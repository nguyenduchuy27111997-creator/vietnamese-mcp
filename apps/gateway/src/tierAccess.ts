import { FREE_SERVERS } from './serverRegistry.js';

/**
 * Check whether the given tier can access the given server.
 * Returns null if access is granted.
 * Returns a Response containing MCP JSON-RPC error -32001 if access is denied.
 *
 * Phase 5: tier is always 'free' (stub). Phase 6 will pass the real tier from auth.
 */
export function checkTierAccess(serverName: string, tier: string): Response | null {
  const allTiersAllowed = ['starter', 'pro', 'business'];
  if (FREE_SERVERS.has(serverName) || allTiersAllowed.includes(tier)) {
    return null; // access granted
  }
  // free tier hitting a restricted server
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32001,
      message: 'Server access restricted. Upgrade to Starter at https://mcpvn.dev/pricing',
      data: {
        server: serverName,
        requiredTier: 'starter',
        currentTier: tier,
        upgradeUrl: 'https://mcpvn.dev/pricing',
      },
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
