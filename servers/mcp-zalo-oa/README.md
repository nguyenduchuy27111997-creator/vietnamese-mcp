# mcp-zalo-oa

Zalo Official Account (OA) messaging MCP server for Vietnam. Send messages to followers, retrieve follower profiles, list followers, and refresh OAuth tokens.

## Quick Start

1. Install dependencies from monorepo root: `npm install`
2. Configure environment variables in `.mcp.json` (see below)
3. Add server entry to `.mcp.json`
4. Verify: `npm test --workspace=servers/mcp-zalo-oa`

## .mcp.json Entry

```json
"zalo-oa": {
  "command": "node",
  "args": ["./servers/mcp-zalo-oa/build/index.js"],
  "env": {
    "ZALO_OA_SANDBOX": "true",
    "ZALO_OA_APP_ID": "demo_app_id",
    "ZALO_OA_APP_SECRET": "demo_app_secret",
    "ZALO_OA_ACCESS_TOKEN": "demo_access_token",
    "ZALO_OA_REFRESH_TOKEN": "demo_refresh_token"
  }
}
```

## Tools

### zalo_oa_send_message

Send a message to a Zalo OA follower. Supports text, image (URL), and file (URL) types.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Zalo user ID of the follower to message |
| `type` | `text` \| `image` \| `file` | Yes | Message type |
| `text` | string | No | Text content (required if type=text) |
| `imageUrl` | string (url) | No | Image URL (required if type=image) |
| `fileUrl` | string (url) | No | File URL (required if type=file) |

**Returns:** `{ error, message, data: { message_id }, _mock? }`

---

### zalo_oa_get_follower_profile

Get profile information for a Zalo OA follower by userId.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Zalo user ID of the follower |

**Returns:** `{ error, message, data: { user_id, display_name, avatar, is_following }, _mock? }`

---

### zalo_oa_list_followers

List followers of the Zalo Official Account with offset pagination.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `offset` | number (int) | No | Pagination offset (default: 0) |
| `count` | number (int, max 50) | No | Number of followers to return (default: 50) |

**Returns:** `{ error, message, data: { followers: [{ user_id }], total }, _mock? }`

---

### zalo_oa_refresh_token

Refresh the Zalo OA access token using the refresh token from environment. Call this when other Zalo OA tools return token-expired errors.

**Parameters:** None

**Returns:** `{ access_token, refresh_token, expires_in, _mock? }`

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ZALO_OA_SANDBOX` | Yes | Enable mock mode | `true` |
| `ZALO_OA_APP_ID` | Yes | Zalo OA application ID | `demo_app_id` |
| `ZALO_OA_APP_SECRET` | Yes | Zalo OA application secret | `demo_app_secret` |
| `ZALO_OA_ACCESS_TOKEN` | Yes | Current OAuth access token (~1 hour TTL) | `demo_access_token` |
| `ZALO_OA_REFRESH_TOKEN` | Yes | OAuth refresh token for renewing access | `demo_refresh_token` |

## Mock Mode

Set `ZALO_OA_SANDBOX=true`. All tools return deterministic mock responses with `_mock: true`.

Access tokens have approximately 1 hour TTL in production. Use `zalo_oa_refresh_token` when the access token expires.
