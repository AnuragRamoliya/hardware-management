# Product Backlog & Future Enhancements

The following features were scoped out of Phase 1–7 foundational releases and are scheduled for post-v1.0.0 milestone planning:

---

## 1. Scheduled & Emailed Report Dispatch

- **Description**: Ability for administrators to configure recurring cron schedules (e.g. every Monday at 08:00) that automatically execute reports, generate PDF/XLSX attachments, and email them to designated management distribution lists.
- **Architecture**: Integration with Node-cron or BullMQ redis job queues.

---

## 2. Self-Service Dynamic Report Builder

- **Description**: Visual drag-and-drop report designer allowing managers to select resource entities, choose custom column projections, define multi-level filters, and save custom views without code changes.

---

## 3. Background Web Push Notifications

- **Description**: Browser Web Push API integration using VAPID keys to deliver hardware request approval alerts and offboarding task reminders even when the application tab is closed.

---

## 4. Hardware Barcode / QR Code Scanner via Camera

- **Description**: Mobile browser camera integration (via HTML5 QR/Barcode reader) allowing IT inventory technicians to scan physical asset tags directly during receiving, assignment, or return verification.

---

## 5. Single Sign-On (SSO) & SCIM Directory Sync

- **Description**: Enterprise SAML 2.0 / OIDC authentication (Okta, Azure AD / Entra ID, Google Workspace) and automated SCIM 2.0 user lifecycle synchronization for onboarding and offboarding.
