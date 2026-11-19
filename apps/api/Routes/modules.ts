import { MODULES } from '../Config/constant';
import { ModuleController } from '../Controllers/modules';
import { createResourceRouter } from '../Utils/route_factory';

export const moduleRouter = createResourceRouter(MODULES.MODULE, new ModuleController(), ['name']);
