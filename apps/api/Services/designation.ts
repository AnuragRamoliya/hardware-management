import { BaseCrudService } from './base_crud.service';
import { DesignationModel, designationDefinition } from '../Models/designation';

export class DesignationService extends BaseCrudService {
  constructor() {
    super(DesignationModel, designationDefinition);
  }
}
