'use strict';

module.exports = {
  async up(queryInterface) {
    const [[adminUser]] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE status = 1 LIMIT 1',
    );
    const adminId = adminUser ? adminUser.id : 1;

    // Fetch active hardware manager or default to admin
    const [[hwManager]] = await queryInterface.sequelize.query(
      "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.type = 'hardware_manager' AND u.status = 1 LIMIT 1",
    );
    const handoverUserId = hwManager ? hwManager.id : adminId;

    // Fetch up to 500 employees that don't have an offboarding case
    const [employees] = await queryInterface.sequelize.query(`
      SELECT e.id, e.manager_id, e.first_name, e.last_name
      FROM employees e
      LEFT JOIN offboarding_cases oc ON e.id = oc.employee_id AND oc.status = 1
      WHERE e.status = 1 AND oc.id IS NULL
      LIMIT 500
    `);

    if (employees.length === 0) return;

    const cases = [];
    const now = new Date();
    const resignationDate = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const lwdDate = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

    const [[maxRow]] = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(id), 0) as maxId FROM offboarding_cases',
    );
    const baseSeq = Number(maxRow?.maxId || 0);

    const empIdsToUpdate = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      empIdsToUpdate.push(emp.id);
      const caseSeq = String(baseSeq + i + 1).padStart(6, '0');
      cases.push({
        case_no: `OFF-${caseSeq}`,
        employee_id: emp.id,
        exit_type: 1, // resignation
        resignation_date: resignationDate,
        last_working_date: lwdDate,
        reason: 'Pursuing higher studies / career transition',
        initiated_by: adminId,
        handover_to: handoverUserId,
        manager_id: emp.manager_id || null,
        case_status: 1, // open
        notes: 'Bulk seeded offboarding test case',
        status: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Bulk insert cases in batches
    const batchSize = 100;
    for (let i = 0; i < cases.length; i += batchSize) {
      await queryInterface.bulkInsert('offboarding_cases', cases.slice(i, i + batchSize));
    }

    // Update employees to notice (employment_status = 2) and set last_working_date
    for (let i = 0; i < empIdsToUpdate.length; i += batchSize) {
      const ids = empIdsToUpdate.slice(i, i + batchSize).join(',');
      await queryInterface.sequelize.query(`
        UPDATE employees
        SET employment_status = 2, last_working_date = '${lwdDate}'
        WHERE id IN (${ids})
      `);
    }

    // Now insert tasks for these created cases
    const [createdCases] = await queryInterface.sequelize.query(`
      SELECT id, employee_id FROM offboarding_cases WHERE case_no LIKE 'OFF-%' ORDER BY id ASC LIMIT 500
    `);

    const tasks = [];
    for (const c of createdCases) {
      tasks.push({
        case_id: c.id,
        task_type: 5, // checklist
        ref_id: null,
        ref_label: 'ID Card Handover',
        title: 'Return ID card & Building Badge',
        assigned_to: handoverUserId,
        task_status: 1, // pending
        is_mandatory: 1,
        due_date: lwdDate,
        status: 1,
        createdAt: now,
        updatedAt: now,
      });
      tasks.push({
        case_id: c.id,
        task_type: 5, // checklist
        ref_id: null,
        ref_label: 'Knowledge Transfer',
        title: 'Knowledge transfer & Documentation sign-off',
        assigned_to: adminId,
        task_status: 1, // pending
        is_mandatory: 1,
        due_date: lwdDate,
        status: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let i = 0; i < tasks.length; i += batchSize) {
      await queryInterface.bulkInsert('offboarding_tasks', tasks.slice(i, i + batchSize));
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM offboarding_tasks WHERE ref_label IN ('ID Card Handover', 'Knowledge Transfer')",
    );
    await queryInterface.sequelize.query(
      "DELETE FROM offboarding_cases WHERE case_no LIKE 'OFF-%'",
    );
  },
};
