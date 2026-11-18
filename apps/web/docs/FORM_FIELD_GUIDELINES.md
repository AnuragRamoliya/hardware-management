# Form field guidelines

## Choose a control

- Use an async single select for a foreign key such as `department_id`, `role_id`, or `manager_id`. Store and submit the selected record ID; show its label to the user.
- Use an async multi select only when the API field accepts multiple IDs.
- Use a static select for a small, stable enum. Define its values and labels in `src/utils/constants.ts` and reuse those values in badges.
- Keep genuine user-entered values such as names, descriptions, email addresses, dates, and notes as text or the appropriate input type. Do not turn a value into a reference unless there is a master resource for it.
- Optional selects should expose a clear action; required selects should not.
- When an edit form receives an ID without a loaded label, hydrate that ID through the resource options endpoint.
- Use the shared Radix select primitives for a consistent trigger, searchable dropdown, keyboard navigation, and option labels. Multi selects show removable label chips above the trigger.

## Options endpoint naming

Use `POST <resource>/options` for async selects, with a body containing `search`, `page`, `limit`, optional `ids`, and supported `filters`. Each item should provide `value`, `label`, and an optional `subLabel`.

## Add a new options resource in five steps

1. Add or confirm the resource schema and its stable primary key.
2. Add a `buildOptions` reader in the API options configuration, selecting a concise label and useful sub-label and allowlisting supported filters.
3. Register the protected `POST <resource>/options` route and document its request and response in Swagger.
4. Add the endpoint path and typed resource field to the web client; use the async select and pass only IDs in form payloads.
5. Add tests for searching, paging, ID hydration, supported filters, and form submission with IDs.

For dependent selects, include the parent ID in `filters` and clear the child value when the parent changes. List filters should send IDs (arrays for multi filters), and chips should display labels.
