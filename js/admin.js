/* Shaunz Royale — staff dashboard
   DEMO ACCESS: roles are selected, not authenticated. Real staff login + server-side
   permission checks are required before production (see README). */
(function () {
  const { esc, fmtDate, fmtTime, todayISO, addDays } = SR;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const root = $('#root'), dlg = $('#dlg');
  const D = () => SR.get();

  const ROLES = {
    owner: ['Owner / Super Admin', 'Full control over settings, users, payments and reporting.'],
    manager: ['Manager', 'Bookings, events, seating and daily operations.'],
    reservation: ['Reservation Officer', 'Enquiries, confirmations and customer communication.'],
    door: ['Door Staff', 'Guest list, check-in and walk-ins.'],
    finance: ['Finance Staff', 'Payments, balances and financial reports.']
  };
  const SECTIONS = [
    ['overview', 'Overview', '◈'], ['checkin', 'Guest check-in', '➜'], ['reservations', 'Reservations', '☰'], ['events', 'Events', '✦'],
    ['tables', 'Tables', '▦'], ['celebrations', 'Celebrations', '🎂'], ['guests', 'Guests', '☺'], ['payments', 'Payments', '₦'], ['reports', 'Reports', '▤'], ['settings', 'Settings', '⚙']
  ];
  const PERMS = {
    owner: SECTIONS.map((s) => s[0]),
    manager: ['overview', 'checkin', 'reservations', 'events', 'tables', 'celebrations', 'guests', 'reports'],
    reservation: ['overview', 'reservations', 'celebrations', 'guests'],
    door: ['checkin'],
    finance: ['overview', 'payments', 'reports']
  };
  const can = (a) => ({ override: ['owner', 'manager'], noshow: ['owner', 'manager'], editEvents: ['owner', 'manager'], settings: ['owner'], tables: ['owner', 'manager'], confirm: ['owner', 'manager', 'reservation'], seeContacts: ['owner', 'manager', 'reservation'] }[a] || []).includes(role);

  let role = null; try { role = sessionStorage.getItem('sr_role'); } catch (e) { }
  const actor = () => (ROLES[role] ? ROLES[role][0] : 'Staff');
  const ui = { date: todayISO(), q: '', status: '', rdate: '', evCat: '', from: '', to: '' };

  /* ---------- helpers ---------- */
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
  const badge = (s) => { const x = SR.STATUS[s] || [s, '', '']; return '<span class="badge ' + s + '" title="' + esc(x[2]) + '"><span aria-hidden="true">' + x[1] + '</span>' + esc(x[0]) + '</span>'; };
  const tbadge = (s) => '<span class="badge ' + s + '"><span aria-hidden="true">' + ({ available: '●', reserved: '◐', occupied: '◉', unavailable: '⊘' }[s]) + '</span>' + s[0].toUpperCase() + s.slice(1) + '</span>';
  function openDlg(title, html) { $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = html; if (!dlg.open) dlg.showModal(); }
  const closeDlg = () => { if (dlg.open) dlg.close(); };
  $('#dlgX').addEventListener('click', closeDlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
  const phoneShow = (p) => can('seeContacts') || role === 'door' ? esc(p) : '—';
  const evName = (id) => { const e = id ? SR.eventById(id) : null; return e ? e.title : 'General visit'; };
  const resByRef = (id) => D().reservations.find((r) => r.id === id);
  function fld(id, label, control, hint) { return '<div class="field"><label for="' + id + '">' + label + '</label>' + control + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>'; }
  function lagosNowMins() { const p = new Intl.DateTimeFormat('en-GB', { timeZone: SR.TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':'); return +p[0] * 60 + +p[1]; }
  function noShowEligible(r) {
    if (!['confirmed'].includes(r.status)) return false;
    const grace = +D().settings.graceMinutes || 0, t = todayISO();
    if (r.date < t) return true; if (r.date > t) return false;
    return lagosNowMins() >= SR.toMin(r.time) + grace;
  }
  function csv(rows, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function waMsgLink(r, text) { return 'https://wa.me/' + SR.normPhone(r.phone) + '?text=' + encodeURIComponent(text); }

  /* ---------- login ---------- */
  function loginView() {
    root.innerHTML = '<div class="login"><div class="panel"><img src="assets/logo.png" alt="Shaunz Royale"><h1 style="font-size:1.6rem">Staff Dashboard</h1><p class="muted">Choose a role to preview what each team member sees.</p>' +
      '<div class="notice" style="text-align:left;font-size:.85rem"><b>Demo access.</b> This preview stores data in this browser only and has no passwords. A production build needs secure staff accounts and server-side permissions.</div>' +
      '<div class="roles">' + Object.keys(ROLES).map((k) => '<button data-role="' + k + '"><b>' + ROLES[k][0] + '</b><span>' + ROLES[k][1] + '</span></button>').join('') + '</div><a href="index.html">← Back to website</a></div></div>';
    $$('[data-role]').forEach((b) => b.addEventListener('click', () => { role = b.dataset.role; try { sessionStorage.setItem('sr_role', role); } catch (e) { } SR.audit(actor(), 'Signed in (demo)', ''); location.hash = '#/' + PERMS[role][0]; render(); }));
  }

  /* ---------- shell ---------- */
  function currentSection() { const s = location.hash.replace(/^#\/?/, '').split('/')[0] || PERMS[role][0]; return SECTIONS.find((x) => x[0] === s) ? s : PERMS[role][0]; }
  function badgeCounts() {
    const d = D(); return { reservations: d.reservations.filter((r) => r.status === 'pending').length, celebrations: d.enquiries.filter((q) => q.stage === 0 && !q.declined).length };
  }
  function render() {
    if (!role || !ROLES[role]) { loginView(); return; }
    let sec = location.hash.replace(/^#\/?/, '').split('/')[0] || PERMS[role][0];
    if (SECTIONS.find((x) => x[0] === sec) && !PERMS[role].includes(sec)) { SR.audit(actor(), 'Access denied', 'Tried to open ' + sec); toast('Your role can’t open that section.'); sec = PERMS[role][0]; location.hash = '#/' + sec; }
    if (!SECTIONS.find((x) => x[0] === sec)) sec = PERMS[role][0];
    const bc = badgeCounts();
    root.innerHTML = (D().sample ? '<div class="demo-bar">Sample events and tables are loaded. Review and edit them in Events and Tables (or clear them in Settings).</div>' : '') +
      '<div class="app"><aside class="side" id="side"><a class="brand" href="index.html"><img src="assets/logo.png" alt="" width="44" height="44"><span>SHAUNZ<br>ROYALE</span></a><nav aria-label="Dashboard">' +
      SECTIONS.filter((s) => PERMS[role].includes(s[0])).map((s) => '<a href="#/' + s[0] + '"' + (s[0] === sec ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + s[2] + '</span>' + s[1] + (bc[s[0]] ? '<span class="n">' + bc[s[0]] + '</span>' : '') + '</a>').join('') +
      '</nav><div class="who">Signed in as<br><b style="color:var(--gold-light)">' + ROLES[role][0] + '</b><br><button class="btn small" style="margin-top:10px" id="logout">Switch role</button></div></aside><main class="main" id="main" tabindex="-1"></main></div>';
    $('#logout').addEventListener('click', () => { try { sessionStorage.removeItem('sr_role'); } catch (e) { } role = null; render(); });
    const m = $('#main'); m.innerHTML = '<div class="topbar"><div style="display:flex;gap:10px;align-items:center"><button class="btn small mnav-btn" id="mnav" aria-label="Open menu">☰ Menu</button><h1>' + SECTIONS.find((s) => s[0] === sec)[1] + '</h1></div><span class="muted">' + fmtDate(todayISO()) + ' · Africa/Lagos</span></div><div id="view"></div>';
    $('#mnav').addEventListener('click', () => $('#side').classList.toggle('open'));
    $('#side').addEventListener('click', (e) => { if (e.target.closest('a')) $('#side').classList.remove('open'); });
    V[sec]($('#view'));
  }
  window.addEventListener('hashchange', render);
  const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

  /* ---------- reservations data ops ---------- */
  function capacityCheck(r) {
    const ev = r.eventId ? SR.eventById(r.eventId) : null; if (!ev || !ev.capacity) return { ok: true };
    const used = SR.eventUsed(ev.id) - (SR.COUNTS.includes(r.status) ? r.guests : 0);
    return { ok: !ev.soldOut && used + r.guests <= ev.capacity, left: ev.capacity - used, ev };
  }
  function setStatus(r, status, opts) {
    opts = opts || {};
    if (status === 'confirmed') {
      if (!can('confirm')) { SR.audit(actor(), 'Access denied', 'Tried to confirm ' + r.ref); toast('Your role can’t confirm bookings.'); return false; }
      const c = capacityCheck(r);
      if (!c.ok) {
        if (!opts.override) { openDlg('Capacity reached', '<p>' + esc(c.ev.title) + ' has <b>' + Math.max(0, c.left) + '</b> spot(s) left, and this booking is for <b>' + r.guests + '</b>.</p>' + (can('override') ? '<p class="muted">As ' + ROLES[role][0] + ', you can override the limit. This will be recorded.</p><div class="actions"><button class="btn danger" id="ovr">Override and confirm</button><button class="btn" id="ovc">Cancel</button></div>' : '<p class="muted">Only a manager or owner can override capacity. Consider waitlisting this guest.</p><button class="btn" id="ovc">Close</button>')); const o = $('#ovr'); if (o) o.onclick = () => { closeDlg(); if (setStatus(r, 'confirmed', { override: true })) rerender(); }; $('#ovc').onclick = closeDlg; return false; }
        SR.audit(actor(), 'Capacity override', r.ref + ' · ' + c.ev.title + ' · ' + r.guests + ' guests over limit');
      }
      for (const tid of r.tableIds || []) { const x = SR.tableConflict(tid, r.date, r.time, r.id); if (x) { toast('Table conflict with ' + x.ref + '. Reassign first.'); return false; } }
    }
    if (status === 'no_show' && !noShowEligible(r) && r.status !== 'no_show') { toast('Not eligible yet: the arrival grace period hasn’t passed.'); return false; }
    const prev = r.status; r.status = status; SR.save(); SR.audit(actor(), 'Status change', r.ref + ': ' + prev + ' → ' + status); return true;
  }
  const tName = (id) => { const t = D().tables.find((x) => x.id === id); return t ? t.name : '?'; };

  /* ---------- views ---------- */
  const V = {};

  V.overview = function (el) {
    const d = D(), t = todayISO();
    const today = d.reservations.filter((r) => r.date === t);
    const expected = today.filter((r) => ['confirmed', 'checked_in', 'completed'].includes(r.status)).reduce((n, r) => n + r.guests, 0);
    const checked = today.reduce((n, r) => n + (r.arrived || 0), 0);
    const pending = d.reservations.filter((r) => r.status === 'pending').length + d.enquiries.filter((q) => q.stage === 0 && !q.declined).length;
    const finance = role === 'finance';
    el.innerHTML = '<h2 style="font-size:1.2rem">Today’s operations</h2>' + (finance ? '<div class="notice">Payments are tracked from the Payments section. Booking details are hidden for this role.</div>' :
      '<div class="stats"><div class="stat"><div class="v">' + expected + '</div><div class="l">Expected guests</div></div><div class="stat"><div class="v">' + today.filter((r) => r.status === 'confirmed').length + '</div><div class="l">Confirmed bookings</div></div><div class="stat"><div class="v">' + checked + '</div><div class="l">Checked in</div></div><div class="stat"><div class="v">' + pending + '</div><div class="l">Pending requests</div></div></div>' +
      '<div class="cta-row" style="margin:0 0 22px">' + (can('confirm') ? '<button class="btn primary" data-act="add">+ Add booking</button>' : '') + (PERMS[role].includes('checkin') ? '<a class="btn" href="#/checkin">Guest check-in</a>' : '') + (PERMS[role].includes('tables') ? '<a class="btn" href="#/tables">Manage tables</a>' : '') + (can('editEvents') ? '<a class="btn" href="#/events">Create event</a>' : '') + '</div>' +
      '<div class="two"><div class="card"><h3>Needs attention</h3>' + attention() + '</div><div class="card"><h3>Arriving today</h3>' + (today.filter((r) => ['confirmed', 'checked_in'].includes(r.status)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8).map((r) => '<ul class="list" style="margin:0"><li><span><b>' + esc(r.name) + '</b><br><span class="muted">' + fmtTime(r.time) + ' · ' + r.guests + ' guests · ' + esc(evName(r.eventId)) + '</span></span>' + badge(r.status) + '</li></ul>').join('') || '<p class="muted">Nobody confirmed for today yet.</p>') + '</div></div>');
    bindCommon(el);
  };
  function attention() {
    const d = D(), items = [];
    const pend = d.reservations.filter((r) => r.status === 'pending').length; if (pend) items.push(['◔', pend + ' reservation request(s) awaiting review', '#/reservations']);
    const wl = d.reservations.filter((r) => r.status === 'waitlisted').length; if (wl) items.push(['⏳', wl + ' on the waitlist', '#/reservations']);
    const en = d.enquiries.filter((q) => q.stage === 0 && !q.declined).length; if (en) items.push(['🎂', en + ' new celebration enquiry(ies)', '#/celebrations']);
    const aff = d.reservations.filter((r) => { const e = r.eventId && SR.eventById(r.eventId); return e && e.cancelled && ['pending', 'confirmed', 'waitlisted'].includes(r.status); }).length; if (aff) items.push(['⚠', aff + ' booking(s) on cancelled events need contacting', '#/reservations']);
    return items.length ? '<ul class="list">' + items.map((i) => '<li><span><span aria-hidden="true">' + i[0] + '</span> ' + i[1] + '</span><a href="' + i[2] + '">Open</a></li>').join('') + '</ul>' : '<p class="muted">All clear. Nothing waiting on you.</p>';
  }

  /* ---- reservations ---- */
  function filteredRes() {
    const q = ui.q.toLowerCase();
    return D().reservations.filter((r) => (!ui.rdate || r.date === ui.rdate) && (!ui.status || r.status === ui.status) &&
      (!q || [r.name, r.phone, r.ref, r.invitedBy].join(' ').toLowerCase().includes(q))).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  V.reservations = function (el) {
    el.innerHTML = '<div class="toolbar"><input class="grow" type="search" id="q" placeholder="Search name, phone, reference or inviter" aria-label="Search reservations" value="' + esc(ui.q) + '"><input type="date" id="rd" aria-label="Filter by date" value="' + esc(ui.rdate) + '"><select id="st" aria-label="Filter by status"><option value="">All statuses</option>' + Object.keys(SR.STATUS).map((s) => '<option value="' + s + '"' + (ui.status === s ? ' selected' : '') + '>' + SR.STATUS[s][0] + '</option>').join('') + '</select>' +
      (can('confirm') ? '<button class="btn primary" data-act="add">+ Add booking</button>' : '') + '<button class="btn" data-act="export">Export CSV</button></div><div id="rl"></div>';
    const draw = () => {
      const rs = filteredRes();
      $('#rl').innerHTML = rs.length ? '<div class="tbl-wrap"><table><thead><tr><th>Ref</th><th>Guest</th><th>When</th><th>Party</th><th>Type / Event</th><th>Invited by</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
        rs.map((r) => { const ev = r.eventId && SR.eventById(r.eventId); return '<tr><td><b>' + r.ref + '</b></td><td>' + esc(r.name) + '<div class="sub">' + phoneShow(r.phone) + '</div></td><td>' + fmtDate(r.date, { year: undefined }) + '<div class="sub">' + fmtTime(r.time) + '</div></td><td>' + r.guests + (r.arrived ? '<div class="sub">' + r.arrived + ' arrived</div>' : '') + '</td><td>' + esc(r.type) + '<div class="sub">' + esc(evName(r.eventId)) + (ev && ev.cancelled ? ' ⚠ cancelled' : '') + '</div></td><td>' + esc(r.invitedBy || '—') + '<div class="sub">' + esc(r.channel || '') + '</div></td><td>' + badge(r.status) + '</td><td><div class="actions">' +
          (can('confirm') && ['pending', 'waitlisted'].includes(r.status) ? '<button class="btn small primary" data-act="confirm" data-id="' + r.id + '">Confirm</button>' : '') + '<button class="btn small" data-act="open" data-id="' + r.id + '">Open</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No reservations match. Bookings from the website appear here.</div>';
    };
    draw();
    $('#q').addEventListener('input', (e) => { ui.q = e.target.value; draw(); }); $('#rd').addEventListener('change', (e) => { ui.rdate = e.target.value; draw(); }); $('#st').addEventListener('change', (e) => { ui.status = e.target.value; draw(); });
    bindCommon(el);
  };

  function openRes(id) {
    const r = resByRef(id); if (!r) return;
    const tbls = D().tables.filter((t) => t.active);
    const canTable = r.type === 'table' || r.type === 'celebration';
    const nsOK = noShowEligible(r);
    const msgs = { confirmed: 'Hello ' + r.name + ', your reservation at Shaunz Royale is confirmed. Ref ' + r.ref + ' · ' + fmtDate(r.date) + ' · ' + fmtTime(r.time) + ' · ' + r.guests + ' guests. See you there!', rejected: 'Hello ' + r.name + ', unfortunately we could not accept your request (' + r.ref + '). Please contact us for alternatives.', waitlisted: 'Hello ' + r.name + ', you are on the waitlist for ' + fmtDate(r.date) + ' (' + r.ref + '). We will contact you if a spot opens.', cancelled: 'Hello ' + r.name + ', your reservation ' + r.ref + ' has been cancelled.' };
    const msg = msgs[r.status] || 'Hello ' + r.name + ', this is Shaunz Royale about your booking ' + r.ref + '.';
    openDlg(r.ref + ' · ' + r.name, '<p>' + badge(r.status) + '</p><dl class="summary"><div><dt>Date &amp; time</dt><dd>' + fmtDate(r.date) + ', ' + fmtTime(r.time) + '</dd></div><div><dt>Party</dt><dd>' + r.guests + (r.arrived ? ' (' + r.arrived + ' arrived)' : '') + '</dd></div><div><dt>Phone</dt><dd>' + phoneShow(r.phone) + '</dd></div><div><dt>Event</dt><dd>' + esc(evName(r.eventId)) + '</dd></div><div><dt>Type</dt><dd>' + esc(r.type) + (r.seating ? ' · ' + esc(r.seating) : '') + '</dd></div><div><dt>Invited by</dt><dd>' + esc(r.invitedBy || '—') + ' · ' + esc(r.channel || '—') + '</dd></div><div><dt>Requests</dt><dd>' + esc(r.requests || '—') + '</dd></div><div><dt>Marketing consent</dt><dd>' + (r.marketing ? 'Yes' : 'No') + '</dd></div></dl>' +
      (can('confirm') ? '<h3 style="margin-top:20px">Update status</h3><div class="actions" id="stAct">' +
        ['confirmed', 'waitlisted', 'rejected', 'cancelled'].filter((s) => s !== r.status).map((s) => '<button class="btn small' + (s === 'confirmed' ? ' primary' : s === 'rejected' || s === 'cancelled' ? ' danger' : '') + '" data-s="' + s + '">' + SR.STATUS[s][0] + '</button>').join('') +
        (can('noshow') ? '<button class="btn small danger" data-s="no_show"' + (nsOK ? '' : ' disabled title="Available after the arrival grace period"') + '>No-show</button>' : '') + (['checked_in'].includes(r.status) ? '<button class="btn small" data-s="completed">Mark completed</button>' : '') + '</div>' : '') +
      (can('confirm') || can('tables') ? '<h3 style="margin-top:20px">Table assignment</h3>' + (canTable ? '<div class="actions" id="tbSel">' + tbls.map((t) => '<label class="check" style="border:1px solid var(--line);border-radius:10px;padding:8px 12px"><input type="checkbox" value="' + t.id + '"' + ((r.tableIds || []).includes(t.id) ? ' checked' : '') + '><span>' + esc(t.name) + ' <span class="muted">(' + t.seats + ')</span></span></label>').join('') + '</div><div class="err" id="tbErr" style="display:block"></div><button class="btn small" id="tbSave" style="margin-top:10px">Save assignment</button>' : '<p class="muted">General visits don’t include a table. Only table reservations and celebrations can be assigned one.</p>') : '') +
      '<h3 style="margin-top:20px">Notes</h3><textarea id="rn" aria-label="Staff notes">' + esc(r.notes || '') + '</textarea><div class="actions" style="margin-top:10px"><button class="btn small" id="rnSave">Save notes</button>' + (can('seeContacts') ? '<a class="btn small" target="_blank" rel="noopener" href="' + waMsgLink(r, msg) + '" id="wa">Message guest on WhatsApp</a>' : '') + '</div>' +
      (r.checkIns && r.checkIns.length ? '<h3 style="margin-top:20px">Check-ins</h3><ul class="list">' + r.checkIns.map((c) => '<li><span>' + c.count + ' guest(s)</span><span class="muted">' + SR.fmtStamp(c.at) + ' · ' + esc(c.by) + '</span></li>').join('') + '</ul>' : ''));
    $$('#stAct [data-s]').forEach((b) => b.onclick = () => { if (setStatus(r, b.dataset.s)) { closeDlg(); rerender(); toast('Status updated'); } });
    const tb = $('#tbSave'); if (tb) tb.onclick = () => {
      const ids = $$('#tbSel input:checked').map((i) => i.value); const err = $('#tbErr'); err.textContent = '';
      for (const tid of ids) { const x = SR.tableConflict(tid, r.date, r.time, r.id); if (x) { err.textContent = tName(tid) + ' is already assigned to ' + x.ref + ' around that time.'; return; } }
      const before = (r.tableIds || []).map(tName).join(', ') || 'none'; r.tableIds = ids; SR.save(); SR.audit(actor(), 'Table assignment', r.ref + ': ' + before + ' → ' + (ids.map(tName).join(', ') || 'none')); closeDlg(); rerender(); toast('Tables saved');
    };
    $('#rnSave').onclick = () => { r.notes = $('#rn').value; SR.save(); SR.audit(actor(), 'Note updated', r.ref); toast('Notes saved'); };
    const wa = $('#wa'); if (wa) wa.addEventListener('click', () => SR.audit(actor(), 'Message opened (WhatsApp)', r.ref));
  }

  function addBookingDlg() {
    const evs = SR.get().events.filter((e) => e.published && !e.cancelled && e.date >= todayISO());
    openDlg('Add booking', '<form class="form" id="ab" novalidate><div class="row">' + fld('ab_name', 'Full name', '<input type="text" id="ab_name">') + fld('ab_phone', 'Phone', '<input type="tel" id="ab_phone">') + '</div><div class="row">' + fld('ab_type', 'Type', '<select id="ab_type"><option value="visit">Visit</option><option value="table">Table</option></select>') + fld('ab_event', 'Event', '<select id="ab_event"><option value="">General visit</option>' + evs.map((e) => '<option value="' + e.id + '">' + esc(e.title) + ' — ' + fmtDate(e.date, { year: undefined }) + '</option>').join('') + '</select>') + '</div><div class="row">' + fld('ab_date', 'Date', '<input type="date" id="ab_date" value="' + todayISO() + '">') + fld('ab_time', 'Arrival', '<input type="time" id="ab_time">') + fld('ab_guests', 'Guests', '<input type="number" id="ab_guests" min="1" value="2">') + '</div><div class="row">' + fld('ab_inv', 'Invited by', '<input type="text" id="ab_inv">') + fld('ab_ch', 'Source', '<select id="ab_ch">' + SR.CHANNELS.map((c) => '<option>' + c + '</option>').join('') + '</select>') + '</div><div class="err" id="ab_err" style="display:block"></div><button class="btn primary" type="submit">Create booking</button></form>');
    $('#ab_event').onchange = (e) => { const ev = e.target.value && SR.eventById(e.target.value); if (ev) $('#ab_date').value = ev.date; };
    $('#ab').onsubmit = (e) => {
      e.preventDefault(); const g = (i) => $('#' + i).value.trim(), err = $('#ab_err');
      if (g('ab_name').length < 2 || !SR.validPhone(g('ab_phone')) || !g('ab_date') || !g('ab_time') || !(+g('ab_guests') > 0)) { err.textContent = 'Please complete name, a valid phone, date, arrival time and guests.'; return; }
      const r = { id: SR.uid('rs'), ref: SR.ref('SR'), type: g('ab_type'), eventId: g('ab_event'), date: g('ab_date'), time: g('ab_time'), guests: +g('ab_guests'), name: g('ab_name'), phone: g('ab_phone'), invitedBy: g('ab_inv'), channel: g('ab_ch'), seating: '', requests: '', marketing: false, status: 'pending', tableIds: [], arrived: 0, checkIns: [], notes: '', createdAt: SR.nowStamp(), source: 'staff' };
      D().reservations.push(r); SR.save(); SR.audit(actor(), 'Booking created (staff)', r.ref);
      if (can('confirm') && !setStatus(r, 'confirmed')) { rerender(); return; }
      closeDlg(); rerender(); toast('Booking ' + r.ref + ' created');
    };
  }

  /* ---- check-in ---- */
  V.checkin = function (el) {
    const d = D(), t = ui.date, q = ui.q.toLowerCase();
    const all = d.reservations.filter((r) => r.date === t && ['confirmed', 'checked_in', 'pending', 'completed', 'no_show'].includes(r.status));
    const list = all.filter((r) => !q || [r.name, r.phone, r.ref, r.invitedBy].join(' ').toLowerCase().includes(q)).sort((a, b) => a.time.localeCompare(b.time));
    const inside = all.reduce((n, r) => n + (r.arrived || 0), 0), expect = all.filter((r) => ['confirmed', 'checked_in', 'completed'].includes(r.status)).reduce((n, r) => n + r.guests, 0);
    el.innerHTML = '<div class="stats"><div class="stat"><div class="v">' + inside + '</div><div class="l">In the venue (checked in)</div></div><div class="stat"><div class="v">' + expect + '</div><div class="l">Expected guests</div></div><div class="stat"><div class="v">' + all.filter((r) => r.type === 'walkin').length + '</div><div class="l">Walk-ins</div></div></div>' +
      '<div class="toolbar"><input type="date" id="cd" value="' + t + '" aria-label="Date"><input class="grow" type="search" id="q" placeholder="Search name, phone, reference or inviter" aria-label="Search guests" value="' + esc(ui.q) + '"><button class="btn primary" data-act="walkin">+ Walk-in</button><button class="btn" data-act="print">Print list</button></div><div id="cl"></div>';
    const draw = () => {
      $('#cl').innerHTML = list.length ? '<div class="tbl-wrap"><table><thead><tr><th>Guest</th><th>Arrival</th><th>Party</th><th>Table</th><th>Invited by</th><th>Status</th><th>Check-in</th></tr></thead><tbody>' + list.map((r) => {
        const left = r.guests - (r.arrived || 0), ok = ['confirmed', 'checked_in'].includes(r.status) && left > 0;
        return '<tr><td><b>' + esc(r.name) + '</b><div class="sub">' + r.ref + ' · ' + phoneShow(r.phone) + '</div>' + (r.notes ? '<div class="sub">📝 ' + esc(r.notes) + '</div>' : '') + '</td><td>' + fmtTime(r.time) + '</td><td>' + (r.arrived || 0) + ' / ' + r.guests + '</td><td>' + (r.tableIds && r.tableIds.length ? r.tableIds.map(tName).map(esc).join(', ') : '—') + '</td><td>' + esc(r.invitedBy || '—') + '</td><td>' + badge(r.status) + '</td><td><div class="actions">' + (ok ? '<button class="btn small primary" data-act="ci" data-id="' + r.id + '">Check in</button>' : r.status === 'pending' ? '<span class="sub">Awaiting confirmation</span>' : left <= 0 && r.arrived ? '<span class="sub">All arrived</span>' : '') + (can('noshow') && noShowEligible(r) ? '<button class="btn small danger" data-act="ns" data-id="' + r.id + '">No-show</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">No guests for this date yet.</div>';
    };
    draw(); $('#cd').onchange = (e) => { ui.date = e.target.value || todayISO(); rerender(); };
    $('#q').addEventListener('input', (e) => { ui.q = e.target.value; V.checkin(el); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
    bindCommon(el);
  };
  function checkInDlg(r) {
    const left = r.guests - (r.arrived || 0);
    openDlg('Check in · ' + r.name, '<p class="muted">Party of ' + r.guests + ' · ' + (r.arrived || 0) + ' already arrived · ' + left + ' remaining</p><form class="form" id="cif">' + fld('ci_n', 'How many are arriving now?', '<input type="number" id="ci_n" min="1" max="' + left + '" value="' + left + '" inputmode="numeric">', 'Partial arrivals are fine. The rest can check in later.') + '<div class="err" id="ci_err" style="display:block"></div><button class="btn primary" type="submit">Confirm check-in</button></form>');
    $('#cif').onsubmit = (e) => {
      e.preventDefault(); const n = +$('#ci_n').value, fresh = resByRef(r.id), rem = fresh.guests - (fresh.arrived || 0);
      if (!(n >= 1) || n > rem) { $('#ci_err').textContent = 'Enter a number between 1 and ' + rem + '.'; return; }
      fresh.arrived = (fresh.arrived || 0) + n; fresh.checkIns = fresh.checkIns || []; fresh.checkIns.push({ at: SR.nowStamp(), by: actor(), count: n }); fresh.status = 'checked_in'; SR.save(); SR.audit(actor(), 'Check-in', fresh.ref + ' · ' + n + ' guest(s)'); closeDlg(); rerender(); toast(n + ' checked in');
    };
  }
  function walkinDlg() {
    const evs = D().events.filter((e) => e.date === ui.date && !e.cancelled);
    openDlg('Register walk-in', '<form class="form" id="wf">' + fld('w_name', 'Name (optional)', '<input type="text" id="w_name">') + '<div class="row">' + fld('w_g', 'Guests', '<input type="number" id="w_g" min="1" value="1" inputmode="numeric">') + fld('w_ch', 'Source', '<select id="w_ch"><option>Walk-in</option>' + SR.CHANNELS.filter((c) => c !== 'Walk-in').map((c) => '<option>' + c + '</option>').join('') + '</select>') + '</div>' + (evs.length ? fld('w_ev', 'Event', '<select id="w_ev">' + evs.map((e) => '<option value="' + e.id + '">' + esc(e.title) + '</option>').join('') + '<option value="">None</option></select>') : '') + '<div class="err" id="w_err" style="display:block"></div><button class="btn primary" type="submit">Check in walk-in</button></form>');
    $('#wf').onsubmit = (e) => {
      e.preventDefault(); const g = +$('#w_g').value; if (!(g >= 1)) { $('#w_err').textContent = 'Enter the number of guests.'; return; }
      const evId = $('#w_ev') ? $('#w_ev').value : '';
      const r = { id: SR.uid('rs'), ref: SR.ref('SR'), type: 'walkin', eventId: evId, date: ui.date, time: new Intl.DateTimeFormat('en-GB', { timeZone: SR.TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), guests: g, name: $('#w_name').value.trim() || 'Walk-in guest', phone: '', invitedBy: '', channel: $('#w_ch').value, seating: '', requests: '', marketing: false, status: 'checked_in', tableIds: [], arrived: g, checkIns: [{ at: SR.nowStamp(), by: actor(), count: g }], notes: '', createdAt: SR.nowStamp(), source: 'walk-in' };
      D().reservations.push(r); SR.save(); SR.audit(actor(), 'Walk-in registered', r.ref + ' · ' + g + ' guest(s)');
      const ev = evId && SR.eventById(evId); closeDlg(); rerender(); toast(ev && ev.capacity && SR.eventUsed(evId) > ev.capacity ? 'Walk-in recorded. Event is now over capacity.' : 'Walk-in recorded');
    };
  }

  /* ---- events ---- */
  V.events = function (el) {
    const d = D(), evs = d.events.slice().sort((a, b) => a.date.localeCompare(b.date));
    el.innerHTML = '<div class="toolbar">' + (can('editEvents') ? '<button class="btn primary" data-act="newev">+ Create event</button>' : '') + '<span class="muted">Recurring events create separate dated occurrences, so changing next Wednesday never touches past ones.</span></div>' +
      (evs.length ? '<div class="tbl-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + evs.map((e) => {
        const used = SR.eventUsed(e.id), pct = e.capacity ? Math.min(100, Math.round(used / e.capacity * 100)) : 0, st = e.cancelled ? 'Cancelled' : e.soldOut ? 'Sold out' : e.published ? 'Published' : 'Draft';
        return '<tr><td><b>' + esc(e.title) + '</b><div class="sub">' + esc(e.category) + '</div></td><td>' + fmtDate(e.date) + (e.start ? '<div class="sub">' + fmtTime(e.start) + '</div>' : '') + '</td><td style="min-width:150px">' + used + ' / ' + (e.capacity || '∞') + '<div class="bar"><i style="width:' + pct + '%"></i></div></td><td><span class="badge ' + (e.cancelled ? 'cancelled' : e.published ? 'confirmed' : 'pending') + '">' + st + '</span></td><td><div class="actions"><button class="btn small" data-act="evbk" data-id="' + e.id + '">Bookings</button>' + (can('editEvents') ? '<button class="btn small" data-act="evedit" data-id="' + e.id + '">Edit</button>' + (!e.cancelled ? '<button class="btn small" data-act="evpub" data-id="' + e.id + '">' + (e.published ? 'Unpublish' : 'Publish') + '</button><button class="btn small" data-act="evsold" data-id="' + e.id + '">' + (e.soldOut ? 'Reopen' : 'Sold out') + '</button><button class="btn small danger" data-act="evcancel" data-id="' + e.id + '">Cancel event</button>' : '') : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty">No events yet. Create your first one.</div>');
    bindCommon(el);
  };
  function eventDlg(ev) {
    const e = ev || { title: '', category: 'Club Nights', date: todayISO(), start: '', end: '', description: '', price: '', capacity: 100, image: SR.IMG.neon, published: false, tablesEnabled: true, policy: '' };
    const images = [['Neon sign', SR.IMG.neon], ['Lounge', SR.IMG.lounge], ['VIP table', SR.IMG.vip], ['Celebration', SR.IMG.bday]];
    const cats = ["Club Nights", "Ladies' Night", 'Karaoke and Live Entertainment', 'Special Performances', 'Birthday and Group Experiences', 'Seasonal and One-off Events'];
    openDlg(ev ? 'Edit event' : 'Create event', '<form class="form" id="ef">' + fld('e_title', 'Event name', '<input type="text" id="e_title" value="' + esc(e.title) + '">') + '<div class="row">' + fld('e_cat', 'Category', '<select id="e_cat">' + cats.concat(cats.includes(e.category) ? [] : [e.category]).map((c) => '<option' + (c === e.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>') + fld('e_date', 'Date', '<input type="date" id="e_date" value="' + e.date + '">') + '</div><div class="row">' + fld('e_start', 'Start time (optional)', '<input type="time" id="e_start" value="' + e.start + '">') + fld('e_end', 'End time (optional)', '<input type="time" id="e_end" value="' + e.end + '">') + fld('e_cap', 'Guest capacity', '<input type="number" id="e_cap" min="0" value="' + (e.capacity || 0) + '">', '0 = no limit') + fld('e_price', 'Entry price / condition', '<input type="text" id="e_price" placeholder="e.g. Free entry, or ₦5,000" value="' + esc(e.price) + '">') + '</div>' + fld('e_desc', 'Description', '<textarea id="e_desc">' + esc(e.description) + '</textarea>') + fld('e_img', 'Poster image', '<select id="e_img">' + images.map((i) => '<option value="' + i[1] + '"' + (i[1] === e.image ? ' selected' : '') + '>' + i[0] + '</option>').join('') + '</select>', 'Using a custom poster? Put the file in the assets folder and set its path in a backup file (see README).') + fld('e_pol', 'Booking / entry policy (optional)', '<input type="text" id="e_pol" value="' + esc(e.policy) + '">') +
      '<label class="check"><input type="checkbox" id="e_tbl"' + (e.tablesEnabled ? ' checked' : '') + '><span>Allow table bookings</span></label><label class="check"><input type="checkbox" id="e_pub"' + (e.published ? ' checked' : '') + '><span>Published (visible to customers)</span></label>' +
      (ev ? '' : fld('e_rep', 'Repeat weekly', '<select id="e_rep"><option value="1">Just this date</option><option value="4">4 weeks</option><option value="8">8 weeks</option><option value="12">12 weeks</option></select>', 'Creates a separate dated occurrence for each week.')) + '<div class="err" id="e_err" style="display:block"></div><button class="btn primary" type="submit">' + (ev ? 'Save changes' : 'Create') + '</button></form>');
    $('#ef').onsubmit = (x) => {
      x.preventDefault(); const g = (i) => $('#' + i).value.trim();
      if (g('e_title').length < 2 || !g('e_date')) { $('#e_err').textContent = 'Event name and date are required.'; return; }
      const base = { title: g('e_title'), category: g('e_cat'), start: g('e_start'), end: g('e_end'), capacity: +g('e_cap') || 0, price: g('e_price'), description: g('e_desc'), image: g('e_img'), policy: g('e_pol'), tablesEnabled: $('#e_tbl').checked, published: $('#e_pub').checked };
      if (ev) { Object.assign(ev, base, { date: g('e_date') }); SR.save(); SR.audit(actor(), 'Event edited', ev.title + ' · ' + ev.date); }
      else { const n = +g('e_rep') || 1; for (let i = 0; i < n; i++) D().events.push(Object.assign({ id: SR.uid('ev'), cancelled: false, soldOut: false, imagePos: 'center' }, base, { date: addDays(g('e_date'), 7 * i) })); SR.save(); SR.audit(actor(), 'Event created', base.title + ' ×' + n); }
      closeDlg(); rerender(); toast('Event saved');
    };
  }
  function cancelEventDlg(ev) {
    const aff = D().reservations.filter((r) => r.eventId === ev.id && ['pending', 'confirmed', 'waitlisted'].includes(r.status));
    openDlg('Cancel “' + ev.title + '”?', '<p>New bookings will be blocked. <b>' + aff.length + '</b> existing booking(s) will be flagged so you can contact those guests.</p>' + (aff.length ? '<ul class="list">' + aff.map((r) => '<li><span>' + esc(r.name) + ' · ' + r.guests + ' guests</span><span class="muted">' + phoneShow(r.phone) + '</span></li>').join('') + '</ul>' : '') + '<div class="actions" style="margin-top:14px"><button class="btn danger" id="cy">Cancel event</button><button class="btn" id="cn">Keep event</button></div>');
    $('#cn').onclick = closeDlg; $('#cy').onclick = () => { ev.cancelled = true; ev.published = false; SR.save(); SR.audit(actor(), 'Event cancelled', ev.title + ' · ' + ev.date + ' · ' + aff.length + ' affected'); closeDlg(); rerender(); toast('Event cancelled'); };
  }

  /* ---- tables ---- */
  V.tables = function (el) {
    const d = D();
    el.innerHTML = '<div class="toolbar"><input type="date" id="td" value="' + ui.date + '" aria-label="Date">' + (can('tables') ? '<button class="btn primary" data-act="newtb">+ Add table</button>' : '') + '<span class="muted">Sample seating. Replace it with Shaunz Royale’s real inventory.</span></div>' +
      '<div class="floor">' + d.tables.map((t) => { const s = SR.tableStatus(t, ui.date); return '<div class="tcard ' + s.s + '"><h3>' + esc(t.name) + '</h3><span class="muted">' + t.seats + ' seats · ' + esc(t.type) + '</span><div>' + tbadge(s.s) + '</div>' + (s.res ? '<div class="sub">' + esc(s.res.name) + ' · ' + fmtTime(s.res.time) + ' · ' + s.res.guests + '</div>' : '') + (t.blockedUntil && s.s === 'unavailable' ? '<div class="sub">Blocked until ' + fmtDate(t.blockedUntil, { year: undefined }) + (t.blockNote ? ' · ' + esc(t.blockNote) : '') + '</div>' : '') + (can('tables') ? '<div class="actions" style="margin-top:6px"><button class="btn small" data-act="tbedit" data-id="' + t.id + '">Edit / block</button></div>' : '') + '</div>'; }).join('') + '</div>' +
      (d.tables.length ? '' : '<div class="empty">No tables yet.</div>');
    $('#td').onchange = (e) => { ui.date = e.target.value || todayISO(); rerender(); };
    bindCommon(el);
  };
  function tableDlg(t) {
    const x = t || { name: '', code: '', seats: 4, type: 'Standard', active: true, blockedUntil: '', blockNote: '' };
    openDlg(t ? 'Edit table' : 'Add table', '<form class="form" id="tf"><div class="row">' + fld('t_name', 'Display name', '<input type="text" id="t_name" value="' + esc(x.name) + '">') + fld('t_seats', 'Seats', '<input type="number" id="t_seats" min="1" value="' + x.seats + '">') + fld('t_type', 'Type', '<select id="t_type">' + ['Standard', 'VIP', 'Private area', 'Bar seating'].map((o) => '<option' + (o === x.type ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>') + '</div><label class="check"><input type="checkbox" id="t_act"' + (x.active ? ' checked' : '') + '><span>Active</span></label><div class="row">' + fld('t_blk', 'Block until (date)', '<input type="date" id="t_blk" value="' + esc(x.blockedUntil) + '">', 'Temporarily unavailable through this date.') + fld('t_note', 'Reason', '<input type="text" id="t_note" value="' + esc(x.blockNote) + '">') + '</div><div class="err" id="t_err" style="display:block"></div><button class="btn primary" type="submit">Save table</button></form>');
    $('#tf').onsubmit = (e) => {
      e.preventDefault(); const name = $('#t_name').value.trim(); if (!name || !(+$('#t_seats').value > 0)) { $('#t_err').textContent = 'Name and seat count are required.'; return; }
      const v = { name, code: name, seats: +$('#t_seats').value, type: $('#t_type').value, active: $('#t_act').checked, blockedUntil: $('#t_blk').value, blockNote: $('#t_note').value.trim() };
      if (t) Object.assign(t, v); else D().tables.push(Object.assign({ id: SR.uid('tb') }, v)); SR.save(); SR.audit(actor(), t ? 'Table edited' : 'Table added', name); closeDlg(); rerender();
    };
  }

  /* ---- celebrations ---- */
  V.celebrations = function (el) {
    const qs = D().enquiries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    el.innerHTML = qs.length ? '<div class="grid cols-2">' + qs.map((q) => '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><h3>' + esc(q.occasion) + ' · ' + esc(q.name) + '</h3><span class="badge ' + (q.declined ? 'rejected' : q.stage >= 4 ? 'confirmed' : 'pending') + '">' + (q.declined ? '⊘ Declined' : SR.STAGES[q.stage]) + '</span></div><p class="muted">' + q.ref + ' · ' + fmtDate(q.date) + ' at ' + fmtTime(q.time) + ' · ' + q.guests + ' guests · ' + esc(q.space) + (q.budget ? ' · ' + esc(q.budget) : '') + '<br>' + phoneShow(q.phone) + '</p><div class="pipe" aria-hidden="true">' + SR.STAGES.map((s, i) => '<i class="' + (i <= q.stage && !q.declined ? 'on' : '') + '"></i>').join('') + '</div>' +
      (q.food || q.decor || q.notes ? '<p class="sub muted">' + [q.food && 'Food/drink: ' + esc(q.food), q.decor && 'Decor: ' + esc(q.decor), q.notes && 'Notes: ' + esc(q.notes)].filter(Boolean).join(' · ') + '</p>' : '') + (q.quote ? '<p><b>Offer:</b> ' + esc(q.quote) + '</p>' : '') + (q.nextAction ? '<p><b>Next:</b> ' + esc(q.nextAction) + '</p>' : '') +
      '<div class="actions">' + (can('confirm') ? (!q.declined && q.stage < 5 ? '<button class="btn small primary" data-act="qadv" data-id="' + q.id + '">Advance → ' + SR.STAGES[Math.min(5, q.stage + 1)] + '</button>' : '') + (q.stage > 0 && !q.declined ? '<button class="btn small" data-act="qback" data-id="' + q.id + '">← Back</button>' : '') + '<button class="btn small" data-act="qedit" data-id="' + q.id + '">Offer &amp; notes</button>' + (q.stage >= 4 && !q.reservationId && !q.declined ? '<button class="btn small" data-act="qconv" data-id="' + q.id + '">Create booking</button>' : '') + (q.reservationId ? '<span class="sub">Booking created ✔</span>' : '') + '<button class="btn small danger" data-act="qdecl" data-id="' + q.id + '">' + (q.declined ? 'Reopen' : 'Decline') + '</button>' : '') + '</div></div>').join('') + '</div>' : '<div class="empty">No celebration enquiries yet.</div>';
    bindCommon(el);
  };
  function enqDlg(q) {
    openDlg('Offer & follow-up · ' + q.ref, '<form class="form" id="qf">' + fld('q_quote', 'Offer / quotation', '<input type="text" id="q_quote" placeholder="e.g. Birthday table package, ₦250,000 with ₦100,000 deposit" value="' + esc(q.quote) + '">') + fld('q_next', 'Next action required', '<input type="text" id="q_next" value="' + esc(q.nextAction) + '">') + fld('q_fu', 'Follow-up notes', '<textarea id="q_fu">' + esc(q.followUp) + '</textarea>') + '<div class="actions"><button class="btn primary" type="submit">Save</button>' + (can('seeContacts') ? '<a class="btn" target="_blank" rel="noopener" href="' + waMsgLink(q, 'Hello ' + q.name + ', this is Shaunz Royale about your celebration enquiry ' + q.ref + '.') + '">WhatsApp host</a>' : '') + '</div></form>');
    $('#qf').onsubmit = (e) => { e.preventDefault(); q.quote = $('#q_quote').value.trim(); q.nextAction = $('#q_next').value.trim(); q.followUp = $('#q_fu').value; SR.save(); SR.audit(actor(), 'Enquiry updated', q.ref); closeDlg(); rerender(); };
  }

  /* ---- guests ---- */
  V.guests = function (el) {
    const map = {};
    D().reservations.filter((r) => r.phone).forEach((r) => { const k = SR.normPhone(r.phone); const g = map[k] || (map[k] = { name: r.name, phone: r.phone, bookings: 0, visits: 0, last: '', marketing: false }); g.bookings++; if (r.arrived) g.visits++; if (r.date > g.last) g.last = r.date; if (r.marketing) g.marketing = true; });
    D().enquiries.forEach((q) => { const k = SR.normPhone(q.phone); if (!map[k]) map[k] = { name: q.name, phone: q.phone, bookings: 0, visits: 0, last: q.date, marketing: !!q.marketing }; });
    const q = ui.q.toLowerCase(), gs = Object.values(map).filter((g) => !q || (g.name + g.phone).toLowerCase().includes(q)).sort((a, b) => b.last.localeCompare(a.last));
    el.innerHTML = '<div class="toolbar"><input class="grow" type="search" id="q" placeholder="Search guests" aria-label="Search guests" value="' + esc(ui.q) + '"></div>' + (gs.length ? '<div class="tbl-wrap"><table><thead><tr><th>Guest</th><th>Phone</th><th>Bookings</th><th>Visits</th><th>Last booking</th><th>Marketing</th></tr></thead><tbody>' + gs.map((g) => '<tr><td><b>' + esc(g.name) + '</b></td><td>' + esc(g.phone) + '</td><td>' + g.bookings + '</td><td>' + g.visits + '</td><td>' + (g.last ? fmtDate(g.last) : '—') + '</td><td>' + (g.marketing ? 'Opted in' : 'No') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">No guest records yet.</div>');
    $('#q').addEventListener('input', (e) => { ui.q = e.target.value; V.guests(el); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
  };

  /* ---- payments ---- */
  V.payments = function (el) {
    el.innerHTML = '<div class="notice"><b>Online payments are a Phase 2 feature (FR-14).</b> This release doesn’t take or record payments. When Paystack or Flutterwave is connected, verified transactions, deposits, balances and refunds will appear here.</div><div class="card" style="margin-top:18px"><h3>Rules built into the workflow</h3><ul class="list"><li><span>A booking that needs payment is never confirmed from a screenshot</span></li><li><span>Payment is verified server-side with the provider</span></li><li><span>A failed payment is never recorded as successful</span></li><li><span>Cancelling doesn’t automatically imply a refund</span></li></ul></div>';
  };

  /* ---- reports ---- */
  V.reports = function (el) {
    const all = D().reservations.filter((r) => (!ui.from || r.date >= ui.from) && (!ui.to || r.date <= ui.to));
    const web = all.filter((r) => r.source === 'website'), acc = ['confirmed', 'checked_in', 'completed', 'no_show'];
    const accepted = all.filter((r) => acc.includes(r.status)), arrived = all.filter((r) => ['checked_in', 'completed'].includes(r.status)), ns = all.filter((r) => r.status === 'no_show');
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
    const eligible = accepted.filter((r) => r.type !== 'walkin');
    const ch = {}; all.forEach((r) => { const c = r.channel || 'Unknown'; const x = ch[c] || (ch[c] = { res: 0, guests: 0, arr: 0 }); x.res++; x.guests += r.guests; x.arr += r.arrived || 0; });
    const maxRes = Math.max(1, ...Object.values(ch).map((x) => x.res));
    const enq = D().enquiries.filter((q) => (!ui.from || q.date >= ui.from) && (!ui.to || q.date <= ui.to));
    el.innerHTML = '<div class="toolbar"><label>From <input type="date" id="rf" value="' + ui.from + '"></label><label>To <input type="date" id="rt" value="' + ui.to + '"></label><button class="btn" data-act="export">Export reservations CSV</button></div>' +
      '<div class="stats"><div class="stat"><div class="v">' + all.length + '</div><div class="l">Reservation volume</div></div><div class="stat"><div class="v">' + pct(web.filter((r) => acc.includes(r.status)).length, web.length) + '</div><div class="l">Confirmed booking rate (website)</div></div><div class="stat"><div class="v">' + pct(arrived.length, eligible.length) + '</div><div class="l">Attendance rate</div></div><div class="stat"><div class="v">' + pct(ns.length, eligible.length) + '</div><div class="l">No-show rate</div></div><div class="stat"><div class="v">' + all.filter((r) => acc.includes(r.status)).reduce((n, r) => n + r.guests, 0) + '</div><div class="l">Guests expected</div></div><div class="stat"><div class="v">' + all.reduce((n, r) => n + (r.arrived || 0), 0) + '</div><div class="l">Guests checked in</div></div><div class="stat"><div class="v">' + pct(enq.filter((q) => q.stage >= 4 && !q.declined).length, enq.length) + '</div><div class="l">Private-event conversion</div></div></div>' +
      '<div class="card"><h3>Booking source performance</h3>' + (Object.keys(ch).length ? '<div class="tbl-wrap" style="border:0"><table><thead><tr><th>Source</th><th>Reservations</th><th></th><th>Guests booked</th><th>Arrived</th></tr></thead><tbody>' + Object.keys(ch).sort((a, b) => ch[b].res - ch[a].res).map((k) => '<tr><td>' + esc(k) + '</td><td>' + ch[k].res + '</td><td style="width:35%"><div class="bar"><i style="width:' + Math.round(ch[k].res / maxRes * 100) + '%"></i></div></td><td>' + ch[k].guests + '</td><td>' + ch[k].arr + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No data for this period.</p>') + '</div><p class="muted" style="margin-top:14px">Rates use consistent definitions: attendance and no-show are measured against accepted bookings (excluding walk-ins). Walk-ins are counted in guests checked in.</p>';
    $('#rf').onchange = (e) => { ui.from = e.target.value; rerender(); }; $('#rt').onchange = (e) => { ui.to = e.target.value; rerender(); };
    bindCommon(el);
  };

  /* ---- settings ---- */
  V.settings = function (el) {
    const s = D().settings, ed = can('settings');
    const inp = (id, label, v, type, hint) => fld('s_' + id, label, '<input type="' + (type || 'text') + '" id="s_' + id + '" value="' + esc(v) + '"' + (ed ? '' : ' disabled') + '>', hint);
    el.innerHTML = '<div class="two"><div class="card"><h3>Business information</h3><form class="form" id="sf">' + inp('address', 'Address', s.address) + inp('phone', 'Phone', s.phone, 'tel') + inp('whatsapp', 'WhatsApp number', s.whatsapp, 'tel', 'Used for “Send on WhatsApp” buttons. Include the country code.') + inp('email', 'Email', s.email, 'email') + inp('instagram', 'Instagram link', s.instagram, 'url', 'Full URL, e.g. https://instagram.com/…') + inp('hours', 'Opening hours (shown on site)', s.hours, 'text', 'Leave blank until confirmed.') +
      '<h3 style="margin-top:12px">Booking rules</h3><div class="row">' + inp('graceMinutes', 'No-show grace (mins)', s.graceMinutes, 'number') + inp('tableDurationMins', 'Table duration (mins)', s.tableDurationMins, 'number') + inp('turnoverBufferMins', 'Turnover buffer (mins)', s.turnoverBufferMins, 'number') + '</div>' + (ed ? '<button class="btn primary" type="submit">Save settings</button>' : '<p class="muted">Only the Owner can change settings.</p>') + '</form></div>' +
      '<div class="card"><h3>Staff roles</h3><ul class="list">' + Object.keys(ROLES).map((k) => '<li><span><b>' + ROLES[k][0] + '</b><br><span class="muted">' + ROLES[k][1] + '</span></span></li>').join('') + '</ul>' + (ed ? '<h3 style="margin-top:18px">Data</h3><div class="actions"><button class="btn small" data-act="backup">Download backup</button><button class="btn small" data-act="demo">Load demo bookings</button><button class="btn small danger" data-act="fresh">Clear sample data</button><button class="btn small danger" data-act="reset">Reset to sample</button></div>' : '') + '</div></div>' +
      '<div class="card" style="margin-top:18px"><h3>Audit log</h3>' + (D().audit.length ? '<div class="tbl-wrap" style="max-height:360px;overflow:auto;border:0"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>' + D().audit.slice(0, 100).map((a) => '<tr><td>' + SR.fmtStamp(a.at) + '</td><td>' + esc(a.actor) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Nothing recorded yet.</p>') + '</div>';
    if (ed) $('#sf').onsubmit = (e) => { e.preventDefault(); ['address', 'phone', 'whatsapp', 'email', 'instagram', 'hours'].forEach((k) => s[k] = $('#s_' + k).value.trim()); ['graceMinutes', 'tableDurationMins', 'turnoverBufferMins'].forEach((k) => s[k] = Math.max(0, +$('#s_' + k).value || 0)); SR.save(); SR.audit(actor(), 'Settings changed', ''); toast('Settings saved'); };
    bindCommon(el);
  };

  function loadDemo() {
    const d = D(), t = todayISO(), evs = d.events.filter((e) => e.date >= t).slice(0, 2), names = ['Tola A.', 'Chidi O.', 'Amaka N.', 'Seun B.', 'Kemi R.', 'Ibrahim S.', 'Funke L.', 'David E.'];
    names.forEach((n, i) => { const ev = evs[i % 2] || null; d.reservations.push({ id: SR.uid('rs'), ref: SR.ref('SR'), type: i % 3 === 0 ? 'table' : 'visit', eventId: ev ? ev.id : '', date: ev ? ev.date : t, time: ['21:00', '22:00', '23:00'][i % 3], guests: 2 + (i % 5), name: 'Demo ' + n, phone: '0803000' + String(1000 + i), invitedBy: i % 2 ? 'Demo host' : '', channel: SR.CHANNELS[i % 4], seating: '', requests: '', marketing: i % 2 === 0, status: ['pending', 'confirmed', 'confirmed', 'waitlisted'][i % 4], tableIds: [], arrived: 0, checkIns: [], notes: '', createdAt: SR.nowStamp(), source: 'website' }); });
    SR.save(); SR.audit(actor(), 'Demo bookings loaded', '');
  }

  /* ---------- delegated actions ---------- */
  function bindCommon(el) {
    el.onclick = (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id, a = b.dataset.act, d = D();
      const r = id && d.reservations.find((x) => x.id === id), ev = id && d.events.find((x) => x.id === id), tb = id && d.tables.find((x) => x.id === id), q = id && d.enquiries.find((x) => x.id === id);
      switch (a) {
        case 'add': addBookingDlg(); break;
        case 'open': openRes(id); break;
        case 'confirm': if (setStatus(r, 'confirmed')) { rerender(); toast('Confirmed ' + r.ref); } break;
        case 'export': csv([['Ref', 'Name', 'Phone', 'Date', 'Time', 'Guests', 'Arrived', 'Type', 'Event', 'Invited by', 'Source', 'Status', 'Tables']].concat(filteredRes().map((x) => [x.ref, x.name, can('seeContacts') ? x.phone : '', x.date, x.time, x.guests, x.arrived || 0, x.type, evName(x.eventId), x.invitedBy, x.channel, x.status, (x.tableIds || []).map(tName).join('; ')])), 'shaunz-royale-reservations.csv'); SR.audit(actor(), 'Export', 'Reservations CSV'); break;
        case 'ci': checkInDlg(r); break;
        case 'walkin': walkinDlg(); break;
        case 'ns': if (setStatus(r, 'no_show')) rerender(); break;
        case 'print': window.print(); break;
        case 'newev': eventDlg(); break;
        case 'evedit': eventDlg(ev); break;
        case 'evpub': ev.published = !ev.published; SR.save(); SR.audit(actor(), ev.published ? 'Event published' : 'Event unpublished', ev.title + ' ' + ev.date); rerender(); break;
        case 'evsold': ev.soldOut = !ev.soldOut; SR.save(); SR.audit(actor(), 'Event sold-out toggled', ev.title + ' ' + ev.date); rerender(); break;
        case 'evcancel': cancelEventDlg(ev); break;
        case 'evbk': ui.rdate = ev.date; ui.status = ''; ui.q = ''; location.hash = '#/reservations'; if (currentSection() === 'reservations') rerender(); break;
        case 'newtb': tableDlg(); break;
        case 'tbedit': tableDlg(tb); break;
        case 'qadv': q.stage = Math.min(5, q.stage + 1); SR.save(); SR.audit(actor(), 'Enquiry stage', q.ref + ' → ' + SR.STAGES[q.stage]); rerender(); break;
        case 'qback': q.stage = Math.max(0, q.stage - 1); SR.save(); SR.audit(actor(), 'Enquiry stage', q.ref + ' → ' + SR.STAGES[q.stage]); rerender(); break;
        case 'qedit': enqDlg(q); break;
        case 'qdecl': q.declined = !q.declined; SR.save(); SR.audit(actor(), q.declined ? 'Enquiry declined' : 'Enquiry reopened', q.ref); rerender(); break;
        case 'qconv': { const rr = { id: SR.uid('rs'), ref: SR.ref('SR'), type: 'celebration', eventId: '', date: q.date, time: q.time, guests: q.guests, name: q.name, phone: q.phone, invitedBy: '', channel: 'Website (direct)', seating: q.space, requests: [q.occasion, q.food, q.decor].filter(Boolean).join(' · '), marketing: !!q.marketing, status: 'confirmed', tableIds: [], arrived: 0, checkIns: [], notes: 'From enquiry ' + q.ref, createdAt: SR.nowStamp(), source: 'celebration' }; d.reservations.push(rr); q.reservationId = rr.id; SR.save(); SR.audit(actor(), 'Enquiry converted', q.ref + ' → ' + rr.ref); rerender(); toast('Booking ' + rr.ref + ' created'); break; }
        case 'backup': { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' })); a2.download = 'shaunz-royale-backup-' + todayISO() + '.json'; a2.click(); break; }
        case 'demo': loadDemo(); rerender(); toast('Demo bookings added'); break;
        case 'fresh': if (confirm('Remove all sample events, tables, bookings and enquiries? Settings are kept.')) { d.events = []; d.tables = []; d.reservations = []; d.enquiries = []; d.sample = false; SR.save(); SR.audit(actor(), 'Sample data cleared', ''); rerender(); } break;
        case 'reset': if (confirm('Reset everything to the original sample data?')) { SR.reset(); rerender(); } break;
      }
    };
  }

  if (role && !location.hash) location.hash = '#/' + PERMS[role][0];
  render();
})();
