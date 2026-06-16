// Optional failure alerting. If ALERT_WEBHOOK_URL is set (a Slack or Discord
// incoming webhook), POST a short message there. No-ops when unset, and never
// throws — alerting must never break the thing it is monitoring.
export async function notify(message: string): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `text` is Slack's field, `content` is Discord's — sending both is
      // harmless (each ignores the key it doesn't use).
      body: JSON.stringify({
        text: `🐭 ratmap.nyc: ${message}`,
        content: `🐭 ratmap.nyc: ${message}`,
      }),
    });
  } catch {
    // Best-effort — swallow any webhook error.
  }
}
