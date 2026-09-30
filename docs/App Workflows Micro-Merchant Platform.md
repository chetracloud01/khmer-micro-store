# App Workflows: Micro-Merchant Platform

Sep 30, 2026 · @CHETRA

## Overview

The app runs on five workflows: a seller sets up a shop, a buyer orders and pays, the seller ships, the order moves through fixed statuses, and the seller renews the subscription each month. Every step sends a Telegram message, so neither side has to chat to know what happens next.

| Workflow | Who starts it | Ends when | Main win vs competitors |
| --- | --- | --- | --- |
| Seller onboarding | Seller | Shop link shared | Khmer-first, free catalog import |
| Buyer order and payment | Buyer | Order paid or COD confirmed | KHQR verified by the system, no slip screenshots |
| Fulfillment and delivery | Seller | Delivered and COD cash settled | Driver booking and tracking link |
| Order statuses | System | Completed or cancelled | Buyer always sees status |
| Subscription billing | System | Renewed or paused | Pause, never delete |

## Seller onboarding

A new seller should go from sign-up to a shared shop link in under 15 minutes, all in Khmer by default.

1. **Sign up** with phone number or Telegram login; choose Khmer or English.
2. **Name the shop**, pick a category and logo; the system creates the shop link.
3. **Add products**: take a photo and let AI write the Khmer title and description, or import from Google Sheets, Excel or a competitor shop (we do it free for switchers).
4. **Connect payment**: enter the Bakong account ID for KHQR; turn COD on or off.
5. **Set delivery**: Phnom Penh zones and fees, pickup address, provincial bus option, and partner drivers.
6. **Connect Telegram**: the seller starts our bot so order alerts reach their phone.
7. **Test order**: the seller places one test order and sees the alert arrive.
8. **Share the link** on Facebook, TikTok, Telegram, and as a printed QR sticker.
9. **Free trial starts** (7–14 days); the billing workflow takes over from here.

## Buyer order and payment

The buyer never messages the seller: they order and pay on the shop page, and the system confirms KHQR payment with Bakong before the seller sees the order.

&#91;embedded content: buyer order and payment · 7 steps, 2 decisions\]

KHQR orders the buyer doesn't pay in time get one reminder, then cancel automatically. COD orders go straight to the seller to confirm.

## Fulfillment and delivery

The seller picks one of three routes after packing, and the order is only completed once any COD cash is settled with the driver.

&#91;embedded content: fulfillment and delivery · 3 routes\]

If the buyer is unreachable or refuses COD, the order becomes Failed delivery and the seller can rebook it. Phnom Penh drivers start as partner drivers messaged by our Telegram bot; delivery-company APIs can replace that later.

## Order statuses

Every order moves through fixed statuses; each change triggers a Telegram message so the buyer never has to ask "where is my order?"

| Status | Trigger | Seller notified | Buyer notified |
| --- | --- | --- | --- |
| Awaiting payment | Buyer chose KHQR, QR shown | No | Yes, QR + pay-by time |
| Paid | Bakong confirms the payment | Yes | Yes, receipt |
| COD pending | Buyer chose COD | Yes | Yes, order summary |
| Confirmed | Seller accepts the order | — | Yes |
| Packing | Seller marks packing | — | Optional |
| Waiting for driver | Delivery booked, driver not yet assigned | Yes, when assigned | No |
| Out for delivery | Driver picks up | Yes | Yes, tracking link or bus ticket number |
| Delivered | Driver or seller marks delivered | Yes | Yes, thank-you + reorder link |
| Completed | Delivered and COD cash settled (or paid online) | Yes | No |
| Cancelled | Payment timed out, buyer cancels, or seller rejects | Yes | Yes, with reason |
| Failed delivery | Buyer unreachable or refused COD | Yes | Yes, rebook option |

## Subscription billing

Sellers renew by paying a KHQR code each month; nothing is charged automatically, because card auto-billing doesn't fit how Cambodians pay.

&#91;embedded content: subscription billing · renewal loop, grace, pause\]

A paused shop shows buyers a short "temporarily closed" notice. Paying at any time restores it with all products, orders and customers intact.

## System architecture

One multi-tenant app serves every shop; the background worker handles payment checks, Telegram alerts, delivery booking and AI jobs, so the shop page stays fast even when an outside service is slow.

&#91;embedded content: system architecture · 3 apps, 4 core parts, 4 outside services\]

The API creates each KHQR code; the worker then checks Bakong until the payment is confirmed or times out. Every database table carries a shop ID, so one seller can never see another's data.
