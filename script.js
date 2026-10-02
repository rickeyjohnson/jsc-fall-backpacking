// ---------- Nav ----------
// Transparent while the hero is on screen, solid after. Marks the link for
// the section being read, and runs the small-screen menu.
(function () {
  const nav = document.getElementById("nav");
  const hero = document.getElementById("top");
  if (!nav || !hero) return;

  const menuBtn = nav.querySelector(".nav__menu-btn");
  const menu = document.getElementById("nav-menu");

  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      const open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        closeMenu();
        menuBtn.focus();
      }
    });
  }

  if (!("IntersectionObserver" in window)) return;

  new IntersectionObserver(
    ([entry]) => nav.classList.toggle("is-top", entry.isIntersecting),
    { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px` }
  ).observe(hero);

  // section id -> every nav link pointing at it (bar links + menu links)
  const links = new Map();
  nav.querySelectorAll('a[href^="#"]:not(.nav__pill):not(.nav__brand)').forEach((a) => {
    const id = a.hash.slice(1);
    if (!links.has(id)) links.set(id, []);
    links.get(id).push(a);
  });

  const clearCurrent = () =>
    links.forEach((list) => list.forEach((a) => a.removeAttribute("aria-current")));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        clearCurrent();
        links.get(entry.target.id).forEach((a) => a.setAttribute("aria-current", "true"));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
})();

// ---------- Packing list ----------
// Checkmarks live in this browser only (localStorage), so each person
// tracks their own packing.
(function () {
  const KEY = "jsc-fall-2026-gear";
  const boxes = [...document.querySelectorAll("input[data-gear]")];
  if (!boxes.length) return;

  const countEl = document.querySelector("[data-gear-count]");
  const totalEl = document.querySelector("[data-gear-total]");
  const barEl = document.querySelector("[data-gear-bar]");
  const progressEl = document.querySelector(".progress");
  const resetBtn = document.querySelector("[data-gear-reset]");
  const required = boxes.filter((b) => b.closest("[data-required]"));

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    saved = {};
  }

  function save() {
    const state = {};
    boxes.forEach((b) => {
      if (b.checked) state[b.dataset.gear] = true;
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable: checkmarks just won't persist */
    }
  }

  function render() {
    const done = required.filter((b) => b.checked).length;
    countEl.textContent = done;
    totalEl.textContent = required.length;
    barEl.style.width = `${(done / required.length) * 100}%`;
    progressEl.classList.toggle("is-done", done === required.length);
  }

  boxes.forEach((b) => {
    b.checked = Boolean(saved[b.dataset.gear]);
    b.addEventListener("change", () => {
      save();
      render();
    });
  });

  resetBtn.addEventListener("click", () => {
    boxes.forEach((b) => (b.checked = false));
    save();
    render();
  });

  render();
})();

// ---------- Weather ----------
// Forecast for each campsite. Uses the National Weather Service (the source the
// park's weather page uses) once it covers the date, which is about 7 days out.
// Before that, Open-Meteo's longer-range forecast fills in. The park's October
// averages only show if neither service can be reached.
(function () {
  const cards = [...document.querySelectorAll("[data-wx-day]")];
  const status = document.querySelector("[data-wx-status]");
  if (!cards.length) return;

  // NPS October averages (high / low): Gatlinburg vs. the crest
  const TYPICAL = {
    valley: { hi: 73, lo: 43, where: "Gatlinburg" },
    crest: { hi: 53, lo: 38, where: "the crest" },
  };

  // Open-Meteo uses WMO weather codes
  const WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
    45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorms", 96: "Thunderstorms with hail", 99: "Thunderstorms with hail",
  };

  const set = (card, key, text) => {
    const el = card.querySelector(`[data-wx="${key}"]`);
    if (el) el.textContent = text;
  };

  // NWS gives phrases like "Slight Chance Showers And Thunderstorms then Mostly Cloudy".
  // Keep the first part, in sentence case.
  const tidy = (text) => {
    const first = text.split(" then ")[0].toLowerCase();
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  function iconFor(text) {
    const t = text.toLowerCase();
    if (t.includes("thunder")) return "storm";
    if (/snow|flurr|sleet|ice/.test(t)) return "snow";
    if (/rain|shower|drizzle/.test(t)) return "rain";
    if (/fog|haze|smoke/.test(t)) return "fog";
    if (/partly|mostly cloudy/.test(t)) return "partly";
    if (/cloudy|overcast/.test(t)) return "cloud";
    if (/sunny|clear/.test(t)) return "sun";
    return "cloud";
  }

  const deg = (v) => (v == null ? "–" : `${Math.round(v)}°`);
  const pct = (v) => (v == null ? "–" : `${Math.round(v)}%`);

  const nextDay = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  };

  function render(card, { cond, hi, lo, rain, note }) {
    set(card, "cond", cond);
    set(card, "hi-label", "High");
    set(card, "lo-label", "Overnight low");
    set(card, "hi", hi);
    set(card, "lo", lo);
    set(card, "rain", rain);
    card.querySelector('[data-wx="icon"]').setAttribute("href", `#wx-${iconFor(cond)}`);
    const noteEl = card.querySelector('[data-wx="note"]');
    noteEl.textContent = note || "";
    noteEl.hidden = !note;
    card.classList.add("is-loaded");
  }

  function showTypical(card) {
    const typical = TYPICAL[card.dataset.wxZone] || TYPICAL.valley;
    set(card, "cond", "Forecast unavailable");
    set(card, "hi-label", "Typical high");
    set(card, "lo-label", "Typical low");
    set(card, "hi", `${typical.hi}°`);
    set(card, "lo", `${typical.lo}°`);
    set(card, "rain", "–");
    const note = card.querySelector('[data-wx="note"]');
    note.textContent = `The park's October averages for ${typical.where}.`;
    note.hidden = false;
  }

  // National Weather Service: true if it covered this card's date
  async function tryNWS(card) {
    const point = await fetch(
      `https://api.weather.gov/points/${card.dataset.wxLat},${card.dataset.wxLon}`
    ).then((r) => r.json());
    const forecast = await fetch(point.properties.forecast).then((r) => r.json());
    const onDay = forecast.properties.periods.filter(
      (p) => p.startTime.slice(0, 10) === card.dataset.wxDay
    );
    const day = onDay.find((p) => p.isDaytime);
    const night = onDay.find((p) => !p.isDaytime);
    if (!day && !night) return false;

    const pops = [day, night]
      .map((p) => p && p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value)
      .filter((v) => v != null);
    render(card, {
      cond: tidy((day || night).shortForecast),
      hi: day ? deg(day.temperature) : "–",
      lo: night ? deg(night.temperature) : "–",
      rain: pops.length ? pct(Math.max(...pops)) : "–",
    });
    return true;
  }

  // Open-Meteo: one request for every card NWS didn't cover yet
  async function fillWithOpenMeteo(list) {
    const days = list.map((c) => c.dataset.wxDay).sort();
    const params = new URLSearchParams({
      latitude: list.map((c) => c.dataset.wxLat).join(","),
      longitude: list.map((c) => c.dataset.wxLon).join(","),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      temperature_unit: "fahrenheit",
      timezone: "America/New_York",
      start_date: days[0],
      end_date: nextDay(days[days.length - 1]),
    });
    const data = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`).then((r) => r.json());
    const results = Array.isArray(data) ? data : [data];
    if (data.error || results.length !== list.length) throw new Error(data.reason || "Bad response");

    list.forEach((card, n) => {
      const daily = results[n].daily;
      const i = daily.time.indexOf(card.dataset.wxDay);
      if (i < 0) throw new Error("Date not covered");
      render(card, {
        cond: WMO[daily.weather_code[i]] || "Cloudy",
        hi: deg(daily.temperature_2m_max[i]),
        lo: deg(daily.temperature_2m_min[i + 1]),
        rain: pct(daily.precipitation_probability_max[i]),
        note: "Early forecast from Open-Meteo. The National Weather Service takes over about a week out.",
      });
    });
  }

  (async function () {
    const covered = await Promise.all(cards.map((card) => tryNWS(card).catch(() => false)));
    const missing = cards.filter((_, i) => !covered[i]);
    let usedOpenMeteo = false;

    if (missing.length) {
      try {
        await fillWithOpenMeteo(missing);
        usedOpenMeteo = true;
      } catch (e) {
        missing.forEach(showTypical);
      }
    }

    const now = new Date().toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    const sources = [
      covered.some(Boolean) && "the National Weather Service",
      usedOpenMeteo && "Open-Meteo",
    ].filter(Boolean);
    status.textContent = sources.length
      ? `Forecast from ${sources.join(" and ")}, checked ${now}.`
      : "Couldn't reach a forecast service right now, so these are the park's October averages.";
  })();
})();
