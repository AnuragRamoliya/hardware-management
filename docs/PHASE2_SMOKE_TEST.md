# Phase 2 manual smoke test

Run against a migrated development database with a `super_admin` or `hardware_manager` account. Keep the API and web apps on their normal development commands and use the browser network panel to confirm requests and responses.

## Inventory and assignments

1. Open **Inventory → Assets**, create an asset with a category, location, serial number, warranty date, and a couple of `specs` key/value pairs. Confirm its generated tag follows `AST-000001` formatting and the new row appears in the list.
2. Open the asset. Check Overview, Assignment history, Maintenance, Accessories, and Activity. Open the QR label and verify it renders and prints.
3. Assign it to an active employee. Confirm the asset status changes to Assigned and the employee page's Hardware tab shows it.
4. Transfer it to a second active employee. Confirm the old assignment has a return timestamp and exactly one current assignment remains.
5. Return the asset with a condition and destination status. Confirm it becomes available (or the selected maintenance/retired/lost status) and both employee histories show the result.
6. Use **Unassigned assets** to assign an available asset. Try deleting an assigned asset and confirm the API rejects it.
7. Import a CSV with one valid row and one invalid category/vendor. Confirm the import result reports each rejected row and download the CSV template.
8. Change the Assets filters, refresh the page, and verify filter values stay in the URL and the server list changes. Check the list and options endpoints with the bulk seed in place.

## Software and seats

1. Open **Software**, create a product, then open its detail and add a one-seat license. Enter a test license key and confirm the list response never contains the key.
2. Assign the license to an active employee. Attempt a second assignment and confirm it is rejected because no seats remain.
3. Revoke the first assignment and verify the seat becomes available again. Confirm the employee's Software tab updates.

## Employee portal and alerts

1. Sign in as an employee linked to an employee record. Open **My Assets** and **My Software** and verify they show only that employee's own items. Calls to `/portal/assets` and `/portal/software` must not use an employee ID parameter.
2. Trigger the expiry job from the API directory:

   ```sh
   npx tsx -e "import { runExpiryAlerts } from './Services/notification'; runExpiryAlerts().then((count) => { console.log('Alerts processed:', count); process.exit(0); }).catch((error) => { console.error(error); process.exit(1); });"
   ```

3. Create or adjust a warranty, software renewal, or license expiry inside 30 days and an overdue assignment, then rerun the job. Confirm alerts appear under **Notifications**, can be marked read, and a second run does not create duplicates for the same record and threshold.

## Responsive and permission checks

Repeat the asset/software list and detail checks at 360, 768, 1024, and 1440 px in both light and dark themes. Confirm filters, dialogs, tabs, and actions remain keyboard reachable. Verify `hardware_manager` can manage Phase 2 records, `hr` has read-only access, and employee sessions can only use the read-only portal routes.
