const PING = new TextEncoder().encode(': ping\n\n');

/**
 * Wraps an SSE Response to inject `: ping\n\n` heartbeat comments at a regular interval.
 *
 * Purpose: CF edge infrastructure silently drops idle SSE connections at ~60 seconds.
 * Sending a no-op SSE comment every 30 seconds keeps the connection alive without
 * interfering with MCP protocol framing (SSE comments are ignored by clients).
 *
 * Non-SSE responses are returned unchanged.
 */
export function wrapWithHeartbeat(
  response: Response,
  intervalMs = 30_000,
  idleTimeoutMs = 300_000,
): Response {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    return response; // not an SSE stream — return unchanged
  }

  if (!response.body) return response;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  let pingInterval: ReturnType<typeof setInterval> | undefined;
  let idleTimeout: ReturnType<typeof setTimeout> | undefined;

  function resetIdleTimeout() {
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      clearInterval(pingInterval);
      writer.close().catch(() => {});
    }, idleTimeoutMs);
  }

  function startHeartbeat() {
    resetIdleTimeout();
    pingInterval = setInterval(async () => {
      try {
        await writer.write(PING);
      } catch {
        clearInterval(pingInterval);
      }
    }, intervalMs);
  }

  // Pipe source body through, injecting heartbeat alongside
  const source = response.body;
  (async () => {
    const reader = source.getReader();
    startHeartbeat();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetIdleTimeout();
        await writer.write(value);
      }
    } catch (err) {
      await writer.abort(err).catch(() => {});
    } finally {
      clearInterval(pingInterval);
      if (idleTimeout) clearTimeout(idleTimeout);
      await writer.close().catch(() => {});
    }
  })();

  // Preserve all original headers, replacing body with wrapped stream
  return new Response(readable, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
