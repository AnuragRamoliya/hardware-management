import { describe, expect, it } from 'vitest';
import { getSorting } from '../Utils/helpers';

describe('Table Sorting Helper (getSorting)', () => {
  it('returns default order when sortBy is missing or empty', () => {
    expect(getSorting({}, ['name'])).toEqual([['id', 'DESC']]);
    expect(getSorting({ sortBy: [] }, ['name'])).toEqual([['id', 'DESC']]);
  });

  it('correctly maps allowed column with asc and desc', () => {
    expect(getSorting({ sortBy: [{ id: 'name', value: 'asc' }] }, ['name', 'status'])).toEqual([
      ['name', 'ASC'],
    ]);

    expect(getSorting({ sortBy: [{ id: 'status', value: 'desc' }] }, ['name', 'status'])).toEqual([
      ['status', 'DESC'],
    ]);
  });

  it('maps column aliases using dictionary', () => {
    const aliases = {
      employee: 'employee_id',
      category: 'category_id',
      request_no: 'request_no',
    };

    expect(getSorting({ sortBy: [{ id: 'employee', value: 'asc' }] }, aliases)).toEqual([
      ['employee_id', 'ASC'],
    ]);

    expect(getSorting({ sortBy: [{ id: 'category', value: 'desc' }] }, aliases)).toEqual([
      ['category_id', 'DESC'],
    ]);
  });

  it('filters out disallowed / arbitrary column names and falls back to default', () => {
    expect(
      getSorting({ sortBy: [{ id: 'non_existent_column; DROP TABLE users;', value: 'asc' }] }, [
        'name',
        'status',
      ]),
    ).toEqual([['id', 'DESC']]);
  });

  it('always permits common timestamp and id fields', () => {
    expect(getSorting({ sortBy: [{ id: 'createdAt', value: 'asc' }] }, ['name'])).toEqual([
      ['createdAt', 'ASC'],
    ]);

    expect(getSorting({ sortBy: [{ id: 'id', value: 'asc' }] }, ['name'])).toEqual([['id', 'ASC']]);
  });

  it('passes expected order tuple to findAndCountAll in ResourceModel', async () => {
    const { ResourceModel } = await import('../Models/resource');
    let capturedOrder: unknown = null;

    const mockModel = {
      rawAttributes: {
        id: {},
        name: {},
        description: {},
        status: {},
        createdAt: {},
        updatedAt: {},
      },
      findAndCountAll: async (opts: { order?: unknown }) => {
        capturedOrder = opts.order;
        return { rows: [], count: 0 };
      },
    };

    const resource = new ResourceModel(
      mockModel as unknown as import('../Database/Schema').EntityModel,
      {
        table: 'test_resource',
        module: 'test_module',
        writableFields: ['name', 'description'],
        searchFields: ['name'],
      },
    );

    await resource.list({
      currentPage: 1,
      itemsPerPage: 10,
      sortBy: [{ id: 'name', value: 'asc' }],
    });
    expect(capturedOrder).toEqual([['name', 'ASC']]);

    await resource.list({
      currentPage: 1,
      itemsPerPage: 10,
      sortBy: [{ id: 'status', value: 'desc' }],
    });
    expect(capturedOrder).toEqual([['status', 'DESC']]);
  });
});
