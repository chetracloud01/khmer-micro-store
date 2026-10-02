/**
 * Shares a link the best way the device allows: the phone's share menu,
 * else the clipboard. "manual" means neither is available (an old browser)
 * — the caller shows the link so it can be copied by hand.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "manual";

/**
 * Copies text to the clipboard. The clipboard API only exists on https (and
 * localhost), so a page opened over plain http — a phone testing on Wi-Fi —
 * falls back to the older select-and-copy command.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older way.
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export async function shareOrCopyLink(title: string, url: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "shared";
    }
  } catch (error) {
    // The person closed the share menu: nothing went wrong.
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  }
  return (await copyText(url)) ? "copied" : "manual";
}
