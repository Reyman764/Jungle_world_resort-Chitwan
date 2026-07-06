# Gmail SMTP — booking verification emails

Use your Gmail account to send OTP codes. No SendGrid account needed.

## 1. Turn on 2-Step Verification

1. Open [Google Account → Security](https://myaccount.google.com/security)
2. Enable **2-St77 ](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Windows Computer** (or Other)
4. Click **Generate**
5. Copy the **16-character password** (e.g. `abcd efgh ijkl mnop` — spaces optional)

## 3. Edit `backend/.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM="Jungle World Resort" <your@gmail.com>
```

| Variable | Value |
|----------|--------|
| `SMTP_USER` | Your full Gmail address |
| `SMTP_PASS` | The 16-character **App Password** (not your Gmail login password) |
| `SMTP_FROM` | Usually the same Gmail; guests see this as the sender |

Leave `SENDGRID_API_KEY` empty so Gmail SMTP is used.

## 4. Restart the backend

```bash
cd jwr_complete/backend
npm run dev
```

## 5. Verify

Open: [http://localhost:3000/api/health/email](http://localhost:3000/api/health/email)

Expected:

```json
{
  "configured": true,
  "smtp": { "configured": true },
  "dev_fallback": false
}
```

## 6. Test the booking wizard

1. Go to Contact / Book on the site
2. Enter your email → **Send verification code**
3. Check inbox and spam — you should **not** see the yellow “Dev mode” code box when mail sends successfully

## Troubleshooting

| Error | Fix |
|-------|-----|
| Invalid login / 535 | Use App Password, enable 2-Step Verification |
| Still shows Dev mode code | Fill `SMTP_USER` and `SMTP_PASS`, restart backend |
| Mail in spam | Normal at first; mark as “Not spam” |
| Less secure app | Google removed this — **must** use App Password |

## Limits

- Gmail free accounts: about **500 emails/day** — fine for a resort booking site in development/small scale
- For high volume later, consider SendGrid or Amazon SES
