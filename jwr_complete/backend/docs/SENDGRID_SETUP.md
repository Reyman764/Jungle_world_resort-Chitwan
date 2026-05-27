# SendGrid setup — booking verification emails

Follow these steps so OTP codes arrive in Gmail (or any inbox).

## 1. Create a SendGrid account

1. Go to [https://signup.sendgrid.com/](https://signup.sendgrid.com/) (free tier is enough to start).
2. Complete signup and verify your account email.

## 2. Verify a sender (required)

SendGrid will **not** deliver mail until the “From” address is verified.

1. Open [Sender Authentication](https://app.sendgrid.com/settings/sender_auth).
2. Choose **Verify a Single Sender**.
3. Use the same email you want guests to see (e.g. your Gmail: `you@gmail.com`).
4. Complete the verification link SendGrid sends to that inbox.

## 3. Create an API key

1. Open [API Keys](https://app.sendgrid.com/settings/api_keys).
2. **Create API Key** → name it e.g. `jwr-booking`.
3. Permissions: **Restricted Access** → enable **Mail Send** → **Full Access** (or minimum needed for send).
4. Copy the key (starts with `SG.`). You only see it once.

## 4. Configure `backend/.env`

Edit `jwr_complete/backend/.env`:

```env
SENDGRID_API_KEY=SG.paste_your_real_key_here
SENDGRID_FROM_EMAIL=you@gmail.com
```

Rules:

- `SENDGRID_FROM_EMAIL` must **exactly match** the verified single sender email.
- Do not use placeholder values with `xxxx`.
- Leave the key empty only if you want dev-mode (code shown on screen, no email).

## 5. Restart the backend

```bash
cd jwr_complete/backend
npm run dev
```

## 6. Test

**Option A — Health check**

```text
GET http://localhost:3000/api/health/email
```

You want `"sendgrid": { "configured": true, "from": "you@gmail.com" }`.

**Option B — Booking wizard**

1. Open Contact / Book page.
2. Enter your email → **Send verification code**.
3. Check inbox and spam. The yellow **“Dev mode — your code is …”** box should **not** appear when mail was sent successfully.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `Unauthorized` | Wrong or expired API key — create a new key. |
| Sender not verified | Complete single sender verification; match `SENDGRID_FROM_EMAIL`. |
| Mail in spam | Normal for new SendGrid accounts; mark as not spam. |
| Dev mode code still shows | Key empty/placeholder, or backend not restarted after `.env` change. |

## Security

- Never commit `.env` or API keys to git.
- Rotate the API key if it is ever exposed.
