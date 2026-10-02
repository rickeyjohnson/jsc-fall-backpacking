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
// National Weather Service forecast (the source the park's weather page uses)
// for each campsite. A card shows that day's high and the overnight low at the
// spot where we sleep. NWS only forecasts about 7 days out, so until a day is
// covered the card shows the park's October averages instead.
(function () {
  const cards = [...document.querySelectorAll("[data-wx-day]")];
  const status = document.querySelector("[data-wx-status]");
  if (!cards.length) return;

  // NPS October averages (high / low): Gatlinburg vs. the crest
  const TYPICAL = {
    valley: { hi: 73, lo: 43, where: "Gatlinburg" },
    crest: { hi: 53, lo: 38, where: "the crest" },
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

  const dayLabel = (iso, offsetDays) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - offsetDays, 12)).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
    });
  };

  function showTypical(card) {
    const typical = TYPICAL[card.dataset.wxZone] || TYPICAL.valley;
    set(card, "cond", "Not forecast yet");
    set(card, "hi-label", "Typical high");
    set(card, "lo-label", "Typical low");
    set(card, "hi", `${typical.hi}°`);
    set(card, "lo", `${typical.lo}°`);
    set(card, "rain", "–");
    const note = card.querySelector('[data-wx="note"]');
    note.textContent = `The forecast posts around ${dayLabel(card.dataset.wxDay, 6)}. Until then, these are the park's October averages for ${typical.where}.`;
    note.hidden = false;
  }

  function showForecast(card, day, night) {
    const main = day || night;
    const pops = [day, night]
      .map((p) => p && p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value)
      .filter((v) => v != null);

    set(card, "cond", tidy(main.shortForecast));
    set(card, "hi-label", "High");
    set(card, "lo-label", "Overnight low");
    set(card, "hi", day ? `${day.temperature}°` : "–");
    set(card, "lo", night ? `${night.temperature}°` : "–");
    set(card, "rain", pops.length ? `${Math.max(...pops)}%` : "–");
    card.querySelector('[data-wx="icon"]').setAttribute("href", `#wx-${iconFor(tidy(main.shortForecast))}`);
    card.querySelector('[data-wx="note"]').hidden = true;
    card.classList.add("is-loaded");
  }

  async function forecastFor(card) {
    const point = await fetch(
      `https://api.weather.gov/points/${card.dataset.wxLat},${card.dataset.wxLon}`
    ).then((r) => r.json());
    const forecast = await fetch(point.properties.forecast).then((r) => r.json());
    return forecast.properties.periods;
  }

  Promise.all(
    cards.map((card) =>
      forecastFor(card).then((periods) => {
        const onDay = periods.filter((p) => p.startTime.slice(0, 10) === card.dataset.wxDay);
        const day = onDay.find((p) => p.isDaytime);
        const night = onDay.find((p) => !p.isDaytime);
        if (day || night) {
          showForecast(card, day, night);
          return true;
        }
        showTypical(card);
        return false;
      })
    )
  )
    .then((results) => {
      const now = new Date().toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      status.textContent = results.some(Boolean)
        ? `National Weather Service forecast, checked ${now}.`
        : `The trip is more than a week out, so these are the park's October averages. Checked ${now}.`;
    })
    .catch(() => {
      cards.forEach(showTypical);
      status.textContent = "Couldn't reach the National Weather Service right now, so these are the park's October averages.";
    });
})();
