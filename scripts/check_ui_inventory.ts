import fs from "fs";
import path from "path";
import { PATHS } from "../apps/web/src/routes/paths";

const inventoryPath = path.resolve(__dirname, "../docs/UI_INVENTORY.md");
const content = fs.readFileSync(inventoryPath, "utf-8");

console.log(
  "Verifying UI Inventory coverage against registered application routes...",
);

const routeEntries = Object.entries(PATHS).filter(
  ([key, val]) =>
    key !== "ROOT" && key !== "NOT_FOUND" && typeof val === "string",
);

let missingCount = 0;

for (const [key, route] of routeEntries) {
  // Normalize parametrized routes: /employees/:id -> /employees/:id
  const needle = route;
  if (!content.includes(needle)) {
    console.error(`Missing route in docs/UI_INVENTORY.md: [${key}] ${route}`);
    missingCount++;
  }
}

// Check total count line in UI_INVENTORY.md
const totalMatch = content.match(
  /Total Inventory Count:\s*\*\*(\d+)\s*items\*\*/,
);
if (!totalMatch) {
  console.error(
    "Could not find 'Total Inventory Count: **<N> items**' in docs/UI_INVENTORY.md",
  );
  process.exit(1);
}

const totalCount = parseInt(totalMatch[1], 10);
console.log(`UI Inventory registered items: ${totalCount}`);

if (missingCount > 0) {
  console.error(
    `UI Inventory check failed: ${missingCount} route(s) missing from inventory.`,
  );
  process.exit(1);
}

console.log(
  "All application routes and overlays are properly accounted for in UI_INVENTORY.md!",
);
process.exit(0);
