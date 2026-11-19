import { modules, permissions, requests, offboarding_cases } from '../Database/Schema';
import type { AuthenticatedSocketUser } from './auth';
import { logger } from '../Config/logger';

/**
 * Checks whether a given role has a specific permission on a module.
 */
export async function hasModuleAccess(
  roleId: number,
  moduleName: string,
  accessType: string = 'read_access',
): Promise<boolean> {
  const mod = await modules.findOne({ where: { name: moduleName, status: 1 } });
  if (!mod) return false;

  const perm = await permissions.findOne({
    where: {
      role_id: roleId,
      module_id: Number(mod.get('id')),
      [accessType]: 1,
      status: 1,
    },
  });

  return Boolean(perm);
}

/**
 * Authorizes a client socket to join a requested room.
 * Never trust client room names; strict server-side RBAC and ownership checks.
 */
export async function authorizeRoomJoin(
  user: AuthenticatedSocketUser,
  room: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // 1. Personal user room: user:{userId}
    if (room.startsWith('user:')) {
      const targetUserId = Number(room.slice(5));
      if (targetUserId === user.id) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Cannot join another user room' };
    }

    // 2. Role room: role:{roleName}
    if (room.startsWith('role:')) {
      const targetRole = room.slice(5);
      if (targetRole === user.role) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Cannot join another role room' };
    }

    // 3. Staff-only request room: request:{id}:staff
    if (room.startsWith('request:') && room.endsWith(':staff')) {
      const requestId = Number(room.slice(8, -6));
      if (!requestId) return { allowed: false, reason: 'Invalid request room format' };

      const isStaff = await hasModuleAccess(user.role_id, 'requests', 'read_access');
      if (isStaff) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Staff privileges required for internal request room' };
    }

    // 4. Public request room: request:{id}
    if (room.startsWith('request:')) {
      const requestId = Number(room.slice(8));
      if (!requestId) return { allowed: false, reason: 'Invalid request room format' };

      // Staff with request read access can join any request room
      const isStaff = await hasModuleAccess(user.role_id, 'requests', 'read_access');
      if (isStaff) {
        return { allowed: true };
      }

      // Requester employee can join their own request room
      if (user.employee_id) {
        const reqRecord = await requests.findByPk(requestId, {
          attributes: ['id', 'employee_id'],
        });
        if (reqRecord && Number(reqRecord.get('employee_id')) === user.employee_id) {
          return { allowed: true };
        }
      }

      return { allowed: false, reason: 'Not authorized to view this request room' };
    }

    // 5. Offboarding case room: offboarding:{id}
    if (room.startsWith('offboarding:')) {
      const caseId = Number(room.slice(12));
      if (!caseId) return { allowed: false, reason: 'Invalid offboarding room format' };

      // Staff with offboarding read access
      const isStaff = await hasModuleAccess(user.role_id, 'offboarding', 'read_access');
      if (isStaff) {
        return { allowed: true };
      }

      // Subject employee
      if (user.employee_id) {
        const caseRecord = await offboarding_cases.findByPk(caseId, {
          attributes: ['id', 'employee_id'],
        });
        if (caseRecord && Number(caseRecord.get('employee_id')) === user.employee_id) {
          return { allowed: true };
        }
      }

      return { allowed: false, reason: 'Not authorized to view this offboarding room' };
    }

    // 6. Queue: requests (staff with read/write access)
    if (room === 'queue:requests') {
      const canRead = await hasModuleAccess(user.role_id, 'requests', 'read_access');
      if (canRead) return { allowed: true };
      return { allowed: false, reason: 'Permission denied for request queue' };
    }

    // 7. Queue: approvals (staff with credential approve or reveal access)
    if (room === 'queue:approvals') {
      const canApprove =
        (await hasModuleAccess(user.role_id, 'credential_vault', 'approve_access')) ||
        (await hasModuleAccess(user.role_id, 'credential_vault', 'read_access'));
      if (canApprove) return { allowed: true };
      return { allowed: false, reason: 'Permission denied for approval queue' };
    }

    // 8. Queue: handover (staff with offboarding read/write access)
    if (room === 'queue:handover') {
      const canRead = await hasModuleAccess(user.role_id, 'offboarding', 'read_access');
      if (canRead) return { allowed: true };
      return { allowed: false, reason: 'Permission denied for handover queue' };
    }

    // 9. Queue: dashboard (staff users only)
    if (room === 'queue:dashboard') {
      if (user.role !== 'employee') return { allowed: true };
      return { allowed: false, reason: 'Staff access required for dashboard queue' };
    }

    // Deny unrecognized rooms
    logger.warn(`Unauthorized room join attempt: user ${user.id} tried to join ${room}`);
    return { allowed: false, reason: 'Access to requested room is denied' };
  } catch (error) {
    logger.error(`Error authorizing room join for ${room}:`, error);
    return { allowed: false, reason: 'Internal error checking room authorization' };
  }
}
