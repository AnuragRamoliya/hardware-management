import { Op } from 'sequelize';
import { describe, expect, it, vi } from 'vitest';
import { ResourceModel } from '../Models/resource';
import type { EntityModel } from '../Database/Schema';

function createResource() {
  const model = {
    findAndCountAll: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
  } as unknown as EntityModel;
  const resource = new ResourceModel(model, {
    table: 'employee',
    module: 'employee',
    writableFields: ['name', 'department_id', 'join_date', 'is_active'],
    searchFields: ['name'],
    filterableFields: {
      name: 'text',
      department_id: 'number',
      join_date: 'date',
      is_active: 'boolean',
    },
  });
  return { model, resource };
}

describe('resource list filters', () => {
  it('supports scalar, IN, range, and boolean filters using only allowed columns', async () => {
    const { model, resource } = createResource();
    await resource.list({
      filters: {
        name: 'Ada',
        department_id: ['2', 3],
        join_date: { from: '2025-01-01', to: '2025-12-31' },
        is_active: false,
        unsafe_column: 'ignored',
      },
    });

    const query = model.findAndCountAll.mock.calls[0]?.[0];
    const where = query?.where as Record<string | symbol, unknown>;
    expect(where.name).toEqual({ [Op.like]: '%Ada%' });
    expect(where.department_id).toEqual({ [Op.in]: [2, 3] });
    const dateRange = where.join_date as Record<symbol, unknown>;
    expect(dateRange[Op.gte]).toEqual(new Date('2025-01-01'));
    expect(dateRange[Op.lte]).toEqual(new Date('2025-12-31T23:59:59.999'));
    expect(where.is_active).toBe(false);
    expect(where.unsafe_column).toBeUndefined();
  });

  it('rejects malformed filter types and range keys', async () => {
    const { model, resource } = createResource();
    await expect(
      resource.list({ filters: { department_id: 'not-a-number' } }),
    ).rejects.toMatchObject({
      statusCode: 422,
    });
    await expect(resource.list({ filters: { name: { from: 'A' } } })).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(model.findAndCountAll).not.toHaveBeenCalled();
  });
});
