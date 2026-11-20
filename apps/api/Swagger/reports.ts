export const reportsSwaggerTag = 'Reports';

export const reportPaths = {
  '/reports/list': {
    post: {
      summary: 'List all available reports for the authenticated role',
      tags: ['Reports'],
      security: [{ Token: [] }],
      responses: {
        '200': { description: 'Array of report definitions available to the caller role' },
        '403': { description: 'Forbidden if role has no report access' },
      },
    },
  },
  '/reports/meta/{key}': {
    get: {
      summary: 'Get configuration and metadata for a specific report',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Report metadata and filter configuration' },
        '403': { description: 'Role lacks permission to view report' },
        '404': { description: 'Report key not found' },
      },
    },
    post: {
      summary: 'Get configuration and metadata for a specific report',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Report metadata and filter configuration' },
        '403': { description: 'Role lacks permission to view report' },
        '404': { description: 'Report key not found' },
      },
    },
  },
  '/reports/run/{key}': {
    post: {
      summary: 'Execute a report query with pagination and filters',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                filters: { type: 'object' },
                currentPage: { type: 'integer', default: 1 },
                itemsPerPage: { type: 'integer', default: 20 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Paginated report dataset with KPI summaries' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Report key not found' },
      },
    },
  },
  '/reports/export/{key}': {
    post: {
      summary: 'Export report data in CSV, XLSX, or PDF (sync stream or async job)',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                format: { type: 'string', enum: ['csv', 'xlsx', 'pdf'], default: 'csv' },
                async: { type: 'boolean', default: false },
                filters: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'File stream or queued job descriptor' },
        '400': { description: 'Invalid format or dataset exceeds max limit' },
        '403': { description: 'Forbidden' },
      },
    },
  },
  '/reports/jobs/list': {
    post: {
      summary: 'List user background export jobs',
      tags: ['Reports'],
      security: [{ Token: [] }],
      responses: {
        '200': { description: 'List of export jobs and their current processing status' },
      },
    },
  },
  '/reports/jobs/get/{id}': {
    get: {
      summary: 'Get export job details and progress',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Export job status, progress percentage, and SHA256' },
        '404': { description: 'Job not found' },
      },
    },
  },
  '/reports/jobs/download/{id}': {
    get: {
      summary: 'Download completed export file',
      tags: ['Reports'],
      security: [{ Token: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: {
        '200': { description: 'Binary file download stream' },
        '404': { description: 'Job not found' },
        '410': { description: 'Export file expired or removed' },
      },
    },
  },
};
