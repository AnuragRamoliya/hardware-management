import type { UserInfo } from './api';

declare global {
  namespace Express {
    interface Request {
      userInfo?: UserInfo;
    }

    interface Response {
      handler: import('../Config/response_handler').ResponseHandler;
    }
  }
}

export {};
