import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  socketAuthMiddleware,
  clientEventRateLimiter,
  registerUserSocket,
  getUserSockets,
  unregisterUserSocket,
} from '../Realtime/auth';
import { user_tokens } from '../Database/Schema';

describe('A9: Realtime Security & Handshake Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects tokens passed in query parameters', async () => {
    const mockSocket: any = {
      handshake: {
        query: { token: 'insecure_query_token_123' },
        auth: {},
        headers: {},
      },
    };

    let errorResult: Error | undefined;
    await socketAuthMiddleware(mockSocket, (err) => {
      errorResult = err;
    });

    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain('Tokens passed via query parameters are forbidden');
  });

  it('rejects missing authentication tokens', async () => {
    const mockSocket: any = {
      handshake: {
        query: {},
        auth: {},
        headers: {},
      },
    };

    let errorResult: Error | undefined;
    await socketAuthMiddleware(mockSocket, (err) => {
      errorResult = err;
    });

    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain('Authentication token required');
  });

  it('rejects invalid or revoked tokens from database', async () => {
    vi.spyOn(user_tokens, 'findOne').mockResolvedValue(null);

    const mockSocket: any = {
      handshake: {
        query: {},
        auth: { token: 'revoked_or_invalid_jwt_token' },
        headers: {},
      },
    };

    let errorResult: Error | undefined;
    await socketAuthMiddleware(mockSocket, (err) => {
      errorResult = err;
    });

    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain('Invalid or revoked authentication token');
  });

  it('clientEventRateLimiter blocks oversized payloads exceeding 4KB', () => {
    const mockSocket: any = {
      id: 'socket_123',
      data: { eventCount: 0, lastRateLimitReset: Date.now() },
    };

    const oversizedPacket = ['event:test', { data: 'A'.repeat(5000) }];

    let errorResult: Error | undefined;
    clientEventRateLimiter(mockSocket, oversizedPacket, (err) => {
      errorResult = err;
    });

    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain('Payload size exceeds 4KB limit');
  });

  it('clientEventRateLimiter blocks flood of events exceeding rate limit', () => {
    const mockSocket: any = {
      id: 'socket_rate_limited',
      data: { eventCount: 30, lastRateLimitReset: Date.now() },
    };

    let errorResult: Error | undefined;
    clientEventRateLimiter(mockSocket, ['event:msg', { text: 'flood' }], (err) => {
      errorResult = err;
    });

    expect(errorResult).toBeDefined();
    expect(errorResult?.message).toContain('Rate limit exceeded');
  });

  it('evicts oldest socket connection when user connection limit is exceeded', () => {
    const userId = 7777;
    const evictedSockets: string[] = [];

    const mockNsp: any = {
      sockets: new Map(),
    };

    const createMockSocket = (id: string) => {
      const sock: any = {
        id,
        nsp: mockNsp,
        emit: vi.fn(),
        disconnect: vi.fn(() => {
          evictedSockets.push(id);
        }),
      };
      mockNsp.sockets.set(id, sock);
      return sock;
    };

    // Register 5 sockets
    for (let i = 1; i <= 5; i++) {
      const s = createMockSocket(`sock_${i}`);
      registerUserSocket(userId, `sock_${i}`, s);
    }

    expect(getUserSockets(userId)?.size).toBe(5);

    // Register 6th socket - should evict oldest (sock_1)
    const s6 = createMockSocket('sock_6');
    registerUserSocket(userId, 'sock_6', s6);

    expect(evictedSockets).toContain('sock_1');
    expect(getUserSockets(userId)?.has('sock_1')).toBe(false);
    expect(getUserSockets(userId)?.has('sock_6')).toBe(true);
    expect(getUserSockets(userId)?.size).toBe(5);

    // Clean up
    for (let i = 2; i <= 6; i++) {
      unregisterUserSocket(userId, `sock_${i}`);
    }
  });
});
