import type { Socket } from 'socket.io';
import { Op } from 'sequelize';
import { user_tokens, users, roles, employees } from '../Database/Schema';
import { logger } from '../Config/logger';
import { env } from '../Config/env';
import { hashToken } from '../Utils/encryption';
import { REALTIME_ROOMS, REALTIME_EVENTS } from '@hm/shared';

export interface AuthenticatedSocketUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  role: string;
  employee_id: number | null;
  token: string;
}

declare module 'socket.io' {
  interface SocketData {
    user: AuthenticatedSocketUser;
    eventCount: number;
    lastRateLimitReset: number;
  }
}

// User ID -> list of active socket IDs
const userSocketsMap = new Map<number, Set<string>>();

export function getUserSockets(userId: number): Set<string> | undefined {
  return userSocketsMap.get(userId);
}

export function registerUserSocket(userId: number, socketId: string, socket: Socket): void {
  let sockets = userSocketsMap.get(userId);
  if (!sockets) {
    sockets = new Set<string>();
    userSocketsMap.set(userId, sockets);
  }

  // Evict oldest socket if limit exceeded
  const maxSockets = env.REALTIME_MAX_SOCKETS_PER_USER || 5;
  if (sockets.size >= maxSockets) {
    const oldestSocketId = sockets.values().next().value;
    if (oldestSocketId) {
      sockets.delete(oldestSocketId);
      const server = socket.nsp;
      const oldestSocket = server.sockets.get(oldestSocketId);
      if (oldestSocket) {
        oldestSocket.emit(REALTIME_EVENTS.SESSION_REVOKED, { reason: 'EVICTED_OLDEST_CONNECTION' });
        oldestSocket.disconnect(true);
        logger.info(
          `Evicted oldest socket ${oldestSocketId} for user ${userId} (limit: ${maxSockets})`,
        );
      }
    }
  }

  sockets.add(socketId);
}

export function unregisterUserSocket(userId: number, socketId: string): void {
  const sockets = userSocketsMap.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSocketsMap.delete(userId);
    }
  }
}

/**
 * Socket.IO authentication middleware.
 * Validates the bearer token in handshake auth or headers against user_tokens and users.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    if (socket.handshake.query?.token) {
      return next(
        new Error(
          'Tokens passed via query parameters are forbidden. Use handshake auth or headers.',
        ),
      );
    }

    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!authHeader) {
      return next(new Error('Authentication token required'));
    }

    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : String(authHeader).trim();

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Lookup token in DB (supports both raw and hashed tokens)
    const hashed = hashToken(token);
    const tokenRecord = await user_tokens.findOne({
      where: {
        token: { [Op.in]: [token, hashed] },
        is_revoked: 0,
      },
      include: [
        {
          model: users,
          as: 'user',
          where: { status: 1 },
          include: [{ model: roles, as: 'role' }],
        },
      ],
    });

    if (!tokenRecord) {
      return next(new Error('Invalid or revoked authentication token'));
    }

    const user = tokenRecord.get('user') as unknown as {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      role_id: number;
      locked_until?: string | Date | null;
      role?: { type?: string };
    };
    if (!user) {
      return next(new Error('User account not found or inactive'));
    }

    // Check account lockout
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return next(new Error('Account is temporarily locked'));
    }

    // Find linked employee ID if any
    const emp = await employees.findOne({
      where: { user_id: Number(user.id), status: 1 },
      attributes: ['id', 'employment_status'],
    });

    // Check if employee has exited (4 = Exited)
    if (emp && Number(emp.get('employment_status')) === 4) {
      return next(new Error('Employee account has exited and login is disabled'));
    }

    const userRole = user.role?.type || 'employee';

    socket.data = {
      user: {
        id: Number(user.id),
        email: String(user.email),
        first_name: String(user.first_name),
        last_name: String(user.last_name || ''),
        role_id: Number(user.role_id),
        role: userRole,
        employee_id: emp ? Number(emp.get('id')) : null,
        token,
      },
      eventCount: 0,
      lastRateLimitReset: Date.now(),
    };

    // Auto-join default personal and role rooms
    socket.join(REALTIME_ROOMS.user(user.id));
    socket.join(REALTIME_ROOMS.role(userRole));

    registerUserSocket(Number(user.id), socket.id, socket);

    logger.info(`Socket authenticated: ${socket.id} (User: ${user.id}, Role: ${userRole})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Internal authentication error'));
  }
}

/**
 * Rate limit & payload size guard for incoming client socket events.
 */
export function clientEventRateLimiter(
  socket: Socket,
  packet: unknown[],
  next: (err?: Error) => void,
): void {
  const MAX_PAYLOAD_BYTES = 4096; // 4 KB limit
  const MAX_EVENTS_PER_WINDOW = 30; // 30 events per 10 seconds
  const WINDOW_MS = 10000;

  try {
    // Check payload size
    const packetStr = JSON.stringify(packet);
    if (packetStr.length > MAX_PAYLOAD_BYTES) {
      logger.warn(`Rejected oversized socket packet from ${socket.id} (${packetStr.length} bytes)`);
      return next(new Error('Payload size exceeds 4KB limit'));
    }

    // Rate limiting
    const now = Date.now();
    if (now - socket.data.lastRateLimitReset > WINDOW_MS) {
      socket.data.eventCount = 1;
      socket.data.lastRateLimitReset = now;
    } else {
      socket.data.eventCount += 1;
      if (socket.data.eventCount > MAX_EVENTS_PER_WINDOW) {
        logger.warn(`Rate limit exceeded for socket ${socket.id} (${socket.data.eventCount} msgs)`);
        return next(new Error('Rate limit exceeded. Please wait.'));
      }
    }

    next();
  } catch {
    next();
  }
}
