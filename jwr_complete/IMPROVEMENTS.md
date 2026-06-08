# Jungle World Resort — Patch Notes

## Bug Fixes

### 🔴 Critical: Staff "Add Staff" + Login Now Working
**Root Cause:**  
Migration `015` changed the `staff_audit_logs.staff_id` foreign key from
referencing `users.id` → `staff_accounts.id`. The `staffAuthService`
writes staff into the `users` table, so every audit-log insert inside the
`createStaffByAdmin` transaction failed with a FK constraint violation.
Because the audit-log write shared the same transaction, PostgreSQL rolled
back the entire transaction — **the new user was never saved**, causing
the subsequent login to fail with "Invalid email or password".

**Fixes applied:**
1. **`backend/src/services/staffAuthService.js`** — `createStaffByAdmin`
   now runs only the `User.create()` inside the transaction. The audit-log
   call fires *after* the transaction commits (no transaction arg), so a
   log failure can never abort the user creation.
2. **`backend/src/models/StaffAuditLog.js`** — Removed the wrong FK
   `references: { model: 'staff_accounts' }` declarations from both
   `staff_id` and `performed_by_staff_id` columns.
3. **`backend/src/models/index.js`** — Re-pointed `StaffAuditLog`
   associations from `StaffAccount` → `User` to match the service layer.
4. **`backend/migrations/017-fix-staff-audit-log-fk.js`** — New migration
   that drops the incorrect DB-level FK constraints and re-adds them
   pointing at `users.id`. **Run `npx sequelize-cli db:migrate` after
   deploying.**

---

## UI Improvements

### ✨ Staff Management — Full Redesign
- **Desktop:** Elegant table with avatar initials, role/status colour
  badges, inline dropdowns, action buttons.
- **Mobile:** Automatically switches to a card-based layout (table is
  hidden ≤640 px). Each card shows identity, role, status with
  context-appropriate controls.
- **Add Staff modal:** Slide-up sheet on mobile; password generator +
  one-click copy; visual role picker; password hint reminder.
- **Audit Log modal:** Styled timeline; smooth entry animation.
- **"Temp pwd" badge** shown on staff created by admin (must change
  password on first login).

### 📱 Admin Dashboard — Mobile Polish
- Topbar: hides "logged in as" text on narrow screens; all buttons
  reachable.
- Tabs: horizontal scroll with no scrollbar chrome so all tabs are
  accessible on small screens.
- Stats grid: 2-column on phones.
- Gallery grid: 2-column on mobile, 1-column on very small screens.
- Gallery category filters: horizontal scroll strip.
- Booking table: hides less-critical columns on small screens.
- All modals: slide-up bottom-sheet behaviour on mobile.
- Password panel: full-width single-column layout on mobile.

### 📱 Staff Login — Mobile Polish
- Card sticks to bottom of screen as a bottom-sheet on small phones.
- Padding and font sizes tuned for 360 px viewports.
- Force-change-password modal also adapts to bottom-sheet on mobile.

---

## How to apply

```
# 1. Backend
cd backend
npm install
npx sequelize-cli db:migrate    # runs migration 017

# 2. Frontend
cd ../frontend
npm install
npm run dev                     # or npm run build for production
```
