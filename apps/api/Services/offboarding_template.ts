import { Op } from 'sequelize';
import { offboarding_checklist_templates } from '../Database/Schema';
import { AppError } from '../Config/app_error';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';

const plain = (model: import('sequelize').Model) =>
  model.get({ plain: true }) as Record<string, unknown>;

export class OffboardingTemplateService {
  async list(
    filters: Record<string, unknown> = {},
    pagination: {
      currentPage?: number;
      itemsPerPage?: number;
      sortBy?: Array<{ id: string; value: 'asc' | 'desc' | 'ASC' | 'DESC' }>;
    } = {},
  ) {
    const where: Record<string | symbol, unknown> = { status: 1 };

    if (filters.is_active !== undefined) {
      where.is_active =
        filters.is_active === true || filters.is_active === 1 || filters.is_active === 'true'
          ? 1
          : 0;
    }

    if (filters.is_mandatory !== undefined) {
      where.is_mandatory =
        filters.is_mandatory === true ||
        filters.is_mandatory === 1 ||
        filters.is_mandatory === 'true'
          ? 1
          : 0;
    }

    if (typeof filters.search === 'string' && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: term } },
        { description: { [Op.like]: term } },
        { default_assignee_role: { [Op.like]: term } },
      ];
    }

    const { limit, offset } = getPagination(pagination);

    const allowedTemplateColumns = new Set([
      'id',
      'title',
      'department',
      'days_before_lwd',
      'sort_order',
      'is_mandatory',
      'is_active',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const order = getSorting(pagination, allowedTemplateColumns, [
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ]);

    const { rows, count } = await offboarding_checklist_templates.findAndCountAll({
      where,
      limit,
      offset,
      order,
    });

    return {
      list: rows.map(plain),
      pagination: {
        totalItems: count,
        currentPage: pagination.currentPage ? Number(pagination.currentPage) : 1,
        itemsPerPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async get(id: number) {
    const tpl = await offboarding_checklist_templates.findByPk(id);
    if (!tpl || Number(tpl.get('status')) !== 1) {
      throw new AppError(404, 'Checklist template not found.');
    }
    return plain(tpl);
  }

  async add(
    input: {
      title: string;
      description?: string;
      default_assignee_role?: string;
      is_mandatory?: boolean;
      sort_order?: number;
    },
    actor: UserInfo,
  ) {
    if (!input.title || input.title.trim().length === 0) {
      throw new AppError(422, 'Title is required.');
    }

    const tpl = await offboarding_checklist_templates.create({
      title: input.title.trim(),
      description: input.description ? input.description.trim() : null,
      default_assignee_role: input.default_assignee_role || 'hardware_manager',
      is_mandatory: input.is_mandatory !== false ? 1 : 0,
      sort_order: input.sort_order !== undefined ? Number(input.sort_order) : 0,
      is_active: 1,
      status: 1,
      created_by: actor.id,
      updated_by: actor.id,
    });

    await createActivityLog({
      module: 'offboarding_template',
      moduleId: Number(tpl.get('id')),
      action: 'created',
      description: `Created checklist template: "${tpl.get('title')}"`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name || ''}`,
    });

    return plain(tpl);
  }

  async update(
    input: {
      id: number;
      title?: string;
      description?: string;
      default_assignee_role?: string;
      is_mandatory?: boolean;
      sort_order?: number;
      is_active?: boolean;
    },
    actor: UserInfo,
  ) {
    const tpl = await offboarding_checklist_templates.findByPk(input.id);
    if (!tpl || Number(tpl.get('status')) !== 1) {
      throw new AppError(404, 'Checklist template not found.');
    }

    const updates: Record<string, unknown> = { updated_by: actor.id };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined)
      updates.description = input.description ? input.description.trim() : null;
    if (input.default_assignee_role !== undefined)
      updates.default_assignee_role = input.default_assignee_role;
    if (input.is_mandatory !== undefined) updates.is_mandatory = input.is_mandatory ? 1 : 0;
    if (input.sort_order !== undefined) updates.sort_order = Number(input.sort_order);
    if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;

    await tpl.update(updates);

    await createActivityLog({
      module: 'offboarding_template',
      moduleId: input.id,
      action: 'updated',
      description: `Updated checklist template: "${tpl.get('title')}"`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name || ''}`,
    });

    return plain(tpl);
  }

  async delete(id: number, actor: UserInfo) {
    const tpl = await offboarding_checklist_templates.findByPk(id);
    if (!tpl || Number(tpl.get('status')) !== 1) {
      throw new AppError(404, 'Checklist template not found.');
    }

    await tpl.update({ status: 2, updated_by: actor.id });

    await createActivityLog({
      module: 'offboarding_template',
      moduleId: id,
      action: 'deleted',
      description: `Deleted checklist template: "${tpl.get('title')}"`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name || ''}`,
    });

    return { message: 'Checklist template deleted successfully.' };
  }

  async options() {
    const list = await offboarding_checklist_templates.findAll({
      where: { status: 1, is_active: 1 },
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'title', 'is_mandatory'],
    });

    return {
      options: list.map((item) => ({
        value: Number(item.get('id')),
        label: String(item.get('title')),
        id: Number(item.get('id')),
        name: String(item.get('title')),
        is_mandatory: Number(item.get('is_mandatory')) === 1,
      })),
    };
  }
}
