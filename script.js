(function () {
  "use strict";

  const THEME_KEY = "rabrezerv-theme";

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }

  function setStoredTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    if (stored === "light" || stored === "dark") {
      applyTheme(stored);
      return;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      applyTheme("light");
    }
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const next = isLight ? "dark" : "light";
      applyTheme(next);
      setStoredTheme(next);
    });
  }

  initTheme();

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const navToggle = document.getElementById("nav-toggle");
  const siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    siteNav.querySelectorAll("a[href^='#']").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const sectionIds = [
    "services",
    "calculator",
    "prices",
    "why",
    "game-block",
    "faq",
    "form",
    "reviews"
  ];

  const navLinks = document.querySelectorAll(".site-nav a[data-nav]");
  function setActiveNav(id) {
    navLinks.forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === id);
    });
  }

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveNav(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.35] }
    );
    sections.forEach((el) => observer.observe(el));
  }

  const reviewsTrack = document.getElementById("reviews-track");
  const reviewsStack = document.getElementById("reviews-stack");
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Колода следует скроллу страницы только когда пользователь «в контакте» со стопкой:
   * наведение мыши (десктоп) или касание/удержание (тач).
   * Иначе страница листается как обычно, прогресс колоды не уезжает.
   */
  let reviewsHoverInStack = false;
  let reviewsFingerOnStack = false;
  /** Пока дорожка отзывов в viewport — листаем колоду от скролла (иначе внизу страницы без hover/тача анимация «замирает»). */
  let reviewsTrackInView = false;
  let reviewsPLast = 0;

  function reviewsStackEngaged() {
    return reviewsHoverInStack || reviewsFingerOnStack || reviewsTrackInView;
  }

  function updateReviewsScroll() {
    if (!reviewsTrack || prefersReducedMotion) return;
    const cards = reviewsTrack.querySelectorAll(".review-card");
    if (!cards.length) return;

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const rect = reviewsTrack.getBoundingClientRect();
    const trackTop = scrollY + rect.top;
    const trackHeight = reviewsTrack.offsetHeight;
    const vh = window.innerHeight;

    /* Анимация карточек только когда блок уже «сел» в окне (заголовок в кадре), не сразу при появлении */
    const progress0 = trackTop - vh * 0.38;
    const progress1 = trackTop + trackHeight - vh;
    let pFromScroll = (scrollY - progress0) / (progress1 - progress0);
    if (pFromScroll < 0) pFromScroll = 0;
    if (pFromScroll > 1) pFromScroll = 1;

    let p;
    if (reviewsStackEngaged()) {
      p = pFromScroll;
      reviewsPLast = pFromScroll;
    } else {
      p = reviewsPLast;
    }

    const n = cards.length;
    const stackStepPx = 11;
    const panelFadeStart = 0.14;
    const zPeek = 0.07;

    function ramp(t, a, b) {
      if (t <= a) return 0;
      if (t >= b) return 1;
      return (t - a) / (b - a);
    }

    const locals = [];
    for (let i = 0; i < n; i += 1) {
      const start = i / (n + 1);
      const end = (i + 1) / (n + 1);
      let li = (p - start) / (end - start);
      if (li < 0) li = 0;
      if (li > 1) li = 1;
      locals.push(li);
    }

    let activeI = -1;
    for (let i = 0; i < n; i += 1) {
      if (locals[i] < 1) {
        activeI = i;
        break;
      }
    }

    const textOutEnd = 0.42;
    const textInStart = 0.02;
    const textInEnd = 0.36;

    cards.forEach((card, index) => {
      const local = locals[index];

      const stackYpx = stackStepPx * index * (1 - local);
      const yPct = -180 * local;
      const rotX = 12 * (1 - local);
      const scale = 0.93 + 0.07 * local;
      card.style.transform = `rotateX(${rotX}deg) translateY(${stackYpx}px) translateY(${yPct}%) scale(${scale})`;

      let textOp = 0;
      if (activeI >= 0) {
        if (index === activeI && local < 1) {
          textOp = 1 - ramp(local, 0, textOutEnd);
        } else if (index === activeI + 1 && index < n) {
          textOp = ramp(locals[activeI], textInStart, textInEnd);
        }
      }
      card.style.setProperty("--review-text-op", String(textOp));

      if (local >= 1) {
        card.style.opacity = "0";
        card.style.visibility = "hidden";
        card.style.pointerEvents = "none";
        card.style.zIndex = "-1";
        card.setAttribute("aria-hidden", "true");
        card.style.setProperty("--review-text-op", "0");
      } else {
        card.style.visibility = "visible";
        card.style.pointerEvents = textOp > 0.08 ? "auto" : "none";
        card.removeAttribute("aria-hidden");

        const zBase = 10 + (n - index);
        const zDrop = local > zPeek && local < 1;
        let zVal;
        if (activeI === index) {
          zVal = 40 + (n - index);
        } else {
          zVal = zDrop ? index : zBase;
        }
        card.style.zIndex = String(zVal);

        let panelOpacity = 1;
        if (local > panelFadeStart) {
          panelOpacity = 1 - (local - panelFadeStart) / (1 - panelFadeStart);
        }
        card.style.opacity = String(panelOpacity);
      }
    });
  }

  if (reviewsTrack && !prefersReducedMotion) {
    let reviewsTicking = false;
    function onReviewsScroll() {
      if (!reviewsTicking) {
        reviewsTicking = true;
        requestAnimationFrame(() => {
          updateReviewsScroll();
          reviewsTicking = false;
        });
      }
    }
    window.addEventListener("scroll", onReviewsScroll, { passive: true });
    window.addEventListener("resize", onReviewsScroll);

    if ("IntersectionObserver" in window) {
      const reviewsVisibilityObserver = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          reviewsTrackInView = Boolean(e && e.isIntersecting);
          updateReviewsScroll();
        },
        { threshold: [0, 0.02, 0.08] }
      );
      reviewsVisibilityObserver.observe(reviewsTrack);
    }

    if (reviewsStack) {
      reviewsStack.addEventListener("mouseenter", () => {
        reviewsHoverInStack = true;
        updateReviewsScroll();
      });
      reviewsStack.addEventListener("mouseleave", () => {
        reviewsHoverInStack = false;
        updateReviewsScroll();
      });

      let fingerDocListeners = false;
      function endFingerOnStack() {
        reviewsFingerOnStack = false;
        if (fingerDocListeners) {
          document.removeEventListener("pointerup", endFingerOnStack);
          document.removeEventListener("pointercancel", endFingerOnStack);
          fingerDocListeners = false;
        }
        updateReviewsScroll();
      }

      reviewsStack.addEventListener(
        "pointerdown",
        () => {
          reviewsFingerOnStack = true;
          if (!fingerDocListeners) {
            fingerDocListeners = true;
            document.addEventListener("pointerup", endFingerOnStack);
            document.addEventListener("pointercancel", endFingerOnStack);
          }
          updateReviewsScroll();
        },
        { capture: true }
      );

      if (typeof PointerEvent === "undefined") {
        reviewsStack.addEventListener(
          "touchstart",
          () => {
            reviewsFingerOnStack = true;
            updateReviewsScroll();
          },
          { passive: true }
        );
        document.addEventListener(
          "touchend",
          () => {
            reviewsFingerOnStack = false;
            updateReviewsScroll();
          },
          { passive: true }
        );
        document.addEventListener(
          "touchcancel",
          () => {
            reviewsFingerOnStack = false;
            updateReviewsScroll();
          },
          { passive: true }
        );
      }
    }
    updateReviewsScroll();
  }

  const hoursInput = document.getElementById("calc-hours");
  const calcTotal = document.getElementById("calc-total");
  const rateInputs = document.querySelectorAll('input[name="rate"]');

  function updateCalculator() {
    if (!hoursInput || !calcTotal) return;
    let hours = parseInt(hoursInput.value, 10);
    if (Number.isNaN(hours) || hours < 1) hours = 1;
    if (hours > 720) hours = 720;
    hoursInput.value = String(hours);

    let rate = 400;
    rateInputs.forEach((input) => {
      if (input.checked) rate = parseInt(input.value, 10) || 400;
    });
    const total = hours * rate;
    calcTotal.textContent = total.toLocaleString("ru-RU");
  }

  if (hoursInput && calcTotal) {
    hoursInput.addEventListener("input", updateCalculator);
    hoursInput.addEventListener("change", updateCalculator);
    rateInputs.forEach((input) => input.addEventListener("change", updateCalculator));
    updateCalculator();
  }

  function initGlowPanels() {
    const panels = document.querySelectorAll(".glow-panel");
    if (!panels.length) return;

    const prefersReduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Координаты относительно каждой панели (не fixed) — иначе эффект часто не виден из‑за backdrop-filter и оверлея ::before */
    function applyPointer(clientX, clientY) {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      const xp = clientX / w;
      const yp = clientY / h;
      const hue = Math.round(43 + xp * 38);

      panels.forEach((el) => {
        const r = el.getBoundingClientRect();
        let lxp = 50;
        let lyp = 50;
        if (r.width > 0 && r.height > 0) {
          lxp = ((clientX - r.left) / r.width) * 100;
          lyp = ((clientY - r.top) / r.height) * 100;
        }
        el.style.setProperty("--glow-lxp", `${lxp.toFixed(2)}%`);
        el.style.setProperty("--glow-lyp", `${lyp.toFixed(2)}%`);
        el.style.setProperty("--glow-xp", xp.toFixed(4));
        el.style.setProperty("--glow-yp", yp.toFixed(4));
        el.style.setProperty("--glow-hue", String(hue));
      });
    }

    applyPointer(window.innerWidth / 2, window.innerHeight / 2);

    if (!prefersReduce) {
      document.addEventListener(
        "pointermove",
        (e) => {
          applyPointer(e.clientX, e.clientY);
        },
        { passive: true }
      );
    }

    window.addEventListener(
      "resize",
      () => {
        applyPointer(window.innerWidth / 2, window.innerHeight / 2);
      },
      { passive: true }
    );
  }

  initGlowPanels();

  const form = document.getElementById("request-form");
  const statusNode = document.getElementById("form-status");
  if (!form || !statusNode) return;

  function normalizePhone(value) {
    return value.replace(/[^\d+]/g, "");
  }

  function isValidPhone(value) {
    return /^(\+7|8)\d{10}$/.test(value);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phoneRaw = document.getElementById("phone").value.trim();
    const task = document.getElementById("task").value.trim();
    const date = document.getElementById("date").value;

    const phone = normalizePhone(phoneRaw);

    if (!name) {
      statusNode.textContent = "Введите имя.";
      statusNode.className = "form-status error";
      return;
    }

    if (!isValidPhone(phone)) {
      statusNode.textContent = "Проверьте телефон. Формат: +7XXXXXXXXXX или 8XXXXXXXXXX.";
      statusNode.className = "form-status error";
      return;
    }

    statusNode.textContent = "Открываю Telegram…";
    statusNode.className = "form-status";

    const message = [
      "Заявка с сайта",
      `Имя: ${name}`,
      `Телефон: ${phone}`,
      `Задача: ${task || "-"}`,
      `Дата: ${date || "-"}`
    ].join("\n");

    const encodedText = encodeURIComponent(message);
    const url = `https://t.me/avk4488?text=${encodedText}`;

    window.open(url, "_blank", "noopener,noreferrer");

    statusNode.textContent = "Сообщение подготовлено. Отправьте его в Telegram.";
    statusNode.className = "form-status success";
  });

})();
