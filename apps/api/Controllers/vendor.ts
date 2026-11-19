import { BaseCrudController } from './base_crud.controller';
import { VendorService } from '../Services/vendor';

export class VendorController extends BaseCrudController {
  constructor(service = new VendorService()) {
    super(service, 'Vendor');
  }
}
