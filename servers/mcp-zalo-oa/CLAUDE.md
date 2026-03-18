# mcp-zalo-oa -- Claude Code Context

## What This Server Does

Zalo Official Account (OA) messaging integration. Send messages to followers, retrieve follower profiles, list followers, and refresh OAuth access tokens.

## Tools

| Tool | Description |
|------|-------------|
| `zalo_oa_send_message` | Send a message to a Zalo OA follower. Supports text, image (URL), and file (URL) types. |
| `zalo_oa_get_follower_profile` | Get profile information for a Zalo OA follower by userId. |
| `zalo_oa_list_followers` | List followers of the Zalo Official Account with offset pagination. |
| `zalo_oa_refresh_token` | Refresh the Zalo OA access token using the refresh token from environment. Call this when other Zalo OA tools return token-expired errors. |

## Required Environment Variables

| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| `ZALO_OA_SANDBOX` | Enable mock mode (set to `true`) | `true` |
| `ZALO_OA_APP_ID` | Zalo OA application ID | `demo_app_id` |
| `ZALO_OA_APP_SECRET` | Zalo OA application secret | `demo_app_secret` |
| `ZALO_OA_ACCESS_TOKEN` | Current OAuth access token (~1 hour TTL) | `demo_access_token` |
| `ZALO_OA_REFRESH_TOKEN` | OAuth refresh token for renewing access | `demo_refresh_token` |

## Enabling Mock Mode

Set `ZALO_OA_SANDBOX=true` in your `.mcp.json` env block. All tools return deterministic mock responses with `_mock: true`.

## Common Workflows

1. **List followers and send a message:**
   - Call `zalo_oa_list_followers` → receive list of follower userId values
   - Call `zalo_oa_get_follower_profile` with a userId to get display name / avatar
   - Call `zalo_oa_send_message` with userId, type=text, and text content

2. **Handle an expired access token:**
   - When a tool returns an error indicating token expiry
   - Call `zalo_oa_refresh_token` (no parameters — reads credentials from env)
   - Update `ZALO_OA_ACCESS_TOKEN` in your `.mcp.json` with the new token value
   - Retry the original tool call
