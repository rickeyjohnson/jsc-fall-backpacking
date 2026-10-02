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
// Live forecast from Open-Meteo for each camp. Each card shows that day's high
// and the next morning's low at the spot where we sleep.
(function () {
  const cards = [...document.querySelectorAll("[data-wx-day]")];
  const status = document.querySelector("[data-wx-status]");
  if (!cards.length) return;

  // Order matters: data-wx-loc on each card indexes into this list.
  const places = [
    { name: "Elkmont", lat: 35.6537, lon: -83.5802 },
    { name: "Campsite #26", lat: 35.6094, lon: -83.592 },
    { name: "Double Spring Gap", lat: 35.5653, lon: -83.5426 },
    { name: "Campsite #24", lat: 35.6158, lon: -83.5297 },
  ];

  const CONDITIONS = {
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

  function fallback(message) {
    cards.forEach((card) => {
      set(card, "cond", "Forecast not out yet");
      set(card, "hi", "–");
      set(card, "lo", "–");
      set(card, "rain", "–");
    });
    status.textContent = message;
  }

  const params = new URLSearchParams({
    latitude: places.map((p) => p.lat).join(","),
    longitude: places.map((p) => p.lon).join(","),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timezone: "America/New_York",
    start_date: "2026-10-10",
    end_date: "2026-10-14",
  });

  fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data)) throw new Error(data.reason || "Unexpected response");

      cards.forEach((card) => {
        const daily = data[Number(card.dataset.wxLoc)].daily;
        const i = daily.time.indexOf(card.dataset.wxDay);
        if (i < 0) return;

        const hi = daily.temperature_2m_max[i];
        const lo = daily.temperature_2m_min[i + 1];
        const rain = daily.precipitation_probability_max[i];

        set(card, "cond", CONDITIONS[daily.weather_code[i]] || "–");
        set(card, "hi", hi == null ? "–" : `${Math.round(hi)}°`);
        set(card, "lo", lo == null ? "–" : `${Math.round(lo)}°`);
        set(card, "rain", rain == null ? "–" : `${rain}%`);
      });

      const now = new Date().toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      status.textContent = `Forecast from Open-Meteo, checked ${now}.`;
    })
    .catch(() => {
      fallback("The live forecast isn't available right now. It covers about two weeks ahead, so until then use the October averages below.");
    });
})();
