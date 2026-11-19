import { BaseCrudService } from './base_crud.service';
import { DepartmentModel, departmentDefinition } from '../Models/department';

export class DepartmentService extends BaseCrudService {
  constructor() {
    super(DepartmentModel, departmentDefinition);
  }
}
