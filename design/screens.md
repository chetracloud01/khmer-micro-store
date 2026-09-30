# Screens

What each screen contains. How it must look and behave is in
`design/design-standard.md`. Phone first (360 px), then tablet and desktop.

Status: **Built** = matches the docs · **Change** = exists, needs the
changes listed · **New** = not built yet.
Phase: from `docs/Winning Strategy` — L = launch, 2 = delivery and
switching, 3 = growth.

## Buyer

Flow: Shop → (Product) → Cart → Checkout → Pay → Order status.

### B1. Shop page `/s/[slug]` — Built · L
- Banner, logo, shop name, Verified badge (after KYC), rating, delivery time.
- Language ខ្មែរ/EN and theme, top right.
- Pinned: search and category chips only.
- Special offers strip; product grid (2 / 3 / 4 columns).
- Product card: photo, title, price in the buyer's currency (other currency
  small), discount badge, Sold out / Only N left (Pro, Advance), + button.
- Floating cart bar: item count, goods total, "View cart".
- Closed notice when the shop is paused.
- Shop name and logo from the seller's profile. Tapping a card opens B2.
- One line under the name: "Delivery from $1.00 · Pickup · Provinces" and
  a call button; it opens "Shop info" (every district and fee, pickup
  address and hours, provinces, how to pay).
- Grey placeholder blocks while loading.
- Later (needs the backend): real rating and delivery time.

### B2. Product detail — Built · L
- Photo carousel (swipe, dots), title, description.
- Price with discount; options (size/colour) as chips with their own price
  and stock; quantity stepper.
- "Add to cart" full width, pinned to the bottom, with the amount.
- On a phone: opens as a bottom sheet over the shop page. Tablet and
  desktop: a centred window with the photo beside the details. Also
  reachable by its own link, `?product=ID` on the shop page (for Facebook
  and TikTok posts), with a Share button.
- Nothing reaches the cart until the button is pressed; an item already in
  the cart opens with its quantity and the button reads "Update cart".
- Later (needs the backend): photo and title in the link preview.

### B3. Cart — Built · L
- Lines with photo, name, price, − / + (capped at stock), remove.
- Add more items; promo code; summary (subtotal, discounts, delivery fee,
  VAT); total in the buyer's currency with the other one small.
- "Checkout" pinned to the bottom.

### B4. Checkout (one page) — Built · L
- Name; phone (+855 prefix).
- **How to get it:** two cards — Delivery (with fee) or Pickup (free, shows
  the shop's pickup address and hours).
- **Where (delivery only):** Phnom Penh → choose district (fee from the
  shop's zones); Province → choose province (sent by bus, fee shown).
  Landmark / note (optional).
- Pay in: USD / KHR.
- Payment cards: only what the shop has set up — KHQR, ABA PayWay, Cash on
  delivery (Phnom Penh delivery or pickup only).
- Order summary; "Place order · total" pinned to the bottom.
- "Remember my details on this phone" (on by default).
- Later: a map pin for the exact spot.

### B5. KHQR payment — Built · L
- Official KHQR card: red header with the KHQR mark, shop name, amount,
  currency, dashed divider, QR with the Bakong mark in the centre.
- Countdown (10:00); "Open bank app"; "Save QR".
- Moves to B6 by itself when paid. Expired state with "Try again".
- Time bar and "pay within 10 minutes or the order is cancelled"; three
  "how to pay" steps.
- The QR is scannable but its content is a mock until Bakong is connected.

### B6. Order status — Built · L
- A link the buyer can reopen any time (also sent on Telegram).
- Header: order number and the current status in plain words.
- Status steps (design standard §7) with the time of each step.
- Out for delivery: driver name and phone, tracking link; or bus company
  and ticket number for provinces.
- Items, fees, total paid; delivery or pickup details; shop phone (tap to call).
- Buttons by status: "Pay now" (awaiting payment), "Cancel order" (before
  packing), "Order again" (delivered).
- Cash on delivery orders land here directly, as "COD pending".
- **Change:** today this is a one-time "Order placed" screen with no
  statuses and no link.

## Seller

Phone first; sidebar from tablet width; tables on desktop.

### S1. Login — Built · L
- Continue with Telegram; Continue with phone (SMS code). Google later.

### S2. Onboarding — Built · L
- Step 1 business type; step 2 shop name, link, optional logo.
- "Your shop is ready": QR code, copy / share link.
- The dashboard checklist (S3) takes over the remaining steps from the
  onboarding workflow, in this order: add products → connect payment
  (Bakong ID) → set delivery → connect Telegram → place a test order →
  share the link. Logo and verification sit underneath as "Good to have".

### S3. Dashboard home — Built · L
- Setup checklist until its six steps are done; plan / payment banner.
- Numbers from the real orders: orders to handle, sales today, cash to
  collect. Dollars and riel are shown side by side, never added together.
- Orders needing action (newest first, five shown) with the next button on
  each; "All caught up" when there are none.
- Sales chart with Today / 7 days / 30 days — sample data until the
  backend has daily totals, and labelled so.

### S4. Orders list — Built · L
- Tabs with counts: To confirm · Packing · Sending · Delivered · Problems
  (cancelled, failed delivery) · All.
- Search by order number, buyer name or phone; date filter.
- Card (phone/tablet) or table row (desktop): order number, buyer, total,
  payment (KHQR paid / COD), delivery or pickup, time, status, next button.
- Uses the shared data grid.

### S5. Order detail — Built · L (delivery booking: 2)
- Status header with the one next button (design standard §7).
- Items; totals; payment (paid by KHQR with reference, or COD amount to collect).
- Buyer: name, phone (tap to call), address, landmark.
- **Send the order** — three routes: own or partner driver (driver name,
  phone, fee; phase 2: quote and tracking link by Telegram) · buyer picks
  up · province bus (company, ticket number).
- COD: "Cash received from driver" before the order completes.
- Problems: cancel with a reason; failed delivery → rebook.
- Print or share the order slip.
- Desktop: two columns (order on the left, actions and timeline on the right).

### S6. Products list — Built · L
- Data grid: search, category / brand / unit filters, bulk delete, export.
- Later (2): "Import" from Google Sheets or Excel.

### S7. Product form — Built · L
- Photos (up to 6); Khmer title, English title + auto-translate;
  category, brand, unit; discount; retail price USD / KHR with auto-fill;
  wholesale price (Pro+); options with their own prices.
- Description in Khmer and English (shown on B2); "Show in shop" switch —
  a hidden product leaves the shop and any cart, and nothing is deleted;
  a new product is kept as a draft on the device while it's typed.
- Later: "Write it for me" from a photo (AI) — shown as "Coming soon".

### S8. Delivery settings — Built · L
- Phnom Penh zones: districts grouped into zones, each with a fee.
  Districts in no zone aren't delivered to.
- Pickup: on/off, address, opening hours.
- Provinces: on/off, bus fee, note for buyers.
- Drivers: own and partner drivers (name, phone) for "Send the order".
- Later: free delivery above an order amount.

### S9. Store settings — Built · L
- Default currency, exchange rate, VAT, cash on delivery, online stock location.
- Delivery fees are on S8; this page links to it.

### S10. Shop profile — Built · L
- Shop details, getting paid (Bakong ID), order alerts, login methods.

### S11. Verification (KYC) — Built · L
### S12. Plan and billing — Built · L
### S13. Stock — Built · L (Pro, Advance)

### S14. Customers — New · 2
- Buyers with order count, total spent, last order; buyer detail with history.

### S15. Discounts — New · 3
- Promo codes (percent or amount, dates, limit); today codes are sample data only.

### S16. Staff — New · 3
- Invite by phone; owner / staff roles.

### S17. Reports — New · 3
- Daily sales, best sellers, delivery success rate.

## Admin (laptop first)

### A1. Overview — Built
### A2. Merchants — Built
### A3. KYC review — Built
### A4. Plans — Built (read-only)
### A5. Audit log — Built
### A6. Settings — Built
### A7. Subscriptions, Invoices — Built · L
- Subscriptions: every store's plan, status and what happens next; tabs for
  renewing this week, overdue, paused, trial ending; extend a period.
- Invoices: list with KHQR reference; statuses Due, Overdue, Paid, Void.
  "Mark as paid" by hand needs a bank reference and reopens the shop;
  "Void" needs a reason. Both go to the audit log.
### A8. Buyer payments, Failed checks — Built · L
- Buyer payments: today's attempts across all stores, read-only; totals per
  currency, never added together.
- Failed checks: attempts a person must look at (no answer, wrong amount,
  wrong currency, paid after expiry). "Check again" or "Close with a note" —
  never "mark as paid".
### A9. Admin users — Built · L
- Roles Owner, Support, Finance from packages/shared admin-roles.ts, with a
  table of what each can do. Invite by Telegram, change role, disable (never
  delete). There is always one active Owner.
- Later (needs the backend): enforcing roles per admin, and 2FA login.

## Build order

Buyer first, then the seller screens the buyer flow depends on.

1. ~~B4 Checkout + S8 Delivery settings~~ — done.
2. ~~B5 KHQR card~~ — done.
3. ~~B6 Order status + S4 Orders list + S5 Order detail~~ — done.
4. ~~B2 Product detail + S7 product form changes~~ — done.
5. ~~B1 Shop page changes; S2 / S3 checklist and dashboard changes~~ — done.
6. ~~Admin A7–A9~~ — done.
7. Phase 2 and 3 screens.
