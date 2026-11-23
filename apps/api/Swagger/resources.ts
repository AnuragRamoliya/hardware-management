const response = {
  description: 'API response envelope.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { message: { type: 'string' }, data: {} },
      },
    },
  },
};

function protectedOperation(summary: string, method: string, body?: Record<string, unknown>) {
  return {
    [method]: {
      summary,
      tags: ['ITAM resources'],
      security: [{ Token: [] }],
      parameters: [
        { in: 'header', name: 'plain-text', schema: { type: 'boolean', default: false } },
      ],
      ...(body
        ? {
            requestBody: {
              required: method === 'post' && summary.endsWith('add'),
              content: { 'application/json': { schema: body } },
            },
          }
        : {}),
      responses: {
        '200': response,
        '201': response,
        '400': response,
        '401': response,
        '403': response,
        '404': response,
      },
    },
  };
}

const names = [
  'role',
  'module',
  'permission',
  'employee',
  'department',
  'designation',
  'location',
  'vendor',
  'asset_category',
];

const optionsBody = {
  type: 'object',
  properties: {
    search: { type: 'string', maxLength: 100, description: 'Trimmed server-side search.' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
    ids: {
      type: 'array',
      maxItems: 200,
      items: { oneOf: [{ type: 'integer', minimum: 1 }, { type: 'string', pattern: '^[1-9][0-9]*$' }] },
    },
    filters: {
      type: 'object',
      description: 'Only resource-specific whitelisted filters are applied.',
      additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
    },
  },
};

const optionsResponse = {
  description: 'Options page or ordered ID hydration result.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              rows: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    value: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                    label: { type: 'string' },
                    subLabel: { type: 'string' },
                    meta: { type: 'object', properties: { inactive: { type: 'boolean' } } },
                  },
                  required: ['value', 'label', 'meta'],
                },
              },
              count: { type: 'integer' },
              hasMore: { type: 'boolean' },
              page: { type: 'integer' },
            },
            required: ['rows', 'count', 'hasMore', 'page'],
          },
        },
      },
    },
  },
};

export const resourcePaths: Record<string, unknown> = {};
for (const name of names) {
  const root = `/${name}`;
  resourcePaths[`${root}/add`] = protectedOperation(`${name} add`, 'post', {
    type: 'object',
    additionalProperties: true,
  });
  resourcePaths[`${root}/update`] = protectedOperation(`${name} update`, 'put', {
    type: 'object',
    required: ['id'],
    additionalProperties: true,
  });
  resourcePaths[`${root}/list`] = protectedOperation(`${name} list`, 'post', {
    type: 'object',
    properties: {
      currentPage: { type: 'integer', default: 1 },
      itemsPerPage: { type: 'integer', maximum: 100, default: 10 },
      filters: { type: 'object' },
      sortBy: { type: 'array', items: { type: 'object' } },
      general_search: { type: 'string' },
    },
  });
  resourcePaths[`${root}/options`] = {
    ...protectedOperation(`${name} options with search, paging, filters, and ID hydration`, 'post', optionsBody),
    post: {
      ...((protectedOperation(`${name} options with search, paging, filters, and ID hydration`, 'post', optionsBody) as Record<string, unknown>).post as Record<string, unknown>),
      responses: {
        '200': optionsResponse,
        '400': response,
        '401': response,
        '403': response,
        '422': response,
      },
    },
  };
  resourcePaths[`${root}/get/{id}`] = protectedOperation(`${name} get`, 'get');
  resourcePaths[`${root}/get/{id}`] = {
    ...(resourcePaths[`${root}/get/{id}`] as object),
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
  };
  resourcePaths[`${root}/delete/{id}`] = {
    ...protectedOperation(`${name} soft delete`, 'delete'),
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
  };
  resourcePaths[`${root}/activity`] = protectedOperation(`${name} activity history`, 'post', {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
      currentPage: { type: 'integer' },
      itemsPerPage: { type: 'integer' },
    },
  });
}

resourcePaths['/employee/bulk/import'] = protectedOperation(
  'Employee bulk import (CSV/XLSX)',
  'post',
  {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
);
resourcePaths['/employee/bulk/import'] = {
  ...(resourcePaths['/employee/bulk/import'] as object),
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
      },
    },
  },
};
resourcePaths['/module/permission'] = {
  get: {
    summary: 'Get the authenticated user role permissions',
    tags: ['Module'],
    security: [{ Token: [] }],
    responses: { '200': response, '401': response, '403': response },
  },
};
resourcePaths['/role/{id}/permissions'] = {
  get: {
    summary: 'Get a role permission matrix',
    tags: ['Role'],
    security: [{ Token: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    responses: { '200': response },
  },
  put: {
    summary: 'Set a role permission matrix',
    tags: ['Role'],
    security: [{ Token: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['permissions'],
            properties: {
              permissions: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['module_id'],
                  properties: {
                    module_id: { type: 'integer' },
                    read_access: { type: 'boolean' },
                    write_access: { type: 'boolean' },
                    delete_access: { type: 'boolean' },
                    options_access: {
                      type: 'boolean',
                      description: 'Allows loading options without full read access.',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: { '200': response, '400': response, '403': response },
  },
};
resourcePaths['/audit/list'] = protectedOperation('List audit activity with filters', 'post', {
  type: 'object',
  properties: {
    currentPage: { type: 'integer' },
    itemsPerPage: { type: 'integer', maximum: 100 },
    filters: {
      type: 'object',
      properties: {
        module: { type: 'string' },
        user_id: { type: 'integer' },
        action: { type: 'string' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
      },
    },
  },
});
resourcePaths['/audit/export'] = protectedOperation('Export audit history as CSV', 'get');
