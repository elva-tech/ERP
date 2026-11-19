## Colour tokens

All theme colours are defined once, in the `@theme` block of `src/index.css`. Tailwind turns each
`--color-<name>` into utility classes, for example `--color-brand` → `bg-brand`, `text-brand`, `border-brand`.
To change a colour everywhere, change its hex value in `index.css` only.

### Sidebar

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `sidebar` | `#111c3a` | Sidebar background |
| `sidebar-active` | `#1b2a4a` | Active menu item background |
| `sidebar-text` | `#94a3b8` | Menu item text and the logo subtitle |
| `sidebar-line` | `#252f4a` | Divider lines inside the sidebar |

### Brand (red)

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `brand` | `#c41e3a` | Page "+ New / Record" buttons, active menu marker, required-field `*`, Net Payable amounts, KPI accents, charts |
| `brand-strong` | `#c91e3a` | Modal submit button and detail-page primary buttons (Record Receipt, Record Partial Payment) |
| `brand-hover` | `#a9172f` | Hover for both red button types |
| `brand-soft` | `#fdecef` | Light red background (defined, not used yet) |

### Page, cards and text

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `workspace` | `#f4f6f9` | Page background, table header bands, neutral badge background, button hover |
| `surface` | `#ffffff` | Cards, panels, modals, inputs on focus |
| `surface-muted` | `#f8fafc` | Light grey surface (defined, not used yet) |
| `field` | `#fbfcfe` | Form input background |
| `field-line` | `#dce3ed` | Form input border, modal header/footer divider |
| `modal-footer` | `#f7f9fc` | Modal footer background |
| `ink` | `#1e293b` | Main text |
| `ink-soft` | `#334155` | Secondary dark text (error banner detail) |
| `navy` | `#1b2a4a` | Record numbers (PR/PO/Invoice No), detail page titles, focus outlines, "Sent" badge text |
| `muted` | `#64748b` | Secondary text, table headers, labels, neutral badge text |
| `placeholder` | `#94a3b8` | Input placeholders, hints, "Fields marked required" note |
| `line` | `#e2e8f0` | Card borders, table row lines |
| `line-soft` | `#f1f5f9` | Progress bar track, chart tracks, modal close button |

### Accent, links and login

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `accent` | `#0e9f7e` | "+ Add item" links in line-item editors, file dropzone highlight |
| `link` | `#2563eb` | "View" links in tables, report download links |
| `login` | `#1a5276` | Login page Sign In button |
| `login-hover` | `#154360` | Login page Sign In button hover |

### Status colours

| Token | Hex | Used for |
| :-- | :-- | :-- |
| `success` | `#10b981` | Approved/Completed/Active badge text, Approve button, Received quantities |
| `success-soft` | `#d1fae5` | Success badge background |
| `success-muted` | `#e6f4ea` | Softer success badge background (Paid, Partially Paid) |
| `danger` | `#ef4444` | Rejected/Inactive badge text, Reject and Cancel buttons, field errors |
| `danger-soft` | `#fee2e2` | Danger badge background, error banner background |
| `warning` | `#fbbf24` | Pending badge text, Medium priority |
| `warning-strong` | `#f59e0b` | Overdue/Submitted/Suspended badge text, rating stars, warning KPI cards |
| `warning-soft` | `#fef3c7` | Warning badge background |
| `info` | `#3b82f6` | Draft badge text (invoices, subcontract orders) |
| `info-soft` | `#eff6ff` | Info badge background, login page notice |
| `sent-soft` | `#e0e9f5` | "Sent" badge background |

### Badge tones

Status badges never use hex values directly. Each status file maps a status to a **tone**, and
`src/components/ui/badgeStyles.js` maps the tone to colours:

| Tone | Background | Text |
| :-- | :-- | :-- |
| `success` | `success-soft` `#d1fae5` | `success` `#10b981` |
| `successMuted` | `success-muted` `#e6f4ea` | `success` `#10b981` |
| `warning` | `warning-soft` `#fef3c7` | `warning` `#fbbf24` |
| `warningStrong` | `warning-soft` `#fef3c7` | `warning-strong` `#f59e0b` |
| `danger` | `danger-soft` `#fee2e2` | `danger` `#ef4444` |
| `info` | `info-soft` `#eff6ff` | `info` `#3b82f6` |
| `navy` | `sent-soft` `#e0e9f5` | `navy` `#1b2a4a` |
| `neutral` (also any unknown status) | `workspace` `#f4f6f9` | `muted` `#64748b` |

### Which status uses which tone

| Module (status file) | Status → tone |
| :-- | :-- |
| Suppliers (`supplierStatus.js`) | Active → success · Inactive → danger |
| Purchase Requisitions (`requisitionStatus.js`) | Pending Approval → warning · Approved → success · Rejected → danger |
| Requisition priority (`requisitionStatus.js`) | High → danger · Medium → warning · Low → success |
| Purchase Orders (`purchaseOrderStatus.js`) | Draft → neutral · Sent → navy · Partially Received → neutral · Completed → success · Cancelled → neutral |
| Purchase Invoices (`purchaseInvoiceStatus.js`) | Draft → info · Paid → successMuted · Partially Paid → successMuted · Overdue → warningStrong |
| Purchase Returns (`purchaseReturnStatus.js`) | Pending Approval → warningStrong · Credit Note Issued → warningStrong · Rejected → danger |
| Subcontractors (`subcontractorStatus.js`) | Active → success · Suspended → warningStrong · Inactive → success |
| Subcontract Agreements (`subcontractAgreementStatus.js`) | Active → success · Completed → success · Expired → danger |
| Subcontract Orders (`subcontractOrderStatus.js`) | Draft → info · Active → success · Completed → success · Cancelled → neutral |
| Subcontract Bills (`subcontractBillStatus.js`) | Submitted → warningStrong · Verified → success · Approved → success · Paid → success |
| Approvals (`approvalOptions.js`) | Priority HIGH → danger · MED → warning · LOW → success; Decision APPROVED → success · REJECTED → danger |
| Requisition approval history (`RequisitionDetail.jsx`) | Approved → success · Rejected → danger |

Subcontractor "Inactive" uses the green success tone, as in the reference design. Confirm with design whether it should be red.

### Buttons

| Button | Background | Hover |
| :-- | :-- | :-- |
| Page header "+ New / Record" (`PrimaryActionButton`) | `brand` `#c41e3a` | `brand-hover` `#a9172f` |
| Modal submit, detail-page primary | `brand-strong` `#c91e3a` | `brand-hover` `#a9172f` |
| Approve / success | `success` `#10b981` | `#059669` |
| Reject / danger (filled) | `danger` `#ef4444` | `#dc2626` |
| Cancel PO / danger (outline, detail pages) | white, red border and text | `danger-soft` `#fee2e2` |
| Secondary / outline | `surface` `#ffffff` with `line` border | `workspace` `#f4f6f9` |
| Login Sign In | `login` `#1a5276` | `login-hover` `#154360` |

### Charts (`src/components/charts/DonutChart.jsx`)

| Name | Hex |
| :-- | :-- |
| navy | `#1b2a4a` |
| brand | `#c41e3a` |
| success | `#10b981` |
| warning | `#f59e0b` |
| empty track | `#f1f5f9` |

### One-off colours written directly in components

These hex values are not theme tokens. They match specific reference screens and are written inline as
Tailwind arbitrary values (`text-[#1b2631]`). If they become shared, move them into `index.css` as tokens.

| Hex | Where | Used for |
| :-- | :-- | :-- |
| `#1b2631` | `TopBar.jsx`, supplier ledger components | Page title and ledger headings/amounts |
| `#4b5563` | `TopBar.jsx`, supplier ledger components | Search box text, ledger body text |
| `#9ca3af` | `LedgerSummaryCard.jsx` | Ledger labels and supplier code |
| `#e0e0e0` | `TopBar.jsx`, supplier ledger pages | Header bottom border, ledger card borders |
| `#f1f3f5` | `TopBar.jsx` | Header search box background |
| `#f2f4f4` | `App.jsx`, `LedgerStatementTable.jsx` | Ledger page background, ledger table header |
| `#27ae60` | Supplier ledger components | Payments / debit amounts (green) |
| `#dc2626` | Supplier ledger components; also danger button hover | Outstanding / credit amounts (red) |
| `#fdedec` | `LedgerSummaryCard.jsx` | Supplier initials tile background |
| `#ebf5fb` / `#1a5276` | `App.jsx` | Small header tag (background / text) |
| `#059669` | `ModalForm.jsx`, `ApprovalCard.jsx`, `DetailParts.jsx` | Success button hover |
| `#cbd5e1` | `formStyles.js`, `FilterSelect.jsx`, `SupplierReportsPage.jsx` | Input and card border on hover |
| `#f1f2f2`, `#e3e6e8`, `#dfe3e8` | `LoginPage.jsx` | Login page background, card border, input border |
| `#0f172a` (73%) | `Modal.jsx` | Modal backdrop |
| `#0b1226` (50%) | `AppShell.jsx` | Mobile sidebar backdrop |

### Rules

- Use a theme token (`bg-brand`, `text-muted`) instead of a hex value in new code.
- To show a status, add it to the feature's `*Status.js` file with a tone; don't colour badges by hand.
- An unknown status from the backend still renders, as a neutral grey badge with the raw value.