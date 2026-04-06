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
    "welcome",
    "services",
    "calculator",
    "prices",
    "why",
    "game-block",
    "faq",
    "form",
    "contacts"
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
