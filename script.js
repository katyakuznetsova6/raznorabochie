(function () {
  "use strict";

  /** После F5 браузер иногда восстанавливает скролл к низу из‑за смены высоты макета или фокуса на чате внизу. */
  (function fixReloadScrollPosition() {
    function hasHashTarget() {
      const h = window.location.hash;
      if (!h || h.length <= 1) return false;
      try {
        const id = decodeURIComponent(h.slice(1));
        return Boolean(id && document.getElementById(id));
      } catch {
        return false;
      }
    }

    function scrollTopNow() {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    function resetIfNoAnchor() {
      if (hasHashTarget()) return;
      scrollTopNow();
    }

    window.addEventListener("pageshow", (e) => {
      if (e.persisted) return;
      resetIfNoAnchor();
    });

    window.addEventListener(
      "load",
      () => {
        if (hasHashTarget()) return;
        scrollTopNow();
        const ae = document.activeElement;
        if (ae && ae !== document.body && typeof ae.closest === "function" && ae.closest(".chat-window")) {
          ae.blur();
          scrollTopNow();
        }
      },
      { once: true }
    );
  })();

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

  const scrollTopBtn = document.getElementById("scroll-top-btn");
  if (scrollTopBtn) {
    const scrollTopThreshold = 380;
    let scrollTopTicking = false;
    function updateScrollTopVisibility() {
      const y = window.scrollY || document.documentElement.scrollTop;
      scrollTopBtn.classList.toggle("is-visible", y > scrollTopThreshold);
      scrollTopTicking = false;
    }
    function onScrollTopScroll() {
      if (!scrollTopTicking) {
        scrollTopTicking = true;
        requestAnimationFrame(updateScrollTopVisibility);
      }
    }
    window.addEventListener("scroll", onScrollTopScroll, { passive: true });
    updateScrollTopVisibility();

    scrollTopBtn.addEventListener("click", () => {
      const reduce =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      scrollTopBtn.blur();
    });
  }

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

  if ("IntersectionObserver" in window) {
    const serviceCards = document.querySelectorAll(".service-card");
    serviceCards.forEach((el) => el.setAttribute("data-reveal", ""));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const target = e.target;
        /* Два кадра: сначала отрисовать состояние opacity/transform «до», иначе
           браузер может не запустить transition при очень быстром IO-callback. */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            target.classList.add("is-visible");
            io.unobserve(target);
          });
        });
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    serviceCards.forEach((el) => io.observe(el));
  }

  /** Услуги: удар → трещины → осколки (разлёт) → сборка в целую панель; второго удара нет */
  (function initServicesDemolishSequence() {
    const frame = document.querySelector("#services .photo-site-frame[data-smash-reveal]");
    const demolishCard = document.querySelector("#services .service-smash-spot .service-card");
    if (!frame || !demolishCard) return;

    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function runSmashSequence() {
      frame.classList.add("is-demolish-busy");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          frame.classList.add("is-smash-revealed");
          frame.classList.add("is-hammer-strike-1");
        });
      });

      const IMPACT_1_MS = 420;
      const CRACKS_1_HOLD_MS = 650;
      const SHATTER_MS = 1050;
      const REASSEMBLE_MS = 1000;

      const tCracks1 = IMPACT_1_MS;
      const tAfterCracks1 = tCracks1 + CRACKS_1_HOLD_MS;
      const tRebuildStart = tAfterCracks1 + SHATTER_MS;
      const tSequenceEnd = tRebuildStart + REASSEMBLE_MS;

      window.setTimeout(() => {
        frame.classList.add("is-demolish-cracked");
      }, tCracks1);

      window.setTimeout(() => {
        frame.classList.remove("is-demolish-cracked");
        frame.classList.remove("is-hammer-strike-1");
        frame.classList.add("is-demolish-shatter");
      }, tAfterCracks1);

      /* Не снимаем is-demolish-shatter сразу — иначе осколки на кадр сбрасываются без transform */
      window.setTimeout(() => {
        frame.classList.add("is-demolish-rebuild");
      }, tRebuildStart);

      window.setTimeout(() => {
        frame.classList.remove("is-demolish-shatter");
        frame.classList.remove("is-demolish-rebuild");
        frame.classList.remove("is-demolish-busy");
      }, tSequenceEnd);
    }

    if (!reduceMotion) {
      const triggerSmash = function () {
        if (frame.classList.contains("is-demolish-busy")) return;
        runSmashSequence();
      };
      demolishCard.addEventListener("mouseenter", triggerSmash, { passive: true });
      demolishCard.addEventListener("touchstart", triggerSmash, { passive: true });
      demolishCard.addEventListener("click", triggerSmash, { passive: true });
    }

    function scheduleAfterBricksSettled() {
      const BRICK_SETTLE_MS = 1020;
      window.setTimeout(runSmashSequence, BRICK_SETTLE_MS);
    }

    if (reduceMotion) {
      frame.classList.add("is-smash-revealed");
      frame.classList.add("is-demolish-cracked");
      return;
    }

    function onDemolishVisible() {
      scheduleAfterBricksSettled();
    }

    if (demolishCard.classList.contains("is-visible")) {
      onDemolishVisible();
      return;
    }

    const mo = new MutationObserver(() => {
      if (!demolishCard.classList.contains("is-visible")) return;
      mo.disconnect();
      onDemolishVisible();
    });
    mo.observe(demolishCard, { attributes: true, attributeFilter: ["class"] });
  })();

  /** «Грузчики»: сгиб пополам (3D) → снова пополам → коробка → обратно */
  (function initLoadersCargoSequence() {
    const frame = document.querySelector("#services .photo-site-frame[data-smash-reveal]");
    const loadersCard = document.querySelector("#services .service-cargo-spot .service-card");
    if (!frame || !loadersCard) return;

    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    /* Быстрее прочих панелей услуг — тайминги совпадают с transition/keyframes в styles.css */
    const FOLD1_MS = 550;
    const FOLD_GAP_MS = 90;
    const FOLD2_MS = 550;
    const FOLD_TOTAL = FOLD1_MS + FOLD_GAP_MS + FOLD2_MS;
    const INBOX_MS = 420;
    const SEAL_MS = 460;
    const PAUSE_SEALED_MS = 290;
    const UNSEAL_FLAP_MS = 250;
    const UNFOLD_MS = 900;

    function runCargo() {
      frame.classList.add("is-cargo-busy");
      frame.classList.add("is-cargo-fold-1");

      /* Конец 1-го сгиба: снять is-cargo-fold-1, иначе шарнир падает в 0 (snap).
         is-cargo-f1-latched фиксирует -180° до конца сцены. */
      window.setTimeout(() => {
        frame.classList.remove("is-cargo-fold-1");
        frame.classList.add("is-cargo-f1-latched");
        window.requestAnimationFrame(() => {
          frame.classList.add("is-cargo-show-f2");
          frame.classList.add("is-cargo-fold-2");
        });
      }, FOLD1_MS);

      window.setTimeout(() => {
        frame.classList.remove("is-cargo-fold-2");
        frame.classList.add("is-cargo-f2-latched");
        frame.classList.add("is-cargo-folds-latched");
        frame.classList.add("is-cargo-inbox");
        frame.classList.add("is-cargo-into-anim");
      }, FOLD_TOTAL);

      window.setTimeout(() => {
        frame.classList.remove("is-cargo-into-anim");
      }, FOLD_TOTAL + INBOX_MS);

      window.setTimeout(() => {
        frame.classList.add("is-cargo-sealed");
      }, FOLD_TOTAL + INBOX_MS);

      const tUnseal = FOLD_TOTAL + INBOX_MS + SEAL_MS + PAUSE_SEALED_MS;
      window.setTimeout(() => {
        frame.classList.remove("is-cargo-sealed");
      }, tUnseal);

      window.setTimeout(() => {
        frame.classList.add("is-cargo-unfold");
      }, tUnseal + UNSEAL_FLAP_MS);

      window.setTimeout(() => {
        frame.classList.remove("is-cargo-inbox");
        frame.classList.remove("is-cargo-unfold");
        frame.classList.remove("is-cargo-folds-latched");
        frame.classList.remove("is-cargo-f1-latched");
        frame.classList.remove("is-cargo-f2-latched");
        frame.classList.remove("is-cargo-show-f2");
        frame.classList.remove("is-cargo-busy");
      }, tUnseal + UNSEAL_FLAP_MS + UNFOLD_MS);
    }

    function scheduleAfterSettle() {
      window.setTimeout(runCargo, 1020);
    }

    if (!reduceMotion) {
      const triggerCargo = function () {
        if (frame.classList.contains("is-cargo-busy")) return;
        runCargo();
      };
      loadersCard.addEventListener("mouseenter", triggerCargo, { passive: true });
      loadersCard.addEventListener("touchstart", triggerCargo, { passive: true });
      loadersCard.addEventListener("click", triggerCargo, { passive: true });
    }

    if (loadersCard.classList.contains("is-visible")) {
      scheduleAfterSettle();
      return;
    }

    const mo = new MutationObserver(() => {
      if (!loadersCard.classList.contains("is-visible")) return;
      mo.disconnect();
      scheduleAfterSettle();
    });
    mo.observe(loadersCard, { attributes: true, attributeFilter: ["class"] });
  })();

  /** «Уборка территории»: два прохода метлы — половина букв хаотично, затем остаток; авто при появлении + по hover */
  (function initServiceInkBroom() {
    const card = document.querySelector("#services .service-card--cleaning-sweep");
    if (!card) return;

    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const busy = new WeakSet();

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    }

    function inkifyBlock(block) {
      const text = block.textContent;
      if (!text || !text.trim()) return;
      block.textContent = "";
      const frag = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "\n" || ch === "\r") continue;
        const span = document.createElement("span");
        span.className = /\s/.test(ch) ? "ink-sp" : "ink-c";
        span.textContent = ch === " " ? "\u00A0" : ch;
        frag.appendChild(span);
      }
      block.appendChild(frag);
    }

    function inkifyCard() {
      const ink = card.querySelector(".service-ink");
      if (!ink || ink.dataset.inkReady === "1") return;
      ink.querySelectorAll("h3, p").forEach(inkifyBlock);
      ink.dataset.inkReady = "1";
    }

    function assignWavesAndDelays() {
      const spans = card.querySelectorAll(".service-ink .ink-c, .service-ink .ink-sp");
      const list = Array.from(spans);
      if (!list.length) return { wave1: [], wave2: [], all: list };

      const idxs = list.map(function (_, i) {
        return i;
      });
      shuffle(idxs);
      const half = Math.ceil(list.length / 2);
      idxs.slice(0, half).forEach(function (i) {
        list[i].setAttribute("data-ink-wave", "1");
      });
      idxs.slice(half).forEach(function (i) {
        list[i].setAttribute("data-ink-wave", "2");
      });

      const wave1 = list.filter(function (s) {
        return s.getAttribute("data-ink-wave") === "1";
      });
      const wave2 = list.filter(function (s) {
        return s.getAttribute("data-ink-wave") === "2";
      });

      wave1.forEach(function (s) {
        s.style.setProperty("--d-out1", (Math.random() * 0.38).toFixed(3) + "s");
      });
      wave2.forEach(function (s) {
        s.style.removeProperty("--d-out2");
      });

      list.forEach(function (s) {
        s.style.setProperty("--d-in", (Math.random() * 0.48).toFixed(3) + "s");
      });

      return { wave1: wave1, wave2: wave2, all: list };
    }

    function maxDelayMs(nodes, prop, extraMs) {
      let m = 0;
      nodes.forEach(function (s) {
        const v = s.style.getPropertyValue(prop);
        if (!v) return;
        const sec = parseFloat(v);
        if (Number.isNaN(sec)) return;
        const ms = sec * 1000 + extraMs;
        if (ms > m) m = ms;
      });
      return m;
    }

    function setPassDurFromMax(maxMs) {
      const sec = Math.min(1.25, Math.max(0.72, (maxMs + 180) / 1000));
      card.style.setProperty("--ink-pass-dur", sec.toFixed(2) + "s");
    }

    function runPass2ThenFinish(wave2, allSpans) {
      wave2.forEach(function (s) {
        s.style.setProperty("--d-out2", (0.1 + Math.random() * 0.52).toFixed(3) + "s");
      });

      const max2 = maxDelayMs(wave2, "--d-out2", 230);
      setPassDurFromMax(max2);
      const pass2Done = max2 + 100;

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          card.classList.remove("is-ink-pass1");
          card.classList.add("is-ink-pass2");
          window.setTimeout(function () {
            card.classList.remove("is-ink-pass2");
            card.classList.add("is-ink-empty");
            window.requestAnimationFrame(function () {
              window.requestAnimationFrame(function () {
                card.classList.remove("is-ink-empty");
                card.classList.add("is-ink-in");
                const maxIn = maxDelayMs(allSpans, "--d-in", 260);
                window.setTimeout(function () {
                  card.classList.remove("is-ink-in", "is-ink-anim");
                  busy.delete(card);
                }, maxIn + 120);
              });
            });
          }, pass2Done);
        });
      });
    }

    function playCleaning() {
      if (busy.has(card)) return;

      inkifyCard();
      const waves = assignWavesAndDelays();
      if (!waves.all.length) return;

      busy.add(card);

      const max1 = maxDelayMs(waves.wave1, "--d-out1", 230);
      setPassDurFromMax(max1);

      card.style.setProperty("--ink-out-dur", "0.22s");
      card.classList.remove("is-ink-in", "is-ink-empty", "is-ink-pass1", "is-ink-pass2");
      card.classList.add("is-ink-anim", "is-ink-pass1");

      const pass1End = Math.max(max1 + 100, 720);

      window.setTimeout(function () {
        if (!waves.wave2.length) {
          card.classList.remove("is-ink-pass1");
          card.classList.add("is-ink-empty");
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              card.classList.remove("is-ink-empty");
              card.classList.add("is-ink-in");
              const maxIn = maxDelayMs(waves.all, "--d-in", 260);
              window.setTimeout(function () {
                card.classList.remove("is-ink-in", "is-ink-anim");
                busy.delete(card);
              }, maxIn + 120);
            });
          });
          return;
        }
        runPass2ThenFinish(waves.wave2, waves.all);
      }, pass1End);
    }

    const triggerCleaning = function () {
      playCleaning();
    };
    card.addEventListener("mouseenter", triggerCleaning, { passive: true });
    card.addEventListener("touchstart", triggerCleaning, { passive: true });
    card.addEventListener("click", triggerCleaning, { passive: true });

    /* Как грузчики / демонтаж: после «оседания» кирпичной сетки запускаем один раз */
    function scheduleAutoSweep() {
      if (reduceMotion) return;
      const BRICK_SETTLE_MS = 1020;
      window.setTimeout(playCleaning, BRICK_SETTLE_MS);
    }

    if (card.classList.contains("is-visible")) {
      scheduleAutoSweep();
    } else {
      const mo = new MutationObserver(function () {
        if (!card.classList.contains("is-visible")) return;
        mo.disconnect();
        scheduleAutoSweep();
      });
      mo.observe(card, { attributes: true, attributeFilter: ["class"] });
    }
  })();

  /** Подсобные: сцена «ряд в строй» — при появлении блока и по hover */
  (function initPodsobPanelFx() {
    const card = document.querySelector("#services .service-card--podsob");
    if (!card) return;

    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ANIM_MS = 2100;
    let clearT = null;

    function playPodsob() {
      if (reduce) return;
      if (clearT) window.clearTimeout(clearT);
      card.classList.remove("is-podsob-anim");
      void card.offsetWidth;
      card.classList.add("is-podsob-anim");
      clearT = window.setTimeout(function () {
        card.classList.remove("is-podsob-anim");
        clearT = null;
      }, ANIM_MS);
    }

    card.addEventListener("mouseenter", playPodsob, { passive: true });
    card.addEventListener("touchstart", playPodsob, { passive: true });
    card.addEventListener("click", playPodsob, { passive: true });

    function scheduleAuto() {
      if (reduce) return;
      window.setTimeout(playPodsob, 1180);
    }

    if (card.classList.contains("is-visible")) {
      scheduleAuto();
    } else {
      const mo = new MutationObserver(function () {
        if (!card.classList.contains("is-visible")) return;
        mo.disconnect();
        scheduleAuto();
      });
      mo.observe(card, { attributes: true, attributeFilter: ["class"] });
    }
  })();

  /** Появление остальных панелей (glow, FAQ, форма) — в одной стилистике со «стройкой», без дубля с .service-card */
  if ("IntersectionObserver" in window) {
    const panelEls = document.querySelectorAll(
      ".glow-panel:not(.service-card), .build-faq-board.glow-panel, .build-form-board.glow-panel"
    );

    function setPanelStagger(el) {
      const parent = el.parentElement;
      if (!parent) return;
      const row = Array.from(parent.children).filter((node) => node.hasAttribute("data-panel-reveal"));
      const idx = row.indexOf(el);
      if (idx < 0) return;
      const stepMs = 52;
      const delay = Math.min(idx, 14) * stepMs;
      el.style.setProperty("--panel-delay", `${delay}ms`);
    }

    panelEls.forEach((el) => {
      el.setAttribute("data-panel-reveal", "");
      setPanelStagger(el);
    });

    const panelIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const target = e.target;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              target.classList.add("is-visible");
              panelIo.unobserve(target);
            });
          });
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    panelEls.forEach((el) => panelIo.observe(el));
  }

  /** «Живые» тексты: каскад + рейка (кроме hero / игры / отзывов — только сдвиг). Счётчик .build-stat */
  function initBuildText() {
    if (!("IntersectionObserver" in window)) return;

    function runCountUps(rootEl) {
      const stat = rootEl.querySelector(".build-stat[data-count-to]");
      if (!stat) return;
      const raw = stat.getAttribute("data-count-to");
      const to = raw ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(to)) return;
      const reduce =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        stat.textContent = String(to);
        return;
      }
      stat.textContent = "0";
      const dur = 950;
      const t0 = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - t0) / dur);
        const eased = 1 - (1 - t) * (1 - t);
        stat.textContent = String(Math.round(eased * to));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    const buildIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const target = e.target;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              target.classList.add("is-build-visible");
              runCountUps(target);
              buildIo.unobserve(target);
            });
          });
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -6% 0px" }
    );

    function markGroup(nodes, stepMs) {
      nodes.forEach((el, i) => {
        if (!el.textContent || !String(el.textContent).trim()) return;
        el.setAttribute("data-build-text", "");
        el.style.setProperty("--build-delay", `${Math.min(i, 22) * stepMs}ms`);
        buildIo.observe(el);
      });
    }

    document.querySelectorAll("section.section-block .container").forEach((container) => {
      if (container.closest("#game-block")) return;
      const els = container.querySelectorAll(
        ":scope > .section-head > .section-kicker, :scope > .section-head > h2, :scope > .section-intro, :scope > p, :scope > ul.advantages > li, :scope > .build-follow-plank p"
      );
      markGroup(Array.from(els), 40);
    });

    const faqBuildList = document.querySelector("#faq .faq-list--build");
    if (faqBuildList) {
      markGroup(Array.from(faqBuildList.querySelectorAll(":scope > details.faq-item")), 42);
    }

    const gameContainer = document.querySelector("#game-block .container");
    if (gameContainer) {
      const ordered = [];
      gameContainer
        .querySelectorAll(":scope > .section-head > .section-kicker, :scope > .section-head > h2")
        .forEach((n) => ordered.push(n));
      gameContainer.querySelectorAll(":scope > .section-intro").forEach((n) => ordered.push(n));
      gameContainer.querySelectorAll(":scope > p").forEach((n) => ordered.push(n));
      const after = gameContainer.querySelector(".game-after");
      if (after) {
        after.querySelectorAll(":scope > p").forEach((n) => ordered.push(n));
      }
      markGroup(ordered, 38);
    }

    const heroInner = document.querySelector(".hero .hero-inner");
    if (heroInner) {
      const heroEls = heroInner.querySelectorAll(
        ":scope > .hero-eyebrow, :scope > h1, :scope > p, :scope > .hero-actions, :scope > .hero-sub"
      );
      markGroup(Array.from(heroEls), 44);
    }
  }

  initBuildText();

  function initTestimonialStack() {
    const stack = document.getElementById("testimonial-stack");
    const pagination = document.getElementById("testimonial-pagination");
    if (!stack || !pagination) return;

    const cards = Array.from(stack.querySelectorAll(".testimonial-card"));
    if (!cards.length) return;

    const total = cards.length;
    const visibleBehind = Math.max(
      0,
      parseInt(stack.getAttribute("data-visible-behind") || "2", 10) || 2
    );
    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let activeIndex = 0;
    let isDragging = false;
    let dragOffset = 0;
    let dragStartX = 0;

    function navigate(newIndex) {
      activeIndex = (newIndex + total) % total;
      dragOffset = 0;
      updateStack();
    }

    function updateStack() {
      cards.forEach((card, index) => {
        card.classList.remove("is-hidden-reduce");
        if (reduceMotion) {
          const on = index === activeIndex;
          card.classList.toggle("is-hidden-reduce", !on);
          card.style.transform = "";
          card.style.opacity = "";
          card.style.zIndex = "";
          card.style.visibility = "";
          card.style.pointerEvents = on ? "auto" : "none";
          card.setAttribute("aria-hidden", on ? "false" : "true");
          return;
        }

        const displayOrder = (index - activeIndex + total) % total;
        let transform = "";
        let opacity = "0";
        let zIndex = "0";
        let pointerEvents = "none";
        let visibility = "hidden";

        if (displayOrder === 0) {
          transform = `translateX(${dragOffset}px)`;
          opacity = "1";
          zIndex = String(total);
          pointerEvents = "auto";
          visibility = "visible";
        } else if (displayOrder <= visibleBehind) {
          const scale = 1 - 0.05 * displayOrder;
          const tyRem = -1.35 * displayOrder;
          transform = `scale(${scale}) translateY(${tyRem}rem)`;
          opacity = String(1 - 0.2 * displayOrder);
          zIndex = String(total - displayOrder);
          visibility = "visible";
        } else {
          transform = "scale(0)";
          opacity = "0";
          zIndex = "0";
          visibility = "hidden";
        }

        card.style.transform = transform;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;
        card.style.pointerEvents = pointerEvents;
        card.style.visibility = visibility;
        card.setAttribute("aria-hidden", displayOrder > visibleBehind ? "true" : "false");
      });

      pagination.querySelectorAll(".testimonial-dot").forEach((dot, i) => {
        const on = i === activeIndex;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-current", on ? "true" : "false");
      });
    }

    if (!pagination.childElementCount) {
      cards.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "testimonial-dot";
        btn.setAttribute("aria-label", `Отзыв ${i + 1} из ${total}`);
        btn.addEventListener("click", () => navigate(i));
        pagination.appendChild(btn);
      });
    }

    function handleDragMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      dragOffset = clientX - dragStartX;
      updateStack();
    }

    function handleDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      stack.classList.remove("stack-dragging");
      const activeCard = cards[activeIndex];
      if (activeCard) activeCard.classList.remove("is-dragging");

      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
      window.removeEventListener("touchcancel", handleDragEnd);

      if (!reduceMotion && Math.abs(dragOffset) > 50) {
        navigate(activeIndex + (dragOffset < 0 ? 1 : -1));
      } else {
        dragOffset = 0;
        updateStack();
      }
    }

    function handleDragStart(e, index) {
      if (reduceMotion) return;
      if (index !== activeIndex) return;
      isDragging = true;
      dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
      dragOffset = 0;
      stack.classList.add("stack-dragging");
      cards[activeIndex].classList.add("is-dragging");

      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("touchmove", handleDragMove, { passive: true });
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);
      window.addEventListener("touchcancel", handleDragEnd);
    }

    cards.forEach((card, index) => {
      card.addEventListener("mousedown", (e) => handleDragStart(e, index));
      card.addEventListener(
        "touchstart",
        (e) => handleDragStart(e, index),
        { passive: true }
      );
    });

    updateStack();
  }

  initTestimonialStack();

  const hoursInput = document.getElementById("calc-hours");
  const hoursRange = document.getElementById("calc-hours-range");
  const hoursOut = document.getElementById("calc-hours-out");
  const calcTotal = document.getElementById("calc-total");
  const breakdownEl = document.getElementById("calc-breakdown");
  const noteEl = document.getElementById("calc-note");
  const calcDisplay = document.getElementById("calc-display");
  const rateInputs = document.querySelectorAll('input[name="rate"]');
  const calcChips = document.querySelectorAll(".calc-chip");

  let calcLastTotal = null;
  let calcPulseTimer = null;

  function clampCalcHours(raw) {
    let h = parseInt(raw, 10);
    if (Number.isNaN(h) || h < 1) h = 1;
    if (h > 720) h = 720;
    return h;
  }

  function updateCalculator(opts) {
    const o = opts || {};
    const fromRange = Boolean(o.fromRange);

    if (!hoursInput || !calcTotal) return;

    let hours;
    if (fromRange && hoursRange) {
      hours = clampCalcHours(hoursRange.value);
      hoursInput.value = String(hours);
    } else {
      hours = clampCalcHours(hoursInput.value);
      hoursInput.value = String(hours);
      if (hoursRange) {
        hoursRange.value = String(Math.min(hours, 72));
      }
    }

    if (hoursOut) {
      hoursOut.textContent = String(hours);
    }

    let rate = 400;
    rateInputs.forEach((input) => {
      if (input.checked) rate = parseInt(input.value, 10) || 400;
    });

    const total = hours * rate;
    calcTotal.textContent = total.toLocaleString("ru-RU");

    if (breakdownEl) {
      breakdownEl.textContent = `${hours} ч × ${rate.toLocaleString("ru-RU")} ₽/час`;
    }

    if (noteEl) {
      if (hours < 8) {
        noteEl.textContent = "";
      } else {
        const shifts = Math.floor(hours / 8);
        const rem = hours % 8;
        if (rem === 0) {
          noteEl.textContent =
            shifts === 1 ? "≈ 1 полная смена по 8 ч" : `≈ ${shifts} полных смен по 8 ч`;
        } else {
          noteEl.textContent = `≈ ${shifts} смен × 8 ч + ${rem} ч`;
        }
      }
    }

    calcChips.forEach((chip) => {
      const preset = parseInt(chip.getAttribute("data-hours"), 10);
      chip.classList.toggle("is-active", !Number.isNaN(preset) && preset === hours);
    });

    if (calcDisplay && calcLastTotal !== null && calcLastTotal !== total) {
      calcDisplay.classList.remove("is-updated");
      void calcDisplay.offsetWidth;
      calcDisplay.classList.add("is-updated");
      if (calcPulseTimer) window.clearTimeout(calcPulseTimer);
      calcPulseTimer = window.setTimeout(() => {
        calcDisplay.classList.remove("is-updated");
        calcPulseTimer = null;
      }, 520);
    }
    calcLastTotal = total;
  }

  if (hoursInput && calcTotal) {
    hoursInput.addEventListener("input", () => updateCalculator({}));
    hoursInput.addEventListener("change", () => updateCalculator({}));
    if (hoursRange) {
      hoursRange.addEventListener("input", () => updateCalculator({ fromRange: true }));
    }
    rateInputs.forEach((input) => input.addEventListener("change", () => updateCalculator({})));
    calcChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const h = clampCalcHours(chip.getAttribute("data-hours"));
        hoursInput.value = String(h);
        if (hoursRange) {
          hoursRange.value = String(Math.min(h, 72));
        }
        updateCalculator({});
      });
    });
    calcLastTotal = null;
    updateCalculator({});
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
  if (form && form.getAttribute("data-supabase-form") === "1") return;
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
