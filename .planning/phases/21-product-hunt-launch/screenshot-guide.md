# Screenshot Capture Guide — VN MCP Hub Product Hunt

Step-by-step instructions for capturing dashboard screenshots and assembling the Product Hunt listing.

---

## Screenshot Setup

```
Browser: Chrome
Viewport: 1280 x 800 (use DevTools device toolbar or resize window)
Theme: Dark mode (dashboard default)
DevTools: Closed
Extensions: Hidden (use incognito or clean profile)
```

---

## Screenshots to Capture (5 required)

### 1. Auth / Login Page

- **URL:** https://vn-mcp-dashboard.pages.dev/login
- **State:** Empty form (not logged in)
- **Capture:** Full page showing the login form with dark background
- **Save as:** `screenshot-01-auth.png`
- **PH Caption:** "Dark mode dashboard — clean sign-up and login flow"

### 2. Overview Page

- **URL:** https://vn-mcp-dashboard.pages.dev/ (after login)
- **State:** Logged in with at least 1 API key created and some usage
- **Capture:** Full page showing welcome card, stat cards (keys, usage, tier), progress bar
- **Save as:** `screenshot-02-overview.png`
- **PH Caption:** "Dark mode dashboard — overview with usage stats and active tier"

### 3. API Keys Page

- **URL:** https://vn-mcp-dashboard.pages.dev/keys
- **State:** At least 2 API keys visible (one active, ideally one revoked)
- **Capture:** Full page showing key table with status badges
- **Save as:** `screenshot-03-keys.png`
- **PH Caption:** "API key management — create, copy, and revoke keys"

### 4. Usage Page

- **URL:** https://vn-mcp-dashboard.pages.dev/usage
- **State:** Some usage data visible in chart
- **Capture:** Full page showing area chart and per-server breakdown table
- **Save as:** `screenshot-04-usage.png`
- **PH Caption:** "Usage analytics — 30-day call volume with per-server breakdown"

### 5. Billing Page

- **URL:** https://vn-mcp-dashboard.pages.dev/billing
- **State:** Logged in, showing plan cards
- **Capture:** Full page showing 3 plan cards with Stripe/MoMo buttons
- **Save as:** `screenshot-05-billing.png`
- **PH Caption:** "Billing — upgrade plans with Stripe (USD) or MoMo (VND)"

---

## Capture Method

### Option A — Chrome DevTools (recommended for exact dimensions):

1. Open DevTools (`Cmd+Option+I`)
2. Toggle device toolbar (`Cmd+Shift+M`)
3. Set dimensions to **1280 x 800**
4. Navigate to each URL
5. `Cmd+Shift+P` → type "Capture full size screenshot" → press Enter

### Option B — macOS Screenshot:

1. Resize browser window to 1280x800 (use a resize tool or manually drag)
2. `Cmd+Shift+4`, then Space, click the browser window

---

## Product Hunt Listing Assembly

### Step 1: Create PH Account (if needed)

1. Go to https://www.producthunt.com
2. Sign up or log in
3. Go to https://www.producthunt.com/posts/new

### Step 2: Fill Listing Fields

Copy all text from `ph-listing-copy.md`:

| Field | Value |
|-------|-------|
| **Name** | VN MCP Hub |
| **Tagline** | MCP servers for Vietnamese payments and messaging |
| **Description** | Copy from `ph-listing-copy.md` Description section |
| **Topics** | Developer Tools, Open Source, Artificial Intelligence, Fintech, API |
| **Website URL** | https://fpt-a833a5a1.mintlify.app/ |
| **Gallery** | Upload 5 screenshots in order (screenshot-01 through screenshot-05) |
| **Gallery captions** | Use captions from `ph-listing-copy.md` Gallery Caption Texts section |
| **Makers** | Add yourself |

### Step 3: Maker Profile

Before submitting, ensure your PH profile is complete:

- **Name:** Your full name
- **Avatar:** Professional photo or recognizable avatar
- **Bio:** Short description mentioning developer/maker. Suggested text:
  > "Developer building tools for Vietnamese fintech. Creator of VN MCP Hub."
- **Twitter/X handle:** Add if available (helps with launch reach)

To update your PH profile: https://www.producthunt.com/settings

### Step 4: Review and Save as Draft

1. Preview the listing using the PH preview pane
2. Verify all 5 screenshots render correctly and in correct order
3. Verify tagline displays properly (check it is not truncated — 55 chars, fits PH 60-char limit)
4. Verify description paragraphs are spaced correctly
5. **Save as draft** — do NOT launch yet

> IMPORTANT: Launch on a planned day (Tuesday–Thursday typically perform best on PH). Coordinate with the launch-day-checklist.md for social posts and comment templates.

---

## File Naming Summary

| # | Save As | PH Caption |
|---|---------|------------|
| 1 | screenshot-01-auth.png | Dark mode dashboard — clean sign-up and login flow |
| 2 | screenshot-02-overview.png | Dark mode dashboard — overview with usage stats and active tier |
| 3 | screenshot-03-keys.png | API key management — create, copy, and revoke keys |
| 4 | screenshot-04-usage.png | Usage analytics — 30-day call volume with per-server breakdown |
| 5 | screenshot-05-billing.png | Billing — upgrade plans with Stripe (USD) or MoMo (VND) |

---

## After Saving Draft

When the draft is ready, proceed to launch day using `launch-day-checklist.md`.
