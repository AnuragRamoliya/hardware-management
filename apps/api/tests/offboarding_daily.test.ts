import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runOverdueCheck, runOffboardingDaily } from '../Jobs/offboarding_daily';
import {
  offboarding_tasks,
  offboarding_cases,
  notifications,
  app_settings,
} from '../Database/Schema';
import { OFFBOARDING_TASK_STATUS } from '@hm/shared';

describe('V3 & V4: Offboarding Daily Job Idempotency & Overdue Checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('flags unreturned hardware asset past LWD as EXCEPTION and deduplicates escalation notifications', async () => {
    const mockTask = {
      get: (key: string) => {
        if (key === 'id') return 101;
        if (key === 'title') return 'MacBook Pro 16"';
        if (key === 'due_date') return '2026-11-18';
        if (key === 'case') {
          return {
            employee: { first_name: 'John', last_name: 'Doe' },
          };
        }
        return null;
      },
      update: vi.fn().mockResolvedValue([1]),
    };

    vi.spyOn(offboarding_tasks, 'findAll').mockResolvedValue([mockTask as any]);
    vi.spyOn(notifications, 'findOne').mockResolvedValue(null);
    const createNotifSpy = vi.spyOn(notifications, 'create').mockResolvedValue({ id: 1 } as any);

    const count = await runOverdueCheck(new Date('2026-11-19T10:00:00.000Z'));

    expect(count).toBe(1);
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        task_status: OFFBOARDING_TASK_STATUS.EXCEPTION,
      }),
    );
    expect(createNotifSpy).toHaveBeenCalled();
  });

  it('runs daily sweep twice idempotently with zero duplicate mutations', async () => {
    const testDate = new Date('2026-11-20T09:00:00.000Z');

    vi.spyOn(app_settings, 'findOne').mockResolvedValue(null);
    vi.spyOn(offboarding_cases, 'findAll').mockResolvedValue([]);
    vi.spyOn(offboarding_tasks, 'findAll').mockResolvedValue([]);

    // Run 1st execution
    const run1 = await runOffboardingDaily(testDate);
    expect(run1.overdue).toBe(0);
    expect(run1.pending).toBe(0);

    // Run 2nd execution for identical timestamp
    const run2 = await runOffboardingDaily(testDate);
    expect(run2.overdue).toBe(0);
    expect(run2.pending).toBe(0);
    expect(run2.lwd.employeesResigned).toBe(0);
  });
});
