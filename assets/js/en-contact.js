(() => {
  "use strict";
  const init = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { gsap, ScrollTrigger, CustomEase, Lenis } = window;
    let lenis = null;
    let paused = false;
    let refreshFrame = null;
    let refreshPending = false;
    const isLocked = () => document.body.classList.contains("overflow-hidden");
    window.SITE_SCROLL = {
      scrollTo(element, { block = "start" } = {}) {
        if (!element) return;
        if (!lenis || isLocked()) {
          element.scrollIntoView({
            block,
            behavior: reducedMotion.matches || isLocked() ? "instant" : "smooth",
          });
          return;
        }
        lenis.resize();
        const rect = element.getBoundingClientRect();
        const offset = block === "center" ? (window.innerHeight - rect.height) / 2 : 0;
        lenis.scrollTo(window.scrollY + rect.top - offset);
      },
    };
    if (!gsap || !ScrollTrigger || !CustomEase) return;
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded" });
    const tick = (time) => {
      lenis?.raf(time * 1e3);
      if (refreshPending && !lenis?.isScrolling) refresh();
    };
    gsap.ticker.lagSmoothing(0);
    const syncLock = () => {
      if (!lenis) return;
      if (paused || isLocked()) lenis.stop();
      else if (lenis.isStopped) {
        lenis.resize();
        lenis.start();
      }
    };
    const syncSmoothScroll = () => {
      if (reducedMotion.matches || !Lenis) {
        gsap.ticker.remove(tick);
        lenis?.destroy();
        lenis = null;
        return;
      }
      if (!lenis) {
        lenis = new Lenis({
          autoRaf: false,
          smoothWheel: true,
          lerp: 0.1,
          wheelMultiplier: 1,
          syncTouch: false,
          anchors: true,
          prevent: (node) => node.hasAttribute("data-lenis-prevent"),
        });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
      }
      syncLock();
    };
    syncSmoothScroll();
    reducedMotion.addEventListener("change", syncSmoothScroll);
    new MutationObserver(syncLock).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const completed = new WeakSet();
    const entranceEase = CustomEase.create("site-entrance", "0.25,0.46,0.45,0.94");
    const GROUP_DELAYS = [0.1, 0.3, 0.5, 0.8];
    const groups = [...document.querySelectorAll("[data-reveal-group]")].map((group) => ({
      trigger: group,
      items: [...group.querySelectorAll("[data-reveal-item]")],
    }));
    const mediaItems = [...document.querySelectorAll("[data-reveal-media]")];
    const groupDelay = (index) =>
      GROUP_DELAYS[index] ?? GROUP_DELAYS.at(-1) + (index - GROUP_DELAYS.length + 1) * 0.3;
    const media = gsap.matchMedia();
    media.add({ all: "all", reduced: "(prefers-reduced-motion: reduce)" }, ({ conditions }) => {
      const entrance = (target, trigger, from, to) => {
        if (conditions.reduced) completed.add(target);
        if (completed.has(target)) return;
        gsap.fromTo(target, from, {
          ...to,
          ease: entranceEase,
          // 播完移除行內 opacity／transform，讓元素本身的 hover 樣式（例如預約按鈕）繼續生效。
          clearProps: "opacity,transform",
          onComplete: () => completed.add(target),
          scrollTrigger: { trigger, start: "top bottom", once: true },
        });
      };
      for (const { trigger, items } of groups) {
        items.forEach((item, index) =>
          entrance(
            item,
            trigger,
            { opacity: 0, y: 40, rotation: 2 },
            { opacity: 1, y: 0, rotation: 0, duration: 0.5, delay: groupDelay(index) }
          )
        );
      }
      for (const element of mediaItems) {
        entrance(
          element,
          element,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.3 }
        );
      }
    });
    const refresh = () => {
      if (paused) return;
      if (lenis?.isScrolling) {
        refreshPending = true;
        return;
      }
      refreshPending = false;
      if (refreshFrame !== null) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = null;
        if (lenis?.isScrolling) {
          refreshPending = true;
          return;
        }
        lenis?.resize();
        ScrollTrigger.refresh();
      });
    };
    let resizeTimer = null;
    window.addEventListener("load", refresh);
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 150);
    });
    document.fonts?.ready.then(refresh);
    if (typeof ResizeObserver === "function") new ResizeObserver(refresh).observe(document.body);
    new MutationObserver(refresh).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    const cancelInertia = () => {
      if (!lenis || paused || isLocked()) return;
      lenis.stop();
      lenis.start();
    };
    document.addEventListener("focusin", cancelInertia);
    document.addEventListener("keydown", ({ key, target }) => {
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(key)) {
        cancelInertia();
      }
    });
    window.addEventListener("pagehide", () => {
      paused = true;
      if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
      refreshFrame = null;
      gsap.ticker.remove(tick);
      lenis?.stop();
    });
    window.addEventListener("pageshow", () => {
      paused = false;
      gsap.ticker.remove(tick);
      if (lenis) gsap.ticker.add(tick);
      syncLock();
      refresh();
    });
    refresh();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
(() => {
  "use strict";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const STEP_ANIMATION_MS = 440;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const errorNodeFor = (field) => {
    let node = field;
    while (node?.parentElement) {
      const error = node.parentElement.querySelector(":scope > [data-booking-error]");
      if (error) return error;
      node = node.parentElement;
    }
    return null;
  };
  const isFilled = ({ type, checked, value }) => {
    if (type === "checkbox") return checked;
    if (type === "email") return EMAIL_PATTERN.test(value.trim());
    return value.trim() !== "";
  };
  const setValidity = (field, valid) => {
    if (field.type === "checkbox") {
      field.setAttribute("aria-invalid", valid ? "false" : "true");
    } else {
      field.toggleAttribute("data-invalid", !valid);
      field.setAttribute("aria-invalid", valid ? "false" : "true");
    }
    const error = errorNodeFor(field);
    if (error) error.hidden = valid;
  };
  const clearValidity = (field) => {
    field.removeAttribute("data-invalid");
    field.removeAttribute("aria-invalid");
    const error = errorNodeFor(field);
    if (error) error.hidden = true;
  };
  const fieldsOf = (form) => [...form.querySelectorAll("[data-booking-field]")];
  const validate = (form) =>
    fieldsOf(form).reduce((firstInvalid, field) => {
      const valid = isFilled(field);
      setValidity(field, valid);
      return firstInvalid ?? (valid ? null : field);
    }, null);
  const formatDate = (value) => {
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    const [year, month, day] = parts;
    return `${year}/${Number(month)}/${Number(day)}`;
  };
  const fillSummary = (modal, form) => {
    for (const node of modal.querySelectorAll("[data-booking-summary]")) {
      const field = form.elements[node.dataset.bookingSummary];
      if (!field) continue;
      if (field.tagName === "SELECT") {
        node.textContent = field.options[field.selectedIndex].textContent.trim();
      } else if (field.type === "date") {
        node.textContent = formatDate(field.value);
      } else {
        node.textContent = field.value;
      }
    }
  };
  const setupSteps = (modal) => {
    const steps = modal.querySelector("[data-booking-steps]");
    const panels = Object.fromEntries(
      [...modal.querySelectorAll("[data-booking-step]")].map((panel) => [
        panel.dataset.bookingStep,
        panel,
      ])
    );
    let current = "1";
    let finishPending = null;
    const settle = () => finishPending?.();
    const reset = () => {
      settle();
      if (current === "1") return;
      panels[current].hidden = true;
      panels["1"].hidden = false;
      current = "1";
    };
    const goTo = (next, direction) => {
      if (next === current || !panels[next]) return;
      settle();
      const from = panels[current];
      const to = panels[next];
      current = next;
      if (prefersReducedMotion()) {
        from.hidden = true;
        to.hidden = false;
        return;
      }
      const startHeight = steps.offsetHeight;
      steps.dataset.bookingDir = direction;
      from.classList.add("is-leaving");
      to.hidden = false;
      to.classList.add("is-entering");
      steps.style.height = `${startHeight}px`;
      const endHeight = to.offsetHeight;
      steps.style.height = `${endHeight}px`;
      const finish = () => {
        window.clearTimeout(timer);
        finishPending = null;
        from.hidden = true;
        from.classList.remove("is-leaving");
        to.classList.remove("is-entering");
        steps.style.height = "";
        delete steps.dataset.bookingDir;
      };
      const timer = window.setTimeout(finish, STEP_ANIMATION_MS);
      finishPending = finish;
    };
    return { goTo, reset };
  };
  const closeHeaderDrawer = () => {
    const drawer = document.querySelector("[data-header-drawer]");
    if (!drawer?.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.querySelector("[data-drawer-open]")?.setAttribute("aria-expanded", "false");
  };
  const init = () => {
    const modal = document.querySelector("[data-booking-modal]");
    if (!modal) return;
    const scroll = modal.querySelector(".booking-modal__scroll");
    const stepOne = modal.querySelector('[data-booking-form="1"]');
    const stepTwo = modal.querySelector('[data-booking-form="2"]');
    if (!stepOne || !stepTwo) return;
    const steps = setupSteps(modal);
    const forms = [stepOne, stepTwo];
    let lastTrigger = null;
    const isOpen = () => modal.classList.contains("is-open");
    const open = (trigger) => {
      lastTrigger = trigger ?? null;
      closeHeaderDrawer();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("overflow-hidden");
      if (scroll) scroll.scrollTop = 0;
    };
    const close = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overflow-hidden");
      lastTrigger?.focus({ preventScroll: true });
      lastTrigger = null;
    };
    const resetForms = () => {
      for (const form of forms) {
        form.reset();
        fieldsOf(form).forEach(clearValidity);
      }
      steps.reset();
    };
    document.addEventListener("click", (event) => {
      const { target } = event;
      if (!(target instanceof Element)) return;
      const trigger = target.closest("[data-booking-open]");
      if (trigger) {
        event.preventDefault();
        open(trigger);
        return;
      }
      if (!isOpen()) return;
      if (!modal.contains(target) || target.closest(".booking-modal__panel")) return;
      close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) close();
    });
    for (const form of forms) {
      for (const field of fieldsOf(form)) {
        const revalidate = () => {
          if (field.getAttribute("aria-invalid") === "true") setValidity(field, isFilled(field));
        };
        field.addEventListener("input", revalidate);
        field.addEventListener("change", revalidate);
      }
    }
    stepOne.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstInvalid = validate(stepOne);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      fillSummary(modal, stepOne);
      steps.goTo("2", "forward");
    });
    modal.querySelector("[data-booking-back]")?.addEventListener("click", () => {
      steps.goTo("1", "back");
    });
    stepTwo.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstInvalid = validate(stepTwo);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      close();
      resetForms();
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
(() => {
  "use strict";
  const DESKTOP_QUERY = "(min-width: 64rem)";
  const SHRINK_AT = 160;
  const EXPAND_AT = 80;
  const TRANSITION_DURATION = 1;
  const setupScrollState = (header) => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { gsap, CustomEase } = window;
    const background = header.querySelector(".site-header__background");
    const brandText = header.querySelector(".site-header__brand-text");
    const logo = header.querySelector(".site-header__logo");
    const nav = header.querySelector(".site-header__nav > ul");
    const parts = [logo, nav, header.querySelector(".site-header__actions")].filter(Boolean);
    const targets = [...parts, background, brandText].filter(Boolean);
    let scrolled = null;
    let ticking = false;
    let timeline = null;
    let transition = null;
    const ease = gsap && CustomEase ? CustomEase.create("site-header", "0.25,0.1,0.25,1") : null;
    const rebuild = () => {
      transition?.kill();
      transition = null;
      timeline?.kill();
      timeline = null;
      gsap?.set(targets, { clearProps: "transform,opacity,visibility" });
      header.classList.remove("has-header-motion", "is-measuring-compact");
      if (!desktop.matches || !ease || reducedMotion.matches) return;
      header.classList.add("has-header-motion");
      const first = parts.map((part) => part.getBoundingClientRect());
      const brandBottom = brandText.getBoundingClientRect().bottom;
      header.classList.add("is-measuring-compact");
      const last = parts.map((part) => part.getBoundingClientRect());
      header.classList.remove("is-measuring-compact");
      timeline = gsap.timeline({
        paused: true,
        defaults: { duration: TRANSITION_DURATION, ease: "none" },
      });
      parts.forEach((part, index) => {
        const start = first[index];
        const end = last[index];
        timeline.to(
          part,
          {
            force3D: true,
            x: end.left + end.width / 2 - (start.left + start.width / 2),
            y: end.top + end.height / 2 - (start.top + start.height / 2),
            ...(part === logo
              ? { scaleX: end.width / start.width, scaleY: end.height / start.height }
              : {}),
          },
          0
        );
      });
      timeline.to(background, { scaleY: 88 / 172, force3D: true }, 0);
      const navIndex = parts.indexOf(nav);
      const navTravel = first[navIndex].top - last[navIndex].top;
      const brandFadePortion = Math.max(
        0.05,
        Math.min(0.4, (first[navIndex].top - brandBottom - 8) / Math.max(1, navTravel))
      );
      timeline.to(
        brandText,
        {
          autoAlpha: 0,
          x: -16,
          force3D: true,
          duration: TRANSITION_DURATION * brandFadePortion,
        },
        0
      );
      timeline.progress(scrolled ? 1 : 0).pause();
    };
    const sync = () => {
      ticking = false;
      const y = window.scrollY;
      const next = scrolled === true ? y >= EXPAND_AT : y > SHRINK_AT;
      if (next === scrolled) return;
      const animate = scrolled !== null;
      scrolled = next;
      header.classList.toggle("is-scrolled", next);
      if (!timeline) return;
      if (!animate) timeline.progress(next ? 1 : 0).pause();
      else {
        transition?.kill();
        transition = timeline.tweenTo(next ? timeline.duration() : 0, {
          duration: TRANSITION_DURATION,
          ease,
        });
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    rebuild();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", rebuild);
    window.addEventListener("pageshow", () => {
      sync();
      rebuild();
    });
    desktop.addEventListener("change", rebuild);
    reducedMotion.addEventListener("change", rebuild);
    new MutationObserver(rebuild).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    document.fonts?.ready.then(rebuild);
    logo?.addEventListener("load", rebuild);
  };
  const setupDrawer = (header) => {
    const drawer = header.querySelector("[data-header-drawer]");
    const openButton = header.querySelector("[data-drawer-open]");
    if (!drawer || !openButton) return;
    const setOpen = (open) => {
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      openButton.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("overflow-hidden", open);
      if (!open) openButton.focus({ preventScroll: true });
    };
    openButton.addEventListener("click", () => setOpen(true));
    for (const button of drawer.querySelectorAll("[data-drawer-close]")) {
      button.addEventListener("click", () => setOpen(false));
    }
    for (const link of drawer.querySelectorAll("a[href]")) {
      link.addEventListener("click", () => setOpen(false));
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false);
    });
    const desktop = window.matchMedia(DESKTOP_QUERY);
    desktop.addEventListener("change", ({ matches }) => {
      if (!matches) return;
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      openButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("overflow-hidden");
    });
  };
  const setupAccordion = (header) => {
    for (const accordion of header.querySelectorAll("[data-accordion]")) {
      const toggle = accordion.querySelector("[data-accordion-toggle]");
      if (!toggle) continue;
      toggle.addEventListener("click", () => {
        const open = accordion.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  };
  const setupDropdown = (header) => {
    const dropdowns = [];
    const closeAll = () => {
      for (const dropdown of dropdowns) {
        dropdown.classList.remove("is-open");
        dropdown.querySelector("[data-dropdown-toggle]")?.setAttribute("aria-expanded", "false");
      }
    };
    for (const toggle of header.querySelectorAll("[data-dropdown-toggle]")) {
      const dropdown = toggle.closest(".site-header__dropdown");
      if (!dropdown) continue;
      dropdowns.push(dropdown);
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const open = !dropdown.classList.contains("is-open");
        closeAll();
        dropdown.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    if (!dropdowns.length) return;
    document.addEventListener("click", ({ target }) => {
      if (target instanceof Element && target.closest(".site-header__dropdown")) return;
      closeAll();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });
  };
  const init = () => {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    setupScrollState(header);
    setupDrawer(header);
    setupAccordion(header);
    setupDropdown(header);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
(() => {
  "use strict";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errorNodeFor = (field) => {
    let node = field;
    while (node?.parentElement) {
      const error = node.parentElement.querySelector(":scope > [data-contact-error]");
      if (error) return error;
      node = node.parentElement;
    }
    return null;
  };
  const isFilled = ({ type, checked, value }) => {
    if (type === "checkbox") return checked;
    if (type === "email") return EMAIL_PATTERN.test(value.trim());
    return value.trim() !== "";
  };
  const setValidity = (field, valid) => {
    if (field.type === "checkbox") {
      field.setAttribute("aria-invalid", valid ? "false" : "true");
    } else {
      field.toggleAttribute("data-invalid", !valid);
      field.setAttribute("aria-invalid", valid ? "false" : "true");
    }
    const error = errorNodeFor(field);
    if (error) error.hidden = valid;
  };
  const init = () => {
    const form = document.querySelector("[data-contact-form]");
    const complete = document.querySelector("[data-contact-complete]");
    if (!form || !complete) return;
    const fields = [...form.querySelectorAll("[data-contact-field]")];
    for (const field of fields) {
      const revalidate = () => {
        if (field.getAttribute("aria-invalid") === "true") setValidity(field, isFilled(field));
      };
      field.addEventListener("input", revalidate);
      field.addEventListener("change", revalidate);
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstInvalid = fields.reduce((found, field) => {
        const valid = isFilled(field);
        setValidity(field, valid);
        return found ?? (valid ? null : field);
      }, null);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      form.hidden = true;
      complete.hidden = false;
      window.SITE_SCROLL.scrollTo(complete, { block: "center" });
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
