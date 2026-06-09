# 🎯 Package Images Fix - Deployment Guide

## What Was Fixed

Your package images were showing **wrong photos**:
- ❌ **Close Up Chitwan** → Camera equipment photo (wrong Unsplash)
- ❌ **Explore Chitwan** → Himalayan mountains (wrong Unsplash + sweethomechitwan.com)
- ✅ **Chitwan at a Glance** → Already correct

All three are now fixed with **local resort gallery images**.

---

## ✅ What You Get in This Zip

| File | Purpose |
|------|---------|
| `backend/migrations/019-fix-package-images.js` | Automatic migration (runs with `npm run migrate`) |
| `backend/seeds/001-seed-packages.js` | Updated seed file with correct local images |
| `frontend/src/hooks/usePackages.js` | Frontend fallback updated |
| `backend/src/controllers/packageController.js` | API layer has runtime guard |
| `fix-package-images.sql` | Manual SQL (backup option) |
| `DEPLOYMENT_STEPS.md` | Step-by-step deployment instructions |

---

## 🚀 Quick Start - Choose Your Path

### Path A: Using Your Existing Migration System (RECOMMENDED)

```bash
cd backend
npm install
npm run migrate
```

✅ The migration file `019-fix-package-images.js` will run automatically and update your database.

---

### Path B: Using the Manual SQL Script

**If migrations aren't working**, use the SQL file directly:

```bash
# Option 1: Using psql (if installed)
psql $DATABASE_URL -f fix-package-images.sql

# Option 2: Using a GUI (pgAdmin, DBeaver, etc.)
# 1. Open pgAdmin or DBeaver
# 2. Open the SQL file
# 3. Execute the queries
```

---

### Path C: Using the Node.js Helper Script

If you have Node.js but no database setup, use the helper:

```bash
cd backend
node ./run-migration.js
```

You'll need to provide your database credentials when prompted.

---

## 📋 Deployment Checklist

- [ ] Extract this zip
- [ ] Copy `jwr_complete/backend` to your backend directory
- [ ] Copy `jwr_complete/frontend` to your frontend directory
- [ ] Run one migration method (A, B, or C above)
- [ ] Test the Packages page locally
- [ ] Deploy to production
- [ ] Verify package images on live site

---

## ⚠️ Important Notes

1. **The code is already fixed** — even without running the migration, the images will show correctly thanks to the API runtime guard
2. **The migration just cleans the database** — it makes the stored URLs match the code
3. **No downtime required** — safe to run anytime
4. **Reversible** — the migration has a `down()` function (though you shouldn't need it)

---

## 🔍 What Changed in Each File

### Frontend (`frontend/src/hooks/usePackages.js`)
```javascript
// Before
img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?...' // Camera equipment!

// After
img: '/images/gallery/resort-06.jpg' // Local resort photo
```

### Backend Seed (`backend/seeds/001-seed-packages.js`)
```javascript
// Before
image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?...' // Mountains!

// After
image_url: '/images/gallery/resort-09.jpg' // Local resort photo
```

### API Controller (`backend/src/controllers/packageController.js`)
Added a runtime guard:
```javascript
img: (() => {
  const SLUG_IMGS = {
    'chitwan-at-a-glance': '/images/gallery/resort-03.jpg',
    'close-up-chitwan':    '/images/gallery/resort-06.jpg',
    'explore-chitwan':     '/images/gallery/resort-09.jpg',
  };
  const isWrongExternal = !p.image_url
    || p.image_url.includes('unsplash.com')
    || p.image_url.includes('sweethomechitwan.com');
  return isWrongExternal ? (SLUG_IMGS[p.slug] || '/images/gallery/resort-03.jpg') : p.image_url;
})(),
```

This means: **If the database has a wrong external URL, it automatically uses a local image instead.**

---

## 🆘 Troubleshooting

### "npm run migrate" doesn't work
→ Use the SQL file directly (Path B above)

### "Can't find psql"
→ Use a GUI tool like pgAdmin or DBeaver (Path B, option 2)

### Images still showing wrong photos after migration
→ Check your browser cache (Ctrl+Shift+Delete in Chrome)
→ Or hard refresh (Ctrl+Shift+R)
→ The API runtime guard should catch it anyway

### Want to revert the migration
```bash
npm run migrate:down
# This will rollback to the old (wrong) URLs — don't do this unless you have a reason!
```

---

## 📞 Summary

**Everything is ready to deploy.** Just:
1. Extract this zip
2. Run the migration using your preferred method
3. Deploy to production
4. Done! ✅

The package images will now display correctly on your Packages page.
