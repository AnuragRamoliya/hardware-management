import { MODULES } from '../Config/constant';
import { DepartmentController } from '../Controllers/department';
import { createResourceRouter } from '../Utils/route_factory';

export const departmentRouter = createResourceRouter(
  MODULES.DEPARTMENT,
  new DepartmentController(),
  ['name'],
);
