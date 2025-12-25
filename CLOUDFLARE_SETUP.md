# Cloudflare Pages Functions Setup for TravelBooking

## 🔐 Security Architecture

The UPI ID is now stored **server-side only** using Cloudflare Environment Variables.
It is **NEVER** present in any client-side code, HTML, or JavaScript files.

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                          │
│  ┌───────────────┐                                              │
│  │  security.js  │  ← No UPI stored here!                       │
│  │   v4.0        │                                              │
│  └───────┬───────┘                                              │
│          │ 1. Request token                                      │
│          │ 2. Request UPI with token                            │
└──────────┼──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE PAGES (Server-Side)                  │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  generate-token.js  │    │    get-upi.js       │            │
│  │  ────────────────── │    │  ─────────────────  │            │
│  │  • HMAC-SHA256      │    │  • Token validation │            │
│  │  • Time-limited     │    │  • Origin check     │            │
│  │  • 30s expiry       │    │  • UPI delivery     │            │
│  └─────────────────────┘    └─────────┬───────────┘            │
│                                       │                         │
│                             ┌─────────▼───────────┐            │
│                             │  Environment Vars   │            │
│                             │  ─────────────────  │            │
│                             │  UPI_ID=9538...@ybl │            │
│                             │  TOKEN_SECRET=xxx   │            │
│                             └─────────────────────┘            │
│                                       │                         │
│                                       │ SECURE                  │
│                                       ▼                         │
│                             ┌─────────────────────┐            │
│                             │   UPI returned to   │            │
│                             │   client on-demand  │            │
│                             └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Setup Instructions

### Step 1: Deploy to Cloudflare Pages

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Pages**
3. Click **"Create a project"** → **"Connect to Git"**
4. Select your repository
5. Configure build settings:
   - **Build command:** (leave empty for static site)
   - **Build output directory:** `/` or `.`
6. Deploy!

### Step 2: Set Environment Variables

Go to **Cloudflare Dashboard** → **Pages** → **Your Project** → **Settings** → **Environment variables**

Add these variables for **Production** (and optionally Preview):

| Variable | Value | Description |
|----------|-------|-------------|
| `UPI_ID` | `9538236581@ybl` | Your UPI ID (NEVER commit this!) |
| `TOKEN_SECRET` | `<random-64-char-string>` | HMAC signing key |

**Generate a secure TOKEN_SECRET:**
```bash
openssl rand -hex 32
```

### Step 3: Test Locally with Wrangler

```bash
# Install Wrangler CLI
npm install -g wrangler

# Create a .dev.vars file (NEVER commit this!)
echo "UPI_ID=9538236581@ybl" > .dev.vars
echo "TOKEN_SECRET=$(openssl rand -hex 32)" >> .dev.vars

# Run local development server
npx wrangler pages dev . --port 8788
```

## 🔒 Security Features

### 1. **Server-Side UPI Storage**
- UPI is stored only in Cloudflare environment variables
- Never appears in source code, HTML, or JavaScript
- Impossible to find by viewing page source

### 2. **Time-Limited Tokens (HMAC-SHA256)**
- Each UPI request requires a fresh token
- Tokens expire after 30 seconds
- Prevents replay attacks

### 3. **Origin Validation**
- Only allowed domains can request UPI
- CORS headers restrict cross-origin requests

### 4. **Rate Limiting**
- Client-side: 5 copy attempts / minute
- Client-side: 3 payment attempts / 5 minutes

### 5. **Additional Protections**
- DOM mutation monitoring
- XSS input sanitization
- Extension detection
- Clickjacking prevention

## 📁 File Structure

```
TravelBooking/
├── functions/
│   └── api/
│       ├── get-upi.js          # Secure UPI delivery (Cloudflare Worker)
│       └── generate-token.js   # Token generation (Cloudflare Worker)
├── js/
│   └── security.js             # Client-side security (v4.0)
├── _headers                    # Security headers
└── CLOUDFLARE_SETUP.md         # This file
```

## 🧪 Testing

### Test Token Generation
```bash
curl https://your-project.pages.dev/api/generate-token
```

### Test UPI Retrieval (requires valid token)
```bash
# First get a token
RESPONSE=$(curl -s https://your-project.pages.dev/api/generate-token)
TOKEN=$(echo $RESPONSE | jq -r '.token')
TIMESTAMP=$(echo $RESPONSE | jq -r '.timestamp')

# Then request UPI
curl -X POST https://your-project.pages.dev/api/get-upi \
  -H "Content-Type: application/json" \
  -H "X-Request-Token: $TOKEN" \
  -H "X-Request-Timestamp: $TIMESTAMP" \
  -d '{"action":"get"}'
```

## ⚠️ Important Notes

1. **NEVER commit `.dev.vars` files** - Add to `.gitignore`
2. **NEVER hardcode UPI** in any source file
3. **Rotate TOKEN_SECRET** periodically
4. **Monitor function logs** in Cloudflare dashboard

## 🚀 Production Checklist

- [ ] UPI_ID set in Cloudflare environment (Production)
- [ ] TOKEN_SECRET set (64+ random characters)
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Security headers configured
- [ ] Function logs enabled
- [ ] Rate limiting active

## 🔄 Migration from Netlify

If migrating from Netlify:
1. Functions moved from `netlify/functions/` to `functions/api/`
2. API endpoints changed from `/.netlify/functions/` to `/api/`
3. Environment variables set in Cloudflare Dashboard instead of Netlify
