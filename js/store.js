/* Shaunz Royale — shared data layer (browser localStorage).
   Replace with a real backend + PostgreSQL for production (see README). */
(function () {
  const KEY = 'shaunz_royale_v1';
  const TZ = 'Africa/Lagos';
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
  const nextDow = (idx, from) => { let d = from || todayISO(); while (dow(d) !== idx) d = addDays(d, 1); return d; };
  const fmtDate = (iso, opts) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-NG', Object.assign({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, opts || {}));
  const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + ' ' + ap; };
  const nowStamp = () => new Date().toISOString();
  const fmtStamp = (s) => new Date(s).toLocaleString('en-NG', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 10);
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const ref = (p) => { let s = ''; const a = new Uint8Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 255); a.forEach((n) => s += ALPHA[n % ALPHA.length]); return p + '-' + s; };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normPhone = (p) => { let d = String(p || '').replace(/[^\d+]/g, ''); if (d.startsWith('+')) return d.slice(1); if (d.startsWith('00')) return d.slice(2); if (d.startsWith('0')) return '234' + d.slice(1); return d; };
  const validPhone = (p) => { const d = String(p || '').replace(/[\s()-]/g, ''); return /^(\+?\d{10,15})$/.test(d); };

  const IMG = { neon: 'assets/image10.jpg', lounge: 'assets/image7.jpg', vip: 'assets/image5.jpg', bday: 'assets/image3.jpg' };

  function seed() {
    const mk = (title, cat, dayIdx, weeks, img, desc, pos) => {
      const out = []; let d = nextDow(dayIdx);
      for (let i = 0; i < weeks; i++) { out.push({ id: uid('ev'), title, category: cat, date: d, start: '', end: '', description: desc, price: '', capacity: 120, image: img, imagePos: pos || 'center', published: true, cancelled: false, soldOut: false, tablesEnabled: true, policy: '' }); d = addDays(d, 7); }
      return out;
    };
    const events = [].concat(
      mk("Wednesday Ladies' Night", "Ladies' Night", 3, 3, IMG.lounge, 'A night made for the ladies. Good music, great company.'),
      mk('Friday Club Night', 'Club Nights', 5, 3, IMG.neon, 'The major night of the week. Bring your people and own the floor.', 'center 30%'),
      mk('Ballers Linkup', 'Club Nights', 6, 3, IMG.vip, 'Saturday link-up for the ballers. Reserve a table and settle in.'),
      mk('Red Room', 'Seasonal and One-off Events', 0, 3, IMG.neon, 'Sunday in the Red Room. A different kind of vibe.', 'center 70%')
    ).sort((a, b) => a.date.localeCompare(b.date));
    const tables = [
      ['A1', 'Table A1', 4, 'Standard'], ['A2', 'Table A2', 4, 'Standard'], ['A3', 'Table A3', 4, 'Standard'],
      ['V1', 'Table V1', 6, 'VIP'], ['V2', 'Table V2', 6, 'VIP'], ['P1', 'Private Area P1', 12, 'Private area']
    ].map(([code, name, seats, type]) => ({ id: uid('tb'), code, name, seats, type, active: true, blockedUntil: '', blockNote: '' }));
    return {
      v: 1, sample: true,
      settings: { address: 'Around Shebi Junction, Ilesha–Owo Express Road, Akure, Ondo State', phone: '', whatsapp: '', email: '', instagram: '', hours: '', graceMinutes: 90, tableDurationMins: 180, turnoverBufferMins: 30 },
      events, tables, reservations: [], enquiries: [], audit: [], notifications: []
    };
  }

  let state = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { state = JSON.parse(raw); return state; } } catch (e) { }
    state = seed(); save(); return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Storage unavailable', e); } }
  function reset() { state = seed(); save(); return state; }
  const get = () => state || load();

  function audit(actor, action, detail) { get().audit.unshift({ id: uid('au'), at: nowStamp(), actor: actor || 'Customer', action, detail: detail || '' }); get().audit = get().audit.slice(0, 500); save(); }

  /* ---------- availability ---------- */
  const COUNTS = ['confirmed', 'checked_in', 'completed'];
  const eventById = (id) => get().events.find((e) => e.id === id);
  function eventUsed(eventId) {
    return get().reservations.filter((r) => r.eventId === eventId && COUNTS.includes(r.status)).reduce((n, r) => n + (r.type === 'walkin' ? (r.arrived || r.guests) : r.guests), 0);
  }
  function eventRemaining(ev) { return ev.capacity ? Math.max(0, ev.capacity - eventUsed(ev.id)) : Infinity; }
  function eventState(ev) {
    if (ev.cancelled) return 'cancelled';
    if (ev.soldOut || eventRemaining(ev) <= 0) return 'full';
    return 'open';
  }
  const bookableEvents = () => get().events.filter((e) => e.published && !e.cancelled && e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''));

  const toMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
  function tableConflict(tableId, date, time, ignoreResId) {
    const s = get().settings, span = (+s.tableDurationMins || 180) + (+s.turnoverBufferMins || 0);
    return get().reservations.find((r) => r.id !== ignoreResId && r.date === date && ['confirmed', 'checked_in'].includes(r.status) && (r.tableIds || []).includes(tableId) && Math.abs(toMin(r.time) - toMin(time)) < span) || null;
  }
  function tableStatus(t, date) {
    if (!t.active || (t.blockedUntil && t.blockedUntil >= date)) return { s: 'unavailable', res: null };
    const rs = get().reservations.filter((r) => r.date === date && (r.tableIds || []).includes(t.id) && ['confirmed', 'checked_in'].includes(r.status));
    const occ = rs.find((r) => r.status === 'checked_in');
    if (occ) return { s: 'occupied', res: occ };
    if (rs.length) return { s: 'reserved', res: rs[0] };
    return { s: 'available', res: null };
  }

  /* ---------- customer actions ---------- */
  function submitReservation(d) {
    const st = get();
    // idempotency: a retried submission with the same token returns the original booking
    const dup = st.reservations.find((r) => r.token && r.token === d.token);
    if (dup) return { ok: true, reservation: dup, duplicate: true };
    const ev = d.eventId ? eventById(d.eventId) : null;
    if (d.eventId && (!ev || !ev.published || ev.cancelled)) return { ok: false, error: 'This event is no longer open for booking.' };
    if (d.date < todayISO()) return { ok: false, error: 'Please choose a date that has not passed.' };
    let status = 'pending';
    if (ev && (ev.soldOut || eventRemaining(ev) < d.guests)) status = 'waitlisted';
    const r = Object.assign({ id: uid('rs'), ref: ref('SR'), status, tableIds: [], arrived: 0, checkIns: [], notes: '', createdAt: nowStamp(), source: 'website' }, d);
    st.reservations.push(r); save(); audit('Customer', 'Booking submitted', r.ref + ' · ' + r.guests + ' guests · ' + r.date);
    return { ok: true, reservation: r };
  }
  function submitEnquiry(d) {
    const st = get();
    const dup = st.enquiries.find((r) => r.token && r.token === d.token);
    if (dup) return { ok: true, enquiry: dup, duplicate: true };
    const q = Object.assign({ id: uid('en'), ref: ref('CE'), stage: 0, declined: false, quote: '', followUp: '', nextAction: '', createdAt: nowStamp(), reservationId: '' }, d);
    st.enquiries.push(q); save(); audit('Customer', 'Celebration enquiry', q.ref + ' · ' + q.occasion + ' · ' + q.date);
    return { ok: true, enquiry: q };
  }
  function lookup(refCode, phone) {
    const c = String(refCode || '').trim().toUpperCase(), p = normPhone(phone);
    const r = get().reservations.find((x) => x.ref === c && normPhone(x.phone) === p);
    if (r) return { kind: 'reservation', item: r };
    const q = get().enquiries.find((x) => x.ref === c && normPhone(x.phone) === p);
    if (q) return { kind: 'enquiry', item: q };
    return null;
  }

  const STATUS = {
    pending: ['Pending', '◔', 'Submitted and awaiting review'], confirmed: ['Confirmed', '✔', 'Accepted under the venue’s booking rules'],
    waitlisted: ['Waitlisted', '⏳', 'No current capacity; waiting for a spot'], cancelled: ['Cancelled', '✕', 'Cancelled by the customer or authorised staff'],
    rejected: ['Rejected', '⊘', 'Not accepted by the venue'], checked_in: ['Checked in', '➜', 'Guest arrival has been recorded'],
    completed: ['Completed', '★', 'Visit or event has ended'], no_show: ['No-show', '∅', 'Guest did not arrive within the applicable policy']
  };
  const STAGES = ['Enquiry submitted', 'Availability reviewed', 'Offer sent', 'Deposit / payment', 'Booking confirmed', 'Event completed'];
  const CHANNELS = ['Instagram', 'WhatsApp', 'Website (direct)', 'Friend or host', 'Promoter', 'Walk-in', 'Other'];

  window.SR = { TZ, DAY_NAMES, IMG, todayISO, addDays, dow, nextDow, fmtDate, fmtTime, fmtStamp, nowStamp, uid, ref, esc, normPhone, validPhone, load, get, save, reset, audit, eventById, eventUsed, eventRemaining, eventState, bookableEvents, tableConflict, tableStatus, toMin, submitReservation, submitEnquiry, lookup, STATUS, STAGES, CHANNELS, COUNTS };
  load();
})();
