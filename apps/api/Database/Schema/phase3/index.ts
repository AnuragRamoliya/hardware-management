import { credentialTypesSchema } from './credential_types';
import { credentialsSchema } from './credentials';
import { credentialHistorySchema } from './credential_history';
import { credentialCollectionRequestsSchema } from './credential_collection_requests';
import { credentialAccessLogsSchema } from './credential_access_logs';
import { loginHistorySchema } from './login_history';

export const phase3Schemas = {
  credential_types: credentialTypesSchema,
  credentials: credentialsSchema,
  credential_history: credentialHistorySchema,
  credential_collection_requests: credentialCollectionRequestsSchema,
  credential_access_logs: credentialAccessLogsSchema,
  login_history: loginHistorySchema,
};
