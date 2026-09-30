# Build Guide: Khmer Micro Store, Step by Step

Sep 30, 2026 · @CHETRA

Follow the steps in order. Each step says what to do, gives a prompt to paste into Claude Code, and ends with a "Done when" check. Finish one step before starting the next.

## Before you start

Build Phase 1 first: a seller creates a shop, a buyer orders and pays by KHQR or COD, and the seller gets a Telegram alert. Delivery booking, discounts and AI come after real sellers use Phase 1.

**The tools we use (keep these; don't switch mid-way):**

| Part | Tool | In simple words |
| --- | --- | --- |
| Language | TypeScript | JavaScript with safety checks, fewer bugs |
| Web app | Next.js | Builds buyer shop, seller dashboard and admin in one project |
| Design | Tailwind CSS + shadcn/ui | Ready-made clean buttons, forms, cards |
| Database | PostgreSQL + Prisma | Stores shops, products, orders; Prisma lets code talk to it easily |
| Background jobs | pg-boss | Runs payment checks and reminders in the background, using the same database |
| Telegram bot | grammY | Sends order alerts and reminders |
| Photos | Cloudflare R2 | Cheap storage for product images |
| Hosting | Railway (Singapore region if offered) | Runs the app, worker and database online |

**Install on your computer:**

- [ ] Node.js (LTS version) and Git
- [ ] VS Code
- [ ] Claude Code (in the VS Code terminal)
- [ ] Docker Desktop (runs a local database for testing)

**Open these accounts:**

- [ ] GitHub (store the code)
- [ ] Telegram bot from @BotFather (save the bot token)
- [ ] Bakong Open API token (checks payments; see Step 7)
- [ ] Your own Bakong/ABA account for sellers' subscription payments to you
- [ ] Cloudflare (R2 photo storage) and Railway (hosting)
- [ ] A domain name, for example yourbrand.com

**Golden rules:** never paste secrets (tokens, passwords) into chat or GitHub; keep them in a `.env` file. Commit and push to GitHub after every step that works.

## Part 1: Setup

By the end of Part 1 you have an empty app running on your computer, saved on GitHub, with the database tables ready.

### Step 1: Create the repo and project rules

1. On GitHub, create a private repo named `khmer-micro-store`.
2. Clone it to your computer and open the folder in VS Code.
3. Open the terminal in VS Code and start Claude Code.
4. Paste this prompt:

```text
Create a CLAUDE.md file for this project. It is a multi-tenant web app for Cambodian micro-merchants: sellers create a mini shop, buyers order and pay with Bakong KHQR or cash on delivery, and sellers get Telegram alerts. Stack: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, PostgreSQL + Prisma, pg-boss for background jobs, grammY for the Telegram bot, Cloudflare R2 for photos. Rules: Khmer is the default language with English as second; mobile-first; every database table that holds shop data must have a shopId and every query must filter by shopId; secrets only in .env, never in code; explain each change in simple English.
```

**Done when:** `CLAUDE.md` exists and is pushed to GitHub. Claude Code reads this file every time, so it remembers your rules.

### Step 2: Create the app skeleton

```text
Set up the Next.js project in this repo with TypeScript, Tailwind, shadcn/ui, ESLint and Prettier. Add next-intl with Khmer (km, default) and English (en). Use the Kantumruy Pro font. Create three areas: /shop/[slug] for buyers, /dashboard for sellers, /admin for me. Add a docker-compose.yml that runs PostgreSQL locally, and a .env.example listing every variable we will need. Then tell me the exact commands to run it.
```

**Done when:** you run the commands, open `http://localhost:3000`, and see a page in Khmer.

### Step 3: Design the database

These are the main tables. Ask Claude Code to build them with Prisma.

| Table | What it stores |
| --- | --- |
| User | Seller or admin login: phone, Telegram ID, role |
| Shop | Shop name, slug (link name), logo, Bakong account ID, COD on/off, plan status, paid-until date |
| Product | Name (Khmer/English), price in USD or KHR, photos, stock, active or hidden |
| ProductVariant | Size, colour, extra price |
| Customer | Buyer name, phone, saved location, per shop |
| Order | Order number, customer, total, payment method, status, delivery method, location pin |
| OrderItem | Which product, how many, price at time of order |
| Payment | KHQR string, MD5 hash, amount, expiry time, status |
| DeliveryZone | Zone name and fee, per shop |
| Subscription payment | Shop, amount, months paid, KHQR hash, status |

```text
Create the Prisma schema for these tables: [paste the table above]. Every shop-owned table has shopId with an index. Money is stored as integers in cents (USD) or riel (KHR) with a currency field. Order status is an enum: AWAITING_PAYMENT, PAID, COD_PENDING, CONFIRMED, PACKING, OUT_FOR_DELIVERY, DELIVERED, COMPLETED, CANCELLED, FAILED_DELIVERY. Create the first migration and a seed script with one demo shop and 5 products.
```

**Done when:** the migration runs without errors and you can see the demo shop's data with `npx prisma studio`.

## Part 2: Seller side

By the end of Part 2 a seller can sign in, create a shop and add products with photos from their phone.

### Step 4: Seller sign-in and shop setup

Use **Telegram login** for sellers: it is free (no SMS cost), and it gives us their Telegram ID for order alerts at the same time.

```text
Add seller sign-in with the Telegram Login Widget, verifying the login hash on the server with the bot token. After first login, show a 4-screen setup wizard in Khmer: 1) shop name and link name (slug, check it is unique), 2) logo upload, 3) Bakong account ID and COD on/off, 4) delivery zones with fees and a pickup address. Save to the Shop table, start a 14-day free trial (set paidUntil), and protect all /dashboard pages so a seller only ever sees their own shop.
```

**Done when:**

- [ ] You log in with your own Telegram and finish the wizard in under 5 minutes.
- [ ] A second test account cannot see or open the first shop's dashboard.

### Step 5: Products and photos

```text
Build the product pages in /dashboard/products, mobile-first: a list of product cards, an Add button, and a form with Khmer name, English name (optional), price, currency USD/KHR, stock, variants (size/colour with extra price) and up to 5 photos. Compress photos in the browser before upload (max 1600px, WebP), upload directly to Cloudflare R2 with a signed URL, and show upload progress. Add hide/show and delete. Also add a CSV import (name, price, stock, photo URL) for sellers switching from another platform.
```

**Done when:**

- [ ] On your phone, you add a product with 3 photos in under 1 minute.
- [ ] Photos load fast and each file is small (usually under 300 KB).
- [ ] A CSV with 20 products imports correctly.

## Part 3: Buyer side and payment

By the end of Part 3 a buyer opens a shop link, orders without logging in, and pays by KHQR, and the system confirms the payment by itself.

### Step 6: Shop page, cart and checkout

```text
Build the buyer shop at /shop/[slug], server-rendered and mobile-first, Khmer by default with an English switch. Show shop logo, categories and product cards; product pages with photo gallery, variants and an Add to cart button. Each product page needs Open Graph tags (photo, name, price) so links look good on Facebook and Telegram. Cart is saved in the browser. Checkout asks only: name, phone (+855 format check), delivery zone or pickup, a map pin or shared location, and a landmark note; show the delivery fee from the shop's zones. Payment choice: KHQR or COD (only if the shop allows COD). No buyer login; remember name and phone on the device. Also make the same shop work as a Telegram Mini App using the Telegram WebApp script.
```

**Done when:**

- [ ] On a phone with slow network (Chrome DevTools "Fast 4G" or slower), the shop page appears in about 2–3 seconds.
- [ ] A COD order reaches the database with status COD\_PENDING.
- [ ] Sharing a product link in Telegram shows its photo and price.

### Step 7: KHQR payment and automatic check

How it works: we create a KHQR code for the exact amount, paid into the **seller's own Bakong account**. The KHQR library gives an MD5 code for it. Our worker asks Bakong "is this MD5 paid?" until it is paid or the time runs out. Money never passes through us, which keeps things simpler legally.

Get ready:

1. Register for a Bakong Open API token at `api-bakong.nbc.gov.kh/register` (sandbox first). Tokens expire, so plan to renew them.
2. **Test early from your hosting server.** Developers report Bakong's API returning HTTP 403 for servers outside Cambodia. If that happens, run the worker on a Cambodian server, or ask NBC about access.
3. Confirm in the sandbox that your token can check payments made to a seller's account, not only to yours.

```text
Add KHQR payment using the bakong-khqr npm package. When a buyer picks KHQR: create a dynamic KHQR for the order total to the shop's Bakong account ID, with bill number = order number and store label = shop name. Save the QR string, MD5 and a 10-minute expiry in the Payment table. Show a payment page with a large QR, the amount, a countdown, Save QR image and Open in ABA/Bakong buttons. Add a pg-boss worker job that checks Bakong check_transaction_by_md5 every 5 seconds (not every second) until paid or expired. Also check that the amount and currency returned match the order. When paid: set order to PAID and push the update to the payment page so it switches to 'Paid' without refresh. When expired: one reminder, then CANCELLED. Put the Bakong token in .env and handle expired-token errors with a clear log.
```

**Done when:**

- [ ] You pay a real small KHQR (for example 100 riel) and the page turns to "Paid" by itself within about 10 seconds.
- [ ] An unpaid QR cancels after the time limit.
- [ ] A screenshot of a payment is never needed anywhere.

## Part 4: Alerts, orders and delivery

By the end of Part 4 the seller gets every order on Telegram, moves it through statuses with one tap, and sends it to a driver.

### Step 8: Telegram bot alerts

```text
Build the Telegram bot with grammY, running inside the worker process (webhook mode in production). Seller messages in Khmer: new order (items, total, payment method, customer phone, map link), payment confirmed, order cancelled. Each new-order message has buttons: Confirm, Reject, Open in dashboard. Buyers who start the bot from the order page get status updates for their order. Send messages through a pg-boss queue so a Telegram outage never breaks checkout, and respect Telegram rate limits.
```

**Done when:**

- [ ] A test order reaches your Telegram in a few seconds.
- [ ] Tapping Confirm in Telegram changes the order status in the dashboard.

### Step 9: Order dashboard

```text
Build /dashboard/orders, mobile-first: tabs New, In progress, Done; each order is a card with customer, items, total, payment badge (Paid / COD) and one big next-step button (Confirm → Packing → Out for delivery → Delivered → Completed). Add Cancel with a reason. Every status change is saved with time and who did it, and triggers the right Telegram message to seller and buyer. Add a buyer order-status page at /o/[orderCode] with no login. Add a simple printable/shareable order slip.
```

**Done when:**

- [ ] You move one order from New to Completed using only your phone.
- [ ] The buyer status page updates at each step.

### Step 10: Delivery (start simple)

Start with **Telegram driver dispatch**: the seller saves their usual drivers or delivery shop's Telegram, and the app sends them the order. Delivery-company APIs come later.

```text
Add /dashboard/delivery: seller saves drivers (name, phone, Telegram username) and a list of bus companies for provinces. On an order, 'Send to driver' posts a Telegram message to the driver with pickup address, drop-off map link, buyer phone and COD amount to collect, plus buttons Picked up and Delivered that update the order. For bus delivery, the seller enters the bus company and ticket number, and the buyer gets it by Telegram. Track COD cash per driver: collected, handed to seller, still owed.
```

**Done when:**

- [ ] A driver taps Picked up and Delivered in Telegram, and the order updates by itself.
- [ ] The COD screen shows how much each driver still owes.

## Part 5: Subscription and polish

By the end of Part 5 sellers pay you monthly by KHQR, and the app feels natural in Khmer on a cheap phone.

### Step 11: Monthly subscription billing

Sellers pay **you** (not the buyer) with a KHQR code to your own Bakong account. Use the same payment check as Step 7.

```text
Add /dashboard/billing: show plan, paid-until date and a Pay button that creates a KHQR to MY Bakong account (from .env) for 1 month or 12 months. When the worker confirms payment, extend paidUntil and save a SubscriptionPayment record. Daily worker job: 3 days before expiry send a Telegram reminder with a pay link; after expiry give 3 days grace with daily reminders; then set the shop to PAUSED. A paused shop shows buyers a polite 'temporarily closed' page but keeps all data; paying restores it instantly. Add an /admin page listing all shops with plan status, paid-until and last payment, and a button to give free months (for switch deals and referrals).
```

**Done when:**

- [ ] You pay for your test shop and paid-until moves forward 30 days.
- [ ] Setting paid-until to yesterday pauses the shop after the grace days, and paying reopens it.

### Step 12: Khmer and mobile polish

```text
Review every page for Khmer and mobile: lang="km" on Khmer pages; Khmer line height 1.6–1.8; no letter-spacing or uppercase on Khmer; long Khmer product names wrap without cutting off; all buttons at least 44px tall; bottom navigation in the dashboard; numbers and prices formatted for USD and KHR. Make the dashboard an installable PWA with the shop logo as icon. Check the shop page's JavaScript size and lazy-load images below the first screen. List any English text left untranslated.
```

**Done when:**

- [ ] A seller who doesn't read English can finish setup and handle an order.
- [ ] Everything works on a low-cost Android phone, not only on yours.

## Part 6: Test, deploy and launch

By the end of Part 6 the app is online on your domain and your first real sellers are using it.

### Step 13: Test the important paths

```text
Add automated tests: unit tests for price, delivery fee and KHQR amount calculations; tests that a seller can never read or change another shop's data (try it on every dashboard API route); and Playwright end-to-end tests for: seller setup, add product, buyer COD order, buyer KHQR order (mock Bakong as paid and as expired), and subscription expiry to pause. Add a GitHub Actions workflow that runs all tests on every push.
```

**Done when:** all tests pass on GitHub, and you have done one full real order yourself, start to finish, on your phone.

### Step 14: Put it online

1. On Railway, create one project with three parts: the web app, the worker, and a PostgreSQL database. Pick the Singapore region if offered.
2. Add all values from `.env` into Railway's variables. Never commit `.env`.
3. Connect your domain, for example `app.yourbrand.com` for sellers and `yourbrand.com/shop-name` for shops.
4. **Run the Bakong payment check from the live server now.** If it returns 403, move the worker to a server in Cambodia before launch (see Step 7).
5. Turn on daily database backups and error alerts (for example Sentry) sent to your Telegram.

```text
Prepare this app for production on Railway: a Dockerfile or build settings for the web app and a separate start command for the worker, run Prisma migrations on deploy, switch the Telegram bot to webhook mode, add a /health endpoint, add Sentry error tracking, and write DEPLOY.md with every step in simple English.
```

**Done when:** you complete a real KHQR order on the live site, and the payment is confirmed automatically.

### Step 15: Launch with real sellers

1. Onboard 5–10 friendly sellers yourself, sitting with them if possible. Free for the first month.
2. Create a Telegram group for them; ask for problems every week.
3. Fix the top 3 complaints each week before adding new features.
4. Once sellers use it daily, start Phase 2 from the strategy doc: delivery booking, catalog import from competitors and the switch deal.

**Done when:** at least 5 sellers get real orders through the app every week and 3 of them pay for a second month.

## Safety checklist before real sellers

Tick every box before the first real seller joins; a data leak or a fake "paid" order would destroy trust fast.

- [ ] Every dashboard query filters by the logged-in seller's shopId (tested in Step 13).
- [ ] An order becomes PAID only from the Bakong check, with matching amount and currency, never from anything the buyer sends.
- [ ] Bakong token, Telegram bot token, database password and R2 keys are only in hosting variables, never in GitHub.
- [ ] Telegram login hash and Telegram webhook secret are checked on the server.
- [ ] Rate limits on checkout and login to stop spam orders.
- [ ] Buyer phone numbers and locations are visible only to that shop's seller and assigned driver.
- [ ] Daily database backups are on, and you have restored one backup once as a test.
- [ ] Privacy page and terms in Khmer and English: what data you keep and why.
- [ ] Business registration and tax: ask a local accountant which registrations (Ministry of Commerce, GDT tax) your subscription business needs before charging sellers.

## Sources

Bakong details were checked on 30 September 2026; the tool choices and step order are recommendations, not research findings.

- [Bakong Open API document (NBC, PDF)](https://bakong.nbc.gov.kh/download/KHQR/integration/Bakong%20Open%20API%20Document.pdf)
- [bakong-khqr npm example with MD5 check (GitHub)](https://github.com/zeroboy0010/KHQR_generate_and_check_transition)
- [KHQR SDK notes: token registration and renewal (Packagist)](https://packagist.org/packages/chamroeuntam/bakong-khqr-image)
- [KHQR SDK notes: sandbox and production API addresses (docs.rs)](https://docs.rs/crate/khqr/latest)
- [Report of HTTP 403 from servers outside Cambodia, and polling advice (GitHub)](https://github.com/bsthen/bakong-khqr)
