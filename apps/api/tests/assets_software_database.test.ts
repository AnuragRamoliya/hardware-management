import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Op } from 'sequelize';
import {
  sequelize,
  assets,
  asset_assignments,
  employees,
  users,
  software,
  software_licenses,
  software_assignments,
} from '../Database/Schema';
import { AssetService } from '../Services/assets';
import { AssetAssignmentService } from '../Services/asset_assignment';
import { SoftwareService } from '../Services/software';
import { SoftwareLicensesService } from '../Services/software_licenses';
import type { UserInfo } from '../Types/api';

const dbTest =
  process.env.DB_INTEGRATION === '1' || process.env.PHASE2_DB_INTEGRATION === '1' ? it : it.skip;
const assetIds: number[] = [];
const softwareIds: number[] = [];
const actor: UserInfo = {
  id: 1,
  role_id: 1,
  first_name: 'Test',
  last_name: 'Admin',
  email: 'test@example.com',
};
let employeeIds: number[] = [];

async function removeTestAssets(ids: number[]) {
  if (!ids.length) return;
  await asset_assignments.destroy({ where: { asset_id: { [Op.in]: ids } }, force: true });
  await assets.update({ parent_asset_id: null }, { where: { id: { [Op.in]: ids } } });
  await assets.destroy({ where: { id: { [Op.in]: ids } }, force: true });
}

beforeAll(async () => {
  if (process.env.PHASE2_DB_INTEGRATION !== '1') return;
  const leftovers = await assets.findAll({
    where: { brand: 'Phase 2 test fixture' },
    attributes: ['id'],
  });
  await removeTestAssets(leftovers.map((row) => Number(row.get('id'))));
  const staleSoftware = await software.findAll({
    where: { name: { [Op.in]: ['Seat test', 'Transfer seat test'] } },
    attributes: ['id'],
  });
  const ids = staleSoftware.map((row) => Number(row.get('id')));
  if (ids.length) {
    await software_assignments.destroy({ where: { software_id: { [Op.in]: ids } }, force: true });
    await software_licenses.destroy({ where: { software_id: { [Op.in]: ids } }, force: true });
    await software.destroy({ where: { id: { [Op.in]: ids } }, force: true });
  }
});

afterEach(async () => {
  if (assetIds.length) {
    await removeTestAssets(assetIds);
    assetIds.length = 0;
  }
  if (softwareIds.length) {
    await software_assignments.destroy({
      where: { software_id: { [Op.in]: softwareIds } },
      force: true,
    });
    await software_licenses.destroy({
      where: { software_id: { [Op.in]: softwareIds } },
      force: true,
    });
    await software.destroy({ where: { id: { [Op.in]: softwareIds } }, force: true });
    softwareIds.length = 0;
  }
});
afterAll(async () => {
  if (process.env.PHASE2_DB_INTEGRATION === '1') await sequelize.close();
});

describe('Phase 2 database workflows', () => {
  dbTest(
    'assigns and returns an accessory hierarchy with its parent',
    async () => {
      const [user, employee] = await Promise.all([
        users.findOne({ where: { status: 1 } }),
        employees.findOne({ where: { status: 1, employment_status: 1 } }),
      ]);
      expect(user).not.toBeNull();
      expect(employee).not.toBeNull();
      actor.id = Number(user?.get('id'));
      const service = new AssetService();
      const parent = await service.add({ brand: 'Phase 2 test fixture', model: 'Parent' }, actor);
      const parentId = Number(parent.id);
      assetIds.push(parentId);
      const child = await service.add(
        { brand: 'Phase 2 test fixture', model: 'Child', parent_asset_id: parentId },
        actor,
      );
      const childId = Number(child.id);
      assetIds.push(childId);
      const assignments = new AssetAssignmentService();
      await assignments.assign(
        { asset_id: parentId, employee_id: Number(employee?.get('id')) },
        actor,
      );
      expect(
        await asset_assignments.count({
          where: { asset_id: { [Op.in]: [parentId, childId] }, returned_at: null },
        }),
      ).toBe(2);
      await assignments.return({ asset_id: parentId, to_status: 'available' }, actor);
      expect(
        await asset_assignments.count({
          where: { asset_id: { [Op.in]: [parentId, childId] }, returned_at: null },
        }),
      ).toBe(0);
    },
    30_000,
  );

  dbTest(
    'allows exactly one concurrent assignment for an asset',
    async () => {
      const [user, employeesFound] = await Promise.all([
        users.findOne({ where: { status: 1 } }),
        employees.findAll({ where: { status: 1, employment_status: 1 }, limit: 2 }),
      ]);
      expect(user).not.toBeNull();
      expect(employeesFound).toHaveLength(2);
      actor.id = Number(user?.get('id'));
      employeeIds = employeesFound.map((item) => Number(item.get('id')));
      const created = await new AssetService().add(
        { brand: 'Phase 2 test fixture', model: 'Lock test' },
        actor,
      );
      const assetId = Number(created.id);
      assetIds.push(assetId);
      const service = new AssetAssignmentService();
      const attempts = await Promise.allSettled([
        service.assign({ asset_id: assetId, employee_id: employeeIds[0]! }, actor),
        service.assign({ asset_id: assetId, employee_id: employeeIds[1]! }, actor),
      ]);
      expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
      expect(
        await asset_assignments.count({ where: { asset_id: assetId, returned_at: null } }),
      ).toBe(1);
    },
    30_000,
  );

  dbTest(
    'transfers an asset atomically and enforces software license seats',
    async () => {
      const [user, employeeRows] = await Promise.all([
        users.findOne({ where: { status: 1 } }),
        employees.findAll({ where: { status: 1, employment_status: 1 }, limit: 2 }),
      ]);
      expect(user).not.toBeNull();
      expect(employeeRows).toHaveLength(2);
      actor.id = Number(user?.get('id'));
      const [firstEmployee, secondEmployee] = employeeRows.map((item) => Number(item.get('id')));
      const asset = await new AssetService().add(
        { brand: 'Phase 2 test fixture', model: 'Atomic test' },
        actor,
      );
      const assetId = Number(asset.id);
      assetIds.push(assetId);
      const assignments = new AssetAssignmentService();
      const first = await assignments.assign(
        { asset_id: assetId, employee_id: firstEmployee! },
        actor,
      );
      const transferred = await assignments.transfer(
        { asset_id: assetId, to_employee_id: secondEmployee! },
        actor,
      );
      expect(Number(transferred.employee_id)).toBe(secondEmployee);
      expect(
        await asset_assignments.count({
          where: { asset_id: assetId, employee_id: firstEmployee, returned_at: { [Op.ne]: null } },
        }),
      ).toBe(1);
      expect(
        await asset_assignments.count({ where: { asset_id: assetId, returned_at: null } }),
      ).toBe(1);
      expect(first).toBeDefined();

      const softwareRecord = await new SoftwareService().add(
        { name: 'Seat test', category: 'productivity', license_type: 'per_seat' },
        actor,
      );
      const softwareId = Number(softwareRecord.id);
      softwareIds.push(softwareId);
      const license = await new SoftwareLicensesService().add(
        { software_id: softwareId, seats_total: 1 },
        actor,
      );
      const licenseId = Number(license.id);
      const softwareService = new SoftwareService();
      await softwareService.assign(
        { software_id: softwareId, license_id: licenseId, employee_id: firstEmployee! },
        actor,
      );
      await expect(
        softwareService.assign(
          { software_id: softwareId, license_id: licenseId, employee_id: secondEmployee! },
          actor,
        ),
      ).rejects.toMatchObject({ statusCode: 409 });

      const listed = await softwareService.list({ filters: { general_search: 'Seat test' } });
      const targetRow = listed.rows.find((r) => Number(r.id) === softwareId);
      expect(targetRow).toBeDefined();
      expect(targetRow?.seats_total).toBe(1);
      expect(targetRow?.seats_used).toBe(1);
      expect(targetRow?.seats_available).toBe(0);
    },
    30_000,
  );
});
