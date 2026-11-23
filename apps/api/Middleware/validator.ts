import { body, validationResult, type ValidationChain } from 'express-validator';
import type { RequestHandler } from 'express';
import { STATUS_MESSAGES } from '../Config/constant';

export const validate =
  (validations: ValidationChain[]): RequestHandler =>
  async (req, res, next) => {
    for (const validation of validations) await validation.run(req);
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }
    res.handler.validationError(
      errors.array(),
      errors.array()[0]?.msg ?? STATUS_MESSAGES.VALIDATION_ERROR,
    );
  };

export function validateUnique(
  lookup: (value: string, request: { body?: unknown }) => Promise<boolean>,
  field: string,
): ValidationChain {
  return body(field)
    .optional({ checkFalsy: true })
    .custom(async (value: string, { req }) => {
      if (await lookup(value, req)) throw new Error(`${field} already exists.`);
      return true;
    });
}
