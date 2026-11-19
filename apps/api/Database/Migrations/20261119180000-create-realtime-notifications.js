'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const base = {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      status: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT.UNSIGNED,
      },
      created_by: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      updated_by: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    };

    // 1. Extend notifications table with category, entity_type, entity_id, body, link, priority
    await queryInterface.addColumn('notifications', 'category', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'system',
      after: 'recipient_user_id',
    });

    await queryInterface.addColumn('notifications', 'entity_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'category',
    });

    await queryInterface.addColumn('notifications', 'entity_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'entity_type',
    });

    await queryInterface.addColumn('notifications', 'body', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'title',
    });

    await queryInterface.addColumn('notifications', 'link', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'message',
    });

    await queryInterface.addColumn('notifications', 'priority', {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 2, // Normal
      after: 'link',
    });

    await queryInterface.addIndex('notifications', ['recipient_user_id', 'read_at'], {
      name: 'idx_notifications_user_read',
    });
    await queryInterface.addIndex('notifications', ['category'], {
      name: 'idx_notifications_category',
    });

    // 2. Create notification_preferences table
    await queryInterface.createTable('notification_preferences', {
      ...base,
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      in_app: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      email: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      desktop: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      sound: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
    });

    await queryInterface.addIndex('notification_preferences', ['user_id', 'category'], {
      unique: true,
      name: 'uq_user_notification_category',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_preferences');
    await queryInterface.removeIndex('notifications', 'idx_notifications_user_read');
    await queryInterface.removeIndex('notifications', 'idx_notifications_category');
    await queryInterface.removeColumn('notifications', 'priority');
    await queryInterface.removeColumn('notifications', 'link');
    await queryInterface.removeColumn('notifications', 'body');
    await queryInterface.removeColumn('notifications', 'entity_id');
    await queryInterface.removeColumn('notifications', 'entity_type');
    await queryInterface.removeColumn('notifications', 'category');
  },
};
