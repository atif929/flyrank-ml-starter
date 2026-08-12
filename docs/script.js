/* ============================================================
   Search Intelligence Research — Interactions
   Vanilla JS, no dependencies. Handles: mobile nav toggle,
   active-link highlighting on scroll, and a subtle reveal-on-
   scroll for sections (respects prefers-reduced-motion).
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");

  function closeNav() {
    siteNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  function openNav() {
    siteNav.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.contains("is-open");
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Close the menu after a link is chosen (mobile)
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 640) closeNav();
      });
    });

    // Close on outside click
    document.addEventListener("click", function (e) {
      var clickedInsideNav = siteNav.contains(e.target) || navToggle.contains(e.target);
      if (!clickedInsideNav && siteNav.classList.contains("is-open")) {
        closeNav();
      }
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && siteNav.classList.contains("is-open")) {
        closeNav();
        navToggle.focus();
      }
    });

    // Reset state if the viewport grows back to desktop width
    window.addEventListener("resize", function () {
      if (window.innerWidth > 640) closeNav();
    });
  }

  /* ---------- Active section highlighting in nav ---------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("main section[id], footer[id]")
  );
  var navLinks = siteNav ? Array.prototype.slice.call(siteNav.querySelectorAll("a")) : [];

  function setActiveLink(id) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) {
      navObserver.observe(section);
    });
  }

  /* ---------- Reveal-on-scroll ---------- */
  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll(".section, .card, .callout")
  );

  if (reduceMotion || !("IntersectionObserver" in window)) {
    // No motion preference, or no support: show everything immediately
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("reveal");
    });

    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  }
})();