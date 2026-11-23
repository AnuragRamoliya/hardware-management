import { body, param } from 'express-validator';
import { STATUS_MESSAGES } from '../Config/constant';
export { validateUnique } from '../Middleware/validator';

export const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer.'),
];

export const listValidation = [
  body('currentPage').optional().isInt({ min: 1 }).toInt(),
  body('itemsPerPage').optional().isInt({ min: 1, max: 100 }).toInt(),
  body('filters').optional().isObject(),
  body('filters.*').custom((value) => {
    const validScalar = (item: unknown) =>
      item === null ||
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean';
    if (validScalar(value)) return true;
    if (Array.isArray(value)) return value.every(validScalar);
    if (typeof value === 'object' && value !== null) {
      const range = value as Record<string, unknown>;
      return (
        Object.keys(range).every((key) => key === 'from' || key === 'to') &&
        Object.values(range).every(validScalar)
      );
    }
    return false;
  }),
  body('sortBy').optional().isArray(),
  body('sortBy.*.id').if(body('sortBy').exists()).isString().notEmpty(),
  body('sortBy.*.value').if(body('sortBy').exists()).isIn(['asc', 'desc', 'ASC', 'DESC']),
];

export const optionsValidation = [
  body('search').optional().isString().trim().isLength({ max: 100 }),
  body('page').optional().isInt({ min: 1 }).toInt(),
  // The builder caps valid positive page sizes at 50; accept larger requests
  // so callers remain compatible while still enforcing the server-side cap.
  body('limit').optional().isInt({ min: 1 }).toInt(),
  body('ids').optional().isArray({ max: 200 }),
  body('ids.*').if(body('ids').exists()).isInt({ min: 1 }),
  body('filters').optional().isObject(),
  body('filters.*').custom(
    (value) =>
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean',
  ),
  body('cursor').optional().isObject(),
  body('cursor.rank').if(body('cursor').exists()).isInt({ min: 0, max: 2 }).toInt(),
  body('cursor.label').if(body('cursor').exists()).isString().isLength({ max: 510 }),
  body('cursor.id').if(body('cursor').exists()).isInt({ min: 1 }),
];

export const loginValidation = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage(STATUS_MESSAGES.PASSWORD_INCORRECT),
];

export const nameValidation = [body('name').isString().trim().isLength({ min: 1, max: 255 })];

export const passwordValidation = [
  body('new_password')
    .isString()
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters.'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.new_password) throw new Error(STATUS_MESSAGES.PASSWORD_MISMATCH);
    return true;
  }),
];
