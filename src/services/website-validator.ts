export interface WebsiteValidationResult {
  url: string;
  is_reachable: boolean;
  status_code: number | null;
  final_url: string | null;
  title: string | null;
  error: string | null;
}

export async function validateWebsite(
  rawUrl: string
): Promise<WebsiteValidationResult> {
  // Normalize URL
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "VCDiscoveryAgent/1.0 (website-validation)",
      },
    });

    // Read a limited amount of HTML to extract <title>
    const html = await res.text();
    const titleMatch = html
      .slice(0, 50_000)
      .match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    return {
      url,
      is_reachable: true,
      status_code: res.status,
      final_url: res.url !== url ? res.url : null,
      title,
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out after 10 seconds"
          : err.message
        : "Website validation failed";

    return {
      url,
      is_reachable: false,
      status_code: null,
      final_url: null,
      title: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
