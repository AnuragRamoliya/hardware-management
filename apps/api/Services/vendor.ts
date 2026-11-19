import { BaseCrudService } from './base_crud.service';
import { VendorModel, vendorDefinition } from '../Models/vendor';

export class VendorService extends BaseCrudService {
  constructor() {
    super(VendorModel, vendorDefinition);
  }
}
