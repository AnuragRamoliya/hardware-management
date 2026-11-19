import { requestsSchema } from './requests';
import { requestCommentsSchema } from './request_comments';
import { requestStatusHistorySchema } from './request_status_history';
import { requestAttachmentsSchema } from './request_attachments';

export const phase4Schemas = {
  requests: requestsSchema,
  request_comments: requestCommentsSchema,
  request_status_history: requestStatusHistorySchema,
  request_attachments: requestAttachmentsSchema,
};
