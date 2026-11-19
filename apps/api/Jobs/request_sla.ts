import { Op } from 'sequelize';
import { REQUEST_STATUS, MODULES, ACTIVITY_ACTIONS } from '@hm/shared';
import {
  sequelize,
  requests,
  request_status_history,
  employees,
  notifications,
  app_settings,
} from '../Database/Schema';
import { createActivityLog } from '../Utils/helpers';

export async function runSlaCheck(): Promise<number> {
  const now = new Date();
  const breachedRequests = await requests.findAll({
    where: {
      status: 1,
      sla_breached: 0,
      sla_due_at: { [Op.lt]: now },
      request_status: { [Op.in]: [1, 2, 3, 4, 9] }, // Open statuses
    },
  });

  let count = 0;
  for (const req of breachedRequests) {
    const reqId = Number(req.get('id'));
    await req.update({ sla_breached: 1 });

    // Notify assignee or team
    const assigneeId = req.get('assigned_to');
    await notifications.create({
      recipient_user_id: assigneeId ? Number(assigneeId) : null,
      kind: 'request_sla_breach',
      record_type: 'request',
      record_id: reqId,
      title: `SLA Breached: Request #${req.get('request_no')}`,
      message: `Request "${req.get('title')}" has exceeded its SLA turnaround deadline.`,
      status: 1,
    });

    count++;
  }

  return count;
}

export async function runNeedInfoReminders(): Promise<number> {
  const reminderDaysSetting = await app_settings.findOne({
    where: { key: 'request_need_info_reminder_days', status: 1 },
  });
  const days = reminderDaysSetting ? Number(reminderDaysSetting.get('value')) || 3 : 3;
  const thresholdDate = new Date(Date.now() - days * 86400000);

  const pendingInfoRequests = await requests.findAll({
    where: {
      status: 1,
      request_status: REQUEST_STATUS.NEED_INFO,
      updatedAt: { [Op.lt]: thresholdDate },
    },
    include: [{ model: employees, as: 'employee' }],
  });

  let count = 0;
  for (const req of pendingInfoRequests) {
    const emp = req.get('employee') as unknown as { user_id?: number } | null;
    if (emp && emp.user_id) {
      await notifications.create({
        recipient_user_id: Number(emp.user_id),
        kind: 'request_need_info_reminder',
        record_type: 'request',
        record_id: Number(req.get('id')),
        title: `Reminder: Action Needed on Request #${req.get('request_no')}`,
        message: `Your request "${req.get('title')}" is awaiting your feedback or information.`,
        status: 1,
      });
      count++;
    }
  }

  return count;
}

export async function runAutoCloseFulfilled(): Promise<number> {
  const autoCloseSetting = await app_settings.findOne({
    where: { key: 'request_auto_close_days', status: 1 },
  });
  const days = autoCloseSetting ? Number(autoCloseSetting.get('value')) || 7 : 7;
  const thresholdDate = new Date(Date.now() - days * 86400000);

  const fulfilledRequests = await requests.findAll({
    where: {
      status: 1,
      request_status: REQUEST_STATUS.FULFILLED,
      fulfilled_at: { [Op.lt]: thresholdDate },
    },
  });

  let count = 0;
  for (const req of fulfilledRequests) {
    const reqId = Number(req.get('id'));
    await sequelize.transaction(async (t) => {
      await req.update(
        {
          request_status: REQUEST_STATUS.CLOSED,
          closed_at: new Date(),
        },
        { transaction: t },
      );

      await request_status_history.create(
        {
          request_id: reqId,
          from_status: REQUEST_STATUS.FULFILLED,
          to_status: REQUEST_STATUS.CLOSED,
          changed_by: 1, // System admin
          note: `Auto-closed after ${days} days fulfilled`,
          status: 1,
          created_by: 1,
        },
        { transaction: t },
      );

      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: reqId,
        action: ACTIVITY_ACTIONS.CLOSED,
        oldValue: { request_status: REQUEST_STATUS.FULFILLED },
        newValue: { request_status: REQUEST_STATUS.CLOSED },
        description: `Request automatically closed after ${days} days fulfilled`,
        createdBy: 1,
        createdByName: 'System Automation',
        transaction: t,
      });
    });

    count++;
  }

  return count;
}
