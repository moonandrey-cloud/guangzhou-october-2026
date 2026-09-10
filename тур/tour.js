document.documentElement.classList.add("js");

const slides = [...document.querySelectorAll(".slide")];
const bar = document.getElementById("bar");
const hint = document.getElementById("hint");
const railBtns = [...document.querySelectorAll(".rail-btn")];
const box = document.getElementById("box");
const boxImg = box.querySelector("img");
const veil = document.getElementById("veil");

let current = 0;
let hintTimer = setTimeout(() => hint.classList.add("gone"), 8000);
let openSheet = null;

function setLocked(on) {
  document.documentElement.classList.toggle("locked", on);
  document.body.classList.toggle("locked", on);
  veil.classList.toggle("on", on);
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
  slide.querySelectorAll(".reveal").forEach((c) => c.classList.add("in"));
}

function goTo(i) {
  const n = Math.max(0, Math.min(slides.length - 1, i));
  slides[n].scrollIntoView({ behavior: "smooth", block: "start" });
  setCurrent(n);
}

const watch = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) setCurrent(slides.indexOf(e.target));
    });
  },
  { threshold: 0.45 }
);
slides.forEach((s) => watch.observe(s));

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

function openBox(src) {
  if (!src || openSheet) return;
  boxImg.src = src;
  box.hidden = false;
  setLocked(true);
}
function closeBox() {
  if (box.hidden) return;
  box.hidden = true;
  boxImg.src = "";
  if (!openSheet) setLocked(false);
}

document.querySelectorAll(".zoomable").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (openSheet || e.target.closest(".peek")) return;
    openBox(el.dataset.full || el.getAttribute("src"));
  });
});

box.addEventListener("click", (e) => {
  if (e.target === box || e.target === boxImg) closeBox();
});

const params = new URLSearchParams(location.search);
const start = params.get("go") || location.hash.replace("#", "");
if (start) {
  const i = slides.findIndex((s) => s.id === start || s.dataset.rail === start);
  if (i >= 0) {
    slides[i].scrollIntoView({ behavior: "auto", block: "start" });
    setCurrent(i);
  }
} else {
  setCurrent(0);
}
const open = params.get("open");
if (open) requestAnimationFrame(() => openSheetById(open));
