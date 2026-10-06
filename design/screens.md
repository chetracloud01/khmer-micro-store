# Screens

What each screen contains. How it must look and behave is in
`design/design-standard.md`. Phone first (360 px), then tablet and desktop.

Status: **Built** = matches the docs · **Change** = exists, needs the
changes listed · **New** = not built yet.
Phase: from `docs/blueprint.md` "Market and how we win" — L = launch, 2 = delivery and
switching, 3 = growth.

## Mascot

Mio, the Khmio rabbit (docs/platform-launch-plan.md, Stage 1), drawn only
by the `Mio` component in `packages/ui`. Decoration unless it says
something: then it gets a label from the translation files.

| Screen | Mio | Status |
| --- | --- | --- |
| S1 Login | Mio's face above the sign-in buttons | Mockup |
| S4 Orders list, empty | Mio above "No orders yet" | Mockup |
| B5 KHQR payment, paid | Mio with a riel coin, a small hop, "Paid!", then B6 | Mockup |
| Telegram bot photo, stickers | From the designer's final artwork | Later |

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
- Moves to B6 by itself when paid, after a 1.5-second "Paid!" moment with
  Mio (see Mascot). Expired state with "Try again".
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
- Mio's face at the top (see Mascot).

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
- Uses the shared data grid. Empty list: Mio above "No orders yet".

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
- New role **Website editor** (with A10–A12): may edit, preview and publish
  website content, nothing else — no shops, money or settings.

### A10. Website pages — New · Website
- List of pages (Home, each product page, Pricing, Help, Terms, Privacy):
  status (published / draft changes), last published, by whom.
- A page: its sections in order, each with on/off, move up/down, edit,
  remove; "Add section" from the site kit. Editing opens a form built from
  the section's schema, with Khmer and English side by side (tabs on a
  phone) and the usual field checks.
- Link preview: title, description, picture.
- **Draft → Preview → Publish.** Edits stay a draft until Publish; Preview
  shows the page exactly as visitors will, at phone and desktop width.
  Publish refuses a page with missing Khmer or English text or a picture
  without a description, and lists what's missing.
- History: every published version with date and editor; "Restore" makes
  that version the new draft. Publish, restore and remove go to the audit
  log.

### A11. Promotions — New · Website
- List: title, where it shows (page and position), start and end, status
  (scheduled / showing / ended), on/off.
- Form: title, line, picture, button text and link (Khmer and English),
  pages, start and end date and time (Phnom Penh time). An end before the
  start is refused. Ended promotions stay in the list, never deleted.

### A12. Pictures — New · Website
- Library of uploaded pictures: thumbnail, description (Khmer and English),
  size, where it's used. Upload shrinks the picture in the browser first
  (as product photos do) and needs both descriptions.
- A picture in use can't be deleted; replacing it updates every page that
  uses it after the next publish.

## Platform website (Khmio)

The public site on `khmio.com` that presents every product, from
docs/platform-launch-plan.md Stage 3. Mockups live under `/mockup/site`;
the real pages replace the placeholder home page later. Brand rules:
design/brand-guide.md. Visitors arrive from social media on a phone, often
inside the TikTok or Facebook browser: phone first, fast, one clear action.

**Edited from the admin, not in code.** Every page is a list of sections
from one fixed set (the site kit below). Text, pictures, promotions and
product cards are content: the admin edits it (A10–A12), previews it and
publishes it, and the site shows it within seconds — no code, no deploy.
The admin never moves boxes freely: the code always decides the layout,
fonts, colours and spacing, so whatever is typed looks right on a phone.
The mockups read sample content shaped exactly like the future database,
so switching to real content changes only where it comes from.

**Site kit — the only section types** (one component and one Zod schema
each, in shared packages; the schema also builds the admin form, so a new
field never needs a new admin screen). Every product's website — Shop now,
Class and Rent later — uses the same kit, tokens, font and Mio.

| Section | Editable content |
| --- | --- |
| Announcement bar | One short line, a link, on/off |
| Hero | Headline, sentence, picture or Mio pose, two buttons (text + link) |
| Steps | 3–4 steps: title, line, icon |
| Product cards | Taken from the product list (name, subtitle, picture, live / coming soon) |
| Features | Title, two lines and a picture per feature |
| Promotion banner | Title, line, picture, button, start and end date and time |
| Plans | No editable prices: always read from `plans.ts`; only the heading and the highlighted plan |
| Questions | Question and answer pairs |
| Seller story | Name, shop, photo, quote, and a required "seller gave permission" tick |
| Closing band | Headline, line, button |
| Waitlist form | Heading and thank-you text; the fields are fixed |

Rules for all content: Khmer and English both required before publishing;
every picture has a short description in both languages (screen readers,
search); links only to `khmio.com` pages or https sites; a section can be
switched off and the sections reordered; each page has its link-preview
title, description and picture for Facebook and Telegram.

Every page shares:
- **Header:** khmio wordmark (links home) · Products · Pricing · ខ្មែរ/EN ·
  "Log in" (text link) · "Start free" (the one main button). On a phone the
  links fold into a menu; "Start free" stays visible. The announcement bar,
  when on, sits above it.
- **Footer:** the products, Pricing, Help, Contact (Telegram support),
  Terms and Privacy (edited in A10; placeholders until the legal text
  exists), language, "© Khmio".
- Prices only from `packages/shared/plans.ts` — never typed in the admin;
  products only from one list of platform products. A product not built
  yet is always "Coming soon", never a date.
- A promotion shows only between its start and end time, by itself.

Pages P1–P4 below list their starting sections, in order; the admin can
change their content, switch them off, reorder them or add a promotion
banner anywhere.

### P1. Home — New · Website
- Hero: Mio (coin pose), the tagline លក់ងាយ ទទួលលុយរហ័ស with its English
  line, one sentence on what Khmio does, "Start free" and "See pricing".
- How it works in 3 steps: open your shop → share the link → get paid by
  KHQR and alerted on Telegram.
- Products: one card each. Khmio Shop ("Start free", "Learn more"); Khmio
  Class and Khmio Rent marked "Coming soon" with "Join the waitlist".
- Why sellers switch: no more payment screenshots, orders in one list,
  Khmer first, works in the Telegram/Facebook browser.
- Seller story: a placeholder card, clearly marked as sample until a real
  seller agrees.
- Closing band: "Start free — 14 days, no card" and the button.

### P2. Product page: Khmio Shop — New · Website
- Title, Khmer subtitle (ហាងអនឡាញ), one-line promise, "Start free".
- Features, each with a phone picture (a real screenshot later, a framed
  placeholder now) and two lines: shop link; KHQR checked by itself;
  Telegram alerts with a Confirm button; delivery and pickup; stock (Pro);
  branches and warehouses (Advance).
- "Which plan?" — a short row of the four plans linking to P4.
- Questions: three or four answers (Do I need a website? Which banks? Is
  my money safe? Can I cancel?).

### P3. Product page: coming soon (Class, Rent) — New · Website
- One page for every product not built yet (`/products/class`,
  `/products/rent`), filled from the product list.
- Title, Khmer subtitle, "Coming soon", what it will do in three points.
- **Waitlist form:** name, phone (the usual phone rules, +855 prefix),
  business type (teacher / school, landlord, other), the product preset.
  Checked by a Zod schema from `packages/shared`; problems shown under the
  field. After sending: a thank-you state with Mio and "We'll message you
  on Telegram or by phone when it opens" — no date.
- The mockup keeps sign-ups on the device only; the real form saves them
  (one platform table, bot check and rate limit) when the site is built.

### P4. Pricing — New · Website
- Khmio Shop plans (the Plans section — not editable prices): Free, Basic, Pro, Advance, from `plans.ts`: monthly
  price, in USD or riel by a toggle (never both added), product limit,
  the trial for Free, and the plan's features.
- Basic marked "Most shops start here"; each card's button: "Start free".
- A comparison table under the cards (cards on a phone, table from tablet).
- How paying works: one KHQR bill a month, no card, no automatic charge,
  cancel any time; data is locked, never deleted (blueprint "Subscription
  tiers").
- Class and Rent: "Coming soon — join the waitlist" with links to P3.

## Account hub (My Khmio)

After login, the one place a customer sees and controls every product they
use, from docs/platform-roadmap.md Phase 1. Mockups under
`/mockup/account`. Built after the website mockups are approved.

### H1. My apps — New · Hub
- A card per product: Khmio Shop (shop name, plan, status, "Open
  dashboard"); Class and Rent ("Join the waitlist", or "On the waitlist ✓").

### H2. My subscriptions — New · Hub
- Per product: plan, status (trial / active / payment due / paused), next
  bill date and amount, "Pay by KHQR", "Change plan"; payment history.
  The rules are the Shop's S12 and blueprint "Subscription life cycle".

### H3. Account — New · Hub
- Name, login methods (Telegram, phone), language.

### H4. App switcher — New · Hub
- In the seller dashboard header: Shop · Class · Rent · My Khmio; products
  not open to this account show "Coming soon".

## Build order

Buyer first, then the seller screens the buyer flow depends on.

1. ~~B4 Checkout + S8 Delivery settings~~ — done.
2. ~~B5 KHQR card~~ — done.
3. ~~B6 Order status + S4 Orders list + S5 Order detail~~ — done.
4. ~~B2 Product detail + S7 product form changes~~ — done.
5. ~~B1 Shop page changes; S2 / S3 checklist and dashboard changes~~ — done.
6. ~~Admin A7–A9~~ — done.
7. Platform website: the site kit sections, then P1–P4 from sample
   content; then the admin website screens A10–A12; then the account hub
   H1–H4. Mockups only — the content backend is its own roadmap step.
8. Phase 2 and 3 screens.
