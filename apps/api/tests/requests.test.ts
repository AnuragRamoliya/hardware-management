/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { REQUEST_TYPE, REQUEST_STATUS } from '@hm/shared';
import { RequestWorkflowService } from '../Services/request_workflow.service';
import { RequestFulfilmentService } from '../Services/request_fulfilment.service';
import { PortalRequestService } from '../Services/portal_request';
import { runSlaCheck, runAutoCloseFulfilled } from '../Jobs/request_sla';
import { requests, assets, request_comments, sequelize } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const dbTest = process.env.PHASE4_DB_INTEGRATION === '1' ? it : it.skip;

describe('Phase 4: Employee Requests & Review Workflow Tests', () => {
  const workflow = new RequestWorkflowService();
  const adminActor: UserInfo = {
    id: 1,
    role_id: 1,
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@hardware.app',
  };

  describe('1. State Machine & Transition Rules', () => {
    it('validates allowed transitions from pure transition map', () => {
      expect(
        workflow.isValidTransition(REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.UNDER_REVIEW),
      ).toBe(true);
      expect(workflow.isValidTransition(REQUEST_STATUS.UNDER_REVIEW, REQUEST_STATUS.APPROVED)).toBe(
        true,
      );
      expect(workflow.isValidTransition(REQUEST_STATUS.APPROVED, REQUEST_STATUS.FULFILLED)).toBe(
        true,
      );
      expect(workflow.isValidTransition(REQUEST_STATUS.FULFILLED, REQUEST_STATUS.CLOSED)).toBe(
        true,
      );
      expect(
        workflow.isValidTransition(REQUEST_STATUS.UNDER_REVIEW, REQUEST_STATUS.NEED_INFO),
      ).toBe(true);
      expect(workflow.isValidTransition(REQUEST_STATUS.NEED_INFO, REQUEST_STATUS.SUBMITTED)).toBe(
        true,
      );
    });

    it('rejects invalid transitions', () => {
      // Direct jump from submitted to fulfilled is invalid
      expect(workflow.isValidTransition(REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.FULFILLED)).toBe(
        false,
      );
      // Terminal states cannot transition to anything
      expect(workflow.isValidTransition(REQUEST_STATUS.REJECTED, REQUEST_STATUS.UNDER_REVIEW)).toBe(
        false,
      );
      expect(workflow.isValidTransition(REQUEST_STATUS.CLOSED, REQUEST_STATUS.SUBMITTED)).toBe(
        false,
      );
      expect(workflow.isValidTransition(REQUEST_STATUS.CANCELLED, REQUEST_STATUS.APPROVED)).toBe(
        false,
      );
    });

    dbTest('enforces feedback requirement on rejection (min 5 characters)', async () => {
      const [[anyEmp]] = await sequelize.query('SELECT id FROM employees WHERE status = 1 LIMIT 1');
      const empId = (anyEmp as any).id;

      // Create a test request in under_review status
      const testReq = await requests.create({
        request_no: `TEST-REJ-${Date.now()}`,
        employee_id: empId,
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        title: 'Test Rejection Request',
        reason: 'Testing feedback constraint on rejection',
        priority: 2,
        request_status: REQUEST_STATUS.UNDER_REVIEW,
        status: 1,
        created_by: adminActor.id,
      });

      const reqId = Number(testReq.get('id'));

      // Attempt to reject without feedback
      await expect(
        workflow.transition({
          requestId: reqId,
          toStatus: REQUEST_STATUS.REJECTED,
          actor: adminActor,
          feedback: '',
        }),
      ).rejects.toThrow(/Feedback is required with minimum 5 characters/);

      // Attempt to reject with short feedback
      await expect(
        workflow.transition({
          requestId: reqId,
          toStatus: REQUEST_STATUS.REJECTED,
          actor: adminActor,
          feedback: 'No',
        }),
      ).rejects.toThrow(/Feedback is required with minimum 5 characters/);

      // Successfully reject with valid feedback
      const rejected = await workflow.transition({
        requestId: reqId,
        toStatus: REQUEST_STATUS.REJECTED,
        actor: adminActor,
        feedback: 'Budget limit exceeded for this quarter',
      });

      expect(rejected.request_status).toBe(REQUEST_STATUS.REJECTED);
      expect(rejected.decision_feedback).toBe('Budget limit exceeded for this quarter');
    });

    dbTest('enforces feedback requirement on need_info (min 5 characters)', async () => {
      const [[anyEmp]] = await sequelize.query('SELECT id FROM employees WHERE status = 1 LIMIT 1');
      const empId = (anyEmp as any).id;

      const testReq = await requests.create({
        request_no: `TEST-INFO-${Date.now()}`,
        employee_id: empId,
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        title: 'Test Need Info Request',
        reason: 'Testing need_info feedback constraint',
        priority: 2,
        request_status: REQUEST_STATUS.UNDER_REVIEW,
        status: 1,
        created_by: adminActor.id,
      });

      const reqId = Number(testReq.get('id'));

      await expect(
        workflow.transition({
          requestId: reqId,
          toStatus: REQUEST_STATUS.NEED_INFO,
          actor: adminActor,
          feedback: 'Why?',
        }),
      ).rejects.toThrow(/Feedback is required with minimum 5 characters/);

      const needInfo = await workflow.transition({
        requestId: reqId,
        toStatus: REQUEST_STATUS.NEED_INFO,
        actor: adminActor,
        feedback: 'Please specify your preferred operating system and RAM configuration',
      });

      expect(needInfo.request_status).toBe(REQUEST_STATUS.NEED_INFO);
    });
  });

  describe('2. Portal Isolation & IDOR Security', () => {
    const portal = new PortalRequestService();

    dbTest('ensures employee A cannot access employee B request', async () => {
      // Find two distinct employees
      const [empList] = await sequelize.query(
        'SELECT id, user_id FROM employees WHERE status = 1 AND user_id IS NOT NULL LIMIT 2',
      );

      if (empList.length >= 2) {
        const emp1 = empList[0] as any;
        const emp2 = empList[1] as any;

        // Create request for Employee 1
        const reqEmp1 = await requests.create({
          request_no: `TEST-IDOR-${Date.now()}`,
          employee_id: emp1.id,
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          title: 'Employee 1 Confidential Request',
          reason: 'Confidential request for emp1 only',
          priority: 2,
          request_status: REQUEST_STATUS.SUBMITTED,
          status: 1,
          created_by: emp1.user_id,
        });

        const actorEmp2: UserInfo = {
          id: emp2.user_id,
          role_id: 4, // employee
          first_name: 'Other',
          last_name: 'Employee',
          email: 'other@employee.com',
        };

        // Employee 2 attempts to get Employee 1's request -> must 404
        await expect(portal.get(Number(reqEmp1.get('id')), actorEmp2)).rejects.toThrow(
          /Request not found/,
        );
      }
    });

    dbTest('excludes staff-only internal comments from portal response', async () => {
      const [empList] = await sequelize.query(
        'SELECT id, user_id FROM employees WHERE status = 1 AND user_id IS NOT NULL LIMIT 1',
      );
      if (empList.length > 0) {
        const emp = empList[0] as any;

        const req = await requests.create({
          request_no: `TEST-SEC-COMM-${Date.now()}`,
          employee_id: emp.id,
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          title: 'Comment Visibility Request',
          reason: 'Testing comment visibility',
          priority: 2,
          request_status: REQUEST_STATUS.UNDER_REVIEW,
          status: 1,
          created_by: emp.user_id,
        });
        const reqId = Number(req.get('id'));

        // Add public comment
        await request_comments.create({
          request_id: reqId,
          user_id: adminActor.id,
          comment: 'Hello, your request is being reviewed.',
          is_internal: 0,
          status: 1,
          created_by: adminActor.id,
        });

        // Add internal staff-only note
        await request_comments.create({
          request_id: reqId,
          user_id: adminActor.id,
          comment: 'INTERNAL STAFF ONLY: Check if employee is on notice period.',
          is_internal: 1,
          status: 1,
          created_by: adminActor.id,
        });

        const empActor: UserInfo = {
          id: emp.user_id,
          role_id: 4,
          first_name: 'Test',
          last_name: 'Employee',
          email: 'test@employee.com',
        };

        const portalData = await portal.get(reqId, empActor);
        const comments = (portalData.comments as any[]) || [];

        expect(comments.length).toBe(1);
        expect(comments[0].comment).toBe('Hello, your request is being reviewed.');
        expect(comments.some((c) => c.comment.includes('INTERNAL STAFF ONLY'))).toBe(false);
      }
    });
  });

  describe('3. Multi-Workflow Fulfilment & Concurrency', () => {
    const fulfilment = new RequestFulfilmentService();

    dbTest('fulfils new hardware request and assigns available asset', async () => {
      // Find an available asset without active assignments
      const [availAssets] = await sequelize.query(
        'SELECT a.id, a.category_id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
      );
      const [empList] = await sequelize.query('SELECT id FROM employees WHERE status = 1 LIMIT 1');

      if (availAssets.length > 0 && empList.length > 0) {
        const asset = availAssets[0] as any;
        const emp = empList[0] as any;

        const req = await requests.create({
          request_no: `TEST-FULFIL-NEW-${Date.now()}`,
          employee_id: emp.id,
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          category_id: asset.category_id,
          title: 'New Hardware Fulfilment Test',
          reason: 'Testing new hardware fulfilment flow',
          priority: 2,
          request_status: REQUEST_STATUS.APPROVED,
          status: 1,
          created_by: adminActor.id,
        });

        const fulfilled = await fulfilment.fulfil(
          {
            request_id: Number(req.get('id')),
            asset_id: asset.id,
          },
          adminActor,
        );

        expect(fulfilled.request_status).toBe(REQUEST_STATUS.FULFILLED);
        expect(fulfilled.assigned_asset_id).toBe(asset.id);

        // Check asset is now assigned (asset_status = 2)
        const updatedAsset = await assets.findByPk(asset.id);
        expect(Number(updatedAsset?.get('asset_status'))).toBe(2);
      }
    });

    dbTest(
      'concurrency test: second reviewer fulfilling with same asset fails cleanly',
      async () => {
        const [availAssets] = await sequelize.query(
          'SELECT a.id, a.category_id FROM assets a WHERE a.asset_status = 1 AND a.status = 1 AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.returned_at IS NULL) LIMIT 1',
        );
        const [empList] = await sequelize.query(
          'SELECT id FROM employees WHERE status = 1 LIMIT 1',
        );

        if (availAssets.length > 0 && empList.length > 0) {
          const asset = availAssets[0] as any;
          const emp = empList[0] as any;

          // Create Request 1
          const req1 = await requests.create({
            request_no: `TEST-CONCUR-1-${Date.now()}`,
            employee_id: emp.id,
            request_type: REQUEST_TYPE.NEW_HARDWARE,
            category_id: asset.category_id,
            title: 'Concurrent Request 1',
            reason: 'First reviewer request',
            priority: 2,
            request_status: REQUEST_STATUS.APPROVED,
            status: 1,
            created_by: adminActor.id,
          });

          // Create Request 2
          const req2 = await requests.create({
            request_no: `TEST-CONCUR-2-${Date.now()}`,
            employee_id: emp.id,
            request_type: REQUEST_TYPE.NEW_HARDWARE,
            category_id: asset.category_id,
            title: 'Concurrent Request 2',
            reason: 'Second reviewer request',
            priority: 2,
            request_status: REQUEST_STATUS.APPROVED,
            status: 1,
            created_by: adminActor.id,
          });

          // Reviewer 1 fulfils with asset
          const res1 = await fulfilment.fulfil(
            { request_id: Number(req1.get('id')), asset_id: asset.id },
            adminActor,
          );
          expect(res1.request_status).toBe(REQUEST_STATUS.FULFILLED);

          // Reviewer 2 attempts to fulfil with the SAME asset -> must fail cleanly with 409
          await expect(
            fulfilment.fulfil(
              { request_id: Number(req2.get('id')), asset_id: asset.id },
              adminActor,
            ),
          ).rejects.toThrow(/Asset is not available in stock/);
        }
      },
    );
  });

  describe('4. Background Jobs: SLA & Auto-Close', () => {
    dbTest('detects and marks SLA breach for overdue requests', async () => {
      const [[anyEmp]] = await sequelize.query('SELECT id FROM employees WHERE status = 1 LIMIT 1');
      const empId = (anyEmp as any).id;

      // Create request with sla_due_at in the past
      const pastDate = new Date(Date.now() - 3600000);
      const overdueReq = await requests.create({
        request_no: `TEST-SLA-BREACH-${Date.now()}`,
        employee_id: empId,
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        title: 'Overdue SLA Test Request',
        reason: 'Testing SLA breach detection job',
        priority: 4,
        request_status: REQUEST_STATUS.UNDER_REVIEW,
        sla_due_at: pastDate,
        sla_breached: 0,
        status: 1,
        created_by: adminActor.id,
      });

      const breachedCount = await runSlaCheck();
      expect(breachedCount).toBeGreaterThanOrEqual(1);

      const refreshed = await requests.findByPk(Number(overdueReq.get('id')));
      expect(refreshed?.get('sla_breached')).toBe(1);
    });

    dbTest('auto-closes fulfilled request past the auto-close cutoff', async () => {
      const [[anyEmp]] = await sequelize.query('SELECT id FROM employees WHERE status = 1 LIMIT 1');
      const empId = (anyEmp as any).id;

      // Create fulfilled request with fulfilled_at 10 days ago
      const oldFulfilledDate = new Date(Date.now() - 10 * 86400000);
      const fulfilledReq = await requests.create({
        request_no: `TEST-AUTOCLOSE-${Date.now()}`,
        employee_id: empId,
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        title: 'Auto Close Test Request',
        reason: 'Testing auto close job',
        priority: 2,
        request_status: REQUEST_STATUS.FULFILLED,
        fulfilled_at: oldFulfilledDate,
        status: 1,
        created_by: adminActor.id,
      });

      const closedCount = await runAutoCloseFulfilled();
      expect(closedCount).toBeGreaterThanOrEqual(1);

      const refreshed = await requests.findByPk(Number(fulfilledReq.get('id')));
      expect(refreshed?.get('request_status')).toBe(REQUEST_STATUS.CLOSED);
      expect(refreshed?.get('closed_at')).toBeDefined();
    });
  });
});
