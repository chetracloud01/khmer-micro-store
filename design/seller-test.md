# Seller test sheet (roadmap gate G2)

Use this to watch 3–5 real sellers try the mockups before any backend is
built. The goal is to find where a seller gets stuck — not to show them the
app, and not to collect compliments.

## Who to ask

Three to five people who sell on Facebook, TikTok or Telegram today. At
least one who is not comfortable with English, and at least one on a
low-cost Android phone. Not friends who will be polite.

## Before you go

1. On your laptop run `pnpm --filter web dev` and leave it running.
2. Get the mockup onto **their** phone — pick one:
   - **Same Wi-Fi or your phone's hotspot:** laptop and their phone on the
     same network, then open `http://<laptop-IP>:3000/km/mockup/merchant-login`
     on their phone. (Find the IP with `ipconfig`; today it is
     `192.168.40.39` on your home Wi-Fi.)
   - **A public link:** `cloudflared tunnel --url http://localhost:3000`
     prints a temporary `https://…trycloudflare.com` address that works on
     any network. Send it to them on Telegram.
3. Open the link once yourself on a phone to check it loads.
4. Print this sheet, one copy per seller, or keep it open on your laptop.

## What is fake in the mockup — say this first

Tell the seller, in your own words: *"This is a test version. Nothing is
real: no money moves, and nothing you type is saved anywhere but this
phone."* Then keep these in mind yourself:

| In the mockup | What to do during the test |
| --- | --- |
| Login does not open Telegram. With a phone number, no SMS is sent: any 6 digits work, except `000000` | Tell them "pretend you got the code, type any 6 numbers" |
| The shop already contains sample coffee products and sample orders | Tell them "ignore what is already there"; note if it confuses them |
| KHQR is a picture, not a real payment, and only appears after the seller adds a Bakong ID | Use **cash** for the buyer task. If they try KHQR, you tap "Simulate payment" |
| "Share your shop link" copies a link that does not open yet | Count it as done if they find and tap it |
| The Telegram button does nothing | Note whether they expected it to |
| Everything lives on that one phone | Buyer and seller tasks are done on the same phone |

## The four tasks

Read the Khmer sentence aloud, give them the phone, then **stop talking**.
Do not point, do not explain a button. If they ask "what do I do?", answer
"what would you try?". Help only after a full minute stuck, and write down
that you helped.

| # | Say this | Start at | Finished when |
| --- | --- | --- | --- |
| 1 | «សូមបង្កើតហាងរបស់អ្នក។» (Please set up your shop.) | `/km/mockup/merchant-login` | They reach the dashboard with their own shop name at the top |
| 2 | «សូមដាក់ទំនិញមួយដែលអ្នកលក់ពិតប្រាកដ ជាមួយរូបថត និងតម្លៃ។» (Add one thing you really sell, with a photo and a price.) | The dashboard | The product shows in the products list |
| 3 | «ឥឡូវអ្នកជាអ្នកទិញ។ សូមបញ្ជាទិញទំនិញនោះ ហើយបង់ប្រាក់ពេលទទួល។» (Now you are a buyer. Order that product and pay on delivery.) | `/km/mockup/storefront` | They see the "Order placed" page |
| 4 | «អ្នកជាម្ចាស់ហាងវិញ។ មានការបញ្ជាទិញថ្មីមួយ។ សូមធ្វើរហូតដល់ប្រគល់ទំនិញរួច។» (You are the seller again. There is a new order. Take it all the way to delivered.) | `/km/mockup/dashboard` | The order shows "Delivered" or "Completed" |

Let them use Khmer or English, whichever they choose — and write down
which they chose.

## What to write down (one table per seller)

Seller: ____________  Sells: ____________  Phone: ____________  Language used: ____

| Task | Finished alone? (yes / with help / no) | Time | Where they stopped or tapped the wrong thing | Their words |
| --- | --- | --- | --- | --- |
| 1. Set up shop | | | | |
| 2. Add a product | | | | |
| 3. Order as a buyer | | | | |
| 4. Handle the order | | | | |

Also note, without asking:

- Any word they read aloud and did not understand.
- Anything they tried to tap that is not a button.
- Any moment they turned to look at you.
- Whether they scrolled sideways or zoomed (a layout problem on their phone).

## Three questions at the end

Ask these only after all four tasks, and write the answers word for word.

1. «ផ្នែកណាពិបាកជាងគេ?» (Which part was hardest?)
2. «តើមានអ្វីខ្វះ ដែលអ្នកត្រូវការដើម្បីលក់ប្រចាំថ្ងៃ?» (What is missing that you need to sell every day?)
3. «បើវាដំណើរការពិត តើអ្នកនឹងប្រើវាសម្រាប់ហាងរបស់អ្នកទេ? ហេតុអ្វី?» (If this were real, would you use it for your shop? Why, or why not?)

Do not ask "do you like it?" — everyone says yes.

## How to read the results

| What you saw | What it means | What to do |
| --- | --- | --- |
| Every seller finished a task alone | That screen is ready | Nothing |
| One seller got stuck at a place | Could be that person | Write it down; change nothing yet |
| **Two or more got stuck at the same place** | The screen is wrong, not the sellers | Fix the mockup, then test that task again with one new seller |
| Several sellers ask for the same missing thing | A real need | Decide which release it belongs in (docs/blueprint.md roadmap) |
| One seller asks for a special feature | One opinion | Write it down; don't build it |

**Gate G2 is passed when** every seller finishes all four tasks, and nothing
that stopped two or more of them is left unfixed.

## After each session

Bring the filled sheet back and tell Claude what you saw, for example:
"3 of 4 sellers did not find where to add a photo." Claude proposes the
change to that screen; you approve it; it is fixed in the mockup before the
next seller.
