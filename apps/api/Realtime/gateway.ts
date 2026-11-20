import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, type Socket, type BroadcastOperator } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import {
  REALTIME_EVENTS,
  type RealtimeEnvelope,
  type PresenceUser,
  type PresencePayload,
  type TypingPayload,
} from '@hm/shared';
import { env } from '../Config/env';
import { logger } from '../Config/logger';
import {
  socketAuthMiddleware,
  clientEventRateLimiter,
  unregisterUserSocket,
  getUserSockets,
} from './auth';
import { authorizeRoomJoin } from './rooms';

export class RealtimeGateway {
  private static instance: RealtimeGateway | null = null;
  private io: SocketIOServer | null = null;
  private redisPubClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private roomPresenceMap = new Map<string, Map<number, PresenceUser>>();
  private typingTimers = new Map<string, NodeJS.Timeout>();
  private userTypingLastSent = new Map<string, number>();
  private eventCounter = 0;
  private lastMinuteReset = Date.now();
  private eventsPerMinute = 0;
  private startedAt = Date.now();

  public static getInstance(): RealtimeGateway {
    if (!RealtimeGateway.instance) {
      RealtimeGateway.instance = realtimeGateway;
    }
    return RealtimeGateway.instance;
  }

  /**
   * Initializes Socket.IO on the provided HTTP server.
   */
  public init(httpServer: HttpServer): void {
    if (!env.REALTIME_ENABLED) {
      logger.info('Real-time system is disabled by configuration (REALTIME_ENABLED=false).');
      return;
    }

    const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

    this.io = new SocketIOServer(httpServer, {
      path: env.REALTIME_PATH || '/realtime',
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 4096, // 4 KB limit
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    // Setup Redis adapter if configured
    if (env.REALTIME_REDIS_URL) {
      try {
        this.redisPubClient = new Redis(env.REALTIME_REDIS_URL);
        this.redisSubClient = this.redisPubClient.duplicate();
        this.io.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
        logger.info(`Attached Redis adapter for Socket.IO at ${env.REALTIME_REDIS_URL}`);
      } catch (err) {
        logger.error('Failed to initialize Redis adapter for Socket.IO:', err);
      }
    }

    // Attach authentication middleware
    this.io.use(socketAuthMiddleware);

    // Event counter reset interval
    setInterval(() => {
      this.eventsPerMinute = this.eventCounter;
      this.eventCounter = 0;
      this.lastMinuteReset = Date.now();
    }, 60000);

    // Setup connection handling
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info(`Realtime gateway initialized on path "${env.REALTIME_PATH || '/realtime'}"`);
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user;

    // Attach client packet rate limiter
    socket.use((packet, next) => {
      clientEventRateLimiter(socket, packet, next);
    });

    // 1. Room join request
    socket.on(
      'room:join',
      async (room: string, callback?: (res: { ok: boolean; error?: string }) => void) => {
        if (!room || typeof room !== 'string') {
          if (callback) callback({ ok: false, error: 'Invalid room name' });
          return;
        }

        const authResult = await authorizeRoomJoin(user, room);
        if (!authResult.allowed) {
          logger.warn(
            `Room join denied for user ${user.id} to room "${room}": ${authResult.reason}`,
          );
          if (callback) callback({ ok: false, error: authResult.reason || 'UNAUTHORIZED_ROOM' });
          socket.emit('error', { error: 'UNAUTHORIZED_ROOM', room, reason: authResult.reason });
          return;
        }

        socket.join(room);
        logger.info(`User ${user.id} joined room "${room}"`);

        // If request or offboarding room, track collaborative presence
        if (room.startsWith('request:') || room.startsWith('offboarding:')) {
          this.addPresence(room, user);
        }

        if (callback) callback({ ok: true });
      },
    );

    // 2. Room leave request
    socket.on(
      'room:leave',
      (room: string, callback?: (res: { ok: boolean; error?: string }) => void) => {
        if (!room || typeof room !== 'string') {
          if (callback) callback({ ok: false, error: 'Invalid room name' });
          return;
        }

        socket.leave(room);
        logger.info(`User ${user.id} left room "${room}"`);

        if (room.startsWith('request:') || room.startsWith('offboarding:')) {
          this.removePresence(room, user.id);
        }

        if (callback) callback({ ok: true });
      },
    );

    // 3. Typing start
    socket.on('typing:start', (room: string) => {
      if (!room || typeof room !== 'string') return;
      if (!socket.rooms.has(room)) return; // Socket must be in the room

      // In request rooms, typing indicators are staff only
      if (room.startsWith('request:') && user.role === 'employee') {
        return;
      }

      // Rate limit typing events: max 1 event per 2s per user/room
      const now = Date.now();
      const typingKey = `${room}:${user.id}`;
      const lastSent = this.userTypingLastSent.get(typingKey) || 0;
      if (now - lastSent < 2000) {
        return;
      }
      this.userTypingLastSent.set(typingKey, now);

      const typingPayload: TypingPayload = {
        room,
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        isTyping: true,
      };

      // Emit to room excluding sender
      socket.to(room).emit(REALTIME_EVENTS.TYPING_UPDATED, {
        id: randomUUID(),
        event: REALTIME_EVENTS.TYPING_UPDATED,
        version: 1,
        ts: Date.now(),
        actor: { id: user.id, name: typingPayload.name, role: user.role },
        data: typingPayload,
      });

      // Auto-expire typing status after 3 seconds if client didn't send stop
      const timerKey = `${room}:${user.id}`;
      const existingTimer = this.typingTimers.get(timerKey);
      if (existingTimer) clearTimeout(existingTimer);

      this.typingTimers.set(
        timerKey,
        setTimeout(() => {
          this.typingTimers.delete(timerKey);
          socket.to(room).emit(REALTIME_EVENTS.TYPING_UPDATED, {
            id: randomUUID(),
            event: REALTIME_EVENTS.TYPING_UPDATED,
            version: 1,
            ts: Date.now(),
            data: { ...typingPayload, isTyping: false },
          });
        }, 3000),
      );
    });

    // 4. Typing stop
    socket.on('typing:stop', (room: string) => {
      if (!room || typeof room !== 'string') return;
      const timerKey = `${room}:${user.id}`;
      const existingTimer = this.typingTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.typingTimers.delete(timerKey);
      }

      socket.to(room).emit(REALTIME_EVENTS.TYPING_UPDATED, {
        id: randomUUID(),
        event: REALTIME_EVENTS.TYPING_UPDATED,
        version: 1,
        ts: Date.now(),
        data: {
          room,
          userId: user.id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          isTyping: false,
        },
      });
    });

    // 5. Presence heartbeat
    socket.on('presence:heartbeat', (room: string) => {
      if (!room || typeof room !== 'string') return;
      if (socket.rooms.has(room)) {
        this.addPresence(room, user);
      }
    });

    // 6. Disconnect handling
    socket.on('disconnect', () => {
      unregisterUserSocket(user.id, socket.id);
      logger.info(`Socket disconnected: ${socket.id} (User: ${user.id})`);

      // Clean up presence across all rooms user had joined
      for (const [room, presenceUsers] of this.roomPresenceMap.entries()) {
        if (presenceUsers.has(user.id)) {
          // Check if user still has another open socket in this room
          const userOtherSockets = getUserSockets(user.id);
          let stillInRoom = false;
          if (userOtherSockets && this.io) {
            for (const sockId of userOtherSockets) {
              const otherSock = this.io.sockets.sockets.get(sockId);
              if (otherSock && otherSock.rooms.has(room)) {
                stillInRoom = true;
                break;
              }
            }
          }

          if (!stillInRoom) {
            this.removePresence(room, user.id);
          }
        }
      }
    });
  }

  private addPresence(room: string, user: Socket['data']['user']): void {
    let viewers = this.roomPresenceMap.get(room);
    if (!viewers) {
      viewers = new Map<number, PresenceUser>();
      this.roomPresenceMap.set(room, viewers);
    }

    viewers.set(user.id, {
      userId: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      role: user.role,
      joinedAt: Date.now(),
    });

    this.broadcastPresence(room);
  }

  private removePresence(room: string, userId: number): void {
    const viewers = this.roomPresenceMap.get(room);
    if (!viewers) return;

    viewers.delete(userId);
    if (viewers.size === 0) {
      this.roomPresenceMap.delete(room);
    }

    this.broadcastPresence(room);
  }

  private broadcastPresence(room: string): void {
    if (!this.io) return;
    const viewers = Array.from(this.roomPresenceMap.get(room)?.values() || []);
    const payload: PresencePayload = { room, viewers };

    const envelope: RealtimeEnvelope<PresencePayload> = {
      id: randomUUID(),
      event: REALTIME_EVENTS.PRESENCE_UPDATED,
      version: 1,
      ts: Date.now(),
      data: payload,
    };

    this.io.to(room).emit(REALTIME_EVENTS.PRESENCE_UPDATED, envelope);
  }

  /**
   * Dispatches a real-time event envelope to one or more targeted rooms.
   */
  public publish<T = unknown>(
    event: string,
    rooms: string | string[],
    data: T,
    actor?: { id: number; name: string; role?: string } | null,
  ): void {
    if (!this.io || !env.REALTIME_ENABLED) return;

    this.eventCounter += 1;
    const targetRooms = Array.isArray(rooms) ? rooms : [rooms];

    const envelope: RealtimeEnvelope<T> = {
      id: randomUUID(),
      event,
      version: 1,
      ts: Date.now(),
      actor: actor || null,
      data,
    };

    let broadcaster:
      | BroadcastOperator<import('@hm/shared').ServerToClientEvents, import('socket.io').SocketData>
      | SocketIOServer = this.io;
    for (const room of targetRooms) {
      broadcaster = broadcaster.to(room);
    }

    broadcaster.emit(event, envelope);
  }

  /**
   * Forcibly disconnects all active sockets for a user (e.g. on session revocation or lockout).
   */
  public disconnectUser(userId: number, reason: string): void {
    if (!this.io) return;
    const socketIds = getUserSockets(userId);
    if (!socketIds || socketIds.size === 0) return;

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(REALTIME_EVENTS.SESSION_REVOKED, { reason });
        socket.disconnect(true);
      }
    }
    logger.info(`Disconnected all active sockets for user ${userId} (Reason: ${reason})`);
  }

  /**
   * Forcibly disconnects any socket using a specific token.
   */
  public disconnectToken(token: string, reason: string): void {
    if (!this.io) return;
    for (const [, socket] of this.io.sockets.sockets) {
      if (socket.data?.user?.token === token) {
        socket.emit(REALTIME_EVENTS.SESSION_REVOKED, { reason });
        socket.disconnect(true);
      }
    }
  }

  /**
   * Health and observability metrics for /realtime/health.
   */
  public getStats(): {
    enabled: boolean;
    connectedSockets: number;
    roomsCount: number;
    eventsPerMinute: number;
    uptimeSeconds: number;
  } {
    const connectedSockets = this.io ? this.io.sockets.sockets.size : 0;
    const roomsCount = this.io ? this.io.sockets.adapter.rooms.size : 0;
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    return {
      enabled: env.REALTIME_ENABLED,
      connectedSockets,
      roomsCount,
      eventsPerMinute: this.eventsPerMinute,
      uptimeSeconds,
    };
  }

  /**
   * Graceful shutdown.
   */
  public async close(): Promise<void> {
    if (this.redisPubClient) {
      await this.redisPubClient.quit();
    }
    if (this.redisSubClient) {
      await this.redisSubClient.quit();
    }
    if (this.io) {
      await new Promise<void>((resolve) => this.io!.close(() => resolve()));
    }
    logger.info('Realtime gateway closed gracefully.');
  }
}

export const realtimeGateway = new RealtimeGateway();
