import type { PlatformProduct, SitePage } from "@khmer-micro-store/shared";

// Sample website content for the platform website mockups (design/screens.md
// "Platform website"). Shaped exactly like the content the admin will edit
// (A10–A12), and checked against the site kit's schemas by mock-site.test.ts,
// so moving to real content changes only where it comes from.
// Khmer text: to be checked by a native reader before it goes live.

export const mockPlatformProducts: PlatformProduct[] = [
  {
    id: "shop",
    name: "Khmio Shop",
    subtitle: { km: "ហាងអនឡាញ", en: "Online shop" },
    line: {
      km: "តំណហាង ការបង់ប្រាក់ KHQR ដំណឹងនៅលើ Telegram និងការដឹកជញ្ជូន។",
      en: "Shop link, KHQR payments, Telegram alerts and delivery.",
    },
    status: "live",
    icon: "store",
  },
  {
    id: "class",
    name: "Khmio Class",
    subtitle: { km: "គ្រប់គ្រងថ្លៃសិក្សា", en: "Class fees" },
    line: {
      km: "វិក្កយបត្រប្រចាំខែទៅឪពុកម្តាយតាម KHQR នៅលើ Telegram ហើយឃើញថាអ្នកណាបានបង់។",
      en: "Monthly KHQR bills to parents on Telegram, and see who has paid.",
    },
    status: "coming_soon",
    icon: "list",
  },
  {
    id: "rent",
    name: "Khmio Rent",
    subtitle: { km: "គ្រប់គ្រងបន្ទប់ជួល", en: "Rental rooms" },
    line: {
      km: "ថ្លៃជួល អគ្គិសនី និងទឹក ក្នុងវិក្កយបត្រ KHQR តែមួយសម្រាប់បន្ទប់នីមួយៗ។",
      en: "Rent, electricity and water in one KHQR bill per room.",
    },
    status: "coming_soon",
    icon: "building",
  },
];

const startFree = { label: { km: "ចាប់ផ្តើមឥតគិតថ្លៃ", en: "Start free" }, href: "/start" };

export const mockHomePage: SitePage = {
  slug: "",
  seo: {
    title: { km: "Khmio — លក់ងាយ ទទួលលុយរហ័ស", en: "Khmio — Sell easily, get paid fast" },
    description: {
      km: "បើកហាងអនឡាញក្នុងរយៈពេលប៉ុន្មាននាទី ទទួលការបង់ប្រាក់តាម KHQR និងដំណឹងនៅលើ Telegram។",
      en: "Open an online shop in minutes, get paid by KHQR and alerted on Telegram.",
    },
  },
  sections: [
    {
      id: "announcement",
      type: "announcement",
      visible: true,
      text: { km: "ថ្មី៖ បញ្ជីរង់ចាំ Khmio Class បានបើកហើយ", en: "New: the Khmio Class waitlist is open" },
      link: { label: { km: "ចុះឈ្មោះ", en: "Join" }, href: "/products/class" },
    },
    {
      id: "hero",
      type: "hero",
      visible: true,
      eyebrow: { km: "សម្រាប់អ្នកលក់អនឡាញនៅកម្ពុជា", en: "For online sellers in Cambodia" },
      headline: { km: "លក់ងាយ ទទួលលុយរហ័ស", en: "Sell easily, get paid fast" },
      sentence: {
        km: "បើកហាងអនឡាញក្នុងរយៈពេល ១០ នាទី។ អតិថិជនបង់តាម KHQR ហើយអ្នកទទួលការបញ្ជាទិញនៅលើ Telegram ភ្លាមៗ — មិនចាំបាច់ពិនិត្យរូបថតបង់ប្រាក់ទៀតទេ។",
        en: "Open your online shop in 10 minutes. Buyers pay by KHQR and the order reaches your Telegram right away — no more checking payment screenshots.",
      },
      art: { kind: "mio", pose: "coin" },
      primary: startFree,
      secondary: { label: { km: "មើលតម្លៃ", en: "See pricing" }, href: "/pricing" },
    },
    {
      id: "beta-help",
      type: "promotion",
      visible: true,
      title: { km: "បេតា៖ អ្នកលក់ ២០ នាក់ដំបូង ទទួលបានជំនួយរៀបចំហាងដោយឥតគិតថ្លៃ", en: "Beta: the first 20 sellers get free help setting up their shop" },
      line: { km: "យើងជួយបន្ថែមទំនិញ និងរៀបចំការដឹកជញ្ជូនជាមួយអ្នក។", en: "We add your products and set up delivery with you." },
      button: startFree,
      startsAt: "2026-10-01T00:00:00+07:00",
      endsAt: "2027-01-01T00:00:00+07:00",
    },
    {
      id: "steps",
      type: "steps",
      visible: true,
      title: { km: "របៀបដំណើរការ", en: "How it works" },
      steps: [
        {
          icon: "store",
          title: { km: "បើកហាងរបស់អ្នក", en: "Open your shop" },
          line: { km: "ដាក់ឈ្មោះហាង និងបន្ថែមទំនិញពីទូរស័ព្ទ — ចំណាយពេលតែប៉ុន្មាននាទី។", en: "Name your shop and add products from your phone — it takes minutes." },
        },
        {
          icon: "share",
          title: { km: "ចែករំលែកតំណ", en: "Share the link" },
          line: { km: "ដាក់តំណហាងនៅលើ Facebook, TikTok ឬ Telegram។", en: "Post your shop link on Facebook, TikTok or Telegram." },
        },
        {
          icon: "qr",
          title: { km: "ទទួលលុយ", en: "Get paid" },
          line: { km: "អតិថិជនបង់តាម KHQR ហើយការបញ្ជាទិញមកដល់ Telegram របស់អ្នក។", en: "Buyers pay by KHQR and the order arrives in your Telegram." },
        },
      ],
    },
    {
      id: "products",
      type: "productCards",
      visible: true,
      title: { km: "ផលិតផល Khmio", en: "Khmio products" },
    },
    {
      id: "why",
      type: "features",
      visible: true,
      title: { km: "ហេតុអ្វីអ្នកលក់ប្តូរមក Khmio", en: "Why sellers switch to Khmio" },
      features: [
        {
          icon: "shield",
          title: { km: "ឈប់ពិនិត្យរូបថតបង់ប្រាក់", en: "No more payment screenshots" },
          line: { km: "KHQR ត្រូវបានពិនិត្យដោយស្វ័យប្រវត្តិ ដូច្នេះរូបថតក្លែងក្លាយមិនអាចបោកអ្នកបានទេ។", en: "KHQR is checked by itself, so a fake screenshot can't fool you." },
        },
        {
          icon: "list",
          title: { km: "ការបញ្ជាទិញនៅកន្លែងតែមួយ", en: "All orders in one list" },
          line: { km: "ឃើញការបញ្ជាទិញថ្មី វេចខ្ចប់ និងផ្ញើ — មិនបាត់ក្នុងការជជែកទៀតទេ។", en: "See new orders, pack and send — nothing gets lost in chat." },
        },
        {
          icon: "bell",
          title: { km: "ដំណឹងនៅលើ Telegram", en: "Alerts on Telegram" },
          line: { km: "ការបញ្ជាទិញថ្មីមកដល់ទូរស័ព្ទរបស់អ្នក ជាមួយប៊ូតុង «បញ្ជាក់»។", en: "New orders reach your phone with a Confirm button." },
        },
        {
          icon: "language",
          title: { km: "ភាសាខ្មែរជាមុន", en: "Khmer first" },
          line: { km: "គ្រប់ពាក្យជាភាសាខ្មែរ និងអង់គ្លេស សម្រាប់អ្នក និងអតិថិជនរបស់អ្នក។", en: "Every word in Khmer and English, for you and your buyers." },
        },
      ],
    },
    {
      id: "story",
      type: "sellerStory",
      visible: true,
      name: { km: "សុខា", en: "Sokha" },
      shop: { km: "ហាងកាហ្វេសុខា", en: "Sokha Coffee" },
      quote: {
        km: "ពីមុនខ្ញុំត្រូវពិនិត្យរូបថតបង់ប្រាក់រាល់ការបញ្ជាទិញ។ ឥឡូវនេះ Khmio ពិនិត្យឲ្យខ្ញុំ ហើយខ្ញុំមានពេលច្រើនសម្រាប់ធ្វើកាហ្វេ។",
        en: "I used to check a payment photo for every order. Now Khmio checks for me, and I have more time to make coffee.",
      },
      permission: true,
      sample: true,
    },
    {
      id: "closing",
      type: "closing",
      visible: true,
      headline: { km: "ចាប់ផ្តើមលក់ថ្ងៃនេះ", en: "Start selling today" },
      line: { km: "សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ មិនត្រូវការកាតធនាគារ។", en: "14-day free trial, no card needed." },
      button: startFree,
    },
  ],
};

/** A picture in the website's picture library (A12). Pages point to it as "library:<id>". */
export interface MockPicture {
  id: string;
  /** The file itself: a path under public/ for the samples, a data URL for uploads in the mockup. */
  file: string;
  alt: { km: string; en: string };
  width: number;
  height: number;
  bytes: number;
  /** ISO time it was added. */
  addedAt: string;
}

const SHOT_BYTES: Record<string, number> = { "shop-link": 30817, khqr: 46277, orders: 33825, send: 31726, delivery: 32618, stock: 27537 };

/** The library starts with the Shop app's phone screenshots (Khmer), saved under public/site/shop. */
export const mockPictures: MockPicture[] = [];

/** A Shop screenshot: added to the library once, used by the page as "library:shop-<file>". */
const shot = (file: string, km: string, en: string) => {
  const id = `shop-${file}`;
  if (!mockPictures.some((picture) => picture.id === id)) {
    mockPictures.push({ id, file: `/site/shop/${file}.jpg`, alt: { km, en }, width: 360, height: 740, bytes: SHOT_BYTES[file] ?? 0, addedAt: "2026-10-06T09:00:00+07:00" });
  }
  return { src: `library:${id}`, alt: { km, en } };
};

export const mockShopPage: SitePage = {
  slug: "products/shop",
  seo: {
    title: { km: "Khmio Shop — ហាងអនឡាញរបស់អ្នក ក្នុង ១០ នាទី", en: "Khmio Shop — your online shop in 10 minutes" },
    description: {
      km: "តំណហាងតែមួយ ការបង់ប្រាក់ KHQR ដែលពិនិត្យដោយខ្លួនឯង ដំណឹង Telegram និងការដឹកជញ្ជូន។",
      en: "One shop link, KHQR that checks itself, Telegram alerts and delivery.",
    },
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      eyebrow: { km: "Khmio Shop · ហាងអនឡាញ", en: "Khmio Shop · Online shop" },
      headline: { km: "ហាងអនឡាញរបស់អ្នក ក្នុង ១០ នាទី", en: "Your online shop in 10 minutes" },
      sentence: {
        km: "ចែករំលែកតំណតែមួយ។ អតិថិជនកុម្ម៉ង់ និងបង់ប្រាក់ដោយខ្លួនឯង ហើយអ្នកគ្រប់គ្រងការបញ្ជាទិញទាំងអស់ពីទូរស័ព្ទ។",
        en: "Share one link. Buyers order and pay on their own, and you run every order from your phone.",
      },
      art: { kind: "mio", pose: "face" },
      primary: startFree,
      secondary: { label: { km: "មើលតម្លៃ", en: "See pricing" }, href: "/pricing" },
    },
    {
      id: "what-you-get",
      type: "features",
      visible: true,
      title: { km: "អ្វីដែលអ្នកទទួលបាន", en: "What you get" },
      features: [
        {
          icon: "share",
          title: { km: "តំណហាងតែមួយ", en: "One shop link" },
          line: {
            km: "ដាក់តំណនៅលើ Facebook, TikTok ឬ Telegram។ អតិថិជនមើលទំនិញ ដាក់ក្នុងកន្ត្រក និងកុម្ម៉ង់ ដោយមិនចាំបាច់ផ្ញើសារ។",
            en: "Post it on Facebook, TikTok or Telegram. Buyers browse, add to the cart and order without sending a message.",
          },
          image: shot("shop-link", "រូបថតអេក្រង់ទំព័រហាង នៅលើទូរស័ព្ទ", "Screenshot of a shop page on a phone"),
        },
        {
          icon: "qr",
          title: { km: "KHQR ពិនិត្យដោយខ្លួនឯង", en: "KHQR that checks itself" },
          line: {
            km: "អតិថិជនស្កេន QR ជាមួយកម្មវិធីធនាគារណាមួយ។ ការបញ្ជាទិញក្លាយជា «បានបង់» ដោយស្វ័យប្រវត្តិ — គ្មានរូបថតបង់ប្រាក់ទៀតទេ។",
            en: "Buyers scan with any bank app. The order turns to Paid by itself — no more payment screenshots.",
          },
          image: shot("khqr", "រូបថតអេក្រង់ការបង់ប្រាក់តាម KHQR", "Screenshot of the KHQR payment screen"),
        },
        {
          icon: "bell",
          title: { km: "ការបញ្ជាទិញ និងដំណឹង Telegram", en: "Orders and Telegram alerts" },
          line: {
            km: "ការបញ្ជាទិញទាំងអស់នៅក្នុងបញ្ជីតែមួយ ហើយការបញ្ជាទិញថ្មីនីមួយៗមកដល់ Telegram របស់អ្នក ជាមួយប៊ូតុង «បញ្ជាក់»។",
            en: "Every order in one list, and each new one reaches your Telegram with a Confirm button.",
          },
          image: shot("orders", "រូបថតអេក្រង់បញ្ជីការបញ្ជាទិញរបស់អ្នកលក់", "Screenshot of the seller's order list"),
        },
        {
          icon: "truck",
          title: { km: "ផ្ញើតាមអ្នកដឹក ឡានក្រុង ឬមកយកផ្ទាល់", en: "Send by driver, bus or pickup" },
          line: {
            km: "ជ្រើសរើសរបៀបផ្ញើការបញ្ជាទិញនីមួយៗ ហើយអតិថិជនឃើញស្ថានភាពការបញ្ជាទិញរបស់ខ្លួនជានិច្ច។",
            en: "Choose how each order goes out, and the buyer always sees where it is.",
          },
          image: shot("send", "រូបថតអេក្រង់ការផ្ញើការបញ្ជាទិញ", "Screenshot of sending an order"),
        },
        {
          icon: "list",
          title: { km: "តំបន់ និងថ្លៃដឹកជញ្ជូន", en: "Delivery zones and fees" },
          line: {
            km: "កំណត់ថ្លៃដឹកតាមខណ្ឌ ឬខេត្ត ហើយថ្លៃត្រឹមត្រូវត្រូវបានបូកដោយស្វ័យប្រវត្តិនៅពេលទូទាត់។",
            en: "Set fees by district or province; checkout adds the right fee by itself.",
          },
          image: shot("delivery", "រូបថតអេក្រង់ការកំណត់ការដឹកជញ្ជូន", "Screenshot of the delivery settings"),
        },
        {
          icon: "boxes",
          title: { km: "ស្តុក និងសាខា", en: "Stock and branches" },
          line: {
            km: "តាមដានស្តុកលើគម្រោង Pro និងឃ្លាំង ឬសាខាច្រើនលើគម្រោង Advance។",
            en: "Track stock on Pro, and several warehouses or branches on Advance.",
          },
          image: shot("stock", "រូបថតអេក្រង់ស្តុក ឃ្លាំង និងសាខា", "Screenshot of stock, warehouses and branches"),
        },
      ],
    },
    {
      id: "plans",
      type: "plans",
      visible: true,
      title: { km: "ជ្រើសរើសគម្រោង", en: "Pick a plan" },
      highlight: "basic",
      link: { label: { km: "ប្រៀបធៀបគម្រោងទាំងអស់", en: "Compare all plans" }, href: "/pricing" },
    },
    {
      id: "questions",
      type: "questions",
      visible: true,
      title: { km: "សំណួរញឹកញាប់", en: "Questions" },
      items: [
        {
          question: { km: "តើខ្ញុំត្រូវការគេហទំព័រទេ?", en: "Do I need a website?" },
          answer: {
            km: "ទេ។ Khmio ផ្តល់តំណហាងមួយឲ្យអ្នក (khmio.com/s/ឈ្មោះហាងរបស់អ្នក) ដែលអ្នកចែករំលែកបានគ្រប់ទីកន្លែង។",
            en: "No. Khmio gives you a shop link (khmio.com/s/your-shop) that you share anywhere.",
          },
        },
        {
          question: { km: "តើអតិថិជនបង់ប្រាក់ពីធនាគារណាបាន?", en: "Which banks can buyers pay from?" },
          answer: {
            km: "កម្មវិធីធនាគារណាមួយដែលស្កេន KHQR បាន — ABA, ACLEDA, Wing, Bakong និងផ្សេងទៀត។",
            en: "Any bank app that scans KHQR — ABA, ACLEDA, Wing, Bakong and more.",
          },
        },
        {
          question: { km: "តើលុយរបស់ខ្ញុំមានសុវត្ថិភាពទេ?", en: "Is my money safe?" },
          answer: {
            km: "អតិថិជនបង់ចូលគណនីធនាគាររបស់អ្នកផ្ទាល់។ Khmio មិនកាន់លុយរបស់អ្នកទេ។",
            en: "Buyers pay straight into your own bank account. Khmio never holds your money.",
          },
        },
        {
          question: { km: "តើខ្ញុំអាចឈប់ប្រើបានពេលណា?", en: "Can I stop any time?" },
          answer: {
            km: "បាន។ គ្មានការកាត់លុយដោយស្វ័យប្រវត្តិទេ — អ្នកបង់វិក្កយបត្រ KHQR មួយក្នុងមួយខែ។ បើឈប់បង់ ហាងត្រូវផ្អាក ហើយទិន្នន័យរបស់អ្នកនៅដដែល។",
            en: "Yes. Nothing is charged automatically — you pay one KHQR bill a month. If you stop, your shop pauses and your data is kept.",
          },
        },
      ],
    },
    {
      id: "closing",
      type: "closing",
      visible: true,
      headline: { km: "ចាប់ផ្តើមលក់ថ្ងៃនេះ", en: "Start selling today" },
      line: { km: "សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ មិនត្រូវការកាតធនាគារ។", en: "14-day free trial, no card needed." },
      button: startFree,
    },
  ],
};

const joinWaitlist = { label: { km: "ចុះឈ្មោះរង់ចាំ", en: "Join the waitlist" }, href: "#waitlist" };

/** P3: one page per product not built yet, all from the same sections. */
export const mockComingSoonPages: Record<"class" | "rent", SitePage> = {
  class: {
    slug: "products/class",
    seo: {
      title: { km: "Khmio Class — ប្រមូលថ្លៃសិក្សាតាម KHQR", en: "Khmio Class — collect class fees by KHQR" },
      description: {
        km: "វិក្កយបត្រប្រចាំខែទៅឪពុកម្តាយនៅលើ Telegram។ មកដល់ឆាប់ៗ — ចុះឈ្មោះរង់ចាំ។",
        en: "Monthly bills to parents on Telegram. Coming soon — join the waitlist.",
      },
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        eyebrow: { km: "Khmio Class · មកដល់ឆាប់ៗ", en: "Khmio Class · Coming soon" },
        headline: { km: "ប្រមូលថ្លៃសិក្សាប្រចាំខែ ដោយមិនចាំបាច់ដើររក", en: "Collect monthly class fees without chasing anyone" },
        sentence: {
          km: "សម្រាប់គ្រូបង្រៀនថ្នាក់បន្ថែម និងសាលាតូចៗ។ Khmio ផ្ញើវិក្កយបត្រ KHQR ទៅឪពុកម្តាយនៅលើ Telegram ហើយប្រាប់អ្នកថាអ្នកណាបានបង់។",
          en: "For extra-class teachers and small schools. Khmio sends parents a KHQR bill on Telegram and tells you who has paid.",
        },
        art: { kind: "mio", pose: "coin" },
        primary: joinWaitlist,
      },
      {
        id: "what-it-will-do",
        type: "features",
        visible: true,
        title: { km: "អ្វីដែលវានឹងធ្វើ", en: "What it will do" },
        features: [
          {
            icon: "list",
            title: { km: "សិស្ស និងថ្នាក់", en: "Students and classes" },
            line: { km: "បន្ថែមថ្នាក់ និងសិស្ស ជាមួយលេខទូរស័ព្ទឪពុកម្តាយ។", en: "Add your classes and students with a parent's phone number." },
          },
          {
            icon: "qr",
            title: { km: "វិក្កយបត្រប្រចាំខែដោយស្វ័យប្រវត្តិ", en: "Automatic monthly bills" },
            line: { km: "នៅដើមខែ ឪពុកម្តាយនីមួយៗទទួលបាន KHQR នៅលើ Telegram។", en: "At the start of each month, every parent gets a KHQR on Telegram." },
          },
          {
            icon: "bell",
            title: { km: "ដឹងថាអ្នកណាបានបង់", en: "Know who has paid" },
            line: {
              km: "ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ដោយខ្លួនឯង ហើយអ្នកដែលមិនទាន់បង់ទទួលការរំលឹកដោយសុភាព។",
              en: "Payments confirm themselves, and parents who haven't paid get a polite reminder.",
            },
          },
        ],
      },
      {
        id: "waitlist",
        type: "waitlist",
        visible: true,
        title: { km: "ប្រាប់ខ្ញុំនៅពេលវារួចរាល់", en: "Tell me when it's ready" },
        thanks: {
          km: "អរគុណ! យើងនឹងផ្ញើសារទៅអ្នកតាម Telegram ឬទូរស័ព្ទ នៅពេល Khmio Class បើក។",
          en: "Thank you! We'll message you on Telegram or by phone when Khmio Class opens.",
        },
      },
    ],
  },
  rent: {
    slug: "products/rent",
    seo: {
      title: { km: "Khmio Rent — ថ្លៃជួល និងទឹកភ្លើង ក្នុងវិក្កយបត្រតែមួយ", en: "Khmio Rent — rent and utilities in one bill" },
      description: {
        km: "វិក្កយបត្រ KHQR ប្រចាំខែសម្រាប់បន្ទប់ជួលនីមួយៗ។ មកដល់ឆាប់ៗ — ចុះឈ្មោះរង់ចាំ។",
        en: "A monthly KHQR bill for every room. Coming soon — join the waitlist.",
      },
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        eyebrow: { km: "Khmio Rent · មកដល់ឆាប់ៗ", en: "Khmio Rent · Coming soon" },
        headline: { km: "ថ្លៃជួល អគ្គិសនី និងទឹក ក្នុងវិក្កយបត្រតែមួយ", en: "Rent, electricity and water in one bill" },
        sentence: {
          km: "សម្រាប់ម្ចាស់បន្ទប់ជួល អន្តេវាសិកដ្ឋាន និងផ្ទះល្វែងតូចៗ។ វាយលេខកុងទ័រ ហើយ Khmio ផ្ញើវិក្កយបត្រ KHQR ទៅអ្នកជួលនីមួយៗ។",
          en: "For landlords of rooms, dorms and small apartments. Type the meter readings and Khmio sends each tenant a KHQR bill.",
        },
        art: { kind: "mio", pose: "coin" },
        primary: joinWaitlist,
      },
      {
        id: "what-it-will-do",
        type: "features",
        visible: true,
        title: { km: "អ្វីដែលវានឹងធ្វើ", en: "What it will do" },
        features: [
          {
            icon: "building",
            title: { km: "បន្ទប់ និងអ្នកជួល", en: "Rooms and tenants" },
            line: { km: "បន្ថែមបន្ទប់ ថ្លៃជួល និងលេខទូរស័ព្ទអ្នកជួលនីមួយៗ។", en: "Add rooms, the rent and each tenant's phone number." },
          },
          {
            icon: "list",
            title: { km: "លេខកុងទ័រទឹកភ្លើង", en: "Meter readings" },
            line: { km: "វាយលេខកុងទ័រប្រចាំខែ ហើយថ្លៃត្រូវបានគណនាឲ្យអ្នក។", en: "Type the monthly meter numbers and the cost is worked out for you." },
          },
          {
            icon: "bell",
            title: { km: "វិក្កយបត្រ និងការរំលឹក", en: "Bills and reminders" },
            line: {
              km: "អ្នកជួលទទួលវិក្កយបត្រ KHQR តែមួយនៅលើ Telegram ហើយអ្នកឃើញថាបន្ទប់ណាបានបង់។",
              en: "Tenants get one KHQR bill on Telegram, and you see which rooms have paid.",
            },
          },
        ],
      },
      {
        id: "waitlist",
        type: "waitlist",
        visible: true,
        title: { km: "ប្រាប់ខ្ញុំនៅពេលវារួចរាល់", en: "Tell me when it's ready" },
        thanks: {
          km: "អរគុណ! យើងនឹងផ្ញើសារទៅអ្នកតាម Telegram ឬទូរស័ព្ទ នៅពេល Khmio Rent បើក។",
          en: "Thank you! We'll message you on Telegram or by phone when Khmio Rent opens.",
        },
      },
    ],
  },
};

/** P4: prices are never typed here — the Plans section reads plans.ts. */
export const mockPricingPage: SitePage = {
  slug: "pricing",
  seo: {
    title: { km: "តម្លៃ Khmio — គម្រោងសាមញ្ញ ជាដុល្លារ ឬរៀល", en: "Khmio pricing — simple plans in dollars or riel" },
    description: {
      km: "ចាប់ផ្តើមដោយការសាកល្បងឥតគិតថ្លៃ។ បង់វិក្កយបត្រ KHQR មួយក្នុងមួយខែ គ្មានកាត គ្មានការកាត់លុយដោយស្វ័យប្រវត្តិ។",
      en: "Start with a free trial. Pay one KHQR bill a month — no card, nothing charged automatically.",
    },
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      eyebrow: { km: "តម្លៃ", en: "Pricing" },
      headline: { km: "តម្លៃសាមញ្ញ គ្មានការភ្ញាក់ផ្អើល", en: "Simple prices, no surprises" },
      sentence: {
        km: "ចាប់ផ្តើមដោយការសាកល្បងឥតគិតថ្លៃ។ នៅពេលអ្នករួចរាល់ បង់វិក្កយបត្រ KHQR មួយក្នុងមួយខែ — ជាដុល្លារ ឬរៀល។",
        en: "Start with a free trial. When you're ready, pay one KHQR bill a month — in dollars or riel.",
      },
      art: { kind: "mio", pose: "coin" },
      primary: startFree,
    },
    {
      id: "plans",
      type: "plans",
      visible: true,
      title: { km: "គម្រោង Khmio Shop", en: "Khmio Shop plans" },
      highlight: "basic",
      compare: true,
    },
    {
      id: "how-paying-works",
      type: "features",
      visible: true,
      title: { km: "របៀបបង់ប្រាក់", en: "How paying works" },
      features: [
        {
          icon: "qr",
          title: { km: "វិក្កយបត្រ KHQR មួយក្នុងមួយខែ", en: "One KHQR bill a month" },
          line: {
            km: "វិក្កយបត្ររបស់អ្នកមកដល់ Telegram មុនខែបញ្ចប់។ បង់ជាមួយកម្មវិធីធនាគារណាមួយ។",
            en: "Your bill arrives on Telegram before the month ends. Pay it with any bank app.",
          },
        },
        {
          icon: "shield",
          title: { km: "គ្មានកាត គ្មានការកាត់លុយដោយស្វ័យប្រវត្តិ", en: "No card, nothing automatic" },
          line: { km: "គ្មានអ្វីត្រូវបានកាត់ដោយគ្មានអ្នកទេ។ មិនត្រូវការកាតធនាគារ។", en: "Nothing is ever charged without you, and no card is needed." },
        },
        {
          icon: "clock",
          title: { km: "ពេលអនុគ្រោះ", en: "A grace period" },
          line: {
            km: "ភ្លេចបង់? អ្វីៗនៅតែដំណើរការមួយរយៈ ខណៈដែលអ្នកបង់ ហើយ Telegram រំលឹកអ្នក។",
            en: "Missed a bill? Everything keeps working for a while as you pay, and Telegram reminds you.",
          },
        },
        {
          icon: "boxes",
          title: { km: "ទិន្នន័យរបស់អ្នកនៅដដែល", en: "Your data is kept" },
          line: {
            km: "ប្តូរគម្រោង ឬឈប់ពេលណាក៏បាន។ ទំនិញ និងការបញ្ជាទិញត្រូវបានចាក់សោ មិនលុបទេ ហើយត្រឡប់មកវិញនៅពេលអ្នកត្រឡប់មក។",
            en: "Change plan or stop any time. Your products and orders are locked, never deleted, and come back when you do.",
          },
        },
      ],
    },
    {
      id: "coming",
      type: "productCards",
      visible: true,
      title: { km: "មកដល់ឆាប់ៗ៖ Khmio Class និង Khmio Rent", en: "Coming soon: Khmio Class and Khmio Rent" },
      show: "coming_soon",
    },
    {
      id: "closing",
      type: "closing",
      visible: true,
      headline: { km: "សាកល្បងមុន បង់ក្រោយ", en: "Try it first, pay later" },
      line: { km: "ចាប់ផ្តើមដោយឥតគិតថ្លៃ — មិនត្រូវការកាតធនាគារ។", en: "Start free — no card needed." },
      button: startFree,
    },
  ],
};
