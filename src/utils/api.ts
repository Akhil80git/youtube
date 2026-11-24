export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const rawText = await res.text();

  let parsed: (T & { error?: string }) | null = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as T & { error?: string };
    } catch {
      const trimmed = rawText.trim().toLowerCase();
      if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
        throw new Error('Server returned an HTML page instead of API data. Please try again.');
      }
      throw new Error('Invalid response received from server. Please try again.');
    }
  }

  if (!res.ok) {
    throw new Error(parsed?.error || `Request failed (${res.status}).`);
  }

  if (!parsed) {
    throw new Error('Empty response received from server.');
  }

  return parsed;
}
