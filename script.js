// Nav: transparent while the hero is on screen, solid after.
// Also marks the nav link for the section currently being read.
(function () {
  const nav = document.getElementById("nav");
  const hero = document.getElementById("top");
  if (!nav || !hero || !("IntersectionObserver" in window)) return;

  new IntersectionObserver(
    ([entry]) => nav.classList.toggle("is-top", entry.isIntersecting),
    { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px` }
  ).observe(hero);

  const links = new Map(
    [...nav.querySelectorAll('a[href^="#"]:not(.nav__pill)')].map((a) => [a.hash.slice(1), a])
  );

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          link.setAttribute("aria-current", "true");
        } else if (link.getAttribute("aria-current")) {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
})();
