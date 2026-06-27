/* ============================================================================
   ALTO NIVEL — Interacciones
   Motion deliberado y sin prisa. Todo se degrada con prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    initHeaderScroll();
    initMobileNav();
    initAltimeter();
    initScrollReveal();
    initFilters();
    initContactForm();
  });

  /* ── Header: fondo sólido al hacer scroll ──────────────────────────── */
  function initHeaderScroll() {
    var header = document.getElementById("siteHeader");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── Menú móvil: abre desde la derecha, Esc y foco ─────────────────── */
  function initMobileNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("mobileNav");
    if (!toggle || !nav) return;

    var open = function () {
      nav.classList.add("is-open");
      nav.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      var first = nav.querySelector("a, button");
      if (first) first.focus();
    };
    var close = function () {
      nav.classList.remove("is-open");
      nav.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      toggle.focus();
    };

    toggle.addEventListener("click", open);
    nav.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) close();
    });
  }

  /* ── Altímetro: cuenta de 0 a la altitud (elemento firma) ──────────── */
  function initAltimeter() {
    var el = document.querySelector("[data-count-to]");
    if (!el) return;
    var target = parseInt(el.getAttribute("data-count-to"), 10) || 0;
    var format = function (n) { return n.toLocaleString("es-CO"); };

    if (reduceMotion) { el.textContent = format(target); return; }

    var duration = 1800, start = null;
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ── Scroll reveal: fade-up una sola vez por sección ───────────────── */
  function initScrollReveal() {
    var targets = document.querySelectorAll(
      ".section-head, .stat, .exp-card, .guide, .testimonial, .step, .cta__copy, .form, .altimeter, .hero__title, .hero__sub, .hero__actions"
    );
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("is-in"); });
      return;
    }
    targets.forEach(function (t) { t.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ── Filtros de expediciones (accesibles por teclado) ──────────────── */
  function initFilters() {
    var buttons = document.querySelectorAll(".filter");
    var cards = document.querySelectorAll(".exp-card");
    var empty = document.getElementById("expEmpty");
    if (!buttons.length || !cards.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        var shown = 0;
        cards.forEach(function (card) {
          var match = filter === "all" || card.getAttribute("data-level") === filter;
          card.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }

  /* ── Formulario de contacto: validación accesible en texto ─────────── */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var status = document.getElementById("formStatus");
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var rules = {
      "f-nombre": function (v) { return v.trim() ? "" : "Escribe tu nombre."; },
      "f-email": function (v) { return !v.trim() ? "Escribe tu correo." : (EMAIL.test(v.trim()) ? "" : "El correo no es válido."); },
      "f-wpp": function (v) { return v.replace(/\D/g, "").length >= 7 ? "" : "Escribe un número de WhatsApp válido."; },
      "f-exp": function (v) { return v ? "" : "Selecciona una expedición."; }
    };

    var validateField = function (id) {
      var input = document.getElementById(id);
      var error = document.getElementById("err-" + id.replace("f-", ""));
      if (!input || !error) return true;
      var msg = rules[id](input.value);
      error.textContent = msg;
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    };

    Object.keys(rules).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener("blur", function () { validateField(id); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") validateField(id);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = "";
      status.className = "form__status";

      var firstInvalid = null, ok = true;
      Object.keys(rules).forEach(function (id) {
        if (!validateField(id)) { ok = false; if (!firstInvalid) firstInvalid = document.getElementById(id); }
      });

      if (!ok) {
        status.textContent = "Revisa los campos marcados antes de enviar.";
        status.classList.add("is-err");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; }
      status.textContent = "Enviando…";

      // Sin backend: handler de demo. Para producción, conectar Netlify Forms
      // (data-netlify="true" + hidden form-name) o un endpoint y quitar el setTimeout.
      window.setTimeout(function () {
        status.textContent = "¡Gracias! Te contactaremos en menos de 24 horas.";
        status.classList.remove("is-err");
        status.classList.add("is-ok");
        form.reset();
        if (btn) { btn.disabled = false; }
        form.querySelectorAll("[aria-invalid]").forEach(function (el) {
          el.setAttribute("aria-invalid", "false");
        });
      }, 700);
    });
  }
})();
