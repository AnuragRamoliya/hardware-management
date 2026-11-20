import { Op } from 'sequelize';
import {
  EMPLOYMENT_STATUS,
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
} from '@hm/shared';
import {
  sequelize,
  offboarding_cases,
  offboarding_tasks,
  employees,
  users,
  user_tokens,
  software_assignments,
  software_licenses,
  software,
  credentials,
  notifications,
  app_settings,
} from '../Database/Schema';
import { createActivityLog } from '../Utils/helpers';
import { ClearancePdfService } from '../Services/clearance_pdf.service';
import { RealtimeGateway } from '../Realtime/gateway';

async function getTodayStr(now: Date = new Date()): Promise<string> {
  const tzSetting = await app_settings.findOne({
    where: { key: { [Op.in]: ['app.timezone', 'system.timezone', 'app_timezone'] }, status: 1 },
  });
  const tz = (tzSetting?.get('value') as string) || process.env.APP_TIMEZONE || 'Asia/Kolkata';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
}

/**
 * 1. Reminders on reminder_days before LWD to employee, manager and hardware owner
 */
export async function runOffboardingReminders(now: Date = new Date()): Promise<number> {
  const reminderDaysSetting = await app_settings.findOne({
    where: { key: 'offboarding_reminder_days', status: 1 },
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

  const openCases = await offboarding_cases.findAll({
    where: {
      case_status: {
        [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS],
      },
      status: 1,
    },
    include: [
      { model: employees, as: 'employee' },
      { model: users, as: 'handover_user' },
    ],
  });

  let remindersSent = 0;
  const todayStr = await getTodayStr(now);

  for (const c of openCases) {
    const lwd = new Date(String(c.get('last_working_date')));
    const diffTime = lwd.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (reminderDays.includes(daysLeft)) {
      const caseId = Number(c.get('id'));
      const emp = (c as any).employee;
      const handoverUser = (c as any).handover_user;

      // Pending task counts
      const pendingCount = await offboarding_tasks.count({
        where: {
          case_id: caseId,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: 1,
        },
      });

      // Deduplicate guard for today
      const alreadySent = await notifications.findOne({
        where: {
          record_type: 'offboarding_case',
          record_id: caseId,
          kind: `offboarding_reminder_${daysLeft}d`,
          createdAt: { [Op.gte]: new Date(todayStr) },
        },
      });

      if (!alreadySent) {
        // Notify employee
        if (emp?.user_id) {
          await notifications.create({
            recipient_user_id: Number(emp.user_id),
            kind: `offboarding_reminder_${daysLeft}d`,
            record_type: 'offboarding_case',
            record_id: caseId,
            title: `Offboarding Reminder: ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`,
            message: `You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} until your Last Working Day (${c.get('last_working_date')}). You have ${pendingCount} pending return task(s).`,
            status: 1,
          });
        }

        // Notify hardware owner
        if (handoverUser?.id) {
          await notifications.create({
            recipient_user_id: Number(handoverUser.id),
            kind: `offboarding_reminder_${daysLeft}d`,
            record_type: 'offboarding_case',
            record_id: caseId,
            title: `Handover Reminder: ${emp?.first_name} ${emp?.last_name || ''} (${daysLeft}d to LWD)`,
            message: `${daysLeft} day(s) until LWD for ${emp?.first_name}. ${pendingCount} handover task(s) remaining.`,
            status: 1,
          });
        }

        remindersSent++;
      }
    }
  }

  return remindersSent;
}

/**
 * 2. On LWD: employee -> resigned; disable login; auto-revoke software; disable credentials; notify
 */
export async function runLwdProcessing(now: Date = new Date()): Promise<{
  employeesResigned: number;
  softwareRevoked: number;
  credentialsDisabled: number;
  loginsDisabled: number;
}> {
  const todayStr = await getTodayStr(now);

  // Fetch settings
  const revokeSwSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.auto_revoke_software', 'offboarding_auto_revoke_software'] },
      status: 1,
    },
  });
  const disableCredSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.auto_disable_credentials', 'offboarding_disable_credentials'] },
      status: 1,
    },
  });
  const disableLoginSetting = await app_settings.findOne({
    where: {
      key: { [Op.in]: ['offboarding.disable_login_on_lwd', 'offboarding_disable_login_on_lwd'] },
      status: 1,
    },
  });

  const autoRevokeSw = revokeSwSetting ? revokeSwSetting.get('value') === 'true' : true;
  const autoDisableCred = disableCredSetting ? disableCredSetting.get('value') === 'true' : true;
  const autoDisableLogin = disableLoginSetting ? disableLoginSetting.get('value') === 'true' : true;

  // Find cases where LWD <= today and employee is in NOTICE (2)
  const dueCases = await offboarding_cases.findAll({
    where: {
      last_working_date: { [Op.lte]: todayStr },
      case_status: { [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS] },
      status: 1,
    },
    include: [{ model: employees, as: 'employee' }],
  });

  let employeesResigned = 0;
  let softwareRevoked = 0;
  let credentialsDisabled = 0;
  let loginsDisabled = 0;

  for (const c of dueCases) {
    const caseId = Number(c.get('id'));
    const emp = (c as any).employee;
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
      await users.update({ status: 0 }, { where: { id: uId } });
      await user_tokens.update({ is_revoked: 1 }, { where: { user_id: uId } });
      RealtimeGateway.getInstance().disconnectUser(uId, 'Employee reached last working date');
      loginsDisabled++;
    }

    // 3. Auto-revoke software licenses
    if (autoRevokeSw) {
      const swTasks = await offboarding_tasks.findAll({
        where: {
          case_id: caseId,
          task_type: OFFBOARDING_TASK_TYPE.SOFTWARE,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: 1,
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

    // 4. Auto-disable credentials
    if (autoDisableCred) {
      const credTasks = await offboarding_tasks.findAll({
        where: {
          case_id: caseId,
          task_type: OFFBOARDING_TASK_TYPE.CREDENTIAL,
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: 1,
        },
      });

      for (const t of credTasks) {
        const credId = t.get('ref_id');
        if (credId) {
          await credentials.update({ status: 0 }, { where: { id: Number(credId) } });
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
      action: 'lwd_processed',
      description: `LWD reached for employee ${emp.first_name} ${emp.last_name || ''}. Access revoked.`,
    });
  }

  return { employeesResigned, softwareRevoked, credentialsDisabled, loginsDisabled };
}

/**
 * 3. After LWD: overdue asset tasks flagged, daily escalation to HR + super_admin
 */
export async function runOverdueCheck(now: Date = new Date()): Promise<number> {
  const todayStr = await getTodayStr(now);

  const overdueTasks = await offboarding_tasks.findAll({
    where: {
      task_type: OFFBOARDING_TASK_TYPE.ASSET,
      task_status: {
        [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
      },
      due_date: { [Op.lte]: todayStr },
      status: 1,
    },
    include: [
      {
        model: offboarding_cases,
        as: 'case',
        include: [{ model: employees, as: 'employee' }],
      },
    ],
  });

  if (overdueTasks.length === 0) return 0;

  for (const t of overdueTasks) {
    // Flag unreturned hardware tasks past LWD as exception
    await t.update({
      task_status: OFFBOARDING_TASK_STATUS.EXCEPTION,
      outcome_notes: 'Unreturned hardware asset flagged as exception past LWD',
    });

    const c = (t as any).case;
    const emp = c?.employee;

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
        message: `Hardware asset for ${emp?.first_name} ${emp?.last_name || ''} has not been returned past LWD (${t.get('due_date')}). Immediate action required.`,
        status: 1,
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
    where: { key: 'offboarding_auto_issue_clearance', status: 1 },
  });
  const autoIssue = autoIssueSetting ? autoIssueSetting.get('value') === 'true' : false;

  const candidateCases = await offboarding_cases.findAll({
    where: {
      last_working_date: { [Op.lte]: todayStr },
      case_status: { [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS] },
      status: 1,
    },
    include: [
      { model: offboarding_tasks, as: 'tasks' },
      { model: employees, as: 'employee' },
    ],
  });

  let clearedCount = 0;

  for (const c of candidateCases) {
    const tasks = ((c as any).tasks || []) as any[];
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
          },
          settingsMap,
        );

        await c.update({
          case_status: OFFBOARDING_CASE_STATUS.COMPLETED,
          completed_at: now,
          clearance_number: clearanceNumber,
          clearance_issued_at: now,
          clearance_file_path: clearanceRes.filePath,
        });

        const emp = (c as any).employee;
        if (emp) {
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
          status: 1,
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
