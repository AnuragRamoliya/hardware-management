import { MODULES } from '../Config/constant';
import { LocationController } from '../Controllers/location';
import { createResourceRouter } from '../Utils/route_factory';

export const locationRouter = createResourceRouter(MODULES.LOCATION, new LocationController(), [
  'name',
]);
