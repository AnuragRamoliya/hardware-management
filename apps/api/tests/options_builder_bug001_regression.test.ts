import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getOptions } from '../Models/options';
import { vendors } from '../Database/Schema';
import { STATUS } from '../Config/constant';

describe('Regression BUG-001: options_builder 3VL nullable field search', () => {
  const uniqueName = `BUG-001-Vendor-${Date.now()}`;
  let vendorId: number;

  beforeAll(async () => {
    // Create vendor with null contact_name and null email
    const vendor = await vendors.create({
      name: `${uniqueName}-Corporation`,
      contact_name: null,
      email: null,
      status: STATUS.ACTIVE,
      created_by: 1,
    });
    vendorId = Number(vendor.id);
  });

  afterAll(async () => {
    if (vendorId) {
      await vendors.destroy({ where: { id: vendorId } });
    }
  });

  it('[BUG-001] finds record in prefix phase when secondary search fields are NULL', async () => {
    const result = await getOptions('vendor', { search: uniqueName, limit: 10 });
    const match = result.rows.find((r) => Number(r.id) === vendorId);
    expect(match).toBeDefined();
    expect(match?.name).toBe(`${uniqueName}-Corporation`);
  });
});
