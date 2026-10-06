import { mockPricingPage } from "@/mock/mock-site";
import { SitePageView } from "../site-shell";

// P4. Pricing (design/screens.md "Platform website"), drawn from sample content; prices from plans.ts.
export default function SitePricingMockupPage() {
  return <SitePageView page={mockPricingPage} />;
}
