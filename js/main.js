(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const el = $(a.getAttribute("href"));
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -90 }); }
    }));
  }

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const burger = $(".burger");
  if (burger) burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  function navUpdate(y) {
    if (nav) nav.classList.toggle("is-solid", y > 40);
  }
  const progress = $(".progress");
  const cssScrollTimeline = CSS.supports("animation-timeline: scroll()");

  /* ---------- split headings into words ---------- */
  function split(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(" "); return; }
            const w = document.createElement("span"); w.className = "sw";
            const s = document.createElement("span"); s.textContent = p; s.style.setProperty("--i", i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
    el.classList.add("is-split");
  }
  if (!reduce) $$("[data-split]").forEach(split);

  /* ---------- counters ---------- */
  function count(el) {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || "";
    const t0 = performance.now(), dur = 1800;
    const tick = (now) => {
      const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- reveal observer ---------- */
  const revealEls = $$(".rv, .is-split, .photo, [data-count], .steps");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("in");
      if (el.dataset.count && !el.dataset.done) { el.dataset.done = 1; count(el); }
      io.unobserve(el);
    }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => { if (!el.closest(".hero__copy")) io.observe(el); });
  } else revealEls.forEach((el) => el.classList.add("in"));
  // hero headline reveals on load
  setTimeout(() => $$(".hero__copy .is-split").forEach((el) => el.classList.add("in")), 350);

  /* steps fill fallback for browsers without view timelines */
  const steps = $(".steps");
  const viewTimeline = CSS.supports("animation-timeline: view()");

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) {
    $$(".btn, .nav__links a").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (el.closest(".nav__links") && (nav.classList.contains("open") || innerWidth <= 1020)) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.28, dy = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    /* spotlight cards */
    $$(".card, .plan").forEach((el) => el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    }));

    /* 3D tilt tiles with inner parallax */
    $$(".tile").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tx", (-py * 6).toFixed(2) + "deg");
        el.style.setProperty("--ty", (px * 8).toFixed(2) + "deg");
        el.style.setProperty("--px", (-px * 22).toFixed(1) + "px");
        el.style.setProperty("--py", (-py * 22).toFixed(1) + "px");
      });
      el.addEventListener("pointerleave", () => ["--tx", "--ty", "--px", "--py"].forEach((p) => el.style.removeProperty(p)));
    });
  }

  /* ---------- demo form + postcode ---------- */
  const form = $("#quoteForm");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = $("#sent");
    ok.style.display = "block";
    if (lenis) lenis.scrollTo(ok, { offset: -120 }); else ok.scrollIntoView({ behavior: "smooth", block: "center" });
    form.reset();
  });
  /* ---------- service area map + postcode check ---------- */
  const mapEl = $("#map");
  if (mapEl && window.L) {
    const L = window.L;
    const AREAS = [
      { id: "inner", name: "Inner West & City", c: [-33.888, 151.165], r: 6500, pc: [[2000, 2011], [2037, 2050], [2130, 2137], [2203, 2204]] },
      { id: "east", name: "Eastern Suburbs", c: [-33.905, 151.245], r: 5200, pc: [[2021, 2036]] },
      { id: "north", name: "North Shore", c: [-33.79, 151.17], r: 7500, pc: [[2060, 2077], [2110, 2122]] },
      { id: "beaches", name: "Northern Beaches", c: [-33.72, 151.285], r: 7000, pc: [[2084, 2108]] },
      { id: "hills", name: "Hills District", c: [-33.725, 150.985], r: 7000, pc: [[2125, 2126], [2153, 2158]] },
      { id: "west", name: "Parramatta & Western Sydney", c: [-33.8, 150.9], r: 13000, pc: [[2138, 2152], [2160, 2179], [2745, 2770]] },
      { id: "south", name: "St George & Sutherland Shire", c: [-33.995, 151.08], r: 8500, pc: [[2205, 2234]] }
    ];
    const HOME = [-33.84, 151.07];
    const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true }).setView(HOME, 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const base = { color: "#0b6a98", weight: 1.5, fillColor: "#8be0ff", fillOpacity: 0.28 };
    const on = { color: "#081423", weight: 2.5, fillColor: "#0b6a98", fillOpacity: 0.38 };
    const chips = $$("#areaList button");
    let active = null, pin = null;
    AREAS.forEach((a) => {
      a.layer = L.circle(a.c, { radius: a.r, ...base }).addTo(map);
      a.layer.bindTooltip(a.name, { direction: "top", className: "map-tip" });
      a.layer.on("mouseover", () => { if (a !== active) a.layer.setStyle({ fillOpacity: 0.45 }); });
      a.layer.on("mouseout", () => { if (a !== active) a.layer.setStyle(base); });
      a.layer.on("click", () => select(a));
    });
    function select(a, msg) {
      if (active) active.layer.setStyle(base);
      active = a;
      a.layer.setStyle(on);
      map.flyTo(a.c, a.r > 10000 ? 11 : 12, { duration: 1.2 });
      chips.forEach((b) => b.classList.toggle("is-on", b.dataset.area === a.id));
      $("#pcOut").textContent = msg || "We cover " + a.name + ". Book a free quote any time.";
    }
    chips.forEach((b) => b.addEventListener("click", () => select(AREAS.find((a) => a.id === b.dataset.area))));
    const pcForm = $("#pcForm");
    if (pcForm) pcForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#pcIn").value.trim(), n = +v;
      const out = $("#pcOut");
      if (pin) { map.removeLayer(pin); pin = null; }
      if (!/^\d{4}$/.test(v)) { out.textContent = "Enter a four-digit postcode, for example 2204."; return; }
      const hit = AREAS.find((a) => a.pc.some(([lo, hi]) => n >= lo && n <= hi));
      if (hit) {
        pin = L.marker(hit.c, { icon: L.divIcon({ className: "map-pin", iconSize: [22, 22] }) }).addTo(map);
        select(hit, "Good news: " + v + " is in our " + hit.name + " area.");
        return;
      }
      if (active) { active.layer.setStyle(base); active = null; chips.forEach((b) => b.classList.remove("is-on")); }
      const sydney = (n >= 2000 && n <= 2249) || (n >= 2555 && n <= 2574) || (n >= 2740 && n <= 2786);
      map.flyTo(HOME, 10, { duration: 1 });
      out.textContent = sydney
        ? v + " is in Greater Sydney. Give us a call and we'll confirm we can get to you."
        : "Sorry, " + v + " is outside our Sydney service area.";
    });
  }

  /* =========================================================
     WIND: trails advected through a curl-noise flow field,
     with drifting vortices and a cursor swirl
     ========================================================= */
  class Wind {
    constructor(canvas) {
      this.c = canvas; this.ctx = canvas.getContext("2d");
      this.mode = canvas.dataset.mode || "drift";
      this.agents = []; this.vort = []; this.t = Math.random() * 100;
      this.intensity = this.mode === "drift" ? 0.5 : 0;
      this.vent = { x: 0, y: 0, hw: 1 };
      this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0, on: false, lx: 0, ly: 0 };
      this.visible = true; this.F = [0, 0];
      this.rgb = this.mode === "vent" ? "175,230,255" : "139,224,255";
      this.resize();
      const host = canvas.closest("[data-wind-host]") || canvas.parentElement;
      host.addEventListener("pointermove", (e) => {
        const r = this.c.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top, m = this.mouse;
        if (m.on) { m.vx += ((x - m.lx) * 30 - m.vx) * 0.3; m.vy += ((y - m.ly) * 30 - m.vy) * 0.3; }
        m.x = x; m.y = y; m.lx = x; m.ly = y; m.on = true;
      }, { passive: true });
      host.addEventListener("pointerleave", () => { this.mouse.on = false; });
      new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }).observe(canvas);
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr;
      this.k = 7 / Math.max(700, this.w);
      this.target = this.mode === "vent" ? (this.w < 700 ? 150 : 300)
        : this.mode === "word" ? Math.round(clamp((this.w * this.h) / 700, 150, 480))
        : Math.round(clamp((this.w * this.h) / 8000, 30, 130));
    }
    spawn(a, fill) {
      const v = this.vent;
      if (this.mode === "vent") {
        a.x = v.x + (Math.random() * 2 - 1) * v.hw * 0.92; a.y = v.y + Math.random() * 4;
        a.vx = ((a.x - v.x) / v.hw) * 20; a.vy = 60 + Math.random() * 60;
        a.life = 2.8 + Math.random() * 3.6; a.max = 22 + (Math.random() * 20) | 0;
      } else if (this.mode === "word") {
        const m = this.mouse, near = m.on && Math.random() < 0.6;
        a.x = near ? m.x + (Math.random() - 0.5) * this.h * 2.2 : Math.random() * this.w;
        a.y = near ? m.y + (Math.random() - 0.5) * this.h : Math.random() * this.h;
        a.vx = 70; a.vy = 0; a.life = 2.4 + Math.random() * 3; a.max = 30 + (Math.random() * 30) | 0;
      } else {
        a.x = fill ? Math.random() * this.w : -30 - Math.random() * 60; a.y = Math.random() * this.h;
        a.vx = 40; a.vy = 0; a.life = 5 + Math.random() * 7; a.max = 26 + (Math.random() * 26) | 0;
      }
      a.trail = []; a.age = 0; a.dying = false;
      return a;
    }
    spawnVortex() {
      const I = this.intensity, s = Math.max(0.55, this.w / 1400);
      if (this.mode === "vent") {
        const v = this.vent;
        this.vort.push({ x: v.x + (Math.random() * 2 - 1) * v.hw * 0.8, y: v.y + 30 + Math.random() * 70,
          r: (40 + Math.random() * 70) * s, s: (Math.random() < 0.5 ? -1 : 1) * (200 + 300 * I),
          vx: 0, vy: 50 + 130 * I, life: 3.2 + Math.random() * 2.4, age: 0, a: 0 });
        const last = this.vort[this.vort.length - 1];
        last.vx = ((last.x - v.x) / v.hw) * 30;
      } else {
        this.vort.push({ x: Math.random() * this.w, y: Math.random() * this.h, r: (60 + Math.random() * 90) * s,
          s: (Math.random() < 0.5 ? -1 : 1) * 170, vx: 40, vy: 0, life: 4 + Math.random() * 4, age: 0, a: 0 });
      }
    }
    field(x, y) {
      const t = this.t, k = this.k, I = this.intensity, F = this.F;
      let vx = 0, vy = 0;
      const A = this.mode === "vent" ? 45 + 95 * I : 34;
      const a1 = x * k + t * 0.35, b1 = y * k * 1.3 - t * 0.27, c = (x * 0.7 - y) * k * 1.7 + t * 0.5;
      const dpx = Math.cos(a1) * Math.cos(b1) + 0.714 * Math.cos(c);
      const dpy = -1.3 * Math.sin(a1) * Math.sin(b1) - 1.02 * Math.cos(c);
      vx += dpy * A; vy -= dpx * A;
      if (this.mode === "vent") {
        const v = this.vent, dy = y - v.y;
        if (dy > -12) {
          const fall = Math.exp(-Math.max(dy, 0) / (this.h * 0.62));
          const lat = (x - v.x) / (v.hw * 1.35);
          const J = 130 + 330 * I;
          vy += J * fall * Math.exp(-lat * lat * 0.6);
          vx += lat * J * 0.3 * fall;
        }
        vy += 14;
      } else {
        vx += 46 + 30 * I; vy += Math.sin(t * 0.4 + y * 0.004) * 8;
      }
      for (const o of this.vort) {
        const dx = x - o.x, dy = y - o.y, f = (o.s * o.r * o.a) / (dx * dx + dy * dy + o.r * o.r);
        vx -= dy * f; vy += dx * f;
      }
      const m = this.mouse;
      if (m.on) {
        const dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy, R = 130;
        if (d2 < R * R * 6) {
          const g = Math.exp(-d2 / (2 * R * R));
          vx += m.vx * g * 0.8 - dy * g * 1.6; vy += m.vy * g * 0.8 + dx * g * 1.6;
        }
      }
      F[0] = vx; F[1] = vy;
      return F;
    }
    step(dt) {
      this.t += dt;
      this.mouse.vx *= 0.92; this.mouse.vy *= 0.92;
      const I = this.intensity;
      for (let i = this.vort.length - 1; i >= 0; i--) {
        const o = this.vort[i];
        o.age += dt; o.x += o.vx * dt; o.y += o.vy * dt;
        o.a = clamp(Math.min(o.age / 0.7, (o.life - o.age) / 0.9));
        if (o.age > o.life) this.vort.splice(i, 1);
      }
      if (this.mode === "word") this.intensity += ((this.mouse.on ? 1 : 0) - I) * Math.min(1, dt * (this.mouse.on ? 3 : 1.2));
      const wantV = this.mode === "vent" ? (I > 0.02 ? Math.round(4 + 5 * I) : 0) : this.mode === "word" ? (I > 0.05 ? 3 : 0) : 4;
      while (this.vort.length < wantV) this.spawnVortex();

      const want = this.mode === "drift" ? this.target : Math.round(this.target * clamp(I * (this.mode === "vent" ? 1.4 : 1)));
      let add = this.mode === "drift" ? want : this.mode === "word" ? 16 : 8;
      while (this.agents.length < want && add-- > 0) this.agents.push(this.spawn({}, this.mode !== "vent"));

      const ease = Math.min(1, dt * 2.6);
      for (let i = this.agents.length - 1; i >= 0; i--) {
        const a = this.agents[i];
        if (!a.dying) {
          const F = this.field(a.x, a.y);
          a.vx += (F[0] - a.vx) * ease; a.vy += (F[1] - a.vy) * ease;
          a.x += a.vx * dt; a.y += a.vy * dt;
          a.trail.push(a.x, a.y);
          if (a.trail.length > a.max * 2) a.trail.splice(0, 2);
          a.age += dt;
          if (a.age > a.life || a.y > this.h + 40 || a.y < -60 || a.x < -90 || a.x > this.w + 90) a.dying = true;
        } else {
          a.trail.splice(0, 4);
          if (a.trail.length < 4) {
            if (this.agents.length > want) this.agents.splice(i, 1); else this.spawn(a, false);
          }
        }
      }
    }
    draw() {
      const ctx = this.ctx, I = this.intensity;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      if (this.mode === "vent" && I > 0.01) {
        const v = this.vent, R = v.hw * 2.2;
        const g = ctx.createRadialGradient(v.x, v.y + R * 0.25, 0, v.x, v.y + R * 0.25, R);
        g.addColorStop(0, `rgba(139,224,255,${(0.1 + 0.16 * I).toFixed(3)})`);
        g.addColorStop(1, "rgba(139,224,255,0)");
        ctx.fillStyle = g; ctx.fillRect(v.x - R, v.y - R * 0.5, R * 2, R * 2);
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const B = 5, alpha = this.mode === "vent" ? 0.45 + 0.4 * I : this.mode === "word" ? 0.95 : 0.4;
      const lw = this.mode === "vent" ? Math.max(0.8, this.w / 1100) : this.mode === "word" ? 1.6 : 0.9;
      for (let b = 0; b < B; b++) {
        ctx.beginPath();
        for (const a of this.agents) {
          const n = a.trail.length >> 1;
          if (n < 2) continue;
          const i0 = Math.floor((b * n) / B), i1 = Math.min(n - 1, Math.floor(((b + 1) * n) / B));
          if (i1 <= i0) continue;
          ctx.moveTo(a.trail[i0 * 2], a.trail[i0 * 2 + 1]);
          for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(a.trail[i * 2], a.trail[i * 2 + 1]);
        }
        const f = (b + 1) / B;
        ctx.strokeStyle = `rgba(${this.rgb},${(alpha * f * f).toFixed(3)})`;
        ctx.lineWidth = (0.45 + 1.4 * f) * lw;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  const winds = reduce ? [] : $$("canvas.wind").map((c) => new Wind(c));

  /* footer wordmark: fit the SVG to its text, then wind blows inside the letters */
  const giantSvg = $(".giant");
  function fitGiant() {
    if (!giantSvg) return;
    const b = giantSvg.querySelector(".giant__base").getBBox();
    if (!b.width) return;
    giantSvg.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
    const fo = giantSvg.querySelector(".giant__fo");
    fo.setAttribute("x", b.x); fo.setAttribute("y", b.y);
    fo.setAttribute("width", b.width); fo.setAttribute("height", b.height);
    winds.filter((w) => w.mode === "word").forEach((w) => w.resize());
  }
  fitGiant();
  if (document.fonts) document.fonts.ready.then(fitGiant);
  const ventWind = winds.find((w) => w.mode === "vent");

  /* ---------- hero: the aircon ---------- */
  const hero = $("#hero");
  const ac = $("#ac");
  const acImg = $(".ac__img");
  const hint = $(".ac-hint");
  const chill = $("#heroChill");
  const ph = [$("#ph1"), $("#ph2"), $("#ph3")];
  const tIn = $("#tempIn"), gauge = $(".gauge__bar");
  let power = 0, turbo = 0, heroP = 0;

  if (ac) {
    setTimeout(() => { ac.classList.remove("is-off"); power = 1; }, reduce ? 0 : 700);
    const fire = () => {
      turbo = 4;
      ac.classList.add("is-turbo");
      if (hint) hint.style.opacity = 0;
    };
    ac.addEventListener("click", fire);
    ac.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } });
  }

  function heroUpdate(time, dt) {
    if (!hero) return;
    const range = hero.offsetHeight - innerHeight;
    heroP = clamp(window.scrollY / range);
    const e = heroP;
    if (turbo > 0) { turbo -= dt; if (turbo <= 0) ac.classList.remove("is-turbo"); }
    const boost = turbo > 0 ? 1 : 0;
    if (ventWind) {
      const target = power * Math.max(boost, 0.5 + 0.5 * smooth(0, 0.6, e));
      ventWind.intensity += (target - ventWind.intensity) * Math.min(1, dt * (power ? 1.4 : 4));
      // the louvre sits along the bottom of the photo: centre 50%, 87% of its width, flap edge at 96% of its height
      const cr = ventWind.c.getBoundingClientRect(), ir = acImg.getBoundingClientRect();
      if (ir.width) {
        ventWind.vent.x = ir.left - cr.left + ir.width * 0.503;
        ventWind.vent.y = ir.top - cr.top + ir.height * 0.96;
        ventWind.vent.hw = ir.width * 0.42;
      } else { // aircon hidden on phones: air pours in from the top of the screen
        ventWind.vent.x = cr.width / 2;
        ventWind.vent.y = 70;
        ventWind.vent.hw = cr.width * 0.46;
      }
    }
    if (reduce) return;
    // the unit grows slightly as you scroll
    ac.style.setProperty("--s", (1 + 0.14 * smooth(0, 0.7, e)).toFixed(4));
    ac.style.setProperty("--ty", (-e * 26).toFixed(1) + "px");
    // room temperature
    const temp = Math.round(34 - 12 * smooth(0.3, 0.7, e));
    if (tIn) tIn.textContent = temp + "°";
    if (gauge) gauge.style.setProperty("--cool", smooth(0.3, 0.7, e).toFixed(3));
    chill.style.opacity = (0.9 * smooth(0.08, 0.7, e)).toFixed(3);
    if (hint) hint.style.opacity = turbo > 0 ? 0 : (1 - smooth(0.05, 0.15, e)).toFixed(2);
    // copy phases
    const o = [
      1 - smooth(0.14, 0.28, e),
      smooth(0.3, 0.42, e) * (1 - smooth(0.68, 0.8, e)),
      smooth(0.82, 0.92, e)
    ];
    ph.forEach((el, i) => {
      el.style.opacity = o[i];
      el.style.visibility = o[i] < 0.01 ? "hidden" : "visible";
      el.style.transform = i === 0 ? `translateY(${(-e * 110).toFixed(1)}px)` : `translateY(${((1 - o[i]) * 40).toFixed(1)}px)`;
    });
  }

  /* ---------- main loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const y = window.scrollY;
    navUpdate(y);
    if (progress && !cssScrollTimeline) progress.style.setProperty("--sp", clamp(y / (document.body.scrollHeight - innerHeight)));
    if (steps && !viewTimeline) {
      const r = steps.getBoundingClientRect();
      steps.style.setProperty("--fill", clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.6)).toFixed(3));
    }
    heroUpdate(now, dt);
    for (const w of winds) if (w.visible) { w.step(dt); w.draw(); }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", () => winds.forEach((w) => w.resize()));
  requestAnimationFrame(frame);
})();
