/**
 * Shares a link the best way the device allows: the phone's share menu,
 * else the clipboard. "manual" means neither is available (a plain-http
 * page, an old browser) — the caller shows the link so it can be copied by hand.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "manual";

export async function shareOrCopyLink(title: string, url: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    // The person closed the share menu: nothing went wrong.
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "manual";
  }
}
