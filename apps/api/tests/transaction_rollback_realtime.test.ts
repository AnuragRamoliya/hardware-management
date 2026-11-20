import { describe, it, expect, vi } from 'vitest';
import { emitAfterCommit } from '../Utils/emit_after_commit';
import { realtimeService } from '../Services/realtime.service';
import { realtimeGateway } from '../Realtime/gateway';

describe('V11: Transaction Rollback and Secret Suppression Guarantees', () => {
  it('suppresses realtime events when transaction rolls back', async () => {
    const publishSpy = vi.spyOn(realtimeGateway, 'publish').mockImplementation(() => {});

    // Mock Sequelize transaction that simulates a rollback (afterCommit never triggers)
    let commitHandler: (() => Promise<void>) | null = null;
    const mockTransaction = {
      afterCommit: (fn: () => Promise<void>) => {
        commitHandler = fn;
      },
    };

    emitAfterCommit(() => {
      realtimeGateway.publish('offboarding:initiated', 'offboarding:1', { case_id: 1 });
    }, mockTransaction as any);

    // Simulate transaction rollback: commitHandler is NEVER called
    expect(publishSpy).not.toHaveBeenCalled();

    // Now simulate successful commit
    if (commitHandler) {
      await (commitHandler as () => Promise<void>)();
    }
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('omits passwords, tokens and secrets from credential realtime events', () => {
    const publishSpy = vi.spyOn(realtimeGateway, 'publish').mockImplementation(() => {});

    const credentialData = {
      id: 99,
      label: 'AWS Root Console',
      username: 'root@company.com',
      password: 'PlaintextSuperSecretPassword123!',
      password_enc: 'encrypted-blob',
      token: 'jwt.token.string',
      refresh_token: 'refresh.token.string',
      encryption_key: 'aes-key',
      iv: 'initialization-vector',
      auth_tag: 'tag',
    };

    realtimeService.publish({
      event: 'credential:created',
      rooms: 'credential:99',
      data: credentialData,
    });

    return new Promise<void>((resolve) => {
      setImmediate(() => {
        expect(publishSpy).toHaveBeenCalled();
        const emitted = publishSpy.mock.calls[0][2] as Record<string, unknown>;
        expect(emitted.password).toBeUndefined();
        expect(emitted.password_enc).toBeUndefined();
        expect(emitted.token).toBeUndefined();
        expect(emitted.refresh_token).toBeUndefined();
        expect(emitted.encryption_key).toBeUndefined();
        expect(emitted.iv).toBeUndefined();
        expect(emitted.auth_tag).toBeUndefined();
        expect(emitted.label).toBe('AWS Root Console');
        expect(emitted.username).toBe('root@company.com');
        resolve();
      });
    });
  });
});
