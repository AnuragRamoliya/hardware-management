# @hm/eslint-config

Shared ESLint flat configurations for the hardware-management monorepo.

- `base.js`: Core rules, Prettier integration, disallowing untyped `any`.
- `node.js`: Node.js specific globals and CJS/MJS overrides.
- `react.js`: React Hooks, React Refresh, architectural import restrictions (prohibiting direct Axios outside `src/api` and raw inputs outside `components/ui`).
