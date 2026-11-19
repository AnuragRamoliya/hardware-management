import { MODULES } from '../Config/constant';
import { VendorController } from '../Controllers/vendor';
import { createResourceRouter } from '../Utils/route_factory';

export const vendorRouter = createResourceRouter(MODULES.VENDOR, new VendorController(), ['name']);
