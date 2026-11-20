import { Router, type Request, type Response, type NextFunction } from 'express';
import { param } from 'express-validator';
import { ACCESS_TYPES, MODULES } from '../Config/constant';
import { checkAccess, userAuth } from '../Middleware/authentication';
import { decryptPayload } from '../Middleware/cryptography';
import { validate } from '../Middleware/validator';
import { ReportController } from '../Controllers/reports';

export const reportRouter = Router();
const report = new ReportController();

const reportsRead = checkAccess(MODULES.REPORTS, ACCESS_TYPES.READ);

// List available reports for current role
reportRouter.post(
  '/reports/list',
  userAuth,
  decryptPayload,
  reportsRead,
  (req: Request, res: Response, next: NextFunction) => report.list(req, res, next),
);

// Get single report definition metadata
reportRouter.get(
  '/reports/meta/:key',
  userAuth,
  reportsRead,
  param('key').isString().trim().notEmpty(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.getMeta(req, res, next),
);

reportRouter.post(
  '/reports/meta/:key',
  userAuth,
  decryptPayload,
  reportsRead,
  param('key').isString().trim().notEmpty(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.getMeta(req, res, next),
);

// Run a report query with pagination and filters
reportRouter.post(
  '/reports/run/:key',
  userAuth,
  decryptPayload,
  reportsRead,
  param('key').isString().trim().notEmpty(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.run(req, res, next),
);

// Export report data (sync stream or async job creation)
reportRouter.post(
  '/reports/export/:key',
  userAuth,
  decryptPayload,
  reportsRead,
  param('key').isString().trim().notEmpty(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.export(req, res, next),
);

// List user export jobs
reportRouter.post(
  '/reports/jobs/list',
  userAuth,
  decryptPayload,
  reportsRead,
  (req: Request, res: Response, next: NextFunction) => report.listJobs(req, res, next),
);

// Get single export job status
reportRouter.get(
  '/reports/jobs/get/:id',
  userAuth,
  reportsRead,
  param('id').isNumeric(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.getJob(req, res, next),
);

reportRouter.post(
  '/reports/jobs/get/:id',
  userAuth,
  decryptPayload,
  reportsRead,
  param('id').isNumeric(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.getJob(req, res, next),
);

// Download exported file
reportRouter.get(
  '/reports/jobs/download/:id',
  userAuth,
  reportsRead,
  param('id').isNumeric(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.downloadJob(req, res, next),
);

reportRouter.post(
  '/reports/jobs/download/:id',
  userAuth,
  decryptPayload,
  reportsRead,
  param('id').isNumeric(),
  validate,
  (req: Request, res: Response, next: NextFunction) => report.downloadJob(req, res, next),
);
