# 🚀 Gmail SMTP Quick Setup (5 Minutes)

## The Changes
- ❌ SendGrid disabled (expiring in 50 days)
- ✅ Gmail SMTP enabled (unlimited, free)
- ✅ All email features work the same

## Setup Checklist

### 1. Generate Gmail App Password (2 min)
```
Go to: https://myaccount.google.com/security
→ Enable 2-Step Verification (if not done)
→ App passwords → Mail + Your Device
→ Copy the 16-char password (e.g., abcd efgh ijkl mnop)
```

### 2. Update `.env` (1 min)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com        # ← Your Gmail address
SMTP_PASS=abcdefghijklmnop            # ← The 16-char app password
SMTP_FROM="Jungle World Resort" <your-gmail@gmail.com>
```

### 3. Install (1 min)
```bash
cd backend
npm install
```

### 4. Test (1 min)
```bash
npm run dev
# Make a test booking → check email arrives
# Expected log: [mailer] sendBookingOtpEmail → user@example.com via smtp ✅
```

## Troubleshooting (Quick)

| Problem | Fix |
|---------|-----|
| "Gmail rejected" | New app password at https://myaccount.google.com/security |
| "SMTP auth failed" | Enable 2FA first, then create app password |
| Email in spam | Mark as "Not spam" (expected for SMTP) |

## Full Docs
- **Setup:** `docs/GMAIL_SMTP_SETUP.md`
- **Migration:** `docs/SENDGRID_TO_GMAIL_MIGRATION.md`
- **Code:** `backend/src/utils/mailer.js`

---
**Last Updated:** June 2026  
**Status:** Ready to deploy ✅
