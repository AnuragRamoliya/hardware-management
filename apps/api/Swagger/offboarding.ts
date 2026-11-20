export const offboardingPaths = {
  '/offboarding/preview': {
    post: {
      summary:
        'Dry-run preview of affected assets, software, credentials, and open requests for employee offboarding',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['employee_id'],
              properties: { employee_id: { type: 'integer' } },
            },
          },
        },
      },
      responses: { '200': { description: 'Preview counts and affected item details' } },
    },
  },
  '/offboarding/initiate': {
    post: {
      summary: 'Initiate employee offboarding and build handover tasks atomically',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'employee_id',
                'exit_type',
                'resignation_date',
                'last_working_date',
                'reason',
              ],
              properties: {
                employee_id: { type: 'integer' },
                exit_type: { type: 'integer', enum: [1, 2, 3, 4, 5] },
                resignation_date: { type: 'string', format: 'date' },
                last_working_date: { type: 'string', format: 'date' },
                reason: { type: 'string' },
                handover_to: { type: 'integer' },
                notes: { type: 'string' },
                checklist_template_ids: { type: 'array', items: { type: 'integer' } },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Offboarding case created successfully' } },
    },
  },
  '/offboarding/list': {
    post: {
      summary: 'List offboarding cases with queue filters and progress metrics',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Paginated offboarding case list' } },
    },
  },
  '/offboarding/get/{id}': {
    get: {
      summary: 'Get offboarding case details by ID',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Offboarding case details' } },
    },
  },
  '/offboarding/complete': {
    put: {
      summary: 'Issue final clearance certificate and mark employee exited',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Clearance certificate issued' } },
    },
  },
  '/offboarding/stats': {
    get: {
      summary: 'Get offboarding summary KPI statistics',
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'KPI dashboard statistics' } },
    },
  },
  '/portal/offboarding': {
    get: {
      summary: 'Get authenticated employee own offboarding status and checklist',
      tags: ['Portal Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Employee own offboarding case summary' } },
    },
  },
  '/offboarding/cases': {
    post: {
      summary: 'Legacy alias for listing offboarding cases (Deprecated: Use /offboarding/list)',
      deprecated: true,
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Paginated offboarding case list' } },
    },
  },
  '/offboarding/cases/{id}': {
    get: {
      summary: 'Legacy alias for case details (Deprecated: Use /offboarding/get/{id})',
      deprecated: true,
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Offboarding case details' } },
    },
  },
  '/offboarding/tasks': {
    post: {
      summary:
        'Legacy alias for listing offboarding tasks (Deprecated: Use /offboarding/task/list)',
      deprecated: true,
      tags: ['Offboarding'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Offboarding tasks list' } },
    },
  },
};
