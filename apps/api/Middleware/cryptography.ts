import type { RequestHandler } from 'express';
import { AppError } from '../Config/app_error';
import { decryptPayload as decrypt } from '../Utils/encryption';

export const decryptPayload: RequestHandler = (req, _res, next): void => {
  if (req.get('plain-text') === 'true') {
    next();
    return;
  }

  try {
    const securityText = req.body?.security_text;
    if (typeof securityText === 'string') {
      const file = req.file;
      const files = req.files;
      const body = decrypt<Record<string, unknown>>(securityText);
      req.body = body;
      if (file) req.file = file;
      if (files) req.files = files;
    } else if (typeof req.params.id === 'string') {
      req.params.id = String(decrypt<number | string>(req.params.id));
    }
    next();
  } catch {
    next(new AppError(400, 'Decryption failed'));
  }
};
