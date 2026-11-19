import { BaseCrudController } from './base_crud.controller';
import { DepartmentService } from '../Services/department';

export class DepartmentController extends BaseCrudController {
  constructor(service = new DepartmentService()) {
    super(service, 'Department');
  }
}
