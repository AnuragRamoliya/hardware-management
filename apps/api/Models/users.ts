import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { AppError } from '../Config/app_error';
import { env } from '../Config/env';
import { ACTIVITY_ACTIONS, MODULES, STATUS, STATUS_MESSAGES } from '../Config/constant';
import { sequelize } from '../Config/database';
import { roles, user_tokens, users, type RowAttributes } from '../Database/Schema';
import { compareHashPassword, createActivityLog, createHashPassword } from '../Utils/helpers';
import { hashToken } from '../Utils/encryption';
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
    role_id: 'number', first_name: 'text', last_name: 'text',
    email: 'text', status: 'number',
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

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await users.findOne({
      where: { email, status: STATUS.ACTIVE },
      attributes: { include: ['password'] },
      include: [{ model: roles, as: 'role', attributes: ['id', 'name'] }],
    });
    if (!user) throw new AppError(401, STATUS_MESSAGES.PASSWORD_INCORRECT);
    const userData = row(user);
    if (!(await compareHashPassword(password, String(userData.password)))) {
      throw new AppError(401, STATUS_MESSAGES.PASSWORD_INCORRECT);
    }
    const id = Number(userData.id);
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
      expires_at: new Date(now + durationMilliseconds(env.ACCESS_TOKEN_EXPIRES)),
      refresh_expires_at: new Date(now + durationMilliseconds(env.REFRESH_TOKEN_EXPIRES)),
    });
    delete userData.password;
    return {
      token: accessToken,
      refresh_token: refreshToken,
      user_info: userData as AuthTokens['user_info'],
    };
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
