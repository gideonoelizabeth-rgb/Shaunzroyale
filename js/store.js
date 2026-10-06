/* Shaunz Royale — shared data layer (Supabase).
   Public site: reads via anonymous RPC functions, writes bookings via RPC.
   Staff dashboard: signed-in staff read/write tables directly (row-level security enforces roles). */
(function () {
  const CFG = window.SR_CONFIG || {};
  const sb = window.supabase ? window.supabase.createClient(CFG.url, CFG.key) : null;
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
  const ref = (p) => { let s = ''; const a = new Uint8Array(6); crypto.getRandomValues(a); a.forEach((n) => s += ALPHA[n % ALPHA.length]); return p + '-' + s; };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normPhone = (p) => { let d = String(p || '').replace(/[^\d+]/g, ''); if (d.startsWith('+')) return d.slice(1); if (d.startsWith('00')) return d.slice(2); if (d.startsWith('0')) return '234' + d.slice(1); return d; };
  const validPhone = (p) => { const d = String(p || '').replace(/[\s()-]/g, ''); return /^(\+?\d{10,15})$/.test(d); };
  const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());

  const IMG = { neon: 'assets/image10.jpg', lounge: 'assets/image7.jpg', vip: 'assets/image5.jpg', bday: 'assets/image3.jpg' };

  const DEFAULT_SETTINGS = { address: 'Around Shebi Junction, Ilesha–Owo Express Road, Akure, Ondo State', phone: '', whatsapp: '', email: '', instagram: '', hours: '', graceMinutes: 90, tableDurationMins: 180, turnoverBufferMins: 30, alertEmail: '', alertWhatsapp: '' };
  let mode = 'public';
  const state = { settings: Object.assign({}, DEFAULT_SETTINGS), events: [], tables: [], reservations: [], enquiries: [], audit: [] };
  const KEYMAP = { events: 'events', tables: 'venue_tables', reservations: 'reservations', enquiries: 'enquiries' };
  const snap = { events: {}, venue_tables: {}, reservations: {}, enquiries: {}, settings: '' };
  const get = () => state;

  /* ---------- public data ---------- */
  async function loadPublic() {
    const [e, s] = await Promise.all([sb.rpc('public_events'), sb.rpc('public_settings')]);
    if (e.error) throw e.error;
    state.events = e.data || [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS, s.data || {});
  }

  /* ---------- staff data ---------- */
  async function loadAll() {
    const q = (t) => sb.from(t).select('*');
    const [ev, tb, rs, en, st, au] = await Promise.all([q('events'), q('venue_tables'), q('reservations').order('created_at', { ascending: false }).limit(5000), q('enquiries'), q('settings').eq('id', 1).maybeSingle(), q('audit_logs').order('at', { ascending: false }).limit(200)]);
    for (const r of [ev, tb, rs, en, st]) if (r.error) throw r.error;
    mode = 'staff';
    state.events = ev.data.map((r) => r.data); state.tables = tb.data.map((r) => r.data);
    state.reservations = rs.data.map((r) => r.data); state.enquiries = en.data.map((r) => r.data);
    state.settings = Object.assign({}, DEFAULT_SETTINGS, st.data ? st.data.data : {});
    state.audit = (au.data || []).map((r) => ({ id: r.id, at: r.at, actor: r.actor, action: r.action, detail: r.detail }));
    Object.keys(KEYMAP).forEach((k) => { snap[KEYMAP[k]] = {}; state[k].forEach((o) => { snap[KEYMAP[k]][o.id] = JSON.stringify(o); }); });
    snap.settings = JSON.stringify(state.settings);
  }
  let chain = Promise.resolve();
  const onError = { fn: null };
  async function syncOnce() {
    if (mode !== 'staff') return;
    for (const key of Object.keys(KEYMAP)) {
      const table = KEYMAP[key], s = snap[table], seen = new Set(), ups = [];
      for (const o of state[key]) { seen.add(o.id); const j = JSON.stringify(o); if (s[o.id] !== j) ups.push({ id: o.id, data: JSON.parse(j) }); }
      const dels = Object.keys(s).filter((id) => !seen.has(id));
      if (ups.length) { const { error } = await sb.from(table).upsert(ups); if (error) throw error; ups.forEach((u) => { s[u.id] = JSON.stringify(u.data); }); }
      if (dels.length) { const { error } = await sb.from(table).delete().in('id', dels); if (error) throw error; dels.forEach((id) => delete s[id]); }
    }
    const j = JSON.stringify(state.settings);
    if (j !== snap.settings) { const { error } = await sb.from('settings').upsert({ id: 1, data: state.settings }); if (error) throw error; snap.settings = j; }
  }
  /* Persist any changes made to the in-memory state (diff-based). */
  function save() { chain = chain.then(syncOnce).catch((e) => { console.error(e); if (onError.fn) onError.fn(e); }); return chain; }
  const refresh = () => chain.then(loadAll);
  function audit(actor, action, detail) {
    const row = { id: uid('au'), actor: actor || 'Staff', action, detail: detail || '' };
    state.audit.unshift(Object.assign({ at: nowStamp() }, row)); state.audit = state.audit.slice(0, 200);
    if (mode === 'staff') sb.from('audit_logs').insert(row).then(({ error }) => { if (error) console.warn('audit', error.message); });
  }
  function subscribe(cb) {
    const ch = sb.channel('sr-live');
    ['reservations', 'enquiries', 'events', 'venue_tables', 'settings'].forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => cb(t, p)));
    ch.subscribe(); return ch;
  }

  /* ---------- availability ---------- */
  const COUNTS = ['confirmed', 'checked_in', 'completed'];
  const eventById = (id) => state.events.find((e) => e.id === id);
  function eventUsed(eventId) {
    if (mode === 'public') { const ev = eventById(eventId); return ev ? ev.used || 0 : 0; }
    return state.reservations.filter((r) => r.eventId === eventId && COUNTS.includes(r.status)).reduce((n, r) => n + (r.type === 'walkin' ? (r.arrived || r.guests) : r.guests), 0);
  }
  function eventRemaining(ev) { return ev.capacity ? Math.max(0, ev.capacity - eventUsed(ev.id)) : Infinity; }
  function eventState(ev) {
    if (ev.cancelled) return 'cancelled';
    if (ev.soldOut || eventRemaining(ev) <= 0) return 'full';
    return 'open';
  }
  const bookableEvents = () => state.events.filter((e) => e.published && !e.cancelled && e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''));

  const toMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
  function tableConflict(tableId, date, time, ignoreResId) {
    const s = state.settings, span = (+s.tableDurationMins || 180) + (+s.turnoverBufferMins || 0);
    return state.reservations.find((r) => r.id !== ignoreResId && r.date === date && ['confirmed', 'checked_in'].includes(r.status) && (r.tableIds || []).includes(tableId) && Math.abs(toMin(r.time) - toMin(time)) < span) || null;
  }
  function tableStatus(t, date) {
    if (!t.active || (t.blockedUntil && t.blockedUntil >= date)) return { s: 'unavailable', res: null };
    const rs = state.reservations.filter((r) => r.date === date && (r.tableIds || []).includes(t.id) && ['confirmed', 'checked_in'].includes(r.status));
    const occ = rs.find((r) => r.status === 'checked_in');
    if (occ) return { s: 'occupied', res: occ };
    if (rs.length) return { s: 'reserved', res: rs[0] };
    return { s: 'available', res: null };
  }

  /* ---------- customer actions (server-validated RPCs) ---------- */
  async function submitReservation(d) {
    const { data, error } = await sb.rpc('submit_reservation', { p: d });
    if (error) return { ok: false, error: 'We couldn’t reach the server. Please check your connection and try again.', network: true };
    if (!data.ok) return { ok: false, error: data.error };
    return { ok: true, duplicate: !!data.duplicate, reservation: { ref: data.ref, status: data.status, name: data.name } };
  }
  async function submitEnquiry(d) {
    const { data, error } = await sb.rpc('submit_enquiry', { p: d });
    if (error) return { ok: false, error: 'We couldn’t reach the server. Please check your connection and try again.', network: true };
    if (!data.ok) return { ok: false, error: data.error };
    return { ok: true, duplicate: !!data.duplicate, enquiry: { ref: data.ref, name: data.name, date: data.date } };
  }
  async function lookup(refCode, phone) {
    const { data, error } = await sb.rpc('lookup_booking', { p_ref: refCode, p_phone: phone });
    if (error) throw error;
    return data;
  }

  const STATUS = {
    pending: ['Pending', '◔', 'Submitted and awaiting review'], confirmed: ['Confirmed', '✔', 'Accepted under the venue’s booking rules'],
    waitlisted: ['Waitlisted', '⏳', 'No current capacity; waiting for a spot'], cancelled: ['Cancelled', '✕', 'Cancelled by the customer or authorised staff'],
    rejected: ['Rejected', '⊘', 'Not accepted by the venue'], checked_in: ['Checked in', '➜', 'Guest arrival has been recorded'],
    completed: ['Completed', '★', 'Visit or event has ended'], no_show: ['No-show', '∅', 'Guest did not arrive within the applicable policy']
  };
  const STAGES = ['Enquiry submitted', 'Availability reviewed', 'Offer sent', 'Deposit / payment', 'Booking confirmed', 'Event completed'];
  const CHANNELS = ['Instagram', 'WhatsApp', 'Website (direct)', 'Friend or host', 'Promoter', 'Walk-in', 'Other'];

  window.SR = { sb, TZ, DAY_NAMES, IMG, todayISO, addDays, dow, nextDow, fmtDate, fmtTime, fmtStamp, nowStamp, uid, ref, esc, normPhone, validPhone, validEmail, get, loadPublic, loadAll, save, refresh, audit, subscribe, onError, eventById, eventUsed, eventRemaining, eventState, bookableEvents, tableConflict, tableStatus, toMin, submitReservation, submitEnquiry, lookup, STATUS, STAGES, CHANNELS, COUNTS };
})();
