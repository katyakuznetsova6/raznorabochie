(function () {
  "use strict";

  if (!window.supabase || typeof window.supabase.createClient !== "function") return;

  const form = document.getElementById("request-form");
  const formStatus = document.getElementById("form-status");
  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const consentInput = document.getElementById("privacy-consent");
  if (!form || !formStatus || !nameInput || !phoneInput) return;

  const { createClient } = window.supabase;
  const supabaseUrl = "https://jlgqxbkxmrjyfaxdaarq.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZ3F4Ymt4bXJqeWZheGRhYXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTE5MjgsImV4cCI6MjA5Mjg2NzkyOH0.Ae0VWzvDwjQ-IBFEGa3A45ih2sLB-inLoXRxNWfVd-8";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const POLICY_VERSION = "2026-04-28";
  const POLICY_URL = "/privacy.html";

  function markInvalid(el, invalid) {
    el.classList.toggle("is-invalid", Boolean(invalid));
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "");
  }

  function isValidPhone(value) {
    return /^(\+7|8)\d{10}$/.test(value);
  }

  [nameInput, phoneInput].forEach((el) => {
    el.addEventListener("input", () => markInvalid(el, false));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = normalizePhone(phoneInput.value);
    const taskInput = document.getElementById("task");
    const formDataBase = {
      name,
      phone,
      service: taskInput ? taskInput.value : "",
      status: "new",
    };
    const formDataCompliance = {
      privacy_consent: true,
      consent_at: new Date().toISOString(),
      policy_version: POLICY_VERSION,
      policy_url: POLICY_URL,
    };

    markInvalid(nameInput, !name);
    markInvalid(phoneInput, !phone || !isValidPhone(phone));
    if (consentInput && !consentInput.checked) {
      formStatus.textContent = "Подтвердите согласие с политикой конфиденциальности.";
      consentInput.focus();
      return;
    }
    if (!name || !phone || !isValidPhone(phone)) {
      formStatus.textContent = "Проверьте имя и телефон.";
      return;
    }

    formStatus.textContent = "Отправляем...";

    try {
      let { error } = await supabaseClient
        .from("orders")
        .insert([{ ...formDataBase, ...formDataCompliance }]);

      if (error) {
        const text = String(error.message || "").toLowerCase();
        const mayLackColumns =
          text.includes("column") || text.includes("schema cache") || text.includes("does not exist");
        if (!mayLackColumns) throw error;

        /* Совместимость на время миграции БД: если новые поля ещё не добавлены,
           сохраняем хотя бы базовую заявку, чтобы не терять лиды. */
        const retry = await supabaseClient.from("orders").insert([formDataBase]);
        error = retry.error || null;
        if (error) throw error;
      }

      formStatus.textContent = "✅";
      setTimeout(() => {
        form.reset();
        formStatus.textContent = "";
      }, 2000);

      const tgText = `Новая заявка:%0AИмя: ${formDataBase.name}%0AТелефон: ${formDataBase.phone}%0AЗадача: ${formDataBase.service}%0AСогласие: да (%20версия%20политики%20${POLICY_VERSION})`;
      window.open(`https://t.me/avk4488?text=${tgText}`, "_blank");
    } catch (error) {
      console.error("Ошибка:", error);
      formStatus.textContent = "❌ Произошла ошибка. Попробуйте ещё раз или позвоните.";
    }
  });
})();
