'use strict';

const phase3Modules = [
  'credential',
  'credential_type',
  'credential_collection_request',
  'credential_access_log',
];

const credentialTypes = [
  {
    name: 'Company email',
    category: 'email',
    icon: 'Mail',
    expiry_days: 90,
    min_length: 12,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'Corporate email account',
  },
  {
    name: 'VPN',
    category: 'vpn',
    icon: 'Shield',
    expiry_days: 60,
    min_length: 14,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'Secure remote access VPN',
  },
  {
    name: 'Git',
    category: 'source_control',
    icon: 'GitBranch',
    expiry_days: null,
    min_length: 12,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'GitHub/GitLab developer credentials',
  },
  {
    name: 'Jira',
    category: 'project_tool',
    icon: 'CheckSquare',
    expiry_days: 90,
    min_length: 12,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'Project management and issue tracker',
  },
  {
    name: 'Cloud console',
    category: 'cloud',
    icon: 'Cloud',
    expiry_days: 90,
    min_length: 16,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'AWS / GCP / Azure management',
  },
  {
    name: 'Laptop login',
    category: 'laptop',
    icon: 'Laptop',
    expiry_days: 90,
    min_length: 12,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'OS login password for assigned machine',
  },
  {
    name: 'Wi-Fi',
    category: 'wifi',
    icon: 'Wifi',
    expiry_days: 180,
    min_length: 10,
    require_complexity: 0,
    requires_approval: 0,
    allow_employee_submit: 1,
    notes: 'Office network passkeys',
  },
  {
    name: 'Database',
    category: 'database',
    icon: 'Database',
    expiry_days: 60,
    min_length: 16,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'Direct database access credentials',
  },
  {
    name: 'Other',
    category: 'other',
    icon: 'Key',
    expiry_days: null,
    min_length: 12,
    require_complexity: 1,
    requires_approval: 1,
    allow_employee_submit: 1,
    notes: 'Miscellaneous work credentials',
  },
];

const appSettings = [
  {
    key: 'credential_reauthorize_on_change',
    value: 'true',
    description: 'Require re-approval when an employee updates credentials',
  },
  {
    key: 'notify_owner_on_reveal',
    value: 'true',
    description: 'Send alert when an admin reveals an employee credential',
  },
  {
    key: 'reveal_rate_limit_per_hour',
    value: '10',
    description: 'Maximum password reveals per user per hour',
  },
  {
    key: 'reauth_window_minutes',
    value: '5',
    description: 'Validity duration of master password reauth token in minutes',
  },
  {
    key: 'max_failed_logins',
    value: '5',
    description: 'Consecutive failed login threshold before account lockout',
  },
  { key: 'lockout_minutes', value: '15', description: 'Duration of account lockout in minutes' },
  {
    key: 'credential_consent_text',
    value:
      'Only submit work-related credentials. The company can access submitted credentials for authorized purposes.',
    description: 'Legal notice presented to employees prior to credential submission',
  },
  {
    key: 'credential_consent_version',
    value: '1.0',
    description: 'Current consent agreement version',
  },
  {
    key: 'expiry_warning_days',
    value: '[14, 7, 1]',
    description: 'Lead days prior to credential expiration for automated alerts',
  },
];

module.exports = {
  async up(queryInterface) {
    // 1. Ensure modules exist
    for (const [index, name] of phase3Modules.entries()) {
      await queryInterface.sequelize.query(
        'INSERT INTO `modules` (`name`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE `status` = 1',
        { replacements: [name, 30 + index] },
      );
    }

    // 2. Fetch roles and modules
    const [roles] = await queryInterface.sequelize.query('SELECT `id`, `type` FROM `roles`');
    const [modules] = await queryInterface.sequelize.query(
      'SELECT `id`, `name` FROM `modules` WHERE `name` IN (?)',
      {
        replacements: [phase3Modules],
      },
    );
    const moduleMap = new Map(modules.map((m) => [m.name, m.id]));

    // 3. Upsert RBAC permissions for phase 3 modules
    for (const role of roles) {
      for (const modName of phase3Modules) {
        const modId = moduleMap.get(modName);
        if (!modId) continue;

        let read = 0,
          write = 0,
          del = 0,
          approve = 0,
          reveal = 0;

        if (role.type === 'super_admin') {
          read = 1;
          write = 1;
          del = 1;
          approve = 1;
          reveal = 1;
        } else if (role.type === 'hardware_manager') {
          if (modName === 'credential_access_log') {
            read = 1;
            write = 0;
            del = 0;
            approve = 0;
            reveal = 0;
          } else {
            read = 1;
            write = 1;
            del = 1;
            approve = 1;
            reveal = 0; // No reveal by default
          }
        }

        await queryInterface.sequelize.query(
          `INSERT INTO \`permissions\` (\`role_id\`, \`module_id\`, \`read_access\`, \`write_access\`, \`delete_access\`, \`options_access\`, \`approve_access\`, \`reveal_access\`, \`status\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             \`read_access\` = VALUES(\`read_access\`),
             \`write_access\` = VALUES(\`write_access\`),
             \`delete_access\` = VALUES(\`delete_access\`),
             \`approve_access\` = VALUES(\`approve_access\`),
             \`reveal_access\` = VALUES(\`reveal_access\`),
             \`status\` = 1`,
          { replacements: [role.id, modId, read, write, del, read, approve, reveal] },
        );
      }
    }

    // 4. Seed credential types
    for (const type of credentialTypes) {
      await queryInterface.sequelize.query(
        `INSERT INTO \`credential_types\` (\`name\`, \`category\`, \`icon\`, \`expiry_days\`, \`min_length\`, \`require_complexity\`, \`requires_approval\`, \`allow_employee_submit\`, \`notes\`, \`status\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           \`category\` = VALUES(\`category\`),
           \`icon\` = VALUES(\`icon\`),
           \`expiry_days\` = VALUES(\`expiry_days\`),
           \`min_length\` = VALUES(\`min_length\`),
           \`require_complexity\` = VALUES(\`require_complexity\`),
           \`requires_approval\` = VALUES(\`requires_approval\`),
           \`allow_employee_submit\` = VALUES(\`allow_employee_submit\`),
           \`notes\` = VALUES(\`notes\`),
           \`status\` = 1`,
        {
          replacements: [
            type.name,
            type.category,
            type.icon,
            type.expiry_days,
            type.min_length,
            type.require_complexity,
            type.requires_approval,
            type.allow_employee_submit,
            type.notes,
          ],
        },
      );
    }

    // 5. Seed app settings
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
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('app_settings', {
      key: appSettings.map((s) => s.key),
    });
    await queryInterface.bulkDelete('credential_types', {
      name: credentialTypes.map((t) => t.name),
    });
  },
};
