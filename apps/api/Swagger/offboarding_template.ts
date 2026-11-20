export const offboarding_templateSwaggerTag = 'offboarding_template';

export const offboardingTemplatePaths = {
  '/offboarding-templates/list': {
    post: {
      summary: 'List offboarding checklist templates',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Paginated templates list' } },
    },
  },
  '/offboarding-templates/get/{id}': {
    get: {
      summary: 'Get checklist template by ID',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Checklist template details' } },
    },
  },
  '/offboarding-templates/add': {
    post: {
      summary: 'Create a new offboarding checklist template',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      responses: { '201': { description: 'Template created successfully' } },
    },
  },
  '/offboarding-templates/update': {
    put: {
      summary: 'Update an existing offboarding checklist template',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Template updated successfully' } },
    },
  },
  '/offboarding-templates/delete/{id}': {
    delete: {
      summary: 'Soft-delete a checklist template',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { '200': { description: 'Template soft-deleted' } },
    },
  },
  '/offboarding-templates/options': {
    post: {
      summary: 'Get dropdown options for checklist templates',
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Dropdown options array' } },
    },
    get: {
      summary: 'Legacy GET options endpoint (Deprecated in favor of POST)',
      deprecated: true,
      tags: ['Offboarding Templates'],
      security: [{ Token: [] }],
      responses: { '200': { description: 'Dropdown options array' } },
    },
  },
};
