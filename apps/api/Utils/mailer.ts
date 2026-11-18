import nodemailer from 'nodemailer';
import { env } from '../Config/env';
import { logger } from '../Config/logger';

const transporter =
  env.MAIL_HOST || env.MAIL_SERVICE
    ? nodemailer.createTransport({
        service: env.MAIL_SERVICE || undefined,
        ...(env.MAIL_HOST ? { host: env.MAIL_HOST } : {}),
        port: env.MAIL_PORT,
        secure: env.MAIL_SECURE,
        auth: env.MAIL_USERNAME ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD } : undefined,
      })
    : null;

export async function sendOtpEmail(email: string, otp: string, name: string): Promise<void> {
  if (!transporter) throw new Error('Mail transport is not configured.');
  try {
    await transporter.sendMail({
      from: env.MAIL_EMAIL,
      to: email,
      subject: 'Password reset verification',
      text: `Hello ${name}, your one-time password is ${otp}.`,
    });
  } catch (error) {
    logger.error('Failed to send password reset email', error);
    throw error;
  }
}
