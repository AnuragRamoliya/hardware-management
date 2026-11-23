import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op, type WhereOptions } from 'sequelize';
import { AppError } from '../Config/app_error';
import { env } from '../Config/env';
import {
  STATUS,
  MODULES,
  ACTIVITY_ACTIONS,
  CREDENTIAL_APPROVAL_STATUS,
  PROVIDED_BY,
  CREDENTIAL_ACCESS_ACTION,
  CREDENTIAL_CHANGE_TYPE,
  COLLECTION_REQUEST_STATUS,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
  NOTIFICATION_CATEGORIES,
} from '@hm/shared';
import {
  sequelize,
  credentials,
  credential_types,
  credential_history,
  credential_collection_requests,
  credential_access_logs,
  employees,
  users,
  assets,
  software,
  app_settings,
  type RowAttributes,
} from '../Database/Schema';
import { buildAAD, encryptSecret, decryptSecret } from '../Utils/vault_crypto';
import { computeRowHash, GENESIS_HASH, verifyHashChain } from '../Utils/hash_chain';
import { validatePasswordPolicy } from '../Utils/password_policy';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';
import { createNotification } from './notification';
import { realtimeService } from './realtime.service';

const record = (model: import('sequelize').Model): RowAttributes =>
  model.get({ plain: true }) as RowAttributes;

async function getEmployeeUserId(
  employeeId: number | unknown,
  transaction?: import('sequelize').Transaction,
): Promise<number | null> {
  if (!employeeId) return null;
  const emp = await employees.findByPk(Number(employeeId), { transaction });
  if (!emp) return null;
  const userId = emp.get('user_id');
  return userId ? Number(userId) : null;
}

export class CredentialVaultService {
  // ==========================================
  // 1. CREDENTIAL TYPES CRUD
  // ==========================================

  async listTypes(input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {
      status: { [Op.ne]: STATUS.DELETED },
    };

    if (input.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${input.search}%` } },
        { category: { [Op.like]: `%${input.search}%` } },
      ];
    }

    if (input.filters && typeof input.filters === 'object') {
      const filters = input.filters as Record<string, unknown>;
      if (filters.category) where.category = filters.category;
      if (filters.requires_approval !== undefined)
        where.requires_approval = filters.requires_approval;
      if (filters.allow_employee_submit !== undefined)
        where.allow_employee_submit = filters.allow_employee_submit;
    }

    const allowedColumns = new Set([
      'id',
      'name',
      'category',
      'expiry_days',
      'requires_approval',
      'require_complexity',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const order = getSorting(input, allowedColumns, [['id', 'DESC']]);

    const { count, rows } = await credential_types.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async getType(id: number) {
    const type = await credential_types.findByPk(id);
    if (!type || Number(type.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }
    return record(type);
  }

  async createType(input: Record<string, unknown>, actor: UserInfo) {
    const existing = await credential_types.findOne({
      where: { name: String(input.name).trim(), status: { [Op.ne]: STATUS.DELETED } },
    });
    if (existing) {
      throw new AppError(409, 'A credential type with this name already exists.');
    }

    const newType = await credential_types.create({
      name: String(input.name).trim(),
      category: String(input.category || 'other').trim(),
      icon: input.icon ? String(input.icon) : null,
      expiry_days: input.expiry_days ? Number(input.expiry_days) : null,
      min_length: input.min_length ? Number(input.min_length) : 12,
      require_complexity:
        input.require_complexity === false || input.require_complexity === 0 ? 0 : 1,
      requires_approval: input.requires_approval === false || input.requires_approval === 0 ? 0 : 1,
      allow_employee_submit:
        input.allow_employee_submit === false || input.allow_employee_submit === 0 ? 0 : 1,
      notes: input.notes ? String(input.notes) : null,
      status: STATUS.ACTIVE,
      created_by: actor.id,
    });

    return record(newType);
  }

  async updateType(id: number, input: Record<string, unknown>, actor: UserInfo) {
    const type = await credential_types.findByPk(id);
    if (!type || Number(type.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }

    if (input.name && String(input.name).trim() !== String(type.get('name'))) {
      const existing = await credential_types.findOne({
        where: {
          name: String(input.name).trim(),
          id: { [Op.ne]: id },
          status: { [Op.ne]: STATUS.DELETED },
        },
      });
      if (existing) {
        throw new AppError(409, 'A credential type with this name already exists.');
      }
    }

    await type.update({
      ...(input.name !== undefined && { name: String(input.name).trim() }),
      ...(input.category !== undefined && { category: String(input.category).trim() }),
      ...(input.icon !== undefined && { icon: input.icon ? String(input.icon) : null }),
      ...(input.expiry_days !== undefined && {
        expiry_days: input.expiry_days ? Number(input.expiry_days) : null,
      }),
      ...(input.min_length !== undefined && { min_length: Number(input.min_length) }),
      ...(input.require_complexity !== undefined && {
        require_complexity: input.require_complexity ? 1 : 0,
      }),
      ...(input.requires_approval !== undefined && {
        requires_approval: input.requires_approval ? 1 : 0,
      }),
      ...(input.allow_employee_submit !== undefined && {
        allow_employee_submit: input.allow_employee_submit ? 1 : 0,
      }),
      ...(input.notes !== undefined && { notes: input.notes ? String(input.notes) : null }),
    });

    await createActivityLog({
      module: MODULES.CREDENTIAL_TYPE,
      moduleId: id,
      action: ACTIVITY_ACTIONS.UPDATED,
      description: `Credential type "${type.get('name')}" updated`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });

    return record(type);
  }

  async deleteType(id: number, actor: UserInfo) {
    const type = await credential_types.findByPk(id);
    if (!type || Number(type.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }

    const inUseCount = await credentials.count({
      where: { credential_type_id: id, status: { [Op.ne]: STATUS.DELETED } },
    });
    if (inUseCount > 0) {
      throw new AppError(
        400,
        'Cannot delete credential type that is in use by active credentials.',
      );
    }

    await type.update({ status: STATUS.DELETED });

    await createActivityLog({
      module: MODULES.CREDENTIAL_TYPE,
      moduleId: id,
      action: ACTIVITY_ACTIONS.DELETED,
      description: `Credential type "${type.get('name')}" deleted`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });

    return { success: true };
  }

  async optionsTypes() {
    const rows = await credential_types.findAll({
      where: { status: STATUS.ACTIVE },
      attributes: [
        'id',
        'name',
        'category',
        'icon',
        'expiry_days',
        'min_length',
        'require_complexity',
        'requires_approval',
        'allow_employee_submit',
      ],
      order: [['name', 'ASC']],
    });
    const items = rows.map((r) => {
      const rec = record(r);
      return {
        ...rec,
        value: rec.id,
        label: rec.name,
        subLabel: rec.category,
      };
    });
    return {
      rows: items,
      count: items.length,
      hasMore: false,
      page: 1,
    };
  }

  // ==========================================
  // 2. CREDENTIALS ADMIN CRUD
  // ==========================================

  async list(input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {
      status: { [Op.ne]: STATUS.DELETED },
    };

    if (input.search) {
      where[Op.or] = [
        { label: { [Op.like]: `%${input.search}%` } },
        { username: { [Op.like]: `%${input.search}%` } },
      ];
    }

    if (input.filters && typeof input.filters === 'object') {
      const filters = input.filters as Record<string, unknown>;
      if (filters.employee_id) where.employee_id = Number(filters.employee_id);
      if (filters.credential_type_id) where.credential_type_id = Number(filters.credential_type_id);
      if (filters.provided_by) where.provided_by = Number(filters.provided_by);
      if (filters.approval_status) where.approval_status = Number(filters.approval_status);
      if (filters.software_id) where.software_id = Number(filters.software_id);
      if (filters.asset_id) where.asset_id = Number(filters.asset_id);
      if (filters.expires_from || filters.expires_to) {
        const dateRange: Record<symbol, Date> = {};
        if (filters.expires_from) dateRange[Op.gte] = new Date(String(filters.expires_from));
        if (filters.expires_to) dateRange[Op.lte] = new Date(String(filters.expires_to));
        where.expires_at = dateRange;
      }
    }

    const allowedColumns = {
      id: 'id',
      label: 'label',
      username: 'username',
      employee_id: 'employee_id',
      employee: 'employee_id',
      credential_type_id: 'credential_type_id',
      credential_type: 'credential_type_id',
      provided_by: 'provided_by',
      approval_status: 'approval_status',
      expires_at: 'expires_at',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedColumns, [['id', 'DESC']]);

    const { count, rows } = await credentials.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
        {
          model: credential_types,
          as: 'credential_type',
          attributes: [
            'id',
            'name',
            'category',
            'icon',
            'expiry_days',
            'min_length',
            'require_complexity',
            'requires_approval',
            'allow_employee_submit',
          ],
        },
        {
          model: assets,
          as: 'asset',
          attributes: ['id', 'asset_tag', 'brand', 'model'],
        },
        {
          model: software,
          as: 'software',
          attributes: ['id', 'name'],
        },
        {
          model: users,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async get(id: number) {
    const cred = await credentials.findByPk(id, {
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
        {
          model: credential_types,
          as: 'credential_type',
          attributes: [
            'id',
            'name',
            'category',
            'icon',
            'expiry_days',
            'min_length',
            'require_complexity',
            'requires_approval',
            'allow_employee_submit',
          ],
        },
        {
          model: assets,
          as: 'asset',
          attributes: ['id', 'asset_tag', 'brand', 'model'],
        },
        {
          model: software,
          as: 'software',
          attributes: ['id', 'name'],
        },
        {
          model: users,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }
    return record(cred);
  }

  async create(input: Record<string, unknown>, actor: UserInfo) {
    const employeeId = Number(input.employee_id);
    const credentialTypeId = Number(input.credential_type_id);
    const password = String(input.password || '');

    if (!employeeId || !credentialTypeId || !input.label || !input.username || !password) {
      throw new AppError(
        400,
        'Employee, credential type, label, username, and password are required.',
      );
    }

    const employee = await employees.findByPk(employeeId);
    if (!employee || Number(employee.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Employee not found.');
    }

    const credType = await credential_types.findByPk(credentialTypeId);
    if (!credType || Number(credType.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }

    // Policy check
    const typeData = record(credType);
    const policyResult = validatePasswordPolicy(password, {
      min_length: Number(typeData.min_length || 12),
      require_complexity: Boolean(typeData.require_complexity),
    });
    if (!policyResult.valid) {
      throw new AppError(
        422,
        policyResult.message || 'Password does not meet complexity requirements.',
      );
    }

    // Expiry calculation
    let expiresAt: Date | null = null;
    if (input.expires_at) {
      expiresAt = new Date(String(input.expires_at));
    } else if (typeData.expiry_days) {
      expiresAt = new Date(Date.now() + Number(typeData.expiry_days) * 86_400_000);
    }

    return sequelize.transaction(async (transaction) => {
      // Create provisional record
      const cred = await credentials.create(
        {
          employee_id: employeeId,
          credential_type_id: credentialTypeId,
          software_id: input.software_id ? Number(input.software_id) : null,
          asset_id: input.asset_id ? Number(input.asset_id) : null,
          label: String(input.label).trim(),
          username: String(input.username).trim(),
          url: input.url ? String(input.url).trim() : null,
          password_enc: 'PROVISIONAL',
          iv: 'PROVISIONAL',
          auth_tag: 'PROVISIONAL',
          key_version: '1',
          notes: input.notes ? String(input.notes) : null,
          provided_by: PROVIDED_BY.COMPANY,
          approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
          submitted_at: new Date(),
          reviewed_by: actor.id,
          reviewed_at: new Date(),
          must_change_on_first_use: input.must_change_on_first_use ? 1 : 0,
          expires_at: expiresAt,
          last_changed_at: new Date(),
          status: STATUS.ACTIVE,
          created_by: actor.id,
        },
        { transaction },
      );

      const credId = Number(cred.get('id'));
      const aad = buildAAD(credId, employeeId);
      const encrypted = encryptSecret(password, aad);

      await cred.update(
        {
          password_enc: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: credId,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.CREATED,
          meta: {
            provided_by: 'company',
            key_version: encrypted.keyVersion,
          },
        },
        { transaction },
      );

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: credId,
        action: ACTIVITY_ACTIONS.CREATED,
        description: `Company credential "${input.label}" created for employee #${employeeId}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_APPROVAL_CHANGED,
        rooms: [REALTIME_ROOMS.queueApprovals()],
        data: {
          id: credId,
          label: String(input.label),
          credential_type_id: credentialTypeId,
          employee_id: employeeId,
          approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
          status: STATUS.ACTIVE,
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      return record(cred);
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo) {
    const id = Number(input.id);
    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    // Stale-update protection
    if (input.expected_updated_at && cred.get('updatedAt')) {
      const expectedTime = new Date(String(input.expected_updated_at)).getTime();
      const actualTime = new Date(cred.get('updatedAt') as string | Date).getTime();
      if (!isNaN(expectedTime) && expectedTime !== actualTime) {
        throw new AppError(
          409,
          'STALE_RESOURCE: This credential has been modified by another user.',
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (input.label !== undefined) updates.label = String(input.label).trim();
    if (input.username !== undefined) updates.username = String(input.username).trim();
    if (input.url !== undefined) updates.url = input.url ? String(input.url).trim() : null;
    if (input.notes !== undefined) updates.notes = input.notes ? String(input.notes) : null;
    if (input.software_id !== undefined)
      updates.software_id = input.software_id ? Number(input.software_id) : null;
    if (input.asset_id !== undefined)
      updates.asset_id = input.asset_id ? Number(input.asset_id) : null;
    if (input.expires_at !== undefined)
      updates.expires_at = input.expires_at ? new Date(String(input.expires_at)) : null;
    if (input.must_change_on_first_use !== undefined) {
      updates.must_change_on_first_use = input.must_change_on_first_use ? 1 : 0;
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update(updates, { transaction });

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.UPDATED,
          meta: updates,
        },
        { transaction },
      );

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: id,
        action: ACTIVITY_ACTIONS.UPDATED,
        description: `Credential #${id} updated`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      return record(cred);
    });
  }

  async updatePassword(id: number, newPassword: string, actor: UserInfo) {
    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    const typeId = Number(cred.get('credential_type_id'));
    const credType = await credential_types.findByPk(typeId);
    if (credType) {
      const typeData = record(credType);
      const policyResult = validatePasswordPolicy(newPassword, {
        min_length: Number(typeData.min_length || 12),
        require_complexity: Boolean(typeData.require_complexity),
      });
      if (!policyResult.valid) {
        throw new AppError(
          422,
          policyResult.message || 'Password does not meet complexity requirements.',
        );
      }
    }

    const employeeId = Number(cred.get('employee_id'));
    const aad = buildAAD(id, employeeId);
    const encrypted = encryptSecret(newPassword, aad);

    return sequelize.transaction(async (transaction) => {
      await cred.update(
        {
          password_enc: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          last_changed_at: new Date(),
          must_change_on_first_use: 0,
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.PASSWORD_UPDATE,
          meta: { key_version: encrypted.keyVersion },
        },
        { transaction },
      );

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: id,
        action: ACTIVITY_ACTIONS.UPDATED,
        description: `Password rotated for credential #${id}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      return { success: true };
    });
  }

  async delete(id: number, actor: UserInfo) {
    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update({ status: STATUS.DELETED }, { transaction });

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.REVOKED,
          meta: { status: 'deleted' },
        },
        { transaction },
      );

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: id,
        action: ACTIVITY_ACTIONS.DELETED,
        description: `Credential #${id} revoked and soft deleted`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      return { success: true };
    });
  }

  async history(id: number) {
    const cred = await credentials.findByPk(id);
    if (!cred) throw new AppError(404, 'Credential not found.');

    const rows = await credential_history.findAll({
      where: { credential_id: id },
      order: [['id', 'DESC']],
      include: [
        {
          model: users,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    return rows.map(record);
  }

  // ==========================================
  // 3. APPROVAL WORKFLOW
  // ==========================================

  async listApprovals(input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {
      status: { [Op.ne]: STATUS.DELETED },
      approval_status: {
        [Op.in]: [CREDENTIAL_APPROVAL_STATUS.PENDING, CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE],
      },
    };

    if (input.search) {
      where[Op.or] = [
        { label: { [Op.like]: `%${input.search}%` } },
        { username: { [Op.like]: `%${input.search}%` } },
      ];
    }

    const allowedApprovalColumns = {
      id: 'id',
      label: 'label',
      username: 'username',
      employee_id: 'employee_id',
      employee: 'employee_id',
      credential_type_id: 'credential_type_id',
      approval_status: 'approval_status',
      submitted_at: 'submitted_at',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedApprovalColumns, [['submitted_at', 'ASC']]);

    const { count, rows } = await credentials.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
        {
          model: credential_types,
          as: 'credential_type',
          attributes: ['id', 'name', 'category', 'icon'],
        },
      ],
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async approve(id: number, actor: UserInfo) {
    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    const status = Number(cred.get('approval_status'));
    if (
      status !== CREDENTIAL_APPROVAL_STATUS.PENDING &&
      status !== CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE
    ) {
      throw new AppError(400, 'Credential is not pending approval.');
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update(
        {
          approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
          reviewed_by: actor.id,
          reviewed_at: new Date(),
          review_feedback: null,
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.APPROVED,
          meta: { approval_status: 'approved' },
        },
        { transaction },
      );

      const empUserId = await getEmployeeUserId(cred.get('employee_id'), transaction);

      if (empUserId) {
        await createNotification({
          recipient_user_id: empUserId,
          category: NOTIFICATION_CATEGORIES.CREDENTIAL,
          kind: 'credential_approved',
          entity_type: 'credential',
          entity_id: id,
          title: 'Credential Approved',
          body: `Your credential "${cred.get('label')}" has been reviewed and approved.`,
          message: `Your credential "${cred.get('label')}" has been reviewed and approved.`,
          transaction,
        });
      }

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_APPROVAL_CHANGED,
        rooms: [
          REALTIME_ROOMS.queueApprovals(),
          ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : []),
        ],
        data: {
          id,
          label: String(cred.get('label')),
          approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
          status: 1,
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_APPROVAL_CHANGED,
        rooms: [
          REALTIME_ROOMS.queueApprovals(),
          ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : []),
        ],
        data: {
          id,
          label: String(cred.get('label')),
          approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
          status: 1,
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: id,
        action: 'APPROVED',
        description: `Credential #${id} approved by ${actor.first_name} ${actor.last_name}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      return record(cred);
    });
  }

  async reject(id: number, feedback: string, actor: UserInfo) {
    if (!feedback || feedback.trim().length < 3) {
      throw new AppError(400, 'Rejection reason/feedback must be at least 3 characters.');
    }

    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    const status = Number(cred.get('approval_status'));
    if (
      status !== CREDENTIAL_APPROVAL_STATUS.PENDING &&
      status !== CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE
    ) {
      throw new AppError(400, 'Credential is not pending approval.');
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update(
        {
          approval_status: CREDENTIAL_APPROVAL_STATUS.REJECTED,
          reviewed_by: actor.id,
          reviewed_at: new Date(),
          review_feedback: feedback.trim(),
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.REJECTED,
          meta: { feedback: feedback.trim() },
        },
        { transaction },
      );

      const empUserId = await getEmployeeUserId(cred.get('employee_id'), transaction);

      if (empUserId) {
        await createNotification({
          recipient_user_id: empUserId,
          category: NOTIFICATION_CATEGORIES.CREDENTIAL,
          kind: 'credential_rejected',
          entity_type: 'credential',
          entity_id: id,
          title: 'Credential Rejected',
          body: `Your credential "${cred.get('label')}" was rejected: ${feedback.trim()}`,
          message: `Your credential "${cred.get('label')}" was rejected: ${feedback.trim()}`,
          transaction,
        });
      }

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_REJECTED,
        rooms: [
          REALTIME_ROOMS.queueApprovals(),
          ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : []),
        ],
        data: {
          id,
          label: String(cred.get('label')),
          approval_status: CREDENTIAL_APPROVAL_STATUS.REJECTED,
          reason: feedback.trim(),
          status: 1,
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_APPROVAL_CHANGED,
        rooms: [
          REALTIME_ROOMS.queueApprovals(),
          ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : []),
        ],
        data: {
          id,
          label: String(cred.get('label')),
          approval_status: CREDENTIAL_APPROVAL_STATUS.REJECTED,
          reason: feedback.trim(),
          status: 1,
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      await createActivityLog({
        module: MODULES.CREDENTIAL,
        moduleId: id,
        action: 'REJECTED',
        description: `Credential #${id} rejected with reason: ${feedback.trim()}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });

      return record(cred);
    });
  }

  async needsChange(id: number, feedback: string, actor: UserInfo) {
    if (!feedback || feedback.trim().length < 3) {
      throw new AppError(400, 'Feedback must be at least 3 characters.');
    }

    const cred = await credentials.findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    const status = Number(cred.get('approval_status'));
    if (
      status !== CREDENTIAL_APPROVAL_STATUS.PENDING &&
      status !== CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE
    ) {
      throw new AppError(400, 'Credential is not pending approval.');
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update(
        {
          approval_status: CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE,
          reviewed_by: actor.id,
          reviewed_at: new Date(),
          review_feedback: feedback.trim(),
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: id,
          changed_by: actor.id,
          change_type: CREDENTIAL_CHANGE_TYPE.NEEDS_CHANGE,
          meta: { feedback: feedback.trim() },
        },
        { transaction },
      );

      const empUserId = await getEmployeeUserId(cred.get('employee_id'), transaction);

      if (empUserId) {
        await createNotification({
          recipient_user_id: empUserId,
          category: NOTIFICATION_CATEGORIES.CREDENTIAL,
          kind: 'credential_needs_change',
          entity_type: 'credential',
          entity_id: id,
          title: 'Changes Requested on Credential',
          body: `Changes requested on "${cred.get('label')}": ${feedback.trim()}`,
          message: `Changes requested on "${cred.get('label')}": ${feedback.trim()}`,
          transaction,
        });
      }

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_NEEDS_CHANGE,
        rooms: [
          REALTIME_ROOMS.queueApprovals(),
          ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : []),
        ],
        data: {
          id,
          label: String(cred.get('label')),
          approval_status: CREDENTIAL_APPROVAL_STATUS.NEEDS_CHANGE,
          reason: feedback.trim(),
          status: 1,
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction,
      });

      return record(cred);
    });
  }

  async bulkApprove(ids: number[], actor: UserInfo) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError(400, 'Array of credential ids is required.');
    }

    let approvedCount = 0;
    for (const id of ids) {
      try {
        await this.approve(id, actor);
        approvedCount++;
      } catch {
        // Skip records not eligible for approval
      }
    }
    return { approvedCount };
  }

  // ==========================================
  // 4. COLLECTION REQUESTS
  // ==========================================

  async createCollectionRequest(input: Record<string, unknown>, actor: UserInfo) {
    const employeeId = Number(input.employee_id);
    const credentialTypeId = Number(input.credential_type_id);
    const dueDate = String(input.due_date || '');

    if (!employeeId || !credentialTypeId || !dueDate) {
      throw new AppError(400, 'Employee, credential type, and due date are required.');
    }

    const employee = await employees.findByPk(employeeId);
    if (!employee || Number(employee.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Employee not found.');
    }

    const type = await credential_types.findByPk(credentialTypeId);
    if (!type || Number(type.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }

    const request = await credential_collection_requests.create({
      employee_id: employeeId,
      credential_type_id: credentialTypeId,
      requested_by: actor.id,
      message: input.message ? String(input.message).trim() : null,
      due_date: dueDate,
      request_status: COLLECTION_REQUEST_STATUS.PENDING,
      status: STATUS.ACTIVE,
    });

    if (employee.get('user_id')) {
      const empUserId = Number(employee.get('user_id'));
      await createNotification({
        recipient_user_id: empUserId,
        category: NOTIFICATION_CATEGORIES.CREDENTIAL,
        kind: 'credential_collection_request',
        entity_type: 'credential_collection_request',
        entity_id: Number(request.get('id')),
        title: 'Credential Requested',
        body: `The company has requested your ${type.get('name')} credentials by ${dueDate}.`,
        message: `The company has requested your ${type.get('name')} credentials by ${dueDate}.`,
        link: '/portal/accounts',
      });

      realtimeService.publish({
        event: REALTIME_EVENTS.CREDENTIAL_COLLECTION_REQUESTED,
        rooms: [REALTIME_ROOMS.user(empUserId)],
        data: {
          id: Number(request.get('id')),
          employee_id: employeeId,
          credential_type_id: credentialTypeId,
          due_date: dueDate,
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
      });
    }

    return record(request);
  }

  async listCollectionRequests(input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {
      status: { [Op.ne]: STATUS.DELETED },
    };

    if (input.filters && typeof input.filters === 'object') {
      const filters = input.filters as Record<string, unknown>;
      if (filters.employee_id) where.employee_id = Number(filters.employee_id);
      if (filters.credential_type_id) where.credential_type_id = Number(filters.credential_type_id);
      if (filters.request_status) where.request_status = Number(filters.request_status);
    }

    const allowedRequestColumns = {
      id: 'id',
      employee_id: 'employee_id',
      employee: 'employee_id',
      credential_type_id: 'credential_type_id',
      credential_type: 'credential_type_id',
      requested_by: 'requested_by',
      due_date: 'due_date',
      request_status: 'request_status',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedRequestColumns, [['id', 'DESC']]);

    const { count, rows } = await credential_collection_requests.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
        {
          model: credential_types,
          as: 'credential_type',
          attributes: ['id', 'name', 'category', 'icon'],
        },
        {
          model: users,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async cancelCollectionRequest(id: number, actor: UserInfo) {
    const req = await credential_collection_requests.findByPk(id);
    if (!req || Number(req.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Collection request not found.');
    }

    await req.update({ request_status: COLLECTION_REQUEST_STATUS.CANCELLED });

    await createActivityLog({
      module: MODULES.CREDENTIAL_COLLECTION_REQUEST,
      moduleId: id,
      action: ACTIVITY_ACTIONS.UPDATED,
      description: `Credential collection request #${id} cancelled`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });

    return { success: true };
  }

  // ==========================================
  // 5. REAUTH AND REVEAL FLOW
  // ==========================================

  generateReauthToken(userId: number): { reauth_token: string; expires_at: Date } {
    const token = jwt.sign(
      { sub: String(userId), purpose: 'vault_reauth', jti: crypto.randomBytes(16).toString('hex') },
      env.SECRET_KEY,
      { expiresIn: '5m' },
    );
    return {
      reauth_token: token,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    };
  }

  verifyReauthToken(token: string, expectedUserId: number): void {
    if (!token) throw new AppError(401, 'Re-authentication token is required.');
    try {
      const decoded = jwt.verify(token, env.SECRET_KEY) as jwt.JwtPayload;
      if (decoded.purpose !== 'vault_reauth' || Number(decoded.sub) !== expectedUserId) {
        throw new AppError(401, 'Invalid or expired re-authentication token.');
      }
    } catch {
      throw new AppError(
        401,
        'Invalid or expired re-authentication token. Please re-authenticate.',
      );
    }
  }

  async revealSecret(
    id: number,
    reauthToken: string,
    reason: string | undefined,
    actor: UserInfo,
    isPortal = false,
    clientIp = '127.0.0.1',
    userAgent = 'unknown',
  ): Promise<{ password: string }> {
    // 1. Verify reauth token
    this.verifyReauthToken(reauthToken, actor.id);

    // 2. Reason validation for admin
    if (!isPortal) {
      if (!reason || reason.trim().length < 5) {
        throw new AppError(
          400,
          'Mandatory access reason of at least 5 characters is required for vault reveal.',
        );
      }
    }

    // 3. Hourly reveal rate limit (max 10/hour per user)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const revealsPastHour = await credential_access_logs.count({
      where: {
        accessed_by: actor.id,
        action: CREDENTIAL_ACCESS_ACTION.REVEAL,
        accessed_at: { [Op.gte]: oneHourAgo },
      },
    });

    if (revealsPastHour >= 10) {
      throw new AppError(429, 'Hourly reveal rate limit exceeded (maximum 10 reveals per hour).');
    }

    // 4. Fetch credential with secrets scope
    const cred = await credentials.scope('withSecret').findByPk(id);
    if (!cred || Number(cred.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential not found.');
    }

    const employeeId = Number(cred.get('employee_id'));

    // 5. Portal ownership check
    if (isPortal && (!actor.employee_id || actor.employee_id !== employeeId)) {
      throw new AppError(403, 'You are not authorized to view another employee’s credentials.');
    }

    // 6. Decrypt secret
    const ciphertext = String(cred.get('password_enc'));
    const iv = String(cred.get('iv'));
    const authTag = String(cred.get('auth_tag'));
    const keyVersion = String(cred.get('key_version'));
    const aad = buildAAD(id, employeeId);

    const plaintext = decryptSecret(ciphertext, iv, authTag, keyVersion, aad);

    // 7. Audit log with hash chain
    const now = new Date();
    await sequelize.transaction(async (transaction) => {
      // Find latest access log for chain linking
      const lastLog = await credential_access_logs.findOne({
        order: [['id', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const prevHash = (lastLog?.get('hash') as string) || GENESIS_HASH;

      const logRecord = await credential_access_logs.create(
        {
          credential_id: id,
          employee_id: employeeId,
          accessed_by: actor.id,
          action: CREDENTIAL_ACCESS_ACTION.REVEAL,
          reason: isPortal ? 'Self-view via employee portal' : reason?.trim(),
          ip_address: clientIp,
          user_agent: userAgent,
          success: 1,
          failure_reason: null,
          accessed_at: now,
          prev_hash: prevHash,
          hash: 'PENDING',
        },
        { transaction },
      );

      const logId = Number(logRecord.get('id'));
      const rowData = {
        id: logId,
        credential_id: id,
        employee_id: employeeId,
        accessed_by: actor.id,
        action: CREDENTIAL_ACCESS_ACTION.REVEAL,
        reason: isPortal ? 'Self-view via employee portal' : reason?.trim(),
        ip_address: clientIp,
        user_agent: userAgent,
        success: 1,
        failure_reason: null,
        accessed_at: now.toISOString(),
      };

      const computedHash = computeRowHash(prevHash, rowData);
      await logRecord.update({ hash: computedHash }, { transaction });

      await cred.update({ last_revealed_at: now }, { transaction });
    });

    // 8. Admin reveal notification to employee owner (if enabled)
    if (!isPortal) {
      const setting = await app_settings.findOne({ where: { key: 'notify_owner_on_reveal' } });
      const notifyOwner = !setting || setting.get('value') !== 'false';
      if (notifyOwner) {
        const empUserId = await getEmployeeUserId(cred.get('employee_id'));
        if (empUserId) {
          await createNotification({
            recipient_user_id: empUserId,
            category: NOTIFICATION_CATEGORIES.CREDENTIAL,
            kind: 'credential_revealed',
            entity_type: 'credential',
            entity_id: id,
            title: 'Credential Accessed by Admin',
            body: `Your "${cred.get('label')}" credential was revealed by ${actor.first_name} ${actor.last_name} on ${now.toLocaleString()}. Reason: ${reason?.trim()}`,
            message: `Your "${cred.get('label')}" credential was revealed by ${actor.first_name} ${actor.last_name} on ${now.toLocaleString()}. Reason: ${reason?.trim()}`,
          });
        }
      }
    }

    const empUserId = await getEmployeeUserId(cred.get('employee_id'));
    realtimeService.publish({
      event: REALTIME_EVENTS.CREDENTIAL_REVEALED,
      rooms: [REALTIME_ROOMS.role('admin'), ...(empUserId ? [REALTIME_ROOMS.user(empUserId)] : [])],
      data: {
        credential_id: id,
        accessed_by: actor.id,
        actor_name: `${actor.first_name} ${actor.last_name || ''}`.trim(),
        revealed_at: now.toISOString(),
      },
      actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
    });

    return { password: plaintext };
  }

  // ==========================================
  // 6. ACCESS LOGS AND AUDIT INTEGRITY
  // ==========================================

  async listAccessLogs(input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {};

    if (input.filters && typeof input.filters === 'object') {
      const filters = input.filters as Record<string, unknown>;
      if (filters.credential_id) where.credential_id = Number(filters.credential_id);
      if (filters.employee_id) where.employee_id = Number(filters.employee_id);
      if (filters.accessed_by) where.accessed_by = Number(filters.accessed_by);
      if (filters.action) where.action = filters.action;
      if (filters.from || filters.to) {
        const dateRange: Record<symbol, Date> = {};
        if (filters.from) dateRange[Op.gte] = new Date(String(filters.from));
        if (filters.to) dateRange[Op.lte] = new Date(String(filters.to));
        where.accessed_at = dateRange;
      }
    }

    const allowedLogColumns = {
      id: 'id',
      credential_id: 'credential_id',
      credential: 'credential_id',
      employee_id: 'employee_id',
      employee: 'employee_id',
      accessed_by: 'accessed_by',
      accessor: 'accessed_by',
      action: 'action',
      accessed_at: 'accessed_at',
      createdAt: 'createdAt',
    };
    const order = getSorting(input, allowedLogColumns, [['id', 'DESC']]);

    const { count, rows } = await credential_access_logs.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
      include: [
        {
          model: credentials,
          as: 'credential',
          attributes: ['id', 'label', 'username'],
        },
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'accessor',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async verifyAuditIntegrity() {
    const accessLogs = await credential_access_logs.findAll({
      order: [['id', 'ASC']],
    });
    const accessRows = accessLogs.map((r) => r.get({ plain: true })) as unknown as Array<{
      id: number;
      credential_id: number;
      employee_id: number;
      accessed_by: number;
      action: string;
      reason?: string | null;
      ip_address?: string | null;
      user_agent?: string | null;
      success: number | boolean;
      failure_reason?: string | null;
      accessed_at: Date | string;
      prev_hash: string;
      hash: string;
    }>;

    const accessResult = verifyHashChain(accessRows, (r) => ({
      id: r.id,
      credential_id: r.credential_id,
      employee_id: r.employee_id,
      accessed_by: r.accessed_by,
      action: r.action,
      reason: r.reason,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      success: r.success,
      failure_reason: r.failure_reason,
      accessed_at: r.accessed_at instanceof Date ? r.accessed_at.toISOString() : r.accessed_at,
    }));

    return {
      accessLogsValid: accessResult.valid,
      totalAccessLogsVerified: accessResult.totalVerified,
      accessLogsError: accessResult.errorMessage || null,
    };
  }

  // ==========================================
  // 7. PORTAL METHODS (EMPLOYEE SELF-SERVICE)
  // ==========================================

  async getConsentStatus(employeeId: number) {
    const employee = await employees.findByPk(employeeId);
    if (!employee) throw new AppError(404, 'Employee record not found.');

    const acceptedAt = employee.get('vault_consent_accepted_at');
    return {
      consent_accepted: Boolean(acceptedAt),
      consent_accepted_at: acceptedAt || null,
      policy_text:
        'Company IT administrators have authorized access to view, update, or revoke company-provided accounts. Your submitted credentials may be inspected for security compliance and audit purposes.',
    };
  }

  async acceptConsent(employeeId: number) {
    const employee = await employees.findByPk(employeeId);
    if (!employee) throw new AppError(404, 'Employee record not found.');

    const now = new Date();
    await employee.update({ vault_consent_accepted_at: now });
    return {
      consent_accepted: true,
      consent_accepted_at: now,
    };
  }

  async portalList(employeeId: number, input: ListDto) {
    const { limit, offset } = getPagination(input);
    const where: Record<string | symbol, unknown> = {
      employee_id: employeeId,
      status: { [Op.ne]: STATUS.DELETED },
    };

    if (input.search) {
      where[Op.or] = [
        { label: { [Op.like]: `%${input.search}%` } },
        { username: { [Op.like]: `%${input.search}%` } },
      ];
    }

    if (input.filters && typeof input.filters === 'object') {
      const filters = input.filters as Record<string, unknown>;
      if (filters.credential_type_id) where.credential_type_id = Number(filters.credential_type_id);
      if (filters.approval_status) where.approval_status = Number(filters.approval_status);
      if (filters.provided_by) where.provided_by = Number(filters.provided_by);
    }

    const allowedColumns = {
      id: 'id',
      label: 'label',
      username: 'username',
      employee_id: 'employee_id',
      employee: 'employee_id',
      credential_type_id: 'credential_type_id',
      credential_type: 'credential_type_id',
      provided_by: 'provided_by',
      approval_status: 'approval_status',
      expires_at: 'expires_at',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedColumns, [['id', 'DESC']]);

    const { count, rows } = await credentials.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit,
      offset,
      order,
      include: [
        {
          model: credential_types,
          as: 'credential_type',
          attributes: [
            'id',
            'name',
            'category',
            'icon',
            'expiry_days',
            'min_length',
            'require_complexity',
            'requires_approval',
            'allow_employee_submit',
          ],
        },
      ],
    });

    const mappedRows = rows.map(record);
    return {
      rows: mappedRows,
      count,
      total: count,
      items: mappedRows,
      currentPage: Number(input.currentPage ?? 1),
      itemsPerPage: limit,
    };
  }

  async portalGet(id: number, employeeId: number) {
    const cred = await credentials.findOne({
      where: { id, employee_id: employeeId, status: { [Op.ne]: STATUS.DELETED } },
      include: [
        {
          model: credential_types,
          as: 'credential_type',
          attributes: [
            'id',
            'name',
            'category',
            'icon',
            'expiry_days',
            'min_length',
            'require_complexity',
            'requires_approval',
            'allow_employee_submit',
          ],
        },
      ],
    });

    if (!cred) throw new AppError(404, 'Credential not found.');
    return record(cred);
  }

  async portalAdd(employeeId: number, input: Record<string, unknown>, userId: number) {
    // Check consent
    const consent = await this.getConsentStatus(employeeId);
    if (!consent.consent_accepted) {
      throw new AppError(
        403,
        'You must accept the credential vault privacy policy before adding accounts.',
      );
    }

    const credentialTypeId = Number(input.credential_type_id);
    const password = String(input.password || '');
    if (!credentialTypeId || !input.label || !input.username || !password) {
      throw new AppError(400, 'Credential type, label, username, and password are required.');
    }

    const type = await credential_types.findByPk(credentialTypeId);
    if (!type || Number(type.get('status')) === STATUS.DELETED) {
      throw new AppError(404, 'Credential type not found.');
    }

    const typeData = record(type);
    if (!typeData.allow_employee_submit) {
      throw new AppError(403, 'This credential type cannot be submitted by employees.');
    }

    const policyResult = validatePasswordPolicy(password, {
      min_length: Number(typeData.min_length || 12),
      require_complexity: Boolean(typeData.require_complexity),
    });
    if (!policyResult.valid) {
      throw new AppError(
        422,
        policyResult.message || 'Password does not meet complexity requirements.',
      );
    }

    const requiresApproval = Boolean(typeData.requires_approval);
    const initialStatus = requiresApproval
      ? CREDENTIAL_APPROVAL_STATUS.PENDING
      : CREDENTIAL_APPROVAL_STATUS.APPROVED;

    return sequelize.transaction(async (transaction) => {
      const cred = await credentials.create(
        {
          employee_id: employeeId,
          credential_type_id: credentialTypeId,
          label: String(input.label).trim(),
          username: String(input.username).trim(),
          url: input.url ? String(input.url).trim() : null,
          password_enc: 'PROVISIONAL',
          iv: 'PROVISIONAL',
          auth_tag: 'PROVISIONAL',
          key_version: '1',
          notes: input.notes ? String(input.notes) : null,
          provided_by: PROVIDED_BY.EMPLOYEE,
          approval_status: initialStatus,
          submitted_at: new Date(),
          must_change_on_first_use: 0,
          last_changed_at: new Date(),
          status: STATUS.ACTIVE,
          created_by: userId,
        },
        { transaction },
      );

      const credId = Number(cred.get('id'));
      const aad = buildAAD(credId, employeeId);
      const encrypted = encryptSecret(password, aad);

      await cred.update(
        {
          password_enc: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
        },
        { transaction },
      );

      await credential_history.create(
        {
          credential_id: credId,
          changed_by: userId,
          change_type: CREDENTIAL_CHANGE_TYPE.SUBMITTED,
          meta: { provided_by: 'employee' },
        },
        { transaction },
      );

      // Auto-fulfill matching pending collection request if any
      const matchingReq = await credential_collection_requests.findOne({
        where: {
          employee_id: employeeId,
          credential_type_id: credentialTypeId,
          request_status: COLLECTION_REQUEST_STATUS.PENDING,
          status: { [Op.ne]: STATUS.DELETED },
        },
        transaction,
      });

      if (matchingReq) {
        await matchingReq.update(
          {
            request_status: COLLECTION_REQUEST_STATUS.FULFILLED,
            credential_id: credId,
            fulfilled_at: new Date(),
          },
          { transaction },
        );
      }

      return record(cred);
    });
  }

  async portalUpdate(
    id: number,
    employeeId: number,
    input: Record<string, unknown>,
    userId: number,
  ) {
    const cred = await credentials.findOne({
      where: { id, employee_id: employeeId, status: { [Op.ne]: STATUS.DELETED } },
    });
    if (!cred) throw new AppError(404, 'Credential not found.');

    const reauthSetting = await app_settings.findOne({
      where: { key: 'credential_reauthorize_on_change' },
    });
    const shouldReauthorize = reauthSetting ? reauthSetting.get('value') === 'true' : true;

    const updates: Record<string, unknown> = {};
    if (input.label !== undefined) updates.label = String(input.label).trim();
    if (input.username !== undefined) updates.username = String(input.username).trim();
    if (input.url !== undefined) updates.url = input.url ? String(input.url).trim() : null;
    if (input.notes !== undefined) updates.notes = input.notes ? String(input.notes) : null;

    if (
      shouldReauthorize &&
      Number(cred.get('approval_status')) === CREDENTIAL_APPROVAL_STATUS.APPROVED
    ) {
      updates.approval_status = CREDENTIAL_APPROVAL_STATUS.PENDING;
      updates.submitted_at = new Date();
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update(updates, { transaction });

      await credential_history.create(
        {
          credential_id: id,
          changed_by: userId,
          change_type: CREDENTIAL_CHANGE_TYPE.UPDATED,
          meta: updates,
        },
        { transaction },
      );

      return record(cred);
    });
  }

  async portalChangePassword(id: number, employeeId: number, newPassword: string, userId: number) {
    const cred = await credentials.findOne({
      where: { id, employee_id: employeeId, status: { [Op.ne]: STATUS.DELETED } },
    });
    if (!cred) throw new AppError(404, 'Credential not found.');

    const type = await credential_types.findByPk(Number(cred.get('credential_type_id')));
    if (type) {
      const typeData = record(type);
      const policyResult = validatePasswordPolicy(newPassword, {
        min_length: Number(typeData.min_length || 12),
        require_complexity: Boolean(typeData.require_complexity),
      });
      if (!policyResult.valid) {
        throw new AppError(
          422,
          policyResult.message || 'Password does not meet complexity requirements.',
        );
      }
    }

    const aad = buildAAD(id, employeeId);
    const encrypted = encryptSecret(newPassword, aad);

    const reauthSetting = await app_settings.findOne({
      where: { key: 'credential_reauthorize_on_change' },
    });
    const shouldReauthorize = reauthSetting ? reauthSetting.get('value') === 'true' : true;

    return sequelize.transaction(async (transaction) => {
      const updates: Record<string, unknown> = {
        password_enc: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        last_changed_at: new Date(),
        must_change_on_first_use: 0,
      };

      if (
        shouldReauthorize &&
        Number(cred.get('approval_status')) === CREDENTIAL_APPROVAL_STATUS.APPROVED
      ) {
        updates.approval_status = CREDENTIAL_APPROVAL_STATUS.PENDING;
        updates.submitted_at = new Date();
      }

      await cred.update(updates, { transaction });

      await credential_history.create(
        {
          credential_id: id,
          changed_by: userId,
          change_type: CREDENTIAL_CHANGE_TYPE.PASSWORD_UPDATE,
          meta: { key_version: encrypted.keyVersion },
        },
        { transaction },
      );

      return { success: true };
    });
  }

  async portalDelete(id: number, employeeId: number, userId: number) {
    const cred = await credentials.findOne({
      where: { id, employee_id: employeeId, status: { [Op.ne]: STATUS.DELETED } },
    });
    if (!cred) throw new AppError(404, 'Credential not found.');

    if (Number(cred.get('provided_by')) === PROVIDED_BY.COMPANY) {
      throw new AppError(403, 'Company-provided credentials cannot be deleted by an employee.');
    }

    return sequelize.transaction(async (transaction) => {
      await cred.update({ status: STATUS.DELETED }, { transaction });

      await credential_history.create(
        {
          credential_id: id,
          changed_by: userId,
          change_type: CREDENTIAL_CHANGE_TYPE.REVOKED,
          meta: { source: 'portal' },
        },
        { transaction },
      );

      return { success: true };
    });
  }

  async portalRequests(employeeId: number) {
    const rows = await credential_collection_requests.findAll({
      where: {
        employee_id: employeeId,
        request_status: COLLECTION_REQUEST_STATUS.PENDING,
        status: { [Op.ne]: STATUS.DELETED },
      },
      include: [
        {
          model: credential_types,
          as: 'credential_type',
          attributes: ['id', 'name', 'category', 'icon'],
        },
      ],
      order: [['due_date', 'ASC']],
    });
    return rows.map(record);
  }

  async portalTypes() {
    const rows = await credential_types.findAll({
      where: {
        status: STATUS.ACTIVE,
        allow_employee_submit: 1,
      },
      attributes: [
        'id',
        'name',
        'category',
        'icon',
        'expiry_days',
        'min_length',
        'require_complexity',
        'requires_approval',
      ],
      order: [['name', 'ASC']],
    });
    return rows.map(record);
  }
}
