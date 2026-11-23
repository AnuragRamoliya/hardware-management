import type { Request, Response } from 'express';
import { CredentialVaultService } from '../Services/credential_vault';
import { getActor } from '../Utils/route_handler';
import { employees } from '../Database/Schema';
import { AppError } from '../Config/app_error';
import { STATUS } from '@hm/shared';

const vaultService = new CredentialVaultService();

export class CredentialsController {
  // Types
  async listTypes(req: Request) {
    return vaultService.listTypes(req.body);
  }

  async getType(req: Request) {
    return vaultService.getType(Number(req.params.id));
  }

  async addType(req: Request) {
    return vaultService.createType(req.body, getActor(req));
  }

  async updateType(req: Request) {
    return vaultService.updateType(Number(req.body.id), req.body, getActor(req));
  }

  async deleteType(req: Request) {
    return vaultService.deleteType(Number(req.params.id), getActor(req));
  }

  async optionsTypes() {
    return vaultService.optionsTypes();
  }

  // Credentials
  async list(req: Request) {
    return vaultService.list(req.body);
  }

  async get(req: Request) {
    return vaultService.get(Number(req.params.id));
  }

  async add(req: Request) {
    return vaultService.create(req.body, getActor(req));
  }

  async update(req: Request) {
    return vaultService.update(req.body, getActor(req));
  }

  async changePassword(req: Request) {
    return vaultService.updatePassword(
      Number(req.body.id),
      String(req.body.password),
      getActor(req),
    );
  }

  async delete(req: Request) {
    return vaultService.delete(Number(req.params.id), getActor(req));
  }

  async history(req: Request) {
    return vaultService.history(Number(req.params.id));
  }

  // Approvals
  async approvalsList(req: Request) {
    return vaultService.listApprovals(req.body);
  }

  async approve(req: Request) {
    return vaultService.approve(Number(req.params.id), getActor(req));
  }

  async reject(req: Request) {
    return vaultService.reject(
      Number(req.params.id),
      String(req.body.feedback || req.body.reason || ''),
      getActor(req),
    );
  }

  async needsChange(req: Request) {
    return vaultService.needsChange(
      Number(req.params.id),
      String(req.body.feedback || req.body.reason || ''),
      getActor(req),
    );
  }

  async bulkApprove(req: Request) {
    return vaultService.bulkApprove(req.body.ids, getActor(req));
  }

  // Collection Requests
  async createRequest(req: Request) {
    return vaultService.createCollectionRequest(req.body, getActor(req));
  }

  async listRequests(req: Request) {
    return vaultService.listCollectionRequests(req.body);
  }

  async cancelRequest(req: Request) {
    return vaultService.cancelCollectionRequest(Number(req.params.id), getActor(req));
  }

  // Reveal
  async reveal(req: Request) {
    const actor = getActor(req);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return vaultService.revealSecret(
      Number(req.params.id),
      String(req.body.reauth_token),
      req.body.reason ? String(req.body.reason) : undefined,
      actor,
      false,
      clientIp,
      userAgent,
    );
  }

  // Access Logs & Audit
  async accessLogsList(req: Request) {
    return vaultService.listAccessLogs(req.body);
  }

  async accessLogsExport(req: Request, res: Response): Promise<void> {
    const result = await vaultService.listAccessLogs({
      ...req.body,
      currentPage: 1,
      itemsPerPage: 10000,
    });

    const headers = [
      'ID',
      'Credential ID',
      'Employee ID',
      'Accessed By User ID',
      'Action',
      'Reason',
      'IP Address',
      'Accessed At',
      'Prev Hash',
      'Hash',
    ];

    const rows = result.items.map((log) => [
      log.id,
      log.credential_id,
      log.employee_id,
      log.accessed_by,
      `"${String(log.action || '').replace(/"/g, '""')}"`,
      `"${String(log.reason || '').replace(/"/g, '""')}"`,
      `"${String(log.ip_address || '').replace(/"/g, '""')}"`,
      log.accessed_at,
      log.prev_hash,
      log.hash,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="credential-access-audit-logs.csv"');
    res.status(200).send(csvContent);
  }

  async auditVerify() {
    return vaultService.verifyAuditIntegrity();
  }
}

export class PortalCredentialsController {
  private async ownEmployeeId(req: Request): Promise<number> {
    const actor = getActor(req);
    const employee = await employees.findOne({
      where: { user_id: actor.id, status: STATUS.ACTIVE },
    });
    if (!employee) {
      throw new AppError(404, 'Employee record not found for this account.');
    }
    return Number(employee.get('id'));
  }

  async consentStatus(req: Request) {
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.getConsentStatus(employeeId);
  }

  async acceptConsent(req: Request) {
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.acceptConsent(employeeId);
  }

  async list(req: Request) {
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalList(employeeId, req.body);
  }

  async get(req: Request) {
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalGet(Number(req.params.id), employeeId);
  }

  async add(req: Request) {
    const actor = getActor(req);
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalAdd(employeeId, req.body, actor.id);
  }

  async update(req: Request) {
    const actor = getActor(req);
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalUpdate(Number(req.body.id), employeeId, req.body, actor.id);
  }

  async changePassword(req: Request) {
    const actor = getActor(req);
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalChangePassword(
      Number(req.body.id),
      employeeId,
      String(req.body.password),
      actor.id,
    );
  }

  async delete(req: Request) {
    const actor = getActor(req);
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalDelete(Number(req.params.id), employeeId, actor.id);
  }

  async reveal(req: Request) {
    const actor = getActor(req);
    const employeeId = await this.ownEmployeeId(req);
    actor.employee_id = employeeId;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return vaultService.revealSecret(
      Number(req.params.id),
      String(req.body.reauth_token),
      req.body.reason ? String(req.body.reason) : undefined,
      actor,
      true,
      clientIp,
      userAgent,
    );
  }

  async myRequests(req: Request) {
    const employeeId = await this.ownEmployeeId(req);
    return vaultService.portalRequests(employeeId);
  }

  async allowedTypes() {
    return vaultService.portalTypes();
  }
}
