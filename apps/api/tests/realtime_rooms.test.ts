import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorizeRoomJoin } from '../Realtime/rooms';
import { requests, modules } from '../Database/Schema';
import type { AuthenticatedSocketUser } from '../Realtime/auth';
import { realtimeService } from '../Services/realtime.service';
import { realtimeGateway } from '../Realtime/gateway';

describe('V7 & V8: Realtime Room Authorization and Payload Privacy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const employeeUser: AuthenticatedSocketUser = {
    id: 42,
    email: 'employee@company.com',
    role: 'employee',
    role_id: 4,
    employee_id: 100,
    first_name: 'Alice',
    last_name: 'Smith',
  };

  it('allows user to join only their own personal room user:{userId}', async () => {
    const allowSelf = await authorizeRoomJoin(employeeUser, 'user:42');
    expect(allowSelf.allowed).toBe(true);

    const denyOther = await authorizeRoomJoin(employeeUser, 'user:99');
    expect(denyOther.allowed).toBe(false);
    expect(denyOther.reason).toContain('Cannot join another user room');
  });

  it('blocks non-staff employee from joining staff role rooms role:admin', async () => {
    const denyRole = await authorizeRoomJoin(employeeUser, 'role:admin');
    expect(denyRole.allowed).toBe(false);
    expect(denyRole.reason).toContain('Non-staff roles cannot join staff role rooms');
  });

  it('blocks employee from joining internal staff request room request:10:staff', async () => {
    vi.spyOn(modules, 'findOne').mockResolvedValue(null);
    const denyInternal = await authorizeRoomJoin(employeeUser, 'request:10:staff');
    expect(denyInternal.allowed).toBe(false);
    expect(denyInternal.reason).toContain('Staff privileges required');
  });

  it('allows employee to join their own request room, denies other employee request', async () => {
    vi.spyOn(modules, 'findOne').mockResolvedValue(null);
    vi.spyOn(requests, 'findByPk').mockImplementation((id: any) => {
      if (id === 10) return Promise.resolve({ get: () => 100 } as any); // Own request
      return Promise.resolve({ get: () => 999 } as any); // Someone else's
    });

    const allowOwn = await authorizeRoomJoin(employeeUser, 'request:10');
    expect(allowOwn.allowed).toBe(true);

    const denyOther = await authorizeRoomJoin(employeeUser, 'request:20');
    expect(denyOther.allowed).toBe(false);
    expect(denyOther.reason).toContain('Not authorized');
  });

  it('strips internal notes, secrets, and waive reasons from public realtime event payloads', () => {
    const publishSpy = vi.spyOn(realtimeGateway, 'publish').mockImplementation(() => {});

    const payload = {
      id: 501,
      title: 'Hardware Upgrade',
      password: 'super-secret-password',
      secret_key: 'top-secret',
      internal_notes: 'Do not tell employee about delay',
      admin_notes: 'Urgent replacement required',
      waive_reason: 'Waived due to manager exception',
      public_status: 'in_progress',
    };

    realtimeService.publish({
      event: 'request:updated',
      rooms: 'request:501',
      data: payload,
    });

    // Run setImmediate queue
    return new Promise<void>((resolve) => {
      setImmediate(() => {
        expect(publishSpy).toHaveBeenCalled();
        const emittedData = publishSpy.mock.calls[0][2] as Record<string, unknown>;
        expect(emittedData.password).toBeUndefined();
        expect(emittedData.secret_key).toBeUndefined();
        expect(emittedData.internal_notes).toBeUndefined();
        expect(emittedData.admin_notes).toBeUndefined();
        expect(emittedData.waive_reason).toBeUndefined();
        expect(emittedData.public_status).toBe('in_progress');
        resolve();
      });
    });
  });
});
