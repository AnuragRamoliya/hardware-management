import { software_licenses, software_assignments } from '../Database/Schema';

/** License keys are encrypted by the service before they are written. */
export const SoftwareLicenseRecord = software_licenses;
export const LicenseAssignmentRecord = software_assignments;
