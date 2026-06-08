export async function appendRegistration(row: string[]): Promise<void> {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    console.warn("GOOGLE_SCRIPT_URL is not set - skipping sheet storage");
    return;
  }

  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ row }),
  });

  if (!res.ok) {
    throw new Error(`Apps Script request failed: ${res.status}`);
  }

  const json = (await res.json()) as { success: boolean; error?: string };
  if (!json.success) {
    throw new Error(`Apps Script error: ${json.error ?? "unknown"}`);
  }
}
