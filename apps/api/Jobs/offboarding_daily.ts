import { Op } from 'sequelize';
import {
  STATUS,
  USER_STATUS,
  TOKEN_REVOCATION,
  EMPLOYMENT_STATUS,
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
} from '@hm/shared';
import {
  offboarding_cases,
  offboarding_tasks,
  employees,
  users,
  user_tokens,
  software_assignments,
  credentials,
  notifications,
  app_settings,
} from '../Database/Schema';
import { createActivityLog } from '../Utils/helpers';
import { ClearancePdfService, type PdfCaseRecord } from '../Services/clearance_pdf.service';
import { RealtimeGateway } from '../Realtime/gateway';

interface AssociatedEmployee {
  id: number;
  first_name: string;
  last_name?: string;
  user_id?: number;
  employment_status?: number;
}

interface AssociatedHandoverUser {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
}

interface AssociatedTask {
  id: number;
  task_type: string | number;
  task_status: string | number;
  is_mandatory: boolean | number;
}

interface CaseWithAssociations {
  employee?: AssociatedEmployee;
  handover_user?: AssociatedHandoverUser;
  tasks?: AssociatedTask[];
}

async function getTodayStr(now: Date = new Date()): Promise<string> {
  const tzSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['app.timezone', 'system.timezone', 'app_timezone'] },
      status: STATUS.ACTIVE,
    },
  });
  const tz = (tzSetting?.get('value') as string) || process.env.APP_TIMEZONE || 'Asia/Kolkata';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
}

/**
 * 1. Reminders on reminder_days before LWD to employee, manager and hardware owner
 */
export async function runOffboardingReminders(now: Date = new Date()): Promise<number> {
  const reminderDaysSetting = await app_settings.findOne({
    where: { key: 'offboarding_reminder_days', status: STATUS.ACTIVE },
  });

  let reminderDays = [7, 3, 1];
  if (reminderDaysSetting && reminderDaysSetting.get('value')) {
    try {
      const parsed = JSON.parse(String(reminderDaysSetting.get('value')));
      if (Array.isArray(parsed)) reminderDays = parsed.map(Number);
    } catch {
      // use default
    }
  }

  const activeCases = await offboarding_cases.findAll({
    where: {
      case_status: { [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS] },
      status: STATUS.ACTIVE,
    },
    include: [
      { model: employees, as: 'employee' },
      { model: users, as: 'handover_user' },
    ],
  });

  let reminderCount = 0;
  for (const c of activeCases) {
    const rawLwd = c.get('last_working_date');
    if (!rawLwd) continue;

    const lwd = new Date(String(rawLwd));
    const diffTime = lwd.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (reminderDays.includes(daysLeft)) {
      const caseId = Number(c.get('id'));
      const associated = c.get({ plain: true }) as CaseWithAssociations;
      const emp = associated.employee;
      const handoverUser = associated.handover_user;

      // Pending task counts
      const pendingCount = await offboarding_tasks.count({
        where: {
          case_id: caseId,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: STATUS.ACTIVE,
        },
      });

      if (pendingCount === 0) continue;

      const title = `Offboarding Reminder: ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`;
      const message = `There are ${pendingCount} pending handover tasks for case #${c.get('case_no')} with Last Working Day on ${rawLwd}.`;

      // Check deduplication for today
      const alreadySent = await notifications.findOne({
        where: {
          record_type: 'offboarding_case',
          record_id: caseId,
          kind: 'offboarding_lwd_reminder',
          createdAt: { [Op.gte]: new Date(now.toISOString().slice(0, 10)) },
          status: STATUS.ACTIVE,
        },
      });

      if (!alreadySent) {
        // Notify employee
        if (emp?.user_id) {
          await notifications.create({
            recipient_user_id: Number(emp.user_id),
            kind: 'offboarding_lwd_reminder',
            record_type: 'offboarding_case',
            record_id: caseId,
            title,
            message,
            status: STATUS.ACTIVE,
          });
          reminderCount++;
        }

        // Notify handover owner
        if (handoverUser?.id) {
          await notifications.create({
            recipient_user_id: Number(handoverUser.id),
            kind: 'offboarding_lwd_reminder',
            record_type: 'offboarding_case',
            record_id: caseId,
            title,
            message,
            status: STATUS.ACTIVE,
          });
          reminderCount++;
        }

        await createActivityLog({
          module: 'offboarding',
          moduleId: caseId,
          action: 'reminder_sent',
          description: `Dispatched ${daysLeft}-day offboarding reminder. Pending tasks: ${pendingCount}.`,
          createdBy: 1,
          createdByName: 'System Scheduler',
        });
      }
    }
  }

  return reminderCount;
}

/**
 * 2. On LWD: lock user login, revoke active tokens, optionally revoke software and disable credentials
 */
export async function runLwdProcessing(now: Date = new Date()) {
  const todayStr = await getTodayStr(now);

  // Fetch settings
  const revokeSwSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.auto_revoke_software', 'offboarding_auto_revoke_software'] },
      status: STATUS.ACTIVE,
    },
  });
  const disableCredSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.auto_disable_credentials', 'offboarding_disable_credentials'] },
      status: STATUS.ACTIVE,
    },
  });
  const disableLoginSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.disable_login_on_lwd', 'offboarding_disable_login_on_lwd'] },
      status: STATUS.ACTIVE,
    },
  });

  const autoRevokeSw = revokeSwSetting
    ? revokeSwSetting.get('value') === 'true' || revokeSwSetting.get('value') === '1'
    : false;
  const autoDisableCred = disableCredSetting
    ? disableCredSetting.get('value') === 'true' || disableCredSetting.get('value') === '1'
    : false;
  const autoDisableLogin = disableLoginSetting
    ? disableLoginSetting.get('value') === 'true' || disableLoginSetting.get('value') === '1'
    : true;

  // Find cases where LWD <= today and employee is in NOTICE (2)
  const dueCases = await offboarding_cases.findAll({
    where: {
      last_working_date: { [Op.lte]: todayStr },
      case_status: { [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS] },
      status: STATUS.ACTIVE,
    },
    include: [{ model: employees, as: 'employee' }],
  });

  let employeesResigned = 0;
  let softwareRevoked = 0;
  let credentialsDisabled = 0;
  let loginsDisabled = 0;

  for (const c of dueCases) {
    const caseId = Number(c.get('id'));
    const associated = c.get({ plain: true }) as CaseWithAssociations;
    const emp = associated.employee;
    if (!emp) continue;

    const empId = Number(emp.id);

    // 1. Move employee status to RESIGNED (3) if currently in NOTICE (2)
    if (Number(emp.employment_status) === EMPLOYMENT_STATUS.NOTICE) {
      await employees.update(
        { employment_status: EMPLOYMENT_STATUS.RESIGNED },
        { where: { id: empId } },
      );
      employeesResigned++;
    }

    // 2. Disable user login & revoke tokens
    if (autoDisableLogin && emp.user_id) {
      const uId = Number(emp.user_id);
      await users.update({ status: USER_STATUS.INACTIVE }, { where: { id: uId } });
      await user_tokens.update(
        { is_revoked: TOKEN_REVOCATION.REVOKED },
        { where: { user_id: uId } },
      );
      RealtimeGateway.getInstance().disconnectUser(uId, 'Employee reached last working date');
      loginsDisabled++;
    }

    // 3. Auto-revoke software licenses if enabled
    if (autoRevokeSw) {
      const swTasks = await offboarding_tasks.findAll({
        where: {
          case_id: caseId,
          task_type: OFFBOARDING_TASK_TYPE.SOFTWARE,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: STATUS.ACTIVE,
        },
      });

      for (const t of swTasks) {
        const assignmentId = t.get('ref_id');
        if (assignmentId) {
          await software_assignments.update(
            { revoked_at: now, note: 'Auto-revoked on LWD' },
            { where: { id: Number(assignmentId), revoked_at: null } },
          );
        }

        await t.update({
          task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          completed_at: now,
          outcome_notes: 'Automatically revoked on Last Working Day',
        });
        softwareRevoked++;
      }
    }

    // 4. Auto-disable credentials if enabled
    if (autoDisableCred) {
      const credTasks = await offboarding_tasks.findAll({
        where: {
          case_id: caseId,
          task_type: OFFBOARDING_TASK_TYPE.CREDENTIAL,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: STATUS.ACTIVE,
        },
      });

      for (const t of credTasks) {
        const credId = t.get('ref_id');
        if (credId) {
          await credentials.update({ status: STATUS.INACTIVE }, { where: { id: Number(credId) } });
        }

        await t.update({
          task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          completed_at: now,
          outcome_notes: 'Automatically disabled on Last Working Day',
        });
        credentialsDisabled++;
      }
    }

    await createActivityLog({
      module: 'offboarding',
      moduleId: caseId,
      action: 'lwd_lock_applied',
      description: `LWD processed for case #${c.get('case_no')}. Employee marked resigned; user account deactivated.`,
      createdBy: 1,
      createdByName: 'System Scheduler',
    });
  }

  return {
    employeesResigned,
    softwareRevoked,
    credentialsDisabled,
    loginsDisabled,
  };
}

/**
 * 3. Daily check for overdue hardware tasks past LWD -> flagged as EXCEPTION
 */
export async function runOverdueCheck(now: Date = new Date()): Promise<number> {
  const todayStr = await getTodayStr(now);

  const overdueTasks = await offboarding_tasks.findAll({
    where: {
      task_type: OFFBOARDING_TASK_TYPE.ASSET,
      task_status: {
        [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
      },
      [Op.or]: [
        { due_date: { [Op.lt]: todayStr } },
        { '$case.last_working_date$': { [Op.lt]: todayStr } },
      ],
      status: STATUS.ACTIVE,
    },
    include: [
      {
        model: offboarding_cases,
        as: 'case',
        include: [{ model: employees, as: 'employee' }],
      },
    ],
  });

  for (const t of overdueTasks) {
    // Flag unreturned hardware tasks past LWD as exception
    await t.update({
      task_status: OFFBOARDING_TASK_STATUS.EXCEPTION,
      outcome_notes: 'Unreturned hardware asset flagged as exception past LWD',
    });

    const associatedCase = t.get('case') as {
      get?: (key: string) => unknown;
      employee?: AssociatedEmployee;
    } | null;
    const emp = associatedCase?.employee;

    // Check deduplication for today
    const alreadyEscalated = await notifications.findOne({
      where: {
        record_type: 'offboarding_task',
        record_id: Number(t.get('id')),
        kind: 'overdue_hardware_escalation',
        createdAt: { [Op.gte]: new Date(todayStr) },
      },
    });

    if (!alreadyEscalated) {
      await notifications.create({
        recipient_user_id: null, // Broadcast to admin/HR
        kind: 'overdue_hardware_escalation',
        record_type: 'offboarding_task',
        record_id: Number(t.get('id')),
        title: `OVERDUE Return Escalation: ${t.get('title')}`,
        message: `Hardware asset for ${emp?.first_name || ''} ${emp?.last_name || ''} has not been returned past LWD (${t.get('due_date')}). Immediate action required.`,
        status: STATUS.ACTIVE,
      });
    }
  }

  return overdueTasks.length;
}

/**
 * 4. When all mandatory tasks are done and LWD has passed: case -> pending_clearance + notify HR
 */
export async function runPendingClearanceCheck(now: Date = new Date()): Promise<number> {
  const todayStr = await getTodayStr(now);

  const autoIssueSetting = await app_settings.findOne({
    where: { key: 'offboarding_auto_issue_clearance', status: STATUS.ACTIVE },
  });
  const autoIssue = autoIssueSetting ? autoIssueSetting.get('value') === 'true' : false;

  const candidateCases = await offboarding_cases.findAll({
    where: {
      last_working_date: { [Op.lte]: todayStr },
      case_status: { [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS] },
      status: STATUS.ACTIVE,
    },
    include: [
      { model: offboarding_tasks, as: 'tasks' },
      { model: employees, as: 'employee' },
    ],
  });

  let clearedCount = 0;

  for (const c of candidateCases) {
    const associated = c.get({ plain: true }) as CaseWithAssociations;
    const tasks = associated.tasks || [];
    const mandatoryTasks = tasks.filter((t) => Number(t.is_mandatory) === 1);
    const allDone = mandatoryTasks.every((t) => {
      const s = String(t.task_status);
      return s === OFFBOARDING_TASK_STATUS.COMPLETED || s === OFFBOARDING_TASK_STATUS.WAIVED;
    });

    if (allDone) {
      const caseId = Number(c.get('id'));

      if (autoIssue) {
        // Auto-complete if enabled
        const pdfService = new ClearancePdfService();
        const settingsList = await app_settings.findAll();
        const settingsMap: Record<string, string> = {};
        for (const s of settingsList) {
          settingsMap[String(s.get('key'))] = String(s.get('value') ?? '');
        }

        const clearanceNumber = `CLR-${c.get('case_no')}`;
        const clearanceRes = await pdfService.generateClearancePdf(
          {
            ...c.get({ plain: true }),
            clearance_number: clearanceNumber,
            clearance_issued_at: now,
          } as unknown as PdfCaseRecord,
          settingsMap,
        );

        await c.update({
          case_status: OFFBOARDING_CASE_STATUS.COMPLETED,
          completed_at: now,
          clearance_number: clearanceNumber,
          clearance_issued_at: now,
          clearance_file_path: clearanceRes.filePath,
        });

        const emp = associated.employee;
        if (emp?.id) {
          await employees.update(
            { employment_status: EMPLOYMENT_STATUS.EXITED },
            { where: { id: Number(emp.id) } },
          );
        }
      } else {
        await c.update({ case_status: OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE });

        await notifications.create({
          recipient_user_id: null,
          kind: 'offboarding_pending_clearance',
          record_type: 'offboarding_case',
          record_id: caseId,
          title: `Ready for Clearance: Case #${c.get('case_no')}`,
          message: `All mandatory handovers for case #${c.get('case_no')} are completed. Ready to issue official clearance.`,
          status: STATUS.ACTIVE,
        });
      }

      clearedCount++;
    }
  }

  return clearedCount;
}

export async function runOffboardingDaily(now: Date = new Date()) {
  const reminders = await runOffboardingReminders(now);
  const lwd = await runLwdProcessing(now);
  const overdue = await runOverdueCheck(now);
  const pending = await runPendingClearanceCheck(now);
  return { reminders, lwd, overdue, pending };
}
