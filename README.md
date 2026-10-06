# Shaunz Royale Reservations (MVP front end)

Built from the PRD in this folder. Gold and black branding, mobile-first, no account needed to book.

## Run it
Double-click `index.html` to browse, or for the full experience run a local server:

    powershell -ExecutionPolicy Bypass -File serve.ps1

then open http://localhost:8080 (customer site) and http://localhost:8080/admin.html (staff).

## What's in it
**Customer site** (`index.html`): Home, Events (with category filter), 3-step Book Now flow (visit or table), Celebrations enquiry form, "Check my booking" by reference + phone, FAQ / policies / privacy pages.
**Staff dashboard** (`admin.html`): Overview, Guest check-in (partial arrivals, walk-ins, no double check-in), Reservations (search, confirm, waitlist, table assignment with conflict checks, CSV export), Events (recurring weekly occurrences, capacity, publish, sold out, cancel with affected-guest list), Tables, Celebrations pipeline (enquiry → offer → confirmed → booking), Guests, Reports, Settings, Audit log, five staff roles.

## Important: this is a working prototype, not production
- Data is stored in the browser (`localStorage`) only. Bookings made on one device are not visible on another.
- Staff "login" is a demo role picker with no passwords.
- No real notifications (WhatsApp links are generated for staff), no payments (Phase 2 / FR-14).
- Per the PRD's own architecture, production needs a backend (Next.js + PostgreSQL), secure staff auth, server-side capacity/table checks, and payment verification.

## Placeholders to confirm with management
Events (Wed Ladies' Night, Fri Club Night, Sat Ballers Linkup, Sun Red Room), capacity (120), the 6 sample tables, photos, and booking rules are samples. Phone, WhatsApp, email, Instagram and opening hours are blank until set in **Staff → Settings** (they stay hidden on the site until filled). Photos in `assets/` came from the PRD and should be replaced with approved venue photography.
