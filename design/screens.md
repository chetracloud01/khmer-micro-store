# Screens (mobile-first 360px unless noted)

## Buyer
1. Store page (/s/[slug])
   - Header: logo, store name, Verified badge, language toggle ខ្មែរ/EN
   - Product grid, 2 columns: photo, title, price in store default currency
   - Sticky cart bar at bottom: item count + total + "View cart"
2. Product detail
   - Photo carousel, title, description, variant chips (size/colour)
   - Price shows USD and/or KHR; quantity stepper; "Add to cart" full-width
3. Cart
   - Line items with stepper and remove; subtotal; "Checkout" button
4. Checkout (one page)
   - Name; Phone (+855 fixed prefix, formats 012 345 678 / 097 123 4567)
   - Map pin + Province > Khan > Sangkat; Landmark note (optional)
   - Delivery / Pickup cards with fee; Pay in USD / KHR toggle
   - Payment cards: KHQR, ABA PayWay, Cash on delivery (if allowed)
   - Sticky "Place order" with total
5. KHQR payment
   - Official KHQR card: merchant name, amount, currency, QR
   - 10:00 countdown; "Save QR" and "Open bank app" buttons
   - Auto-switches to success when paid; expired state with "Try again"
6. Order success
   - Order number, items, total, delivery info, "Get updates on Telegram"

## Merchant (phone first, works on laptop)
7. Login: one "Log in with Telegram" button
8. Onboarding (5 steps with progress bar)
   - Shop name + auto slug check; logo (optional); Bakong ID with live check;
     connect Telegram group (optional); done screen with shop link + share
9. Product form
   - Photos (up to 6); Khmer title, English title + Auto-translate
   - Two price boxes USD and KHR + Auto-fill; stock stepper
   - "Add sizes or colours" opens variant grid; autosave draft
10. Order list
   - Tabs: New paid / Preparing / Dispatched / Completed; count badges
   - Card: order number, buyer name, total, time, payment icon
11. Order detail
   - Items, buyer phone (tap to call), map pin, landmark
   - Buttons: Preparing > Dispatched (driver name/phone) > Completed

## Admin (laptop)
12. Admin overview
   - Merchant list with KYC status + approve; payments today; Bakong token
     status; failed payment checks
