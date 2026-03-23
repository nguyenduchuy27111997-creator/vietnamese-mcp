export type ToolCallEvent = {
  api_key_id: string;
  server: string;
  tool: string;
  timestamp: string;       // ISO 8601
  response_status: string;  // 'ok' or 'error'
};

export async function sendTinybirdEvent(
  event: ToolCallEvent,
  token: string,
  host = 'https://api.tinybird.co',
): Promise<void> {
  try {
    const res = await fetch(`${host}/v0/events?name=tool_calls`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(event) + '\n',
    });
    if (!res.ok) {
      console.error(`Tinybird ingestion failed: ${res.status}`);
    }
  } catch (err) {
    console.error('Tinybird unreachable:', err);
  }
}
