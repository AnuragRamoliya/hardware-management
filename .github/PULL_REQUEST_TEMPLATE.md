## Description

<!-- Provide a brief overview of changes in this PR -->

## Type of Change

- [ ] `feat`: New feature or capability
- [ ] `fix`: Bug fix
- [ ] `refactor`: Code refactoring without behavioral changes
- [ ] `chore`: Build, workspace, or tooling maintenance
- [ ] `docs`: Documentation updates
- [ ] `test`: Unit, integration, or visual tests

## Scope

- [ ] `@hm/shared`: Shared types, constants, contracts
- [ ] `@hm/api`: Express API, routes, services, database
- [ ] `@hm/web`: Vite frontend, components, pages
- [ ] Tooling / Infra: Docker, CI workflows, ESLint, TSConfig

---

## Module Quality Checklist (per `docs/MODULE_CHECKLIST.md`)

### UI Standards

- [ ] Standard layout (`PageHeader`, filters button + count badge, `TableFilterPanel`, `ActiveFilterChips`)
- [ ] Action buttons & menus gated with proper RBAC permission checks
- [ ] `CommonTable` with sorting, pagination, mobile responsive cards
- [ ] Forms implement dirty guard, prefill skeleton, validation via Yup/Zod
- [ ] Select fields use generic `/options` endpoints
- [ ] Status badges match standard design system tokens
- [ ] Light & Dark mode tested

### API Standards

- [ ] Standard response envelope: `{ message, data }`
- [ ] Generic POST `/<resource>/list` and `/<resource>/options` contracts
- [ ] Proper error handling via `asyncHandler` and `AppError`
- [ ] Activity logs written in transactional boundaries
- [ ] Zero secret leaks in response payloads

### Quality & Testing

- [ ] `npm run lint` passes across all packages
- [ ] `npm run typecheck` passes across all packages
- [ ] `npm run check:ui` passes for web
- [ ] `npm test` passes
- [ ] No `.env` files or secrets included
