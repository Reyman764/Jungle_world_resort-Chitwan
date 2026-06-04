# Jungle World Resort — Improvement Roadmap

This document covers pending improvements, technical debt, and feature ideas for the JWR booking system. Items are grouped by effort and impact.

---

## 🚀 High Impact / Low Effort

### 1. Per-Package Rooms Left Counter (Auto-Decrement)
**What:** Instead of manually typing "2 rooms left" as urgency text, connect it to actual booking data.

**How:**
- Add a `total_rooms` integer column to the `packages` table
- In `packageController.js > serializePackage`, compute:
  ```js
  const confirmedBookings = await Booking.count({ where: { package_id: p.id, status: { [Op.in]: ['confirmed','checked_in'] }, check_in_date: today } });
  urgency = p.total_rooms - confirmedBookings > 0 ? `${p.total_rooms - confirmedBookings} rooms left` : null;
  ```
- Admin still sets `total_rooms` once; urgency updates automatically
- Add migration: `ALTER TABLE packages ADD COLUMN total_rooms INTEGER DEFAULT 10;`

---

### 2. Image Upload for Packages
**What:** Admin can upload package images directly instead of pasting image URLs.

**How:**
- Add a file input in `PackageManager.jsx` alongside the existing image URL field
- Backend: add `POST /api/admin/packages/:id/image` route that accepts multipart
- Storage: upload to Supabase Storage bucket or Cloudinary (both have free tiers)
- On success, auto-update `image_url` in the package record

---

### 3. Booking Confirmation Emails
**What:** Send a formatted confirmation email to the guest when a booking status changes to `confirmed`.

**How:**
- In `adminController.js`, after `booking.update(updates)`, check if `status` changed to `confirmed`
- Use the existing SendGrid `mailer.js` to send a template email with booking reference, package name, dates, and total
- Create an HTML email template in `src/templates/booking-confirmed.html`
- Also send a copy to the resort's inbox as a notification

---

### 4. WhatsApp / Viber Quick Contact Button
**What:** A floating "Chat on WhatsApp" button for direct guest inquiries — common in South Asian tourism.

**How:**
- Add to `FloatingBookBtn.jsx` alongside the existing book button
- Link: `https://wa.me/977XXXXXXXXX?text=Hi, I'm interested in booking a stay at Jungle World Resort`
- Show only on mobile (where WhatsApp is most used)

---

## 📦 Medium Effort

### 5. Package Availability Calendar
**What:** Show guests which dates still have availability before they enquire.

**How:**
- Add a `GET /api/packages/:id/availability?month=YYYY-MM` endpoint
- Query confirmed/checked-in bookings for that month, grouped by check-in date
- Frontend: render a simple calendar grid in `BookingWizard.jsx` Step 1
- Block out dates that are fully booked

---

### 6. Admin Booking Export (CSV)
**What:** One-click export of filtered bookings to CSV for accounting and record-keeping.

**How:**
- Add `GET /api/admin/export?status=confirmed&startDate=...` endpoint
- Use `json2csv` npm package to stream CSV response with headers: `Reference, Guest, Package, Check-in, Category, Status, Payment, Total`
- Add an "Export CSV" button to the admin bookings table header

---

### 7. Multi-Language Support (Nepali)
**What:** Add Nepali (नेपाली) as a language option for local visitors.

**How:**
- Add `i18next` and `react-i18next`
- Create `src/locales/en.json` and `src/locales/np.json` with all UI strings
- Add a language toggle in the Navbar
- Price formatting already handles NPR — Nepali locale uses the same currency

---

### 8. Reviews & Rating Display
**What:** The `Review` model exists in the backend but there's no frontend display.

**How:**
- Add `GET /api/reviews` public endpoint in `packageController.js` or a new `reviewController.js`
- Display star ratings and review cards on the Home page (below the testimonials section)
- Admin dashboard: add a "Reviews" tab to approve/reject guest reviews before they appear

---

### 9. Discount Expiry Auto-Clear
**What:** If a package has a discount set, automatically clear it after the promo end date passes.

**How:**
- Add a cron job (node-cron or a Supabase scheduled function) that runs daily at midnight
- Query packages where `discount_label IS NOT NULL`
- Cross-reference with `site_settings WHERE key = 'promo'` — if `ends_at` has passed, null out discount fields
- This prevents stale "15% Off" badges from showing after the offer is over

---

### 10. Package Waitlist
**What:** When a package shows "X rooms left", allow guests to join a waitlist.

**How:**
- Add a `waitlists` table: `(id, package_id, guest_email, guest_name, check_in_date, created_at)`
- Add `POST /api/waitlist` public endpoint
- Show a "Join Waitlist" button in `BookingWizard.jsx` when urgency text is set
- When a booking is cancelled, admin is notified and can offer the slot to the next waitlist entry

---

## 🏗️ Larger Features

### 11. Online Payment Integration (Khalti / eSewa)
**What:** Accept partial or full payment online instead of just "pay at hotel".

**How:**
- Both Khalti and eSewa have Nepal-specific APIs with good documentation
- Khalti Web Checkout: https://docs.khalti.com/khalti-epayment/
- Backend: add `POST /api/payments/khalti/initiate` and `POST /api/payments/khalti/verify`
- Update `BookingWizard.jsx` to include a payment step after confirmation
- Record payment in the existing `Payment` model
- This is the single highest-revenue-impact feature on this list

---

### 12. Admin Analytics Dashboard
**What:** Charts for revenue trends, occupancy rates, booking source breakdown.

**How:**
- Backend: extend `GET /api/admin/stats` to return monthly revenue arrays, occupancy by package, and category breakdown
- Frontend: add a "Analytics" tab in `AdminDashboard.jsx`
- Use `recharts` (already available in React) for bar/line charts
- Key metrics: revenue this month vs last month, busiest check-in days, top guest categories

---

### 13. Staff Role Permissions
**What:** Currently only `admin` and `manager` can edit packages. A finer permission model would let you give specific staff limited access.

**How:**
- Add a `permissions` JSONB column to the `users` table
- Example: `{ "can_edit_packages": false, "can_export_bookings": true, "can_change_status": true }`
- Update `requireRole` middleware to also check specific permissions
- Admin can set permissions per staff member in the dashboard

---

### 14. SEO & Sitemap
**What:** The site has no sitemap.xml or structured data, limiting search engine visibility.

**How:**
- Generate `public/sitemap.xml` with routes: `/`, `/packages`, `/activities`, `/gallery`, `/about-chitwan`, `/tariff`, `/contact`
- Add JSON-LD structured data in `index.html`:
  ```html
  <script type="application/ld+json">
  { "@type": "LodgingBusiness", "name": "Jungle World Resort", ... }
  </script>
  ```
- Add `meta` description tags to each page component
- Submit sitemap to Google Search Console

---

## 🐛 Known Technical Debt

### Fix: `BookingWizard.jsx` Package Night Map
The `PACKAGE_NIGHTS` map in `BookingWizard.jsx` is hardcoded:
```js
const PACKAGE_NIGHTS = { glance: 1, closeup: 2, explore: 3 }
```
This should be derived from the API response so it automatically updates if packages change:
```js
const PACKAGE_NIGHTS = Object.fromEntries(packages.map(p => [p.id, p._raw?.duration_nights ?? 1]))
```

---

### Fix: Error Boundary
There's no React error boundary in the app. An uncaught render error anywhere will crash the whole page. Add a top-level `<ErrorBoundary>` in `App.jsx`.

---

### Fix: Token Expiry Handling
When the JWT expires, API calls silently fail. Add a global response interceptor that checks for `401` and redirects to `/staff-login`:
```js
if (res.status === 401) { localStorage.removeItem('token'); window.location = '/staff-login'; }
```

---

### Fix: Missing `loading` State on Initial Render in Home.jsx
`usePackages()` starts with `FALLBACK_PACKAGES` as initial state and then replaces them with API data. This causes a brief flash of fallback content. Guard with the `loading` flag:
```jsx
{!loading && packages.map(...)}
```

---

### Fix: Inconsistent `referrerPolicy` on Images
Some `<img>` tags use `referrerPolicy="no-referrer-when-downgrade"` and some don't. Standardise by setting it globally in `index.css`:
```css
img { referrer-policy: no-referrer-when-downgrade; }
```
(or set it in the Vite `<meta>` tag in `index.html`)

---

## 🔒 Security Improvements

- **Rate-limit the public packages endpoint** — currently no rate limit; add `express-rate-limit` to `GET /api/packages`
- **CSRF protection** — admin PATCH/POST endpoints have JWT auth but no CSRF token for browser requests; consider `csurf` middleware
- **Input sanitisation** — `discount_label` and `urgency_text` are rendered in the DOM; sanitise with `DOMPurify` on the frontend before display, even though values come from trusted admins
- **Helmet.js** — add security headers (`X-Frame-Options`, `Content-Security-Policy`) via `helmet` npm package in `app.js`

---

## 📝 File Structure Reference

```
backend/src/
  controllers/
    adminController.js      — bookings CRUD, stats
    packageController.js    — packages + promo settings ← recently updated
    bookingController.js    — public booking creation
    authController.js       — login / JWT
  models/
    Package.js              — package schema (urgency_text, discount_label etc.)
    SiteSetting.js          — key/value store (promo countdown config)
    Booking.js
  routes/
    adminPackages.js        — admin package management routes
    admin.js                — booking management routes
    packages.js             — public package listing

frontend/src/
  admin/
    AdminDashboard.jsx      — main admin shell + booking table
    PackageManager.jsx      — package + promo editing ← recently updated
  components/
    PackageBadges.jsx       — shared urgency/discount badge component ← NEW
    BookingWizard.jsx       — multi-step booking form
    CountdownTimer.jsx      — countdown display
  hooks/
    usePackages.js          — fetches + caches package + promo data ← recently updated
  pages/
    Packages.jsx            — public packages page ← recently updated
    Home.jsx                — homepage with package cards ← recently updated
```
