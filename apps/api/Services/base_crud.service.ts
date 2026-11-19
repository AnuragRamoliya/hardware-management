import { ResourceModel, type ResourceDefinition } from '../Models/resource';
import type { EntityModel } from '../Database/Schema';

export type CrudResourceDefinition = ResourceDefinition;

/**
 * BaseCrudService provides standardized CRUD operations:
 * - list with pagination, search, dynamic subquery attributes, and whitelisted sorting
 * - get with detail fields and subquery count mapping
 * - add with validation and automatic activity logging
 * - update with diff tracking and activity logging
 * - soft delete with concurrency lock and activity logging
 * - options fetching with role/permission gating
 */
export class BaseCrudService extends ResourceModel {
  constructor(model: EntityModel, definition: CrudResourceDefinition) {
    super(model, definition);
  }
}
