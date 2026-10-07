# Shaunz Royale Reservations

Static front end (HTML/CSS/JS, deployed on Vercel) + Supabase (Postgres, Auth, Realtime, Edge Function).

## How it works
- **Guests** book on the site (name, phone, **email**). The booking is saved in Supabase via the `submit_reservation` function, which validates input, enforces event capacity (waitlists when full), is safe to retry, and rate-limits by phone.
- **Guest email**: a database trigger calls the `notify` edge function, which emails the guest "request received" (pending, not confirmed) and later "confirmed / waitlisted / rejected / cancelled" when staff change the status.
- **Venue alert**: the same function emails `shaunzroyaleculture@gmail.com` the moment a booking or celebration enquiry arrives (guest name, phone, email, details, one-tap WhatsApp link). Optional automatic WhatsApp alert to 08105784634 via CallMeBot.
- **Staff** sign in at `/admin` with email + password. Only emails listed in `staff_users` can enter; roles (owner, manager, reservation, door, finance) are enforced by database row-level security. New bookings appear live with a sound and toast.

## One-time setup (secrets are set in Supabase, never in the code)
Supabase dashboard → project `shaunz-royale` → Edge Functions → Secrets:

| Secret | Purpose |
|---|---|
| `GMAIL_USER` = shaunzroyaleculture@gmail.com and `GMAIL_APP_PASSWORD` | send email through Gmail (no domain needed; ~500/day) |
| *or* `RESEND_API_KEY` (+ `MAIL_FROM`) | send through Resend (needs a verified domain to email guests) |
| `CALLMEBOT_APIKEY` (optional) | automatic WhatsApp alert to the number in Settings |
| `SITE_URL` (optional) | public site address used in email links |

Then Authentication → Users → **Add user** `shaunzroyaleculture@gmail.com` with a password you choose. Owners can add more staff emails and roles under Dashboard → Settings → Staff accounts.

## Local preview
    powershell -ExecutionPolicy Bypass -File serve.ps1
then http://localhost:8080 and /admin.html.

## Known limits
- Staff status changes and capacity overrides are checked in the dashboard; guest bookings are checked on the server. Move staff confirmation checks server-side before heavy use.
- Two staff editing the same booking at once: last save wins.
- Online payments (Paystack/Flutterwave) are not built yet.
- Sample events (Wed Ladies' Night, Fri Club Night, Sat Ballers Linkup, Sun Red Room), capacity 120 and six tables are placeholders: edit them in the dashboard.
