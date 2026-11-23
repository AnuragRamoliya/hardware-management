const envelope = {
  description:
    'Success or error response. Unless plain-text: true is sent, the response body is encrypted.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { message: { type: 'string' }, data: {} },
      },
    },
  },
};

const optionsSuccess = {
  description: 'Paged user options or ID hydration result.',
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

const operation = (
  summary: string,
  method: 'get' | 'post' | 'put' | 'delete',
  protectedRoute = true,
  requestBody?: Record<string, unknown>,
  successResponse?: Record<string, unknown>,
) => ({
  [method]: {
    summary,
    tags: ['User'],
    ...(protectedRoute ? { security: [{ Token: [] }] } : {}),
    parameters: [{ in: 'header', name: 'plain-text', schema: { type: 'boolean', default: false } }],
    ...(requestBody
      ? {
          requestBody: { required: true, content: { 'application/json': { schema: requestBody } } },
        }
      : {}),
    responses: {
      '200': successResponse ?? envelope,
      '400': envelope,
      '401': envelope,
      '403': envelope,
      '500': envelope,
    },
  },
});

export const userPaths = {
  '/user/login': operation('Log in and create access and refresh tokens', 'post', false, {
    type: 'object',
    required: ['email', 'password'],
    example: { email: 'admin@example.com', password: 'use-a-secret-password' },
  }),
  '/user/refresh/token': operation('Rotate access and refresh tokens', 'post', false, {
    type: 'object',
    required: ['refresh_token'],
    example: { refresh_token: '<refresh-token>' },
  }),
  '/user/forgot/password': operation('Request a password reset OTP', 'post', false, {
    type: 'object',
    required: ['email'],
    example: { email: 'admin@example.com' },
  }),
  '/user/forgot/otp/verify': operation('Verify password reset OTP', 'post', false, {
    type: 'object',
    required: ['otp', 'otp_reference'],
    example: { otp: '000000', otp_reference: '<otp-reference>' },
  }),
  '/user/reset/password': operation('Set a new password with a reset token', 'put', false, {
    type: 'object',
    required: ['reset_token', 'new_password', 'confirm_password'],
    example: {
      reset_token: '<reset-token>',
      new_password: 'a-new-secret-password',
      confirm_password: 'a-new-secret-password',
    },
  }),
  '/user/profile': operation('Get the authenticated profile', 'get'),
  '/user/profile/update': operation('Update the authenticated profile', 'put', true, {
    type: 'object',
    properties: {
      first_name: { type: 'string' },
      last_name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
  }),
  '/user/change/password': operation('Change the authenticated user password', 'put'),
  '/user/logout': operation('Revoke the current access token', 'delete'),
  '/user/add': operation('Create a user', 'post', true, {
    type: 'object',
    required: ['role_id', 'first_name', 'last_name', 'email', 'password'],
    example: {
      role_id: 2,
      first_name: 'Alex',
      last_name: 'Employee',
      email: 'alex@example.com',
      password: '<password-from-client>',
    },
  }),
  '/user/update': operation('Update a user', 'put', true, { type: 'object', required: ['id'] }),
  '/user/get/{id}': {
    ...operation('Get a user by ID', 'get'),
    get: {
      ...operation('Get a user by ID', 'get').get,
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
    },
  },
  '/user/list': operation('List users', 'post', true, {
    type: 'object',
    properties: {
      currentPage: { type: 'integer', default: 1 },
      itemsPerPage: { type: 'integer', maximum: 100, default: 10 },
      filters: { type: 'object' },
      sortBy: { type: 'array', items: { type: 'object' } },
      general_search: { type: 'string' },
    },
  }),
  '/user/delete/{id}': {
    delete: {
      summary: 'Soft delete a user',
      tags: ['User'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { '200': envelope, '401': envelope, '403': envelope, '404': envelope },
    },
  },
  '/user/options': operation('Search, page, or hydrate user options', 'post', true, {
    type: 'object',
    properties: {
      search: { type: 'string', maxLength: 100 },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
      ids: {
        type: 'array',
        maxItems: 200,
        items: { oneOf: [{ type: 'integer', minimum: 1 }, { type: 'string', pattern: '^[1-9][0-9]*$' }] },
      },
      filters: { type: 'object', description: 'Allowed filter: role_id.' },
    },
  }, optionsSuccess),
  '/user/activity': operation('Get user activity history', 'post', true, {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer' },
      currentPage: { type: 'integer' },
      itemsPerPage: { type: 'integer' },
    },
  }),
};
