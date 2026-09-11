document.documentElement.classList.add("js");

const slides = [...document.querySelectorAll(".slide")];
const bar = document.getElementById("bar");
const hint = document.getElementById("hint");
const railBtns = [...document.querySelectorAll(".rail-btn")];
const box = document.getElementById("box");
const boxImg = box.querySelector("img");
const boxCap = document.getElementById("boxcap");
const veil = document.getElementById("veil");
const topbar = document.getElementById("topbar");
const tbNum = document.getElementById("tb-num");
const tbTitle = document.getElementById("tb-title");
const geo = document.getElementById("geo");

let current = 0;
let hintTimer = setTimeout(() => hint.classList.add("gone"), 9000);
let openSheet = null;

function setLocked(on) {
  document.documentElement.classList.toggle("locked", on);
  document.body.classList.toggle("locked", on);
  veil.classList.toggle("on", on);
}

function setChapter(slide) {
  const label = slide.dataset.ch;
  if (!label) {
    topbar.classList.add("hide");
    return;
  }
  const parts = label.split(" · ");
  tbNum.textContent = parts[0];
  tbTitle.textContent = parts.slice(1).join(" · ");
  topbar.classList.toggle("one", parts.length === 1);
  topbar.classList.remove("hide");
}

function setCurrent(i) {
  current = Math.max(0, Math.min(slides.length - 1, i));
  const slide = slides[current];
  const id = slide.id;
  const rail = slide.dataset.rail;
  railBtns.forEach((b) => {
    const key = (b.getAttribute("href") || "").replace("#", "");
    b.classList.toggle("on", key === id || key === rail);
  });
  bar.style.width = `${(current / (slides.length - 1)) * 100}%`;
  const paper = slide.classList.contains("light");
  document.body.classList.toggle("on-paper", paper);
  if (paper) hint.classList.add("gone");
  slide.querySelectorAll(".card").forEach((c) => c.classList.add("in"));
  if (geo && slide.contains(geo)) geo.classList.add("in");
  setChapter(slide);
}

function goTo(i) {
  const n = Math.max(0, Math.min(slides.length - 1, i));
  slides[n].scrollIntoView({ behavior: "smooth", block: "start" });
  setCurrent(n);
}

/* which slide sits under the 45% line of the viewport — works for tall slides too */
let scrollTick = false;
function trackSlide() {
  scrollTick = false;
  const probe = window.innerHeight * 0.45;
  for (let i = 0; i < slides.length; i++) {
    const r = slides[i].getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) {
      if (i !== current) setCurrent(i);
      return;
    }
  }
}
function onScroll() {
  if (scrollTick) return;
  scrollTick = true;
  requestAnimationFrame(trackSlide);
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);

/* reveal on scroll, staggered inside each .stagger group */
document.querySelectorAll(".stagger").forEach((group) => {
  [...group.querySelectorAll(":scope > .rise")].forEach((el, i) => {
    el.style.setProperty("--i", String(Math.min(i, 8)));
  });
});
const riseWatch = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        riseWatch.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
);
document.querySelectorAll(".rise").forEach((el) => riseWatch.observe(el));

/* numbers count up */
function fmt(n, dec, plain) {
  const fixed = n.toFixed(dec);
  const [int, frac] = fixed.split(".");
  const grouped = plain ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return frac ? `${grouped},${frac}` : grouped;
}
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const countWatch = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      countWatch.unobserve(el);
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.dec || "0", 10);
      const plain = "plain" in el.dataset;
      if (reduce || Number.isNaN(target)) {
        el.textContent = fmt(target, dec, plain);
        return;
      }
      const start = performance.now();
      const dur = 1300;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * eased, dec, plain);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll("[data-count]").forEach((el) => {
  el.textContent = "0";
  countWatch.observe(el);
});

function next(dir) {
  if (openSheet || !box.hidden) return;
  goTo(current + dir);
  hint.classList.add("gone");
  clearTimeout(hintTimer);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSheet();
    closeBox();
    return;
  }
  if (openSheet || !box.hidden) return;
  if (e.target && e.target.closest("details, summary")) return;
  if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
    e.preventDefault();
    next(1);
  }
  if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
    e.preventDefault();
    next(-1);
  }
});

function openSheetById(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (openSheet && openSheet !== el) {
    openSheet.classList.remove("show");
    openSheet.hidden = true;
  }
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  openSheet = el;
  setLocked(true);
}

function closeSheet() {
  if (!openSheet) return;
  openSheet.classList.remove("show");
  const el = openSheet;
  openSheet = null;
  if (box.hidden) setLocked(false);
  setTimeout(() => {
    if (!el.classList.contains("show")) el.hidden = true;
  }, 380);
}

document.querySelectorAll("[data-sheet]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openSheetById(btn.dataset.sheet);
  });
});
document.querySelectorAll(".sheet-x").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSheet();
    closeBox();
  });
});
veil.addEventListener("click", () => {
  closeSheet();
});

function openBox(src, cap) {
  if (!src || openSheet) return;
  boxImg.src = src;
  boxCap.textContent = cap || "";
  box.hidden = false;
  setLocked(true);
}
function closeBox() {
  if (box.hidden) return;
  box.hidden = true;
  boxImg.src = "";
  boxCap.textContent = "";
  if (!openSheet) setLocked(false);
}

document.querySelectorAll(".zoomable").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (openSheet || e.target.closest(".peek, a")) return;
    openBox(el.dataset.full || el.getAttribute("src"), el.dataset.cap);
  });
});

box.addEventListener("click", (e) => {
  if (e.target === box || e.target === boxImg || e.target === boxCap) closeBox();
});

/* deep links: ?go=d4, #d6, ?open=s2 */
const params = new URLSearchParams(location.search);
const start = params.get("go") || location.hash.replace("#", "");
if (start) {
  const i = slides.findIndex((s) => s.id === start || s.dataset.rail === start);
  if (i >= 0) {
    slides[i].scrollIntoView({ behavior: "auto", block: "start" });
    setCurrent(i);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => slides[i].scrollIntoView({ behavior: "auto", block: "start" }));
    }
  }
} else {
  setCurrent(0);
}
const open = params.get("open");
if (open) requestAnimationFrame(() => openSheetById(open));
