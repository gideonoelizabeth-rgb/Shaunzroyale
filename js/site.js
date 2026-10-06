/* Shaunz Royale — customer website */
(function () {
  const { esc, fmtDate, fmtTime, todayISO, addDays } = SR;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $('#app');
  const S = () => SR.get().settings;
  let bk = null; // booking wizard state

  /* ---------- helpers ---------- */
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Shaunz Royale Akure Shebi Junction Ilesha-Owo Express Road');
  const waLink = (text) => S().whatsapp ? 'https://wa.me/' + SR.normPhone(S().whatsapp) + '?text=' + encodeURIComponent(text) : '';
  function field(id, label, control, o) {
    o = o || {};
    return '<div class="field" id="f_' + id + '"><label for="' + id + '">' + label + (o.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' + control +
      (o.hint ? '<div class="hint">' + o.hint + '</div>' : '') + '<div class="err" id="e_' + id + '" role="alert"></div></div>';
  }
  const val = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
  function setErr(id, msg) { const f = $('#f_' + id); if (!f) return; f.classList.toggle('invalid', !!msg); const e = $('#e_' + id); if (e) e.textContent = msg || ''; const i = document.getElementById(id); if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  function focusFirstError() { const f = $('.field.invalid input, .field.invalid select, .field.invalid textarea'); if (f) f.focus(); }
  const statusBadge = (s) => { const x = SR.STATUS[s] || [s, '', '']; return '<span class="badge ' + s + '" title="' + esc(x[2]) + '"><span aria-hidden="true">' + x[1] + '</span>' + esc(x[0]) + '</span>'; };
  const guestOptions = (max, sel) => Array.from({ length: max }, (_, i) => '<option value="' + (i + 1) + '"' + (+sel === i + 1 ? ' selected' : '') + '>' + (i + 1) + (i ? ' guests' : ' guest') + '</option>').join('');

  /* ---------- event card ---------- */
  function eventCard(ev) {
    const st = SR.eventState(ev), d = new Date(ev.date + 'T12:00:00Z');
    const mon = d.toLocaleDateString('en-NG', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const label = st === 'open' ? 'Spots available' : st === 'full' ? 'Fully booked — join waitlist' : 'Cancelled';
    const time = ev.start ? fmtTime(ev.start) + (ev.end ? ' – ' + fmtTime(ev.end) : '') : '';
    return '<article class="card event"><div class="poster" style="background-image:url(\'' + esc(ev.image) + '\');background-position:' + esc(ev.imagePos || 'center') + '"><div class="date-chip"><b>' + d.getUTCDate() + '</b><span>' + mon + '</span></div></div>' +
      '<div class="body"><span class="tag ' + st + '">' + label + '</span><h3>' + esc(ev.title) + '</h3>' +
      '<div class="meta"><span>' + fmtDate(ev.date, { year: undefined }) + '</span>' + (time ? '<span>' + time + '</span>' : '') + (ev.price ? '<span>' + esc(ev.price) + '</span>' : '') + '</div>' +
      '<p class="muted">' + esc(ev.description) + '</p>' +
      (st === 'cancelled' ? '' : '<a class="btn primary" href="#/book/' + ev.id + '">' + (st === 'full' ? 'Join Waitlist' : 'Book This Event') + '</a>') + '</article>';
  }

  /* ---------- views ---------- */
  const views = {};

  views.home = function () {
    const evs = SR.bookableEvents().slice(0, 3);
    return '<section class="hero" style="--hero-img:url(\'' + new URL(SR.IMG.neon, location.href).href + '\')"><div class="wrap"><div class="hero-inner">' +
      '<span class="eyebrow">Akure · Lounge &amp; Nightclub</span><h1>Your next night out starts here.</h1>' +
      '<p class="lead">Discover the vibe. Bring your people. Reserve your spot.</p>' +
      '<div class="cta-row"><a class="btn primary" href="#/book">Book a Visit</a><a class="btn" href="#/celebrations">Plan a Celebration</a></div></div></div></section>' +

      '<section class="block"><div class="wrap"><div class="section-head"><div class="rule">✦</div><h2>Upcoming events</h2><p>The next nights at Shaunz Royale. Pick one and reserve your spot.</p></div>' +
      (evs.length ? '<div class="grid cols-3">' + evs.map(eventCard).join('') + '</div><p style="margin-top:22px"><a class="btn" href="#/events">See all events</a></p>'
        : '<div class="empty"><p>No events are published right now.</p><a class="btn primary" href="#/book">Make a general reservation</a></div>') + '</div></section>' +

      '<section class="block band"><div class="wrap"><div class="section-head"><div class="rule">✦</div><h2>Choose your experience</h2><p>Three simple ways to get started.</p></div>' +
      '<div class="grid cols-3">' +
      '<a class="card link" href="#/book/visit"><div class="ico" aria-hidden="true">🥂</div><h3>Book a Visit</h3><p>For individuals, couples and groups who want to come through.</p></a>' +
      '<a class="card link" href="#/book/table"><div class="ico" aria-hidden="true">🛋️</div><h3>Reserve a Table</h3><p>Want a table or designated seating? Tell us your party size and preference.</p></a>' +
      '<a class="card link" href="#/celebrations"><div class="ico" aria-hidden="true">🎂</div><h3>Plan a Celebration</h3><p>Birthdays, anniversaries, hangouts and private events, planned with you.</p></a></div></div></section>' +

      '<section class="block"><div class="wrap"><div class="section-head"><div class="rule">✦</div><h2>The Shaunz experience</h2><p>Lounge. Music. Food and drinks. Moments worth remembering.</p></div>' +
      '<div class="gallery"><figure><img src="' + SR.IMG.lounge + '" alt="Plush lounge seating under crystal chandeliers" loading="lazy"><figcaption>The Lounge</figcaption></figure>' +
      '<figure><img src="' + SR.IMG.vip + '" alt="A reserved VIP table with bottles and sparklers" loading="lazy"><figcaption>VIP Tables</figcaption></figure>' +
      '<figure><img src="' + SR.IMG.neon + '" alt="Shaunz Royale neon sign held up on the dance floor" loading="lazy" style="object-position:center 25%"><figcaption>Club Nights</figcaption></figure></div></div></section>' +

      '<section class="block band"><div class="wrap split"><div><div class="rule" style="justify-content:flex-start">✦</div><h2>Celebrations &amp; group bookings</h2>' +
      '<p class="muted">Birthday, anniversary, link-up or private party? Share a few details and our team will review availability and come back to you with the next step. No long back-and-forth needed.</p>' +
      '<div class="cta-row"><a class="btn primary" href="#/celebrations">Plan a Celebration</a></div></div>' +
      '<div class="pic"><img src="' + SR.IMG.bday + '" alt="Gold balloon arch and birthday cake in a lounge setup" loading="lazy"></div></div></section>' +

      '<section class="block"><div class="wrap"><div class="section-head"><div class="rule">✦</div><h2>Find us</h2></div>' + findUs() + '</div></section>';
  };

  function findUs() {
    const s = S();
    return '<div class="card"><ul class="facts">' +
      '<li><span class="k">Address</span><span>' + esc(s.address) + '</span></li>' +
      (s.phone ? '<li><span class="k">Phone</span><a href="tel:' + esc(s.phone.replace(/\s/g, '')) + '">' + esc(s.phone) + '</a></li>' : '') +
      '<li><span class="k">Hours</span><span>' + (s.hours ? esc(s.hours) : 'Opening times vary by event. Check <a href="#/events">Events</a> or book to be sure.') + '</span></li></ul>' +
      '<div class="cta-row" style="margin-top:0"><a class="btn primary" target="_blank" rel="noopener" href="' + mapsUrl + '">Get Directions</a>' +
      (s.whatsapp ? '<a class="btn" target="_blank" rel="noopener" href="' + waLink('Hello Shaunz Royale, ') + '">Chat on WhatsApp</a>' : '') + '</div></div>';
  }

  views.events = function () {
    const evs = SR.bookableEvents();
    const cats = Array.from(new Set(evs.map((e) => e.category))).sort();
    return pageHead('Events', 'What’s happening at Shaunz Royale. Reserve your spot before it fills up.') +
      '<section class="block" style="padding-top:0"><div class="wrap"><div class="toolbar" style="display:flex;gap:10px;margin-bottom:18px"><label class="sr-only" for="catF">Filter by category</label><select id="catF" style="max-width:300px"><option value="">All categories</option>' + cats.map((c) => '<option>' + esc(c) + '</option>').join('') + '</select></div>' +
      '<div id="evList">' + (evs.length ? '<div class="grid cols-3">' + evs.map(eventCard).join('') + '</div>' : '<div class="empty"><p>No upcoming events are published yet.</p><a class="btn primary" href="#/book">Make a general reservation</a></div>') + '</div></div></section>';
  };
  views.events.after = function () {
    const f = $('#catF'); if (!f) return;
    f.addEventListener('change', () => {
      const evs = SR.bookableEvents().filter((e) => !f.value || e.category === f.value);
      $('#evList').innerHTML = evs.length ? '<div class="grid cols-3">' + evs.map(eventCard).join('') + '</div>' : '<div class="empty">No events in this category right now.</div>';
    });
  };

  function pageHead(title, sub) { return '<section class="block" style="padding-bottom:24px"><div class="wrap"><div class="rule" style="justify-content:flex-start">✦</div><h1 style="font-size:clamp(2rem,6vw,3rem)">' + esc(title) + '</h1>' + (sub ? '<p class="muted" style="max-width:640px">' + esc(sub) + '</p>' : '') + '</div></section>'; }

  /* ---------- booking wizard ---------- */
  function newBooking(arg) {
    bk = { step: 1, type: 'visit', eventId: '', date: '', time: '', guests: 2, name: '', phone: '', invitedBy: '', channel: '', seating: '', requests: '', consent: false, marketing: false, token: SR.uid('tk') };
    if (arg === 'table') bk.type = 'table';
    else if (arg && arg !== 'visit') { const ev = SR.eventById(arg); if (ev && ev.published && !ev.cancelled) { bk.eventId = ev.id; bk.date = ev.date; } }
  }
  const stepper = () => '<ol class="steps" aria-label="Booking progress">' + ['Choose your visit', 'Your details', 'Confirm'].map((l, i) => '<li class="' + (i + 1 < bk.step ? 'done' : i + 1 === bk.step ? 'now' : '') + '"' + (i + 1 === bk.step ? ' aria-current="step"' : '') + '>' + l + '</li>').join('') + '</ol>';

  views.book = function (arg) {
    if (!bk || bk.done || (arg && arg !== bk.arg)) newBooking(arg);
    bk.arg = arg || bk.arg || '';
    return pageHead(bk.type === 'table' ? 'Reserve a Table' : 'Book a Visit', 'Three quick steps. No account needed.') +
      '<section class="block" style="padding-top:0"><div class="wrap" style="max-width:760px"><div class="panel" id="wiz"></div>' +
      '<p class="muted" style="margin-top:16px;text-align:center">Already booked? <a href="#/track">Check your booking status</a></p></div></section>';
  };
  views.book.after = renderStep;

  function renderStep() {
    const w = $('#wiz'); if (!w) return;
    if (bk.done) { w.innerHTML = bk.done; return; }
    if (bk.step === 1) w.innerHTML = stepper() + step1();
    if (bk.step === 2) w.innerHTML = stepper() + step2();
    if (bk.step === 3) w.innerHTML = stepper() + step3();
    bindStep(); w.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function step1() {
    const evs = SR.bookableEvents(), maxDate = addDays(todayISO(), 120);
    const ev = bk.eventId ? SR.eventById(bk.eventId) : null;
    return '<form class="form" id="s1" novalidate><div class="field"><span class="lbl">What would you like to do? <span class="req">*</span></span><div class="seg" role="radiogroup">' +
      '<label><input type="radio" name="type" value="visit"' + (bk.type === 'visit' ? ' checked' : '') + '><span class="opt"><b>Visit</b><span>Come through with friends or family</span></span></label>' +
      '<label><input type="radio" name="type" value="table"' + (bk.type === 'table' ? ' checked' : '') + '><span class="opt"><b>Table</b><span>Reserve a table or seating area</span></span></label></div></div>' +
      field('eventId', 'Event', '<select id="eventId"><option value="">No specific event (general visit)</option>' + evs.map((e) => '<option value="' + e.id + '"' + (e.id === bk.eventId ? ' selected' : '') + '>' + esc(e.title) + ' — ' + fmtDate(e.date, { year: undefined }) + '</option>').join('') + '</select>', { hint: '<span id="evHint">' + evHint(ev) + '</span>' }) +
      '<div class="row">' + field('date', 'Date', '<input type="date" id="date" min="' + todayISO() + '" max="' + maxDate + '" value="' + esc(bk.date) + '"' + (ev ? ' readonly' : '') + '>', { req: true, hint: ev ? 'Set by the event you chose.' : '' }) +
      field('time', 'Expected arrival time', '<input type="time" id="time" value="' + esc(bk.time) + '">', { req: true }) + '</div>' +
      field('guests', 'Number of guests', '<select id="guests">' + guestOptions(30, bk.guests) + '</select>', { req: true, hint: 'Including yourself. For bigger groups, use <a href="#/celebrations">Plan a Celebration</a>.' }) +
      '<div class="nav-btns"><span></span><button class="btn primary" type="submit">Continue →</button></div></form>';
  }
  function evHint(ev) {
    if (!ev) return '';
    const st = SR.eventState(ev);
    return st === 'full' ? 'This event is fully booked. You can still request a spot on the waitlist.' : ev.price ? 'Entry: ' + esc(ev.price) : '';
  }

  function step2() {
    return '<form class="form" id="s2" novalidate><div class="row">' +
      field('name', 'Full name', '<input type="text" id="name" autocomplete="name" value="' + esc(bk.name) + '">', { req: true }) +
      field('phone', 'Phone number', '<input type="tel" id="phone" inputmode="tel" autocomplete="tel" placeholder="0803 000 0000" value="' + esc(bk.phone) + '">', { req: true, hint: 'Nigerian or international. We use it to reach you about this booking.' }) + '</div>' +
      '<div class="row">' + field('invitedBy', 'Who invited you?', '<input type="text" id="invitedBy" placeholder="Friend, host or promoter (optional)" value="' + esc(bk.invitedBy) + '">') +
      field('channel', 'How did you hear about us?', '<select id="channel"><option value="">Select (optional)</option>' + ['Instagram', 'WhatsApp', 'Website (direct)', 'Friend or host', 'Promoter', 'Other'].map((c) => '<option' + (bk.channel === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>') + '</div>' +
      (bk.type === 'table' ? field('seating', 'Seating preference', '<select id="seating"><option value="">No preference</option>' + ['Standard table', 'VIP table', 'Private area', 'Near the dance floor', 'Quieter corner'].map((c) => '<option' + (bk.seating === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>', { hint: 'Our team assigns the exact table. Preferences are not guaranteed.' }) : '') +
      field('requests', 'Special requests', '<textarea id="requests" maxlength="500" placeholder="Anything we should know? (optional)">' + esc(bk.requests) + '</textarea>') +
      '<div class="nav-btns"><button class="btn" type="button" id="back">← Back</button><button class="btn primary" type="submit">Review →</button></div></form>';
  }

  function step3() {
    const ev = bk.eventId ? SR.eventById(bk.eventId) : null;
    const rows = [['Booking', bk.type === 'table' ? 'Table reservation' : 'Visit'], ['Event', ev ? ev.title : 'General visit'], ['Date', fmtDate(bk.date)], ['Arrival', fmtTime(bk.time)], ['Guests', bk.guests], ['Name', bk.name], ['Phone', bk.phone]];
    if (bk.invitedBy) rows.push(['Invited by', bk.invitedBy]); if (bk.seating) rows.push(['Seating', bk.seating]); if (bk.requests) rows.push(['Requests', bk.requests]);
    return '<form class="form" id="s3" novalidate><h3>Review your booking</h3><dl class="summary">' + rows.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>' +
      '<div class="notice"><b>This is a reservation request.</b> Your spot is only confirmed once our team accepts it and we tell you so. No payment is needed to submit.</div>' +
      '<div class="field" id="f_consent"><label class="check"><input type="checkbox" id="consent"' + (bk.consent ? ' checked' : '') + '><span>I agree to Shaunz Royale using my details to manage this booking, as described in the <a href="#/info/privacy" target="_blank">privacy notice</a>. <span class="req">*</span></span></label><div class="err" id="e_consent" role="alert"></div></div>' +
      '<label class="check"><input type="checkbox" id="marketing"' + (bk.marketing ? ' checked' : '') + '><span>Send me news about upcoming events and offers (optional).</span></label>' +
      '<div class="nav-btns"><button class="btn" type="button" id="back">← Back</button><button class="btn primary" type="submit" id="submitBtn">Submit Request</button></div></form>';
  }

  function collect(ids) { ids.forEach((id) => { bk[id] = id === 'guests' ? +val(id) : val(id); }); }

  function bindStep() {
    const f1 = $('#s1'), f2 = $('#s2'), f3 = $('#s3');
    $$('#wiz #back').forEach((b) => b.addEventListener('click', () => { if (bk.step === 2) collect(['name', 'phone', 'invitedBy', 'channel', 'requests'].concat(bk.type === 'table' ? ['seating'] : [])); if (bk.step === 3) { bk.consent = val('consent'); bk.marketing = val('marketing'); } bk.step--; renderStep(); }));
    if (f1) {
      $$('input[name=type]', f1).forEach((r) => r.addEventListener('change', () => { bk.type = r.value; const h = $('.site-header'); document.querySelector('#app h1').textContent = bk.type === 'table' ? 'Reserve a Table' : 'Book a Visit'; }));
      $('#eventId').addEventListener('change', (e) => {
        bk.eventId = e.target.value; const ev = bk.eventId ? SR.eventById(bk.eventId) : null;
        const d = $('#date'); if (ev) { d.value = ev.date; d.readOnly = true; } else { d.readOnly = false; }
        bk.date = d.value; $('#evHint').innerHTML = evHint(ev);
      });
      f1.addEventListener('submit', (e) => {
        e.preventDefault(); let ok = true;
        const date = val('date'), time = val('time');
        setErr('date', !date ? 'Please choose a date.' : date < todayISO() ? 'That date has passed. Please choose today or later.' : '');
        setErr('time', !time ? 'Please enter your expected arrival time.' : '');
        if (!date || date < todayISO() || !time) ok = false;
        if (!ok) { focusFirstError(); return; }
        bk.type = ($('input[name=type]:checked', f1) || {}).value || 'visit'; bk.eventId = val('eventId'); bk.date = date; bk.time = time; bk.guests = +val('guests'); bk.step = 2; renderStep();
      });
    }
    if (f2) f2.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = val('name'), phone = val('phone');
      setErr('name', name.length < 2 ? 'Please enter your full name.' : '');
      setErr('phone', !phone ? 'Please enter your phone number.' : !SR.validPhone(phone) ? 'That doesn’t look like a valid phone number.' : '');
      if (name.length < 2 || !SR.validPhone(phone)) { focusFirstError(); return; }
      collect(['name', 'phone', 'invitedBy', 'channel', 'requests'].concat(bk.type === 'table' ? ['seating'] : [])); bk.step = 3; renderStep();
    });
    if (f3) f3.addEventListener('submit', (e) => {
      e.preventDefault();
      bk.consent = val('consent'); bk.marketing = val('marketing');
      setErr('consent', bk.consent ? '' : 'Please agree so we can process your booking.');
      if (!bk.consent) { $('#consent').focus(); return; }
      const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = 'Submitting…';
      const res = SR.submitReservation({ type: bk.type, eventId: bk.eventId, date: bk.date, time: bk.time, guests: bk.guests, name: bk.name, phone: bk.phone, invitedBy: bk.invitedBy, channel: bk.channel || (bk.invitedBy ? 'Friend or host' : 'Website (direct)'), seating: bk.seating, requests: bk.requests, marketing: bk.marketing, token: bk.token });
      if (!res.ok) { btn.disabled = false; btn.textContent = 'Submit Request'; $('#e_consent').insertAdjacentHTML('afterend', '<div class="notice bad" role="alert" style="margin-top:12px">' + esc(res.error) + '</div>'); return; }
      bk.done = successHtml(res.reservation); renderStep();
    });
  }

  function successHtml(r) {
    const waiting = r.status === 'waitlisted';
    const msg = 'Hello Shaunz Royale, my booking reference is ' + r.ref + ' (' + r.name + ', ' + fmtDate(r.date) + ').';
    return '<div style="text-align:center"><div style="font-size:2.4rem" aria-hidden="true">' + (waiting ? '⏳' : '✨') + '</div><h2>' + (waiting ? 'You’re on the waitlist' : 'Request received') + '</h2>' +
      '<p class="muted">' + (waiting ? 'This event has no spots left right now. We’ll contact you if one opens up. You are <b>not</b> confirmed yet.' : 'Thank you, ' + esc(r.name.split(' ')[0]) + '. Your reservation is <b>pending review</b>. It is not confirmed until our team accepts it and tells you so.') + '</p>' +
      '<div class="refbox" aria-label="Booking reference">' + r.ref + '</div><p>' + statusBadge(r.status) + '</p>' +
      '<p class="muted">Save this reference. You can check your status anytime with your reference and phone number.</p>' +
      '<div class="cta-row" style="justify-content:center"><a class="btn primary" href="#/track">Check booking status</a>' + (S().whatsapp ? '<a class="btn" target="_blank" rel="noopener" href="' + waLink(msg) + '">Send on WhatsApp</a>' : '') + '<a class="btn" href="#/">Back home</a></div></div>';
  }

  /* ---------- celebrations ---------- */
  views.celebrations = function () {
    return pageHead('Plan a Celebration', 'Birthdays, anniversaries, hangouts and private events. Share your plans in one short form and our team will take it from there.') +
      '<section class="block" style="padding-top:0"><div class="wrap" style="max-width:760px"><div class="panel" id="celeb"><form class="form" id="cf" novalidate>' +
      '<div class="row">' + field('c_name', 'Host’s name', '<input type="text" id="c_name" autocomplete="name">', { req: true }) + field('c_phone', 'Phone number', '<input type="tel" id="c_phone" inputmode="tel" autocomplete="tel" placeholder="0803 000 0000">', { req: true }) + '</div>' +
      '<div class="row">' + field('c_occasion', 'Occasion', '<select id="c_occasion"><option value="">Select…</option>' + ['Birthday', 'Anniversary', 'Friends’ hangout', 'Private party', 'Other'].map((o) => '<option>' + o + '</option>').join('') + '</select>', { req: true }) +
      field('c_space', 'Space preference', '<select id="c_space">' + ['Undecided', 'Table', 'VIP area', 'Private area'].map((o) => '<option>' + o + '</option>').join('') + '</select>') + '</div>' +
      '<div class="row">' + field('c_date', 'Preferred date', '<input type="date" id="c_date" min="' + todayISO() + '">', { req: true }) + field('c_time', 'Expected arrival time', '<input type="time" id="c_time">', { req: true }) + '</div>' +
      '<div class="row">' + field('c_guests', 'Number of guests', '<input type="number" id="c_guests" min="2" max="500" inputmode="numeric" placeholder="e.g. 15">', { req: true }) +
      field('c_budget', 'Budget range', '<select id="c_budget"><option value="">Prefer not to say</option>' + ['Under ₦200,000', '₦200,000 – ₦500,000', '₦500,000 – ₦1,000,000', 'Above ₦1,000,000'].map((o) => '<option>' + o + '</option>').join('') + '</select>') + '</div>' +
      field('c_food', 'Food and drink requests', '<textarea id="c_food" maxlength="500" placeholder="Optional"></textarea>') +
      field('c_decor', 'Decoration or special setup', '<textarea id="c_decor" maxlength="500" placeholder="Optional"></textarea>') +
      field('c_notes', 'Additional notes', '<textarea id="c_notes" maxlength="500" placeholder="Optional"></textarea>') +
      '<div class="notice">Submitting this form is an enquiry, not a booking. We’ll review availability, send you an offer, and confirm once the arrangements are agreed.</div>' +
      '<div class="field" id="f_c_consent"><label class="check"><input type="checkbox" id="c_consent"><span>I agree to Shaunz Royale using my details to respond to this enquiry (<a href="#/info/privacy" target="_blank">privacy notice</a>). <span class="req">*</span></span></label><div class="err" id="e_c_consent" role="alert"></div></div>' +
      '<label class="check"><input type="checkbox" id="c_marketing"><span>Send me news about upcoming events and offers (optional).</span></label>' +
      '<div class="nav-btns"><span></span><button class="btn primary" type="submit" id="c_submit">Send Enquiry</button></div></form></div></div></section>';
  };
  let celebToken = null;
  views.celebrations.after = function () {
    celebToken = celebToken || SR.uid('tk');
    $('#cf').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (id) => val('c_' + id), checks = [];
      const chk = (id, bad, msg) => { setErr('c_' + id, bad ? msg : ''); if (bad) checks.push(id); };
      chk('name', v('name').length < 2, 'Please enter the host’s name.');
      chk('phone', !SR.validPhone(v('phone')), 'Please enter a valid phone number.');
      chk('occasion', !v('occasion'), 'Please choose an occasion.');
      chk('date', !v('date') || v('date') < todayISO(), 'Please choose a date that has not passed.');
      chk('time', !v('time'), 'Please enter an expected arrival time.');
      chk('guests', !(+v('guests') >= 2), 'Please enter the number of guests (at least 2).');
      setErr('c_consent', val('c_consent') ? '' : 'Please agree so we can respond to your enquiry.'); if (!val('c_consent')) checks.push('consent');
      if (checks.length) { focusFirstError(); return; }
      const b = $('#c_submit'); b.disabled = true; b.textContent = 'Sending…';
      const res = SR.submitEnquiry({ name: v('name'), phone: v('phone'), occasion: v('occasion'), space: v('space'), date: v('date'), time: v('time'), guests: +v('guests'), budget: v('budget'), food: v('food'), decor: v('decor'), notes: v('notes'), marketing: val('c_marketing'), token: celebToken });
      celebToken = null;
      const q = res.enquiry, msg = 'Hello Shaunz Royale, my celebration enquiry reference is ' + q.ref + '.';
      $('#celeb').innerHTML = '<div style="text-align:center"><div style="font-size:2.4rem" aria-hidden="true">🥂</div><h2>Enquiry received</h2><p class="muted">Thank you, ' + esc(q.name.split(' ')[0]) + '. Our team will review availability for ' + fmtDate(q.date) + ' and come back to you with an offer. This is not a confirmed booking yet.</p>' +
        '<div class="refbox">' + q.ref + '</div><p class="muted">Use this reference and your phone number to follow your enquiry’s progress.</p><div class="cta-row" style="justify-content:center"><a class="btn primary" href="#/track">Track my enquiry</a>' + (S().whatsapp ? '<a class="btn" target="_blank" rel="noopener" href="' + waLink(msg) + '">Send on WhatsApp</a>' : '') + '</div></div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  /* ---------- track ---------- */
  views.track = function () {
    return pageHead('Check your booking', 'Enter the reference we gave you and the phone number you booked with.') +
      '<section class="block" style="padding-top:0"><div class="wrap" style="max-width:640px"><div class="panel"><form class="form" id="tf" novalidate>' +
      field('t_ref', 'Booking reference', '<input type="text" id="t_ref" autocapitalize="characters" placeholder="SR-XXXXXX or CE-XXXXXX">', { req: true }) +
      field('t_phone', 'Phone number', '<input type="tel" id="t_phone" inputmode="tel">', { req: true }) +
      '<button class="btn primary" type="submit">Check status</button></form><div id="tres" style="margin-top:22px" aria-live="polite"></div></div></div></section>';
  };
  views.track.after = function () {
    $('#tf').addEventListener('submit', (e) => {
      e.preventDefault();
      setErr('t_ref', val('t_ref') ? '' : 'Enter your reference.'); setErr('t_phone', val('t_phone') ? '' : 'Enter your phone number.');
      if (!val('t_ref') || !val('t_phone')) { focusFirstError(); return; }
      const r = SR.lookup(val('t_ref'), val('t_phone')), out = $('#tres');
      if (!r) { out.innerHTML = '<div class="notice bad">We couldn’t find a booking matching that reference and phone number. Please check both and try again.</div>'; return; }
      if (r.kind === 'reservation') {
        const x = r.item, ev = x.eventId ? SR.eventById(x.eventId) : null;
        const next = { pending: 'Our team is reviewing your request. We’ll contact you once it’s decided.', confirmed: 'You’re confirmed. See you there!', waitlisted: 'You’re on the waitlist. We’ll contact you if a spot opens.', rejected: 'Sorry, we couldn’t accept this request. Please contact the venue or try another date.', cancelled: 'This booking has been cancelled.', checked_in: 'Welcome in! Enjoy your night.', completed: 'Thanks for visiting Shaunz Royale.', no_show: 'This booking was marked as a no-show.' }[x.status] || '';
        out.innerHTML = '<h3>' + esc(x.ref) + ' ' + statusBadge(x.status) + '</h3><p class="muted">' + next + '</p><dl class="summary"><div><dt>Event</dt><dd>' + esc(ev ? ev.title : 'General visit') + (ev && ev.cancelled ? ' (cancelled)' : '') + '</dd></div><div><dt>Date</dt><dd>' + fmtDate(x.date) + '</dd></div><div><dt>Arrival</dt><dd>' + fmtTime(x.time) + '</dd></div><div><dt>Guests</dt><dd>' + x.guests + '</dd></div></dl>';
      } else {
        const x = r.item;
        out.innerHTML = '<h3>' + esc(x.ref) + (x.declined ? ' <span class="badge rejected">⊘ Not available</span>' : '') + '</h3><ol class="steps" style="flex-direction:column;gap:6px">' + SR.STAGES.map((s, i) => '<li class="' + (i < x.stage ? 'done' : i === x.stage && !x.declined ? 'now' : '') + '" style="border-top:0;border-left:3px solid ' + (i <= x.stage ? 'var(--gold)' : '#2f2a1a') + ';padding:2px 12px">' + s + '</li>').join('') + '</ol>' +
          (x.quote ? '<div class="notice">Our offer: <b>' + esc(x.quote) + '</b></div>' : '') + '<p class="muted" style="margin-top:12px">' + (x.declined ? 'We’re unable to host this date. Please contact the venue to discuss alternatives.' : x.stage >= 4 ? 'Your celebration is confirmed.' : 'We’ll contact you with the next step.') + '</p>';
      }
    });
  };

  /* ---------- info ---------- */
  const INFO = {
    faq: ['Frequently asked questions', [
      ['Do I need an account to book?', 'No. Enter your name and phone number and you’re done.'],
      ['Is my spot guaranteed once I submit?', 'No. A submitted form is a request. Your spot is confirmed only when our team accepts it and you’re told so, using the reference you received.'],
      ['Can I choose my exact table?', 'You can tell us your seating preference. Our team assigns the actual table on the night to keep things running smoothly.'],
      ['What if an event is fully booked?', 'You can join the waitlist. Waitlisted guests are not counted as confirmed, and we’ll reach out if a spot opens.'],
      ['How do I plan a birthday or private event?', 'Use <a href="#/celebrations">Plan a Celebration</a>. We review availability, send an offer, and confirm once arrangements are agreed.'],
      ['How do I check my status?', 'Go to <a href="#/track">Check my booking</a> and enter your reference and phone number.']]],
    policies: ['Booking policies', [
      ['Reservations', 'Reservations are requests until confirmed by Shaunz Royale. Confirmation is communicated to you directly.'],
      ['Capacity', 'Events and seating areas have limited capacity. When capacity is reached, further requests may be waitlisted.'],
      ['Arrival', 'Please arrive around your expected arrival time. Where a table is guaranteed, a late-arrival allowance applies and may be explained when you’re confirmed. Bookings that don’t arrive within the allowance may be released.'],
      ['Changes & cancellations', 'Contact the venue as early as possible with your booking reference. Cancelling does not automatically imply a refund where payment applies. Refunds follow the policy for the specific booking or event.'],
      ['Event changes', 'If an event is cancelled or postponed, affected guests will be contacted with next steps.'],
      ['Payments', 'Deposits or entry charges, where they apply, are stated on the event or in your offer. A booking that requires payment is not confirmed on the strength of a screenshot.']]],
    privacy: ['Privacy notice', [
      ['What we collect', 'Only what’s needed to manage your booking: your name, phone number, visit details, and anything you choose to add (such as who invited you or special requests).'],
      ['Why we collect it', 'To process, confirm and manage your reservation or enquiry, to contact you about it, and to run the venue safely on the night.'],
      ['Marketing', 'We only send news and offers if you opt in separately. Booking never requires it.'],
      ['Who can see it', 'Staff see the details their role requires. We don’t share your details with promoters or third parties for their own use.'],
      ['Your rights', 'You may ask to access, correct or delete your information. Contact the venue to do so. We aim to handle personal data in line with applicable Nigerian data protection law.']]]
  };
  views.info = function (arg) {
    const d = INFO[arg] || INFO.faq;
    return pageHead(d[0]) + '<section class="block" style="padding-top:0"><div class="wrap" style="max-width:760px"><div class="panel">' + d[1].map((x) => '<h3 style="margin-top:1em">' + x[0] + '</h3><p class="muted">' + x[1] + '</p>').join('') + '</div></div></section>';
  };

  /* ---------- router ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, ''), [name, arg] = h.split('/');
    const key = views[name || 'home'] ? (name || 'home') : 'home';
    app.innerHTML = views[key](arg);
    if (views[key].after) views[key].after(arg);
    $$('.nav a[data-r]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.r === key || (key === 'home' && a.dataset.r === 'home')) );
    $$('.nav a[data-r]').forEach((a) => { if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page'); });
    $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    if (key !== 'book') window.scrollTo(0, 0);
    document.title = (key === 'home' ? 'Shaunz Royale — Nightlife, Lounge & Celebrations in Akure' : ({ events: 'Events', book: 'Book Now', celebrations: 'Celebrations', track: 'Check Booking', info: 'Info' }[key] || '') + ' · Shaunz Royale');
  }
  $('#menuBtn').addEventListener('click', () => { const n = $('#nav'); const o = n.classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', o); });
  window.addEventListener('hashchange', route);

  const s = S(); $('#yr').textContent = new Date().getFullYear();
  $('#ftContact').innerHTML = '<li>' + esc(s.address) + '</li>' + (s.phone ? '<li><a href="tel:' + esc(s.phone.replace(/\s/g, '')) + '">' + esc(s.phone) + '</a></li>' : '') + (s.email ? '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></li>' : '') + (s.instagram ? '<li><a target="_blank" rel="noopener" href="' + esc(s.instagram) + '">Instagram</a></li>' : '') + '<li><a target="_blank" rel="noopener" href="' + mapsUrl + '">Directions</a></li>';
  route();
})();
