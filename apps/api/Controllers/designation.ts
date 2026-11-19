import { BaseCrudController } from './base_crud.controller';
import { DesignationService } from '../Services/designation';

export class DesignationController extends BaseCrudController {
  constructor(service = new DesignationService()) {
    super(service, 'Designation');
  }
}
