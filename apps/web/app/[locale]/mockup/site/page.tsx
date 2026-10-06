import { mockHomePage } from "@/mock/mock-site";
import { SitePageView } from "./site-shell";

// P1. Home (design/screens.md "Platform website"), drawn from sample content.
export default function SiteHomeMockupPage() {
  return <SitePageView page={mockHomePage} />;
}
