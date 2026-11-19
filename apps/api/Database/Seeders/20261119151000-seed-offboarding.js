'use strict';

const appSettings = [
  {
    key: 'offboarding_handover_strategy',
    value: 'least_loaded',
    description: 'Hardware handover routing strategy: least_loaded | round_robin | fixed',
  },
  {
    key: 'offboarding_fixed_handover_user_id',
    value: null,
    description: 'Fixed hardware manager user ID when strategy is fixed',
  },
  {
    key: 'offboarding_reminder_days',
    value: JSON.stringify([7, 3, 1]),
    description: 'Days before Last Working Date to send return reminders',
  },
  {
    key: 'offboarding_auto_revoke_software',
    value: 'true',
    description: 'Automatically revoke software license assignments on LWD',
  },
  {
    key: 'offboarding_disable_credentials',
    value: 'true',
    description: 'Automatically disable credential vault accounts on LWD',
  },
  {
    key: 'offboarding_disable_login_on_lwd',
    value: 'true',
    description: 'Deactivate user login and revoke authentication sessions on LWD',
  },
  {
    key: 'offboarding_block_assign_during_notice',
    value: 'true',
    description: 'Block new hardware or software assignments while employee is in notice period',
  },
  {
    key: 'offboarding_restrict_requests_during_notice',
    value: 'true',
    description: 'Restrict portal self-service requests to repair and return during notice',
  },
  {
    key: 'offboarding_auto_issue_clearance',
    value: 'false',
    description: 'Automatically issue clearance certificates once all mandatory tasks pass',
  },
  {
    key: 'company_name',
    value: 'Acme Technologies Inc.',
    description: 'Legal company name printed on clearance certificates and handover receipts',
  },
  {
    key: 'company_address',
    value: '123 Tech Park, Suite 400, Silicon Valley, CA 94025',
    description: 'Official corporate address for clearance documents',
  },
  {
    key: 'clearance_signatory_hr',
    value: 'Head of Human Resources',
    description: 'HR authorization title on clearance certificate',
  },
  {
    key: 'clearance_signatory_it',
    value: 'IT Infrastructure Manager',
    description: 'IT authorization title on clearance certificate',
  },
];

const checklistTemplates = [
  {
    title: 'Return ID card',
    description: 'Collect physical company employee badge and lanyard.',
    default_assignee_role: 'hardware_manager',
    is_mandatory: 1,
    sort_order: 1,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Return access card',
    description: 'Collect building, server room, or RFID access cards.',
    default_assignee_role: 'hardware_manager',
    is_mandatory: 1,
    sort_order: 2,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Return SIM/company phone accessories',
    description: 'Return physical company SIM card, charging adapters, and mobile peripherals.',
    default_assignee_role: 'hardware_manager',
    is_mandatory: 1,
    sort_order: 3,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Knowledge transfer completed',
    description:
      'Confirm formal KT documentation and project handoff signed off by reporting manager.',
    default_assignee_role: 'manager',
    is_mandatory: 1,
    sort_order: 4,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Email forwarding/auto-reply set',
    description: 'Configure out-of-office message and route inbound emails to department delegate.',
    default_assignee_role: 'hardware_manager',
    is_mandatory: 1,
    sort_order: 5,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Exit interview',
    description: 'Conduct final exit feedback session and discuss notice terms.',
    default_assignee_role: 'hr',
    is_mandatory: 1,
    sort_order: 6,
    is_active: 1,
    status: 1,
  },
  {
    title: 'Final settlement clearance (HR)',
    description: 'Verify payroll, expense reimbursements, and leave encashment calculations.',
    default_assignee_role: 'hr',
    is_mandatory: 1,
    sort_order: 7,
    is_active: 1,
    status: 1,
  },
];

module.exports = {
  async up(queryInterface) {
    // 1. Ensure modules exist
    await queryInterface.sequelize.query(
      "INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES ('offboarding', 40, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `status` = 1",
    );
    await queryInterface.sequelize.query(
      "INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES ('offboarding_template', 45, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `status` = 1",
    );

    const [[offboardingMod]] = await queryInterface.sequelize.query(
      "SELECT `id` FROM `modules` WHERE `name` = 'offboarding' LIMIT 1",
    );
    const [[templateMod]] = await queryInterface.sequelize.query(
      "SELECT `id` FROM `modules` WHERE `name` = 'offboarding_template' LIMIT 1",
    );

    // 2. Configure RBAC permissions
    const [roles] = await queryInterface.sequelize.query('SELECT `id`, `type` FROM `roles`');

    for (const role of roles) {
      let offRead = 0,
        offWrite = 0,
        offDel = 0,
        offApprove = 0;
      let tplRead = 0,
        tplWrite = 0,
        tplDel = 0,
        tplApprove = 0;

      if (role.type === 'super_admin') {
        offRead = 1;
        offWrite = 1;
        offDel = 1;
        offApprove = 1;
        tplRead = 1;
        tplWrite = 1;
        tplDel = 1;
        tplApprove = 1;
      } else if (role.type === 'hr') {
        // HR can initiate, waive, issue clearance, manage templates
        offRead = 1;
        offWrite = 1;
        offDel = 0;
        offApprove = 1;
        tplRead = 1;
        tplWrite = 1;
        tplDel = 0;
        tplApprove = 1;
      } else if (role.type === 'hardware_manager') {
        // Hardware Manager receives and completes tasks, but cannot waive
        offRead = 1;
        offWrite = 1;
        offDel = 0;
        offApprove = 0;
        tplRead = 1;
        tplWrite = 0;
        tplDel = 0;
        tplApprove = 0;
      }

      if (offboardingMod) {
        await queryInterface.sequelize.query(
          `INSERT INTO \`permissions\` (\`role_id\`, \`module_id\`, \`read_access\`, \`write_access\`, \`delete_access\`, \`options_access\`, \`approve_access\`, \`reveal_access\`, \`status\`, \`createdAt\`, \`updatedAt\`)
           VALUES (${role.id}, ${offboardingMod.id}, ${offRead}, ${offWrite}, ${offDel}, 1, ${offApprove}, 0, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE \`read_access\` = ${offRead}, \`write_access\` = ${offWrite}, \`approve_access\` = ${offApprove}, \`options_access\` = 1`,
        );
      }

      if (templateMod) {
        await queryInterface.sequelize.query(
          `INSERT INTO \`permissions\` (\`role_id\`, \`module_id\`, \`read_access\`, \`write_access\`, \`delete_access\`, \`options_access\`, \`approve_access\`, \`reveal_access\`, \`status\`, \`createdAt\`, \`updatedAt\`)
           VALUES (${role.id}, ${templateMod.id}, ${tplRead}, ${tplWrite}, ${tplDel}, 1, ${tplApprove}, 0, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE \`read_access\` = ${tplRead}, \`write_access\` = ${tplWrite}, \`approve_access\` = ${tplApprove}, \`options_access\` = 1`,
        );
      }
    }

    // 3. Seed app_settings
    for (const setting of appSettings) {
      const valStr = setting.value === null ? 'NULL' : `'${setting.value.replace(/'/g, "''")}'`;
      await queryInterface.sequelize.query(
        `INSERT INTO \`app_settings\` (\`key\`, \`value\`, \`description\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES ('${setting.key}', ${valStr}, '${setting.description.replace(/'/g, "''")}', 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE \`description\` = '${setting.description.replace(/'/g, "''")}'`,
      );
    }

    // 4. Seed checklist templates
    for (const tpl of checklistTemplates) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM offboarding_checklist_templates WHERE title = '${tpl.title.replace(/'/g, "''")}' LIMIT 1`,
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert('offboarding_checklist_templates', [
          {
            ...tpl,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('offboarding_checklist_templates', null, {});
  },
};
