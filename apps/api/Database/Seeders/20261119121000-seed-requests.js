'use strict';

const appSettings = [
  {
    key: 'request_sla_hours',
    value: JSON.stringify({ 4: 4, 3: 24, 2: 72, 1: 120 }),
    description: 'SLA turnaround hours by priority (1: low, 2: medium, 3: high, 4: urgent)',
  },
  {
    key: 'request_manager_approval_required',
    value: 'false',
    description: 'Require manager approval before review begins',
  },
  {
    key: 'request_auto_close_days',
    value: '7',
    description: 'Days before fulfilled requests automatically close',
  },
  {
    key: 'request_allow_attachments',
    value: 'true',
    description: 'Allow attachment uploads on requests',
  },
  {
    key: 'request_max_active_per_employee',
    value: '5',
    description: 'Maximum active open requests per employee',
  },
  {
    key: 'request_need_info_reminder_days',
    value: '3',
    description: 'Days before reminder sent to employee on need_info status',
  },
];

module.exports = {
  async up(queryInterface) {
    // 1. Ensure 'request' module exists
    await queryInterface.sequelize.query(
      "INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES ('request', 35, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `status` = 1",
    );

    const [[requestMod]] = await queryInterface.sequelize.query(
      "SELECT `id` FROM `modules` WHERE `name` = 'request' LIMIT 1",
    );

    // 2. Configure RBAC permissions for 'request' module
    const [roles] = await queryInterface.sequelize.query('SELECT `id`, `type` FROM `roles`');

    for (const role of roles) {
      let read = 0,
        write = 0,
        del = 0,
        approve = 0;

      if (role.type === 'super_admin') {
        read = 1;
        write = 1;
        del = 1;
        approve = 1;
      } else if (role.type === 'hardware_manager') {
        read = 1;
        write = 1;
        del = 0;
        approve = 1;
      } else if (role.type === 'hr') {
        read = 1;
        write = 0;
        del = 0;
        approve = 0;
      }
      // employee: 0 for admin permissions (portal endpoints handle employee access)

      await queryInterface.sequelize.query(
        `INSERT INTO \`permissions\` (\`role_id\`, \`module_id\`, \`read_access\`, \`write_access\`, \`delete_access\`, \`options_access\`, \`approve_access\`, \`reveal_access\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           \`read_access\` = VALUES(\`read_access\`),
           \`write_access\` = VALUES(\`write_access\`),
           \`delete_access\` = VALUES(\`delete_access\`),
           \`options_access\` = VALUES(\`options_access\`),
           \`approve_access\` = VALUES(\`approve_access\`),
           \`status\` = 1`,
        { replacements: [role.id, requestMod.id, read, write, del, read, approve] },
      );
    }

    // 3. Upsert app_settings
    for (const setting of appSettings) {
      await queryInterface.sequelize.query(
        `INSERT INTO \`app_settings\` (\`key\`, \`value\`, \`description\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           \`value\` = VALUES(\`value\`),
           \`description\` = VALUES(\`description\`),
           \`status\` = 1`,
        { replacements: [setting.key, setting.value, setting.description] },
      );
    }

    // 4. Seed realistic sample requests
    const [employees] = await queryInterface.sequelize.query(
      'SELECT `id`, `first_name`, `last_name`, `user_id` FROM `employees` WHERE `status` = 1 ORDER BY `id` ASC LIMIT 10',
    );
    if (!employees.length) return;

    const [adminUsers] = await queryInterface.sequelize.query(
      "SELECT u.`id` FROM `users` u JOIN `roles` r ON u.`role_id` = r.`id` WHERE r.`type` IN ('super_admin', 'hardware_manager') LIMIT 2",
    );
    const adminId = adminUsers[0]?.id || 1;
    const reviewerId = adminUsers[1]?.id || adminId;

    const [categories] = await queryInterface.sequelize.query(
      'SELECT `id`, `name` FROM `asset_categories` LIMIT 5',
    );
    const [assets] = await queryInterface.sequelize.query(
      'SELECT `id`, `category_id`, `asset_tag` FROM `assets` LIMIT 10',
    );
    const [softwares] = await queryInterface.sequelize.query(
      'SELECT `id`, `name` FROM `software` LIMIT 5',
    );
    const [licenses] = await queryInterface.sequelize.query(
      'SELECT `id`, `software_id` FROM `software_licenses` LIMIT 5',
    );

    const emp1 = employees[0];
    const emp2 = employees[1] || emp1;
    const emp3 = employees[2] || emp1;
    const emp4 = employees[3] || emp1;

    const cat1 = categories[0]?.id || null;
    const cat2 = categories[1]?.id || cat1;

    const ast1 = assets[0]?.id || null;
    const ast2 = assets[1]?.id || null;
    const ast3 = assets[2]?.id || null;

    const sw1 = softwares[0]?.id || null;
    const lic1 = licenses[0]?.id || null;

    const sampleRequests = [
      {
        request_no: 'REQ-000001',
        employee_id: emp1.id,
        request_type: 1, // NEW_HARDWARE
        category_id: cat1,
        current_asset_id: null,
        software_id: null,
        title: 'MacBook Pro M3 for Mobile Development',
        reason:
          'Current machine lacks required GPU capability for iOS simulation and local LLM benchmarking.',
        priority: 3, // HIGH
        needed_by_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        request_status: 1, // SUBMITTED
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision_feedback: null,
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 24 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000002',
        employee_id: emp2.id,
        request_type: 1, // NEW_HARDWARE
        category_id: cat2,
        current_asset_id: null,
        software_id: null,
        title: 'Ergonomic 27" 4K Monitor',
        reason:
          'Requested dual monitor setup for data analysis and backend architecture monitoring.',
        priority: 2, // MEDIUM
        needed_by_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        request_status: 2, // UNDER_REVIEW
        assigned_to: reviewerId,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        decision_feedback: null,
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 48 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000003',
        employee_id: emp1.id,
        request_type: 3, // REPAIR
        category_id: null,
        current_asset_id: ast1,
        software_id: null,
        title: 'Laptop keyboard spacebar sticking',
        reason:
          'Spacebar and right shift key frequently get stuck or fail to register during typing.',
        priority: 4, // URGENT
        needed_by_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        request_status: 3, // NEED_INFO
        assigned_to: reviewerId,
        reviewed_by: reviewerId,
        reviewed_at: new Date(Date.now() - 3600000),
        decision_feedback:
          'Can you bring the device to IT Desk at Floor 3 for diagnostic testing today?',
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 2 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000004',
        employee_id: emp3.id,
        request_type: 4, // SOFTWARE_ACCESS
        category_id: null,
        current_asset_id: null,
        software_id: sw1,
        title: 'JetBrains All Products Pack License',
        reason:
          'Required for multi-language microservices development across Java, Go, and TypeScript.',
        priority: 2, // MEDIUM
        needed_by_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        request_status: 4, // APPROVED
        assigned_to: adminId,
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 7200000),
        decision_feedback: 'Approved based on manager request approval.',
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 40 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000005',
        employee_id: emp4.id,
        request_type: 1, // NEW_HARDWARE
        category_id: cat1,
        current_asset_id: null,
        software_id: null,
        title: 'Ultra-wide Curved Monitor',
        reason: 'Special display required for UI design team reviews.',
        priority: 1, // LOW
        needed_by_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        request_status: 4, // APPROVED (awaiting stock)
        assigned_to: reviewerId,
        reviewed_by: reviewerId,
        reviewed_at: new Date(Date.now() - 10000000),
        decision_feedback: 'Approved, pending next warehouse inventory shipment arrival.',
        awaiting_stock: 1,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 100 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000006',
        employee_id: emp2.id,
        request_type: 1, // NEW_HARDWARE
        category_id: cat1,
        current_asset_id: null,
        software_id: null,
        title: 'Development Laptop Replacement',
        reason: 'Standard 3-year refresh cycle.',
        priority: 2, // MEDIUM
        needed_by_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        request_status: 6, // FULFILLED
        assigned_to: adminId,
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 172800000),
        decision_feedback: 'Approved and assigned from warehouse reserve.',
        awaiting_stock: 0,
        assigned_asset_id: ast2,
        assigned_license_id: null,
        fulfilled_at: new Date(Date.now() - 86400000),
        fulfilled_by: adminId,
        closed_at: null,
        sla_due_at: new Date(Date.now() - 86400000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000007',
        employee_id: emp3.id,
        request_type: 4, // SOFTWARE_ACCESS
        category_id: null,
        current_asset_id: null,
        software_id: sw1,
        title: 'Adobe Creative Cloud Access',
        reason: 'Needed for marketing asset creation.',
        priority: 3, // HIGH
        needed_by_date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
        request_status: 7, // CLOSED
        assigned_to: adminId,
        reviewed_by: adminId,
        reviewed_at: new Date(Date.now() - 10 * 86400000),
        decision_feedback: 'Assigned license seat #4.',
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: lic1,
        fulfilled_at: new Date(Date.now() - 9 * 86400000),
        fulfilled_by: adminId,
        closed_at: new Date(Date.now() - 2 * 86400000),
        sla_due_at: new Date(Date.now() - 9 * 86400000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000008',
        employee_id: emp1.id,
        request_type: 1, // NEW_HARDWARE
        category_id: cat2,
        current_asset_id: null,
        software_id: null,
        title: 'Portable Travel Monitor',
        reason: 'Requested for upcoming conference presentation tour.',
        priority: 2, // MEDIUM
        needed_by_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        request_status: 5, // REJECTED
        assigned_to: reviewerId,
        reviewed_by: reviewerId,
        reviewed_at: new Date(Date.now() - 5000000),
        decision_feedback: 'Equipment is currently reserved only for field survey staff.',
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 30 * 3600000),
        sla_breached: 0,
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000009',
        employee_id: emp4.id,
        request_type: 2, // CHANGE_REPLACE_HARDWARE
        category_id: cat1,
        current_asset_id: ast3,
        software_id: null,
        title: 'Upgrade Workstation to 64GB RAM',
        reason: 'Need increased RAM to run local containerized test cluster.',
        priority: 3, // HIGH
        needed_by_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        request_status: 2, // UNDER_REVIEW
        assigned_to: reviewerId,
        reviewed_by: null,
        reviewed_at: null,
        decision_feedback: null,
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() - 24 * 3600000), // In the past!
        sla_breached: 1, // SLA Breached
        cancelled_reason: null,
      },
      {
        request_no: 'REQ-000010',
        employee_id: emp2.id,
        request_type: 5, // RETURN_HARDWARE
        category_id: null,
        current_asset_id: ast1,
        software_id: null,
        title: 'Return Secondary Display',
        reason:
          'Switched to a single high-resolution display, secondary monitor no longer required.',
        priority: 1, // LOW
        needed_by_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        request_status: 8, // CANCELLED
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision_feedback: null,
        awaiting_stock: 0,
        assigned_asset_id: null,
        assigned_license_id: null,
        fulfilled_at: null,
        fulfilled_by: null,
        closed_at: null,
        sla_due_at: new Date(Date.now() + 120 * 3600000),
        sla_breached: 0,
        cancelled_reason: 'Decided to keep the secondary monitor for remote office setup.',
      },
    ];

    for (const req of sampleRequests) {
      await queryInterface.sequelize.query(
        `INSERT INTO \`requests\` (
          \`request_no\`, \`employee_id\`, \`request_type\`, \`category_id\`, \`current_asset_id\`, \`software_id\`,
          \`title\`, \`reason\`, \`priority\`, \`needed_by_date\`, \`request_status\`, \`assigned_to\`, \`reviewed_by\`,
          \`reviewed_at\`, \`decision_feedback\`, \`awaiting_stock\`, \`assigned_asset_id\`, \`assigned_license_id\`,
          \`fulfilled_at\`, \`fulfilled_by\`, \`closed_at\`, \`sla_due_at\`, \`sla_breached\`, \`cancelled_reason\`,
          \`status\`, \`createdAt\`, \`updatedAt\`
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          1, NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`)`,
        {
          replacements: [
            req.request_no,
            req.employee_id,
            req.request_type,
            req.category_id,
            req.current_asset_id,
            req.software_id,
            req.title,
            req.reason,
            req.priority,
            req.needed_by_date,
            req.request_status,
            req.assigned_to,
            req.reviewed_by,
            req.reviewed_at,
            req.decision_feedback,
            req.awaiting_stock,
            req.assigned_asset_id,
            req.assigned_license_id,
            req.fulfilled_at,
            req.fulfilled_by,
            req.closed_at,
            req.sla_due_at,
            req.sla_breached,
            req.cancelled_reason,
          ],
        },
      );
    }

    // 5. Seed comments and status history for sample requests
    const [insertedReqs] = await queryInterface.sequelize.query(
      'SELECT `id`, `request_no`, `request_status`, `employee_id` FROM `requests` WHERE `request_no` LIKE "REQ-%"',
    );
    const reqMap = new Map(insertedReqs.map((r) => [r.request_no, r.id]));

    const req3Id = reqMap.get('REQ-000003');
    if (req3Id) {
      await queryInterface.sequelize.query(
        `INSERT INTO \`request_comments\` (\`request_id\`, \`user_id\`, \`comment\`, \`is_internal\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        {
          replacements: [
            req3Id,
            reviewerId,
            'Can you bring the device to IT Desk at Floor 3 for diagnostic testing today?',
            0, // public comment
          ],
        },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO \`request_comments\` (\`request_id\`, \`user_id\`, \`comment\`, \`is_internal\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        {
          replacements: [
            req3Id,
            adminId,
            'Internal note: Spare keyboard replacements are in cabinet B-12.',
            1, // internal note
          ],
        },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO \`request_status_history\` (\`request_id\`, \`from_status\`, \`to_status\`, \`changed_by\`, \`note\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, 1, 2, ?, 'Started review', 1, NOW(), NOW()),
                (?, 2, 3, ?, 'Requested diagnostic inspection', 1, NOW(), NOW())`,
        { replacements: [req3Id, reviewerId, req3Id, reviewerId] },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DELETE FROM `request_attachments`');
    await queryInterface.sequelize.query('DELETE FROM `request_status_history`');
    await queryInterface.sequelize.query('DELETE FROM `request_comments`');
    await queryInterface.sequelize.query('DELETE FROM `requests`');
    await queryInterface.sequelize.query('DELETE FROM `app_settings` WHERE `key` LIKE "request_%"');
  },
};
