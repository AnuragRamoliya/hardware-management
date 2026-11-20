import { createApp } from '../Config/app';

export interface RouteEntry {
  method: string;
  path: string;
  middleware: string[];
}

function cleanRegexp(regex: RegExp): string {
  if (!regex || (regex as any).fast_slash) return '';
  const src = regex.source;
  const match = /^\^\\\/([a-zA-Z0-9_\-\\/]+?)(?:\\\/\?)?(?:\(\?=\\\/\|\$\)|\$)/.exec(src);
  if (match && match[1]) {
    return '/' + match[1].replace(/\\/g, '');
  }
  return '';
}

export function listAllRoutes(): RouteEntry[] {
  const app = createApp();
  const routes: RouteEntry[] = [];

  function traverse(stack: any[], prefix = ''): void {
    for (const layer of stack) {
      if (layer.route) {
        const fullPath = (prefix + layer.route.path).replace(/\/+/g, '/');
        for (const [method, enabled] of Object.entries(layer.route.methods)) {
          if (enabled) {
            routes.push({
              method: method.toUpperCase(),
              path: fullPath,
              middleware: layer.route.stack.map((s: any) => s.name || 'anonymous'),
            });
          }
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const sub = cleanRegexp(layer.regexp);
        traverse(layer.handle.stack, prefix + sub);
      }
    }
  }

  traverse((app as any).router.stack);
  return routes;
}

if (process.argv[1] && process.argv[1].includes('audit_routes')) {
  const allRoutes = listAllRoutes();
  console.log(`Total Routes: ${allRoutes.length}`);
  for (const r of allRoutes) {
    console.log(`${r.method.padEnd(7)} ${r.path.padEnd(50)} [${r.middleware.join(', ')}]`);
  }
}
