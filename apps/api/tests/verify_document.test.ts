import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { ClearancePdfService } from '../Services/clearance_pdf.service';
import { offboarding_cases } from '../Database/Schema';

describe('V6: POST /offboarding/verify-document hardening', () => {
  let pdfService: ClearancePdfService;

  beforeEach(() => {
    vi.restoreAllMocks();
    pdfService = new ClearancePdfService();
  });

  it('returns exactly { valid: false, case_no: null, issued_at: null } for empty or whitespace code without throwing', async () => {
    const result1 = await pdfService.verifyDocument('');
    expect(result1).toEqual({ valid: false, case_no: null, issued_at: null });

    const result2 = await pdfService.verifyDocument('   ');
    expect(result2).toEqual({ valid: false, case_no: null, issued_at: null });
  });

  it('returns exactly { valid: false, case_no: null, issued_at: null } for invalid code with constant-time compare', async () => {
    vi.spyOn(offboarding_cases, 'findOne').mockResolvedValue(null as any);
    const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

    const result = await pdfService.verifyDocument('CLR-2026-INVALID-CODE');

    expect(result).toEqual({ valid: false, case_no: null, issued_at: null });
    // Proves crypto.timingSafeEqual was invoked on fixed-length digests
    expect(timingSafeEqualSpy).toHaveBeenCalled();
    const [buf1, buf2] = timingSafeEqualSpy.mock.calls[0];
    expect(Buffer.isBuffer(buf1)).toBe(true);
    expect(Buffer.isBuffer(buf2)).toBe(true);
    expect(buf1.length).toBe(32); // SHA-256 digest length
    expect(buf2.length).toBe(32);
  });

  it('returns exactly { valid: true, case_no, issued_at } with identical keys for valid code', async () => {
    const issuedDate = new Date('2026-11-19T10:00:00.000Z');
    const mockCase = {
      get: (key: string) => {
        if (key === 'verification_code') return 'CLR-2026-0001-A1B2C3';
        if (key === 'case_no') return 'OB-2026-0001';
        if (key === 'clearance_issued_at') return issuedDate;
        return null;
      },
    };

    vi.spyOn(offboarding_cases, 'findOne').mockResolvedValue(mockCase as any);
    const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

    const result = await pdfService.verifyDocument('CLR-2026-0001-A1B2C3');

    expect(result).toEqual({
      valid: true,
      case_no: 'OB-2026-0001',
      issued_at: issuedDate.toISOString(),
    });
    // Response must strictly have only these 3 keys (no employee details, no secrets)
    expect(Object.keys(result).sort()).toEqual(['case_no', 'issued_at', 'valid']);
    expect(timingSafeEqualSpy).toHaveBeenCalled();
  });
});
