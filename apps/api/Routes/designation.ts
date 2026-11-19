import { MODULES } from '../Config/constant';
import { DesignationController } from '../Controllers/designation';
import { createResourceRouter } from '../Utils/route_factory';

export const designationRouter = createResourceRouter(
  MODULES.DESIGNATION,
  new DesignationController(),
  ['name'],
);
