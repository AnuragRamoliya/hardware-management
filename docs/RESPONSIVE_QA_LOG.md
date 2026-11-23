# Responsive QA Log (DOM & Geometry Measurements)

Log of every inspected screen, modal, drawer, popup, popover, dropdown, and form field across viewports, devices, and themes. All results are measured via real browser DOM geometry (`scrollWidth`, `innerWidth`, `clientWidth`, `getBoundingClientRect`, `visualViewport`, computed styles, and axe accessibility violation counts).

## Log Entries Format

- **ID**: Inventory ID (`AUTH-01`, `EMP-02`, etc.)
- **Viewport**: WxH in CSS px
- **Browser / Engine**: Chromium / WebKit / Firefox
- **Theme**: Light / Dark
- **Result**: PASS / FAIL (with failure details)
- **Measured Evidence**:
  - `scrollWidth` vs `innerWidth` (horizontal overflow: must be `<=`)
  - Panel geometry vs `visualViewport` (modal / drawer fit)
  - Interactive touch targets (`width x height >= 44x44px`, `spacing >= 8px`)
  - Axe a11y violations count (must be `0`)
- **Defect Reference**: `UI-BUG-xxx` (if applicable)

---

## Audit Log Entries

| ID  | Viewport | Browser | Theme | Status | Measured Geometry / Dimensions | Touch Targets | Axe Violations | Defect ID |
| :-- | :------- | :------ | :---- | :----: | :----------------------------- | :------------ | :------------: | :-------- |
