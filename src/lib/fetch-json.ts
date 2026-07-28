/**
 * Parse a fetch Response as JSON without throwing the opaque browser error
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * when the body is empty (Next.js 405s, aborted proxies, etc.).
 */
export async function readResponseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.ok
        ? "Empty response from server"
        : `Request failed (${res.status})`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Request failed (${res.status})`,
    );
  }
}
