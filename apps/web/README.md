# itam-web

Phase 1 foundation for the IT Asset & Employee Management admin application.

## Requirements

- Node.js 20+
- API server reachable at `VITE_HOST_API`

Copy `.env.example` to `.env`, set `VITE_HOST_API` to the API origin (the local API defaults to
`http://localhost:8000/`), then run:

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

The app uses React Query for server state, a persisted Zustand auth store, and the `plain-text: true` API header. Theme preference follows the system initially and is persisted by `next-themes`.

## Phase 1 scope

Includes the app shell, design-system showcase, authentication flows, admin resource views, employee detail tabs, portal entry points, typed API services, route/role/permission guards, and test foundations. Later-phase asset/software/credential/request/offboarding/report functionality is intentionally not implemented.

## Backend contract

The web app sends JSON with `plain-text: true`, carries the access token in the `token` header,
and expects the `{ message, data }` response envelope. List requests use
`POST /<resource>/list` with
`{ currentPage, itemsPerPage, filters, sortBy, general_search }`; list data is
`{ rows, count }`. Auth and role-permission requests use the paths documented by the Phase 1 API.
