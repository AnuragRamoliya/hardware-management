import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { env } from '../Config/env';
import { ACTIVITY_ACTIONS, MODULES, STATUS, STATUS_MESSAGES } from '../Config/constant';
import { sequelize } from '../Config/database';
import {
  roles,
  user_tokens,
  users,
  employees,
  login_history,
  type RowAttributes,
} from '../Database/Schema';
import { compareHashPassword, createActivityLog, createHashPassword } from '../Utils/helpers';
import { hashToken } from '../Utils/encryption';
import { CredentialVaultService } from '../Services/credential_vault';
import { sendOtpEmail } from '../Utils/mailer';
import type { AuthTokens, UserInfo } from '../Types/api';
import { ResourceModel, type ResourceDefinition } from './resource';

const userDefinition: ResourceDefinition = {
  table: 'user',
  module: MODULES.USER,
  writableFields: ['role_id', 'first_name', 'last_name', 'email', 'image', 'status'],
  searchFields: ['first_name', 'last_name', 'email'],
  optionFields: ['id', 'first_name', 'last_name', 'email'],
  filterableFields: {
    role_id: 'number',
    first_name: 'text',
    last_name: 'text',
    email: 'text',
    status: 'number',
  },
};

function row(record: import('sequelize').Model): RowAttributes {
  return record.get({ plain: true }) as RowAttributes;
}

function durationMilliseconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error('Invalid JWT duration.');
  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return amount * multiplier;
}

export class UserModel extends ResourceModel {
  constructor() {
    super(users, userDefinition);
  }

  async login(
    email: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const user = await users.findOne({
      where: { email, status: STATUS.ACTIVE },
      attributes: { include: ['password', 'failed_login_count', 'locked_until'] },
      include: [{ model: roles, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user) {
      await login_history.create({
        user_id: null,
        email_attempted: email,
        success: 0,
        ip_address: meta?.ipAddress || null,
        user_agent: meta?.userAgent || null,
        failure_reason: 'User not found or inactive',
      });
      throw new AppError(401, STATUS_MESSAGES.PASSWORD_INCORRECT);
    }

    const userData = row(user);

    // Exited employee login guard
    const linkedEmp = await employees.findOne({
      where: { user_id: Number(userData.id), status: 1 },
    });
    if (linkedEmp && Number(linkedEmp.get('employment_status')) === 4) {
      await login_history.create({
        user_id: Number(userData.id),
        email_attempted: email,
        success: 0,
        ip_address: meta?.ipAddress || null,
        user_agent: meta?.userAgent || null,
        failure_reason: 'Employee has exited the company',
      });
      throw new AppError(403, 'Your account has been deactivated due to offboarding clearance.');
    }

    // Lockout check
    if (userData.locked_until && new Date(String(userData.locked_until)) > new Date()) {
      await login_history.create({
        user_id: Number(userData.id),
        email_attempted: email,
        success: 0,
        ip_address: meta?.ipAddress || null,
        user_agent: meta?.userAgent || null,
        failure_reason: 'Account is locked',
      });
      throw new AppError(
        403,
        'Account is temporarily locked due to repeated failed login attempts. Try again in 15 minutes or contact an administrator.',
      );
    }

    const passwordValid = await compareHashPassword(password, String(userData.password));
    if (!passwordValid) {
      const failedAttempts = Number(userData.failed_login_count || 0) + 1;
      let lockedUntil: Date | null = null;
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.update({
        failed_login_count: failedAttempts,
        locked_until: lockedUntil,
      });

      await login_history.create({
        user_id: Number(userData.id),
        email_attempted: email,
        success: 0,
        ip_address: meta?.ipAddress || null,
        user_agent: meta?.userAgent || null,
        failure_reason: 'Password incorrect',
      });

      throw new AppError(401, STATUS_MESSAGES.PASSWORD_INCORRECT);
    }

    // Success: reset lockout
    await user.update({
      failed_login_count: 0,
      locked_until: null,
    });

    const id = Number(userData.id);
    await login_history.create({
      user_id: id,
      email_attempted: email,
      success: 1,
      ip_address: meta?.ipAddress || null,
      user_agent: meta?.userAgent || null,
      failure_reason: null,
    });

    const accessToken = jwt.sign({ email: userData.email }, env.SECRET_KEY, {
      subject: String(id),
      expiresIn: durationMilliseconds(env.ACCESS_TOKEN_EXPIRES) / 1000,
    });
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const now = Date.now();
    await user_tokens.create({
      user_id: id,
      token: hashToken(accessToken),
      refresh_token_hash: hashToken(refreshToken),
      ip_address: meta?.ipAddress || null,
      user_agent: meta?.userAgent || null,
      last_active_at: new Date(now),
      expires_at: new Date(now + durationMilliseconds(env.ACCESS_TOKEN_EXPIRES)),
      refresh_expires_at: new Date(now + durationMilliseconds(env.REFRESH_TOKEN_EXPIRES)),
    });
    delete userData.password;
    delete userData.failed_login_count;
    delete userData.locked_until;

    return {
      token: accessToken,
      refresh_token: refreshToken,
      user_info: userData as AuthTokens['user_info'],
    };
  }

  async reauth(
    userId: number,
    password: string,
  ): Promise<{ reauth_token: string; expires_at: Date }> {
    const user = await users.findByPk(userId, { attributes: { include: ['password'] } });
    if (!user) throw new AppError(404, 'User not found.');
    const userData = row(user);
    if (!(await compareHashPassword(password, String(userData.password)))) {
      throw new AppError(401, 'Invalid password for re-authentication.');
    }
    const vaultService = new CredentialVaultService();
    return vaultService.generateReauthToken(userId);
  }

  async adminUnlock(targetUserId: number, actor: UserInfo): Promise<{ success: boolean }> {
    const user = await users.findByPk(targetUserId);
    if (!user) throw new AppError(404, 'User not found.');
    await user.update({ failed_login_count: 0, locked_until: null });
    await createActivityLog({
      module: MODULES.USER,
      moduleId: targetUserId,
      action: 'UNLOCKED',
      description: `User #${targetUserId} unlocked by ${actor.first_name} ${actor.last_name}`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });
    return { success: true };
  }

  async listSessions(userId: number, currentRawToken: string) {
    const currentHashed = hashToken(currentRawToken);
    const rows = await user_tokens.findAll({
      where: {
        user_id: userId,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });
    return rows.map((r) => {
      const plain = row(r);
      return {
        id: plain.id,
        ip_address: plain.ip_address,
        user_agent: plain.user_agent,
        created_at: plain.createdAt,
        last_active_at: plain.last_active_at || plain.createdAt,
        is_current: plain.token === currentHashed,
      };
    });
  }

  async revokeSession(sessionId: number, userId: number) {
    const session = await user_tokens.findOne({ where: { id: sessionId, user_id: userId } });
    if (!session) throw new AppError(404, 'Session not found.');
    await session.destroy();
    return { success: true };
  }

  async revokeOtherSessions(userId: number, currentRawToken: string) {
    const currentHashed = hashToken(currentRawToken);
    await user_tokens.destroy({
      where: {
        user_id: userId,
        token: { [Op.ne]: currentHashed },
      },
    });
    return { success: true };
  }

  async getLoginHistory(userId: number) {
    const rows = await login_history.findAll({
      where: { user_id: userId },
      order: [['id', 'DESC']],
      limit: 50,
    });
    return rows.map(row);
  }

  async refresh(refreshToken: string): Promise<Pick<AuthTokens, 'token' | 'refresh_token'>> {
    return sequelize.transaction(async (transaction) => {
      const session = await user_tokens.findOne({
        where: {
          refresh_token_hash: hashToken(refreshToken),
          refresh_expires_at: { [Op.gt]: new Date() },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
      const sessionData = row(session);
      const user = await users.findOne({
        where: { id: sessionData.user_id, status: STATUS.ACTIVE },
        transaction,
      });
      if (!user) throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
      const userData = row(user);
      const nextAccess = jwt.sign({ email: userData.email }, env.SECRET_KEY, {
        subject: String(userData.id),
        expiresIn: durationMilliseconds(env.ACCESS_TOKEN_EXPIRES) / 1000,
      });
      const nextRefresh = crypto.randomBytes(48).toString('base64url');
      const now = Date.now();
      await session.update(
        {
          token: hashToken(nextAccess),
          refresh_token_hash: hashToken(nextRefresh),
          expires_at: new Date(now + durationMilliseconds(env.ACCESS_TOKEN_EXPIRES)),
          refresh_expires_at: new Date(now + durationMilliseconds(env.REFRESH_TOKEN_EXPIRES)),
        },
        { transaction },
      );
      return { token: nextAccess, refresh_token: nextRefresh };
    });
  }

  async logout(token: string): Promise<void> {
    await user_tokens.destroy({ where: { token: hashToken(token) } });
  }

  async addUser(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    return sequelize.transaction(async (transaction) => {
      const password = await createHashPassword(String(input.password));
      const record = await users.create(
        {
          ...this.values(input),
          password,
          status: STATUS.ACTIVE,
          created_by: actor.id,
        },
        { transaction },
      );
      const data = row(record);
      await createActivityLog({
        module: MODULES.USER,
        moduleId: Number(data.id),
        action: ACTIVITY_ACTIONS.CREATED,
        newValue: { id: data.id, email: data.email },
        description: `User ${String(data.id)} was created`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });
      delete data.password;
      return data;
    });
  }

  async changePassword(input: Record<string, unknown>, actor: UserInfo): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const user = await users.findOne({
        where: { id: actor.id, status: STATUS.ACTIVE },
        attributes: { include: ['password'] },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) throw new AppError(404, STATUS_MESSAGES.USER_NOT_FOUND);
      const current = row(user);
      if (!(await compareHashPassword(String(input.current_password), String(current.password)))) {
        throw new AppError(400, STATUS_MESSAGES.PASSWORD_INCORRECT);
      }
      if (input.new_password === input.current_password) {
        throw new AppError(400, 'New password must differ from the current password.');
      }
      await user.update(
        { password: await createHashPassword(String(input.new_password)), updated_by: actor.id },
        { transaction },
      );
      await user_tokens.destroy({ where: { user_id: actor.id }, transaction });
      await createActivityLog({
        module: MODULES.USER,
        moduleId: actor.id,
        action: ACTIVITY_ACTIONS.UPDATED,
        field: 'password',
        description: `User ${actor.id} password changed`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });
    });
  }

  async forgotPassword(email: string): Promise<{ otp?: string; otp_reference: string }> {
    const reference = crypto.randomBytes(32).toString('hex');
    const user = await users.findOne({ where: { email, status: STATUS.ACTIVE } });
    if (!user) return { otp_reference: reference };
    const data = row(user);
    const otp = env.IS_OTP_GENERATE_STATIC ? '123456' : String(crypto.randomInt(100000, 1_000_000));
    await user_tokens.create({
      user_id: data.id,
      otp,
      otp_reference: reference,
      refresh_expires_at: new Date(Date.now() + 10 * 60_000),
    });
    if (env.IS_STATIC_EMAIL) return { otp, otp_reference: reference };
    await sendOtpEmail(
      String(data.email),
      otp,
      `${String(data.first_name)} ${String(data.last_name)}`,
    );
    return { otp_reference: reference };
  }

  async verifyOtp(otp: string, reference: string): Promise<{ reset_token: string }> {
    const session = await user_tokens.findOne({
      where: { otp, otp_reference: reference, refresh_expires_at: { [Op.gt]: new Date() } },
    });
    if (!session) throw new AppError(400, STATUS_MESSAGES.OTP_INCORRECT);
    const resetToken = crypto.randomBytes(32).toString('hex');
    await session.update({ otp: null, otp_reference: null, reset_token: resetToken });
    return { reset_token: resetToken };
  }

  async resetPassword(input: Record<string, unknown>): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const session = await user_tokens.findOne({
        where: { reset_token: input.reset_token },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) throw new AppError(401, STATUS_MESSAGES.TOKEN_INVALID);
      const data = row(session);
      await users.update(
        { password: await createHashPassword(String(input.new_password)) },
        { where: { id: data.user_id }, transaction },
      );
      await user_tokens.destroy({ where: { user_id: data.user_id }, transaction });
    });
  }

  async getProfile(actor: UserInfo): Promise<RowAttributes> {
    const user = await users.findOne({
      where: { id: actor.id, status: STATUS.ACTIVE },
      include: [{ model: roles, as: 'role', attributes: ['id', 'name'] }],
    });
    if (!user) throw new AppError(404, STATUS_MESSAGES.USER_NOT_FOUND);
    const profile = row(user);
    delete profile.password;
    return profile;
  }

  async updateProfile(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    const updates = Object.fromEntries(
      Object.entries(input).filter(([field]) =>
        ['first_name', 'last_name', 'email'].includes(field),
      ),
    );
    if (Object.keys(updates).length === 0) {
      throw new AppError(422, 'At least one profile field is required.');
    }

    return sequelize.transaction(async (transaction) => {
      const user = await users.findOne({
        where: { id: actor.id, status: STATUS.ACTIVE },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) throw new AppError(404, STATUS_MESSAGES.USER_NOT_FOUND);

      if (typeof updates.email === 'string') {
        const duplicate = await users.findOne({
          where: {
            email: updates.email,
            id: { [Op.ne]: actor.id },
            status: STATUS.ACTIVE,
          },
          transaction,
        });
        if (duplicate) throw new AppError(409, 'Email already exists in our system.');
      }

      const previous = row(user);
      await user.update({ ...updates, updated_by: actor.id }, { transaction });
      for (const [field, value] of Object.entries(updates)) {
        if (previous[field] === value) continue;
        await createActivityLog({
          module: MODULES.USER,
          moduleId: actor.id,
          action: ACTIVITY_ACTIONS.UPDATED,
          field,
          oldValue: previous[field],
          newValue: value,
          description: `User ${actor.id} profile ${field} updated`,
          createdBy: actor.id,
          createdByName: `${actor.first_name} ${actor.last_name}`,
          transaction,
        });
      }
      const profile = await users.findOne({
        where: { id: actor.id },
        include: [{ model: roles, as: 'role', attributes: ['id', 'name'] }],
        transaction,
      });
      if (!profile) throw new AppError(404, STATUS_MESSAGES.USER_NOT_FOUND);
      const profileData = row(profile);
      delete profileData.password;
      return profileData;
    });
  }

  override async delete(id: number, actor: UserInfo): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const record = await users.findOne({
        where: { id, status: { [Op.ne]: STATUS.DELETED } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw new AppError(404, STATUS_MESSAGES.USER_NOT_FOUND);
      const data = row(record);
      await record.update({ status: STATUS.DELETED, updated_by: actor.id }, { transaction });
      await user_tokens.destroy({ where: { user_id: id }, transaction });
      await createActivityLog({
        module: MODULES.USER,
        moduleId: id,
        action: ACTIVITY_ACTIONS.DELETED,
        oldValue: data.status,
        newValue: STATUS.DELETED,
        description: `User ${id} was soft deleted`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction,
      });
    });
  }
}
