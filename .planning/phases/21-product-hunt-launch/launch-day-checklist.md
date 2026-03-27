# Launch Day Checklist — VN MCP Hub

All social content and response templates for Product Hunt launch day. Copy-paste ready.

---

## First Comment (post immediately when listing goes live)

```
Hey Product Hunt! I'm Huy, the maker of VN MCP Hub.

**Why I built this:** I was using Claude Code for a project that needed MoMo payments and realized there were zero MCP servers for Vietnamese APIs. Every integration meant the same boilerplate — auth headers, HMAC signing, webhook parsing. So I built 5 servers covering Vietnam's major payment gateways and messaging platforms.

**What you get:**
- 5 MCP servers: MoMo, ZaloPay, VNPAY, ViettelPay, Zalo OA
- 18 pre-built tools (create payments, check transactions, send messages)
- Self-host via npm or use the managed gateway (free tier: 1,000 calls/month)
- Dark mode dashboard for key management, usage tracking, and billing

**Try it in 2 minutes:**
1. `npm install @vn-mcp/mcp-momo-vn`
2. Add to your `.mcp.json`
3. Ask Claude: "Create a MoMo payment for 50,000 VND"

Would love your feedback — especially if you're building with Vietnamese fintech APIs!
```

---

## Social Posts

### Twitter/X Post

```
Launched on Product Hunt today!

VN MCP Hub — 5 MCP servers for Vietnamese payments and messaging.

MoMo, ZaloPay, VNPAY, ViettelPay, Zalo OA — add one line to .mcp.json and Claude Code handles the rest.

Free tier: 1,000 calls/month.

[PH link]
[GitHub link]
```

### LinkedIn Post

```
Excited to launch VN MCP Hub on Product Hunt today!

I built 5 Model Context Protocol (MCP) servers that connect Claude Code to Vietnam's payment gateways (MoMo, ZaloPay, VNPAY, ViettelPay) and messaging platforms (Zalo OA).

The problem: Vietnamese developers using AI coding assistants had no native way to interact with local fintech APIs. Every integration meant writing custom boilerplate.

The solution: Add one line to your config, and Claude can create payments, check transactions, and send messages — zero integration code.

Available as open-source npm packages or via a managed gateway with a free tier.

Check it out: [PH link]
GitHub: [GitHub link]

#MCP #AI #Fintech #Vietnam #OpenSource #DeveloperTools
```

### Dev Community Post (Reddit r/ClaudeAI or r/programming)

```
Title: I built 5 MCP servers for Vietnamese payment gateways and messaging — open source

Body:
I've been using Claude Code and wanted to interact with Vietnamese payment APIs (MoMo, ZaloPay, VNPAY) directly from the AI. No MCP servers existed for the Vietnamese market, so I built them.

**VN MCP Hub** includes:
- 5 MCP servers (MoMo, ZaloPay, VNPAY, ViettelPay, Zalo OA)
- 18 tools across all servers
- npm packages for self-hosting
- Managed gateway on Cloudflare Workers (free tier included)
- Dark mode dashboard for API key management and usage tracking

All open source: [GitHub link]

Docs + guides: [Docs link]

Happy to answer questions about the architecture (Cloudflare Workers + Supabase + Tinybird) or MCP server development.
```

---

## Launch Day Timeline

```
- [ ] T-1 day: Schedule PH listing (or submit at 12:01 AM PT)
- [ ] T-0 00:00 PT: Listing goes live
- [ ] T-0 00:05: Post first comment (copy from above)
- [ ] T-0 00:10: Tweet the Twitter/X post
- [ ] T-0 00:30: Post LinkedIn update
- [ ] T-0 01:00: Post to Reddit r/ClaudeAI
- [ ] T-0 every 2 hours: Check PH for comments, respond within 30 min
- [ ] T-0 end of day: Thank voters, share results on social
```

---

## Response Templates

### "How is this different from just using the API directly?"

```
Great question! The difference is that MCP servers let Claude Code interact with these APIs natively — you describe what you want in English, and Claude handles the API calls, authentication, and response parsing. Without MCP, you'd need to write SDK integration code, handle auth headers, and parse responses yourself. VN MCP Hub removes that boilerplate entirely.
```

### "Does this work with real payments?"

```
Currently all servers run in sandbox/mock mode — perfect for development, prototyping, and testing AI workflows. Real API integration (after merchant KYC) is on the roadmap. The mock responses mirror the real API schemas so your code won't need changes when switching to production.
```

### "Is there a free tier?"

```
Yes! Two free options: (1) Self-host any server via npm with unlimited local calls, or (2) use the managed gateway with 1,000 free calls per month. No credit card required for either path.
```

### "Can I use this with other AI tools besides Claude?"

```
VN MCP Hub uses the open Model Context Protocol (MCP) standard by Anthropic. Any MCP-compatible client can connect — Claude Code, Claude Desktop, and any future tools that adopt the protocol. The npm packages also work as standalone stdio servers.
```
