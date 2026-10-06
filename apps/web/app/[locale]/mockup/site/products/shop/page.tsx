import { mockShopPage } from "@/mock/mock-site";
import { SitePageView } from "../../site-shell";

// P2. Product page: Khmio Shop (design/screens.md "Platform website"), drawn from sample content.
export default function SiteShopMockupPage() {
  return <SitePageView page={mockShopPage} />;
}
