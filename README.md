# Vietnamese MCP Server Collection

The first collection of Model Context Protocol (MCP) servers for Vietnamese fintech and messaging APIs. Plug into Claude Code and interact with Vietnam's major payment gateways and messaging platforms with zero integration boilerplate.

## Servers

| Server | Package | Description | Tools |
|--------|---------|-------------|-------|
| MoMo | `@vn-mcp/mcp-momo-vn` | MoMo e-wallet payments | 4 |
| ZaloPay | `@vn-mcp/mcp-zalopay-vn` | ZaloPay payment gateway | 4 |
| VNPAY | `@vn-mcp/mcp-vnpay` | VNPAY payment gateway | 3 |
| Zalo OA | `@vn-mcp/mcp-zalo-oa` | Zalo Official Account messaging | 4 |
| ViettelPay | `@vn-mcp/mcp-viettel-pay` | ViettelPay payments (mock-only) | 3 |

**Total: 18 tools** across 5 servers.

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd vietnamese-mcp
   npm install
   ```

2. Copy `.mcp.json` to your project or add server entries to your existing `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "momo-vn": {
         "command": "node",
         "args": ["./servers/mcp-momo-vn/build/index.js"],
         "env": {
           "MOMO_SANDBOX": "true",
           "MOMO_PARTNER_CODE": "MOMOBKUN20180529",
           "MOMO_ACCESS_KEY": "klm05TvNBzhg7h7j",
           "MOMO_SECRET_KEY": "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa"
         }
       }
     }
   }
   ```
   See [`.mcp.json`](./.mcp.json) for the full example with all 5 servers.

3. Verify all servers work:
   ```bash
   npm test
   ```

All servers run in **mock mode** by default with `{SERVICE}_SANDBOX=true`. No API accounts needed.

## Architecture

This is a monorepo using npm workspaces:

- `packages/shared` — Shared utilities (HMAC signing, mock engine, error formatting, test helpers)
- `servers/mcp-momo-vn` — MoMo e-wallet ([README](servers/mcp-momo-vn/README.md))
- `servers/mcp-zalopay-vn` — ZaloPay ([README](servers/mcp-zalopay-vn/README.md))
- `servers/mcp-vnpay` — VNPAY ([README](servers/mcp-vnpay/README.md))
- `servers/mcp-zalo-oa` — Zalo OA ([README](servers/mcp-zalo-oa/README.md))
- `servers/mcp-viettel-pay` — ViettelPay ([README](servers/mcp-viettel-pay/README.md))

## Mock Mode

Every server runs in mock mode when `{SERVICE}_SANDBOX=true` is set. Mock responses are deterministic and include `_mock: true` in every response for easy identification.

No real API credentials are needed for development or testing.

## Development

```bash
npm install        # Install all workspaces
npm run build      # Build all packages
npm test           # Run all tests
```

## License

MIT
