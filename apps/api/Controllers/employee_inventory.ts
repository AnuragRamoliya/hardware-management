import type { Request } from 'express';
import { AppError } from '../Config/app_error';
import { employees } from '../Database/Schema';
import { AssetAssignmentService } from '../Services/asset_assignment';
import { SoftwareService } from '../Services/software';

const assignments = new AssetAssignmentService();
const software = new SoftwareService();

export class EmployeeInventoryController {
  async assets(request: Request) {
    return assignments.employeeAssets(Number(request.params.employee_id));
  }
  async software(request: Request) {
    return software.employeeSoftware(Number(request.params.employee_id));
  }
  async ownEmployeeId(request: Request): Promise<number> {
    const employee = await employees.findOne({
      where: { user_id: request.userInfo?.id, status: 1 },
    });
    if (!employee) throw new AppError(404, 'Employee record not found for this account.');
    return Number(employee.get('id'));
  }
  async portalAssets(request: Request) {
    return assignments.employeeAssets(await this.ownEmployeeId(request));
  }
  async portalSoftware(request: Request) {
    return software.employeeSoftware(await this.ownEmployeeId(request));
  }
}
