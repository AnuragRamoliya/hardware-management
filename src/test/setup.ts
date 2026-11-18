import "@testing-library/jest-dom/vitest";

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
