import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class ClearancePdfService {
  private ensureStorageDir(): string {
    const dir = path.resolve(process.cwd(), 'storage/clearance');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async generateClearancePdf(
    caseRecord: any,
    settings: Record<string, string>,
  ): Promise<{ filePath: string; fileName: string; hash: string }> {
    const storageDir = this.ensureStorageDir();
    const fileName = `Clearance_${caseRecord.case_no}_${Date.now()}.pdf`;
    const fullPath = path.join(storageDir, fileName);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(fullPath);
    doc.pipe(writeStream);

    const companyName = settings.company_name || 'Acme Technologies Inc.';
    const companyAddress = settings.company_address || '123 Tech Park, Silicon Valley, CA';
    const hrSignatory = settings.clearance_signatory_hr || 'Head of Human Resources';
    const itSignatory = settings.clearance_signatory_it || 'IT Infrastructure Manager';

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(companyAddress, { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('OFFBOARDING CLEARANCE CERTIFICATE', { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#4f46e5')
      .text(`Certificate #: ${caseRecord.clearance_number || 'CLR-' + caseRecord.case_no}`, {
        align: 'center',
      });
    doc.moveDown(1);

    // Employee & Case Info Card
    const emp = caseRecord.employee || {};
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Employee & Case Details');
    doc.moveDown(0.3);

    const startY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text(`Employee Name: ${emp.first_name || ''} ${emp.last_name || ''}`, 40, startY);
    doc.text(`Employee Code: ${emp.employee_code || '—'}`, 40, startY + 14);
    doc.text(`Department: ${emp.department?.name || '—'}`, 40, startY + 28);
    doc.text(`Designation: ${emp.designation?.name || '—'}`, 40, startY + 42);

    doc.text(`Case Number: ${caseRecord.case_no}`, 300, startY);
    doc.text(`Resignation Date: ${caseRecord.resignation_date || '—'}`, 300, startY + 14);
    doc.text(`Last Working Date: ${caseRecord.last_working_date || '—'}`, 300, startY + 28);
    doc.text(
      `Clearance Issued: ${caseRecord.clearance_issued_at ? new Date(caseRecord.clearance_issued_at).toLocaleDateString() : new Date().toLocaleDateString()}`,
      300,
      startY + 42,
    );

    doc.y = startY + 65;
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);

    // Section 1: Hardware Assets Handover
    const tasks = caseRecord.tasks || [];
    const assetTasks = tasks.filter((t: any) => t.task_type === 1);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`1. Hardware Assets Returned (${assetTasks.length})`);
    doc.moveDown(0.3);
    if (assetTasks.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text('No company hardware assets were assigned to this employee.');
    } else {
      assetTasks.forEach((t: any) => {
        const statusText =
          t.task_status === 4 ? '[WAIVED]' : t.task_status === 5 ? '[EXCEPTION]' : '[RETURNED]';
        const cond = t.return_condition ? `(Condition: ${t.return_condition})` : '';
        const notes = t.outcome_notes ? ` - ${t.outcome_notes}` : '';
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1f2937')
          .text(`• ${statusText} ${t.ref_label || t.title} ${cond}${notes}`);
      });
    }
    doc.moveDown(0.6);

    // Section 2: Software Licenses
    const softwareTasks = tasks.filter((t: any) => t.task_type === 2);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`2. Software Licenses & Seats Revoked (${softwareTasks.length})`);
    doc.moveDown(0.3);
    if (softwareTasks.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text('No licensed software seats were allocated to this employee.');
    } else {
      softwareTasks.forEach((t: any) => {
        const statusText = t.task_status === 4 ? '[WAIVED]' : '[REVOKED]';
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1f2937')
          .text(`• ${statusText} ${t.ref_label || t.title}`);
      });
    }
    doc.moveDown(0.6);

    // Section 3: Credentials & Access
    const credTasks = tasks.filter((t: any) => t.task_type === 3);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`3. Credentials & Vault Accounts Disabled (${credTasks.length})`);
    doc.moveDown(0.3);
    if (credTasks.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text('No company login credentials were registered for this employee.');
    } else {
      credTasks.forEach((t: any) => {
        const statusText = t.task_status === 4 ? '[WAIVED]' : '[DISABLED]';
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1f2937')
          .text(`• ${statusText} ${t.ref_label || t.title}`);
      });
    }
    doc.moveDown(0.6);

    // Section 4: Open Requests Cancelled
    const reqTasks = tasks.filter((t: any) => t.task_type === 4);
    if (reqTasks.length > 0) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`4. Open Self-Service Requests Auto-Cancelled (${reqTasks.length})`);
      doc.moveDown(0.3);
      reqTasks.forEach((t: any) => {
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1f2937')
          .text(`• [CANCELLED] ${t.ref_label || t.title}`);
      });
      doc.moveDown(0.6);
    }

    // Section 5: Checklist Items
    const checklistTasks = tasks.filter((t: any) => t.task_type === 5);
    if (checklistTasks.length > 0) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`5. Offboarding Checklist Items (${checklistTasks.length})`);
      doc.moveDown(0.3);
      checklistTasks.forEach((t: any) => {
        const statusText =
          t.task_status === 4 ? '[WAIVED]' : t.task_status === 3 ? '[COMPLETED]' : '[PENDING]';
        const notes = t.waive_reason
          ? ` (Reason: ${t.waive_reason})`
          : t.outcome_notes
            ? ` (${t.outcome_notes})`
            : '';
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1f2937')
          .text(`• ${statusText} ${t.title}${notes}`);
      });
      doc.moveDown(0.8);
    }

    // Signatures
    const signY = Math.max(doc.y + 20, 680);
    doc.strokeColor('#9ca3af').lineWidth(1).moveTo(40, signY).lineTo(220, signY).stroke();
    doc.strokeColor('#9ca3af').lineWidth(1).moveTo(375, signY).lineTo(555, signY).stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(hrSignatory, 40, signY + 6);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Human Resources Authorization', 40, signY + 18);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(itSignatory, 375, signY + 6);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('IT & Infrastructure Department', 375, signY + 18);

    // Verification Hash & Footer
    const hash = crypto
      .createHash('sha256')
      .update(`${caseRecord.case_no}_${caseRecord.employee_id}_${Date.now()}`)
      .digest('hex');
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text(`Verification Hash: ${hash} | Generated at: ${new Date().toISOString()}`, 40, 760, {
        align: 'center',
      });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    return { filePath: fullPath, fileName, hash };
  }

  async generateHandoverReceiptPdf(
    caseRecord: any,
    receivedAssets: any[],
    handoverUser: any,
    settings: Record<string, string>,
  ): Promise<{ filePath: string; fileName: string; hash: string }> {
    const storageDir = this.ensureStorageDir();
    const fileName = `HandoverReceipt_${caseRecord.case_no}_${Date.now()}.pdf`;
    const fullPath = path.join(storageDir, fileName);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(fullPath);
    doc.pipe(writeStream);

    const companyName = settings.company_name || 'Acme Technologies Inc.';
    const companyAddress = settings.company_address || '123 Tech Park, Silicon Valley, CA';

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(companyAddress, { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc
      .fontSize(15)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('HARDWARE ASSET HANDOVER RECEIPT', { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#4f46e5')
      .text(`Case Ref: ${caseRecord.case_no}`, { align: 'center' });
    doc.moveDown(1);

    const emp = caseRecord.employee || {};
    const startY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text(
      `Employee: ${emp.first_name || ''} ${emp.last_name || ''} (${emp.employee_code || '—'})`,
      40,
      startY,
    );
    doc.text(`Department: ${emp.department?.name || '—'}`, 40, startY + 14);

    const receiverName = handoverUser
      ? `${handoverUser.first_name} ${handoverUser.last_name || ''}`
      : 'Hardware Team';
    doc.text(`Received By: ${receiverName}`, 300, startY);
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, 300, startY + 14);

    doc.y = startY + 40;
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`Received Hardware Items (${receivedAssets.length})`);
    doc.moveDown(0.4);

    if (receivedAssets.length === 0) {
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text('No assets listed on this receipt.');
    } else {
      receivedAssets.forEach((item: any, idx: number) => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1f2937')
          .text(`${idx + 1}. ${item.title || item.ref_label || 'Asset'}`);
        doc.fontSize(8.5).font('Helvetica').fillColor('#4b5563');
        if (item.return_condition) doc.text(`   Condition: ${item.return_condition}`);
        if (item.to_status) doc.text(`   Status: ${item.to_status}`);
        if (item.outcome_notes) doc.text(`   Notes: ${item.outcome_notes}`);
        doc.moveDown(0.3);
      });
    }

    const signY = 680;
    doc.strokeColor('#9ca3af').lineWidth(1).moveTo(40, signY).lineTo(220, signY).stroke();
    doc.strokeColor('#9ca3af').lineWidth(1).moveTo(375, signY).lineTo(555, signY).stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`${emp.first_name || ''} ${emp.last_name || ''}`, 40, signY + 6);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Surrendering Employee Signature', 40, signY + 18);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(receiverName, 375, signY + 6);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Receiving Officer Signature', 375, signY + 18);

    const hash = crypto
      .createHash('sha256')
      .update(`HANDOVER_${caseRecord.case_no}_${Date.now()}`)
      .digest('hex');
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text(`Receipt Verification: ${hash} | Generated at: ${new Date().toISOString()}`, 40, 760, {
        align: 'center',
      });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    return { filePath: fullPath, fileName, hash };
  }
}
