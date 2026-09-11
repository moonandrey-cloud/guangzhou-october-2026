document.documentElement.classList.add("js");

const bar = document.getElementById("bar");
const hint = document.getElementById("hint");
const box = document.getElementById("box");
const boxImg = box.querySelector("img");
const veil = document.getElementById("veil");

let slides = [];
let current = 0;
let hintTimer = setTimeout(() => hint.classList.add("gone"), 8000);
let openSheet = null;
let albumPlace = null;
let mode = "work";
const boxCap = box.querySelector(".box-cap");
const boxPrev = box.querySelector(".box-prev");
const boxNext = box.querySelector(".box-next");

function visibleSlides() {
  return [...document.querySelectorAll(".slide")].filter((s) => {
    const ch = s.dataset.chapter;
    return !ch || ch === "all" || ch === mode;
  });
}

function setLocked(on) {
  document.documentElement.classList.toggle("locked", on);
  document.body.classList.toggle("locked", on);
  veil.classList.toggle("on", on);
}

function setCurrent(i) {
  slides = visibleSlides();
  if (!slides.length) return;
  current = Math.max(0, Math.min(slides.length - 1, i));
  const slide = slides[current];
  const id = slide.id;
  const rail = slide.dataset.rail;
  document.querySelectorAll(".rail-btn").forEach((b) => {
    const key = (b.getAttribute("href") || "").replace("#", "");
    b.classList.toggle("on", key === id || key === rail);
  });
  bar.style.width = slides.length > 1 ? `${(current / (slides.length - 1)) * 100}%` : "0";
  document.body.classList.toggle("on-paper", slide.classList.contains("light"));
  if (slide.classList.contains("light")) hint.classList.add("gone");
  slide.querySelectorAll(".card").forEach((c) => c.classList.add("in"));
  slide.querySelectorAll(".reveal").forEach((c) => c.classList.add("in"));
}

function goTo(i) {
  slides = visibleSlides();
  const n = Math.max(0, Math.min(slides.length - 1, i));
  slides[n].scrollIntoView({ behavior: "smooth", block: "start" });
  setCurrent(n);
}

function setMode(next, jumpId) {
  mode = next;
  document.body.dataset.mode = next;
  document.querySelectorAll(".chapters button").forEach((b) => {
    b.classList.toggle("on", b.dataset.mode === next);
  });
  document.querySelectorAll(".rail").forEach((r) => {
    r.hidden = r.dataset.for !== next;
  });
  slides = visibleSlides();
  if (jumpId) {
    const el = document.getElementById(jumpId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  requestAnimationFrame(() => {
    slides = visibleSlides();
    const i = jumpId ? slides.findIndex((s) => s.id === jumpId) : 0;
    setCurrent(i >= 0 ? i : 0);
  });
}

document.querySelectorAll(".chapters button, .door").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const next = btn.dataset.mode;
    if (!next) return;
    setMode(next, btn.dataset.jump || (next === "nature" ? "n-map" : "map"));
  });
});

const watch = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const list = visibleSlides();
      const i = list.indexOf(e.target);
      if (i >= 0) setCurrent(i);
    });
  },
  { threshold: 0.45 }
);
document.querySelectorAll(".slide").forEach((s) => watch.observe(s));

function next(dir) {
  if (openSheet || !box.hidden) return;
  goTo(current + dir);
  hint.classList.add("gone");
  clearTimeout(hintTimer);
}

function placeOf(el) {
  return el ? el.closest(".place") : null;
}

function filmButtons(place) {
  return [...place.querySelectorAll(".film button")];
}

function setShot(place, index) {
  const btns = filmButtons(place);
  if (!btns.length) return;
  const i = (index + btns.length) % btns.length;
  const btn = btns[i];
  btns.forEach((b) => b.classList.toggle("on", b === btn));
  const src = btn.dataset.src;
  const cap = btn.dataset.cap || "";
  const stage = place.querySelector(".album-stage");
  if (stage) {
    if (stage.tagName === "IMG") stage.src = src;
    else stage.style.backgroundImage = `url('${src}')`;
    stage.dataset.full = src;
    const frame = stage.closest(".shot");
    if (frame) frame.dataset.full = src;
  }
  const label = place.querySelector(".album-cap");
  if (label) {
    const num = label.querySelector("b");
    const text = label.querySelector("span");
    if (num) num.textContent = `${i + 1} / ${btns.length}`;
    if (text) text.textContent = cap;
  }
  return { src, cap, index: i, total: btns.length };
}

function currentShot(place) {
  const btns = filmButtons(place);
  const i = Math.max(0, btns.findIndex((b) => b.classList.contains("on")));
  const btn = btns[i];
  return btn ? { src: btn.dataset.src, cap: btn.dataset.cap || "", index: i, total: btns.length } : null;
}

function stepAlbum(place, dir) {
  if (!place) return null;
  const now = currentShot(place);
  if (!now) return null;
  return setShot(place, now.index + dir);
}

document.querySelectorAll(".place").forEach((place) => {
  place.querySelectorAll(".film button").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setShot(place, i);
    });
  });
  const stage = place.querySelector(".album-stage");
  if (stage) {
    stage.classList.add("zoomable");
    stage.dataset.full = filmButtons(place)[0]?.dataset.src || "";
    let x = null;
    place.addEventListener("touchstart", (e) => {
      if (e.target.closest(".card, .peek, .out, .film")) return;
      x = e.changedTouches[0].clientX;
    }, { passive: true });
    place.addEventListener("touchend", (e) => {
      if (x == null) return;
      const dx = e.changedTouches[0].clientX - x;
      if (Math.abs(dx) > 40) stepAlbum(place, dx < 0 ? 1 : -1);
      x = null;
    });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSheet();
    closeBox();
    return;
  }
  if (!box.hidden && albumPlace) {
    if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
      e.preventDefault();
      showBoxShot(stepAlbum(albumPlace, 1));
    }
    if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      showBoxShot(stepAlbum(albumPlace, -1));
    }
    return;
  }
  if (openSheet || !box.hidden) return;
  const place = slides[current] && placeOf(slides[current]);
  if (place && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    stepAlbum(place, e.key === "ArrowRight" ? 1 : -1);
    return;
  }
  if (["ArrowDown", "PageDown", " "].includes(e.key)) {
    e.preventDefault();
    next(1);
  }
  if (["ArrowUp", "PageUp"].includes(e.key)) {
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

function showBoxShot(shot) {
  if (!shot) return;
  boxImg.src = shot.src;
  if (boxCap) boxCap.textContent = shot.cap || "";
}

function openBox(src, place) {
  if (openSheet) return;
  albumPlace = place || null;
  const shot = place ? currentShot(place) || { src, cap: "" } : { src, cap: "" };
  if (!shot.src) return;
  showBoxShot(shot);
  box.hidden = false;
  if (boxPrev) boxPrev.hidden = !place;
  if (boxNext) boxNext.hidden = !place;
  setLocked(true);
}
function closeBox() {
  if (box.hidden) return;
  box.hidden = true;
  boxImg.src = "";
  albumPlace = null;
  if (boxCap) boxCap.textContent = "";
  if (!openSheet) setLocked(false);
}

document.querySelectorAll(".zoomable").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (openSheet || e.target.closest(".peek") || e.target.closest(".door") || e.target.closest(".film")) return;
    openBox(el.dataset.full || el.getAttribute("src"), placeOf(el));
  });
});

if (boxPrev) {
  boxPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    showBoxShot(stepAlbum(albumPlace, -1));
  });
}
if (boxNext) {
  boxNext.addEventListener("click", (e) => {
    e.stopPropagation();
    showBoxShot(stepAlbum(albumPlace, 1));
  });
}

let touchX = null;
box.addEventListener("touchstart", (e) => {
  touchX = e.changedTouches[0].clientX;
}, { passive: true });
box.addEventListener("touchend", (e) => {
  if (touchX == null || !albumPlace) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) showBoxShot(stepAlbum(albumPlace, dx < 0 ? 1 : -1));
  touchX = null;
});

box.addEventListener("click", (e) => {
  if (e.target === box || e.target === boxImg) closeBox();
});

const hash = location.hash.replace("#", "");
const natureIds = ["n-map", "n-want", "pillars", "tianmen", "river", "mountains", "mtnb", "riverb"];
if (natureIds.includes(hash)) {
  const jump = hash === "mountains" || hash === "mtnb" ? "tianmen" : hash === "riverb" ? "river" : hash;
  setMode("nature", jump);
} else {
  setMode("work", hash || "cover");
}
