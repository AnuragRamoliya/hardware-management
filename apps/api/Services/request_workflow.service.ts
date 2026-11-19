import { Transaction } from 'sequelize';
import {
  REQUEST_STATUS,
  REQUEST_TRANSITIONS,
  REQUEST_STATUS_NAMES,
  type RequestStatus,
  ACTIVITY_ACTIONS,
  MODULES,
} from '@hm/shared';
import { AppError } from '../Config/app_error';
import {
  sequelize,
  requests,
  request_status_history,
  employees,
  notifications,
} from '../Database/Schema';
import { createActivityLog } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';

const plain = (val: import('sequelize').Model) =>
  val.get({ plain: true }) as Record<string, unknown>;

export interface TransitionOptions {
  requestId: number;
  toStatus: RequestStatus;
  actor: UserInfo;
  feedback?: string;
  cancelledReason?: string;
  awaitingStock?: boolean;
  assignedTo?: number | null;
  externalTransaction?: Transaction;
}

export class RequestWorkflowService {
  /**
   * Validate if a transition from fromStatus to toStatus is valid
   */
  isValidTransition(fromStatus: RequestStatus, toStatus: RequestStatus): boolean {
    const allowed = REQUEST_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }

  /**
   * Execute state machine transition inside an atomic transaction
   */
  async transition(opts: TransitionOptions): Promise<Record<string, unknown>> {
    const run = async (t: Transaction) => {
      const req = await requests.findByPk(opts.requestId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!req || Number(req.get('status')) !== 1) {
        throw new AppError(404, 'Request not found.');
      }

      const currentStatus = Number(req.get('request_status')) as RequestStatus;
      const targetStatus = Number(opts.toStatus) as RequestStatus;

      if (currentStatus === targetStatus) {
        return plain(req);
      }

      if (!this.isValidTransition(currentStatus, targetStatus)) {
        const fromName = REQUEST_STATUS_NAMES[currentStatus] || currentStatus;
        const toName = REQUEST_STATUS_NAMES[targetStatus] || targetStatus;
        throw new AppError(
          422,
          `Invalid request status transition from "${fromName}" to "${toName}".`,
        );
      }

      // Feedback requirement rules: reject and need_info require feedback of min 5 chars
      if (targetStatus === REQUEST_STATUS.REJECTED || targetStatus === REQUEST_STATUS.NEED_INFO) {
        if (!opts.feedback || opts.feedback.trim().length < 5) {
          throw new AppError(422, 'Feedback is required with minimum 5 characters.');
        }
      }

      const updateData: Record<string, unknown> = {
        request_status: targetStatus,
        updated_by: opts.actor.id,
      };

      if (opts.feedback) {
        updateData.decision_feedback = opts.feedback.trim();
      }

      if (opts.cancelledReason) {
        updateData.cancelled_reason = opts.cancelledReason.trim();
      }

      if (opts.awaitingStock !== undefined) {
        updateData.awaiting_stock = opts.awaitingStock ? 1 : 0;
      }

      if (opts.assignedTo !== undefined) {
        updateData.assigned_to = opts.assignedTo;
      }

      if (
        targetStatus === REQUEST_STATUS.UNDER_REVIEW ||
        targetStatus === REQUEST_STATUS.APPROVED ||
        targetStatus === REQUEST_STATUS.REJECTED ||
        targetStatus === REQUEST_STATUS.NEED_INFO
      ) {
        updateData.reviewed_by = opts.actor.id;
        updateData.reviewed_at = new Date();
      }

      if (targetStatus === REQUEST_STATUS.CLOSED) {
        updateData.closed_at = new Date();
      }

      await req.update(updateData, { transaction: t });

      // Record in request_status_history
      await request_status_history.create(
        {
          request_id: opts.requestId,
          from_status: currentStatus,
          to_status: targetStatus,
          changed_by: opts.actor.id,
          note: opts.feedback || opts.cancelledReason || null,
          status: 1,
          created_by: opts.actor.id,
        },
        { transaction: t },
      );

      // Audit log
      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: opts.requestId,
        action: ACTIVITY_ACTIONS.STATUS_CHANGED,
        oldValue: { request_status: currentStatus },
        newValue: { request_status: targetStatus, feedback: opts.feedback },
        description: `Request status transitioned from ${REQUEST_STATUS_NAMES[currentStatus]} to ${REQUEST_STATUS_NAMES[targetStatus]}`,
        createdBy: opts.actor.id,
        createdByName: `${opts.actor.first_name} ${opts.actor.last_name}`,
        transaction: t,
      });

      // Dispatch notification
      const emp = await employees.findByPk(Number(req.get('employee_id')), { transaction: t });
      if (emp && emp.get('user_id')) {
        const empUserId = Number(emp.get('user_id'));
        const title = `Request ${req.get('request_no')} Update`;
        const msg = `Your request status changed to ${REQUEST_STATUS_NAMES[targetStatus]}.`;
        await notifications.create(
          {
            recipient_user_id: empUserId,
            kind: 'request_status_change',
            record_type: 'request',
            record_id: opts.requestId,
            title,
            message: opts.feedback ? `${msg} Note: ${opts.feedback}` : msg,
            status: 1,
            created_by: opts.actor.id,
          },
          { transaction: t },
        );
      }

      return plain(req);
    };

    if (opts.externalTransaction) {
      return run(opts.externalTransaction);
    }
    return sequelize.transaction(run);
  }
}
