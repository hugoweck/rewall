const siteHeader = document.querySelector('.site-header');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isLowPowerDevice =
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  (navigator.deviceMemory && navigator.deviceMemory <= 4);
const SCROLL_STORAGE_KEY = 'mc_scrollY';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

let scrollSaveTimeout = null;

const saveScrollPosition = () => {
  if (scrollSaveTimeout) return;

  scrollSaveTimeout = window.setTimeout(() => {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY || 0));
    scrollSaveTimeout = null;
  }, 150);
};

const getHeaderOffset = () => {
  if (!siteHeader) return 0;
  return Math.round(siteHeader.getBoundingClientRect().height);
};

const scrollToHash = (hash, shouldSmooth = false) => {
  if (!hash) return false;

  const target = document.querySelector(hash);
  if (!target) return false;

  const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset() - 8;
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: shouldSmooth ? 'smooth' : 'auto' });
  return true;
};

const restoreInitialScroll = () => {
  const { hash } = window.location;

  if (hash) {
    scrollToHash(hash, false);
    return;
  }

  const savedScrollY = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || 0);
  if (!savedScrollY) return;

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
    }, 0);
  });
};

window.addEventListener('scroll', saveScrollPosition, { passive: true });

window.addEventListener('pageshow', () => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const clearSavedScroll = () => {
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);
  };

  const navigateWithAnimationReset = (url) => {
    const resetUrl = new URL(url, window.location.href);
    resetUrl.searchParams.set('resetAnimations', '1');
    window.location.assign(`${resetUrl.pathname}${resetUrl.search}${resetUrl.hash}`);
  };

  if (window.location.search.includes('resetAnimations=1')) {
    clearSavedScroll();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const cleanedUrl = `${window.location.pathname}${window.location.hash}`;
    history.replaceState(history.state, '', cleanedUrl || window.location.pathname);
  }

  document.querySelectorAll('.brand').forEach((brandLink) => {
    brandLink.addEventListener('click', (event) => {
      const targetUrl = new URL(brandLink.href, window.location.href);

      clearSavedScroll();

      const isSamePage = targetUrl.pathname === window.location.pathname && targetUrl.origin === window.location.origin;

      if (isSamePage) {
        event.preventDefault();
        navigateWithAnimationReset(targetUrl);
      }
    });
  });

  restoreInitialScroll();

  document.querySelectorAll('.js-smart-back').forEach((link) => {
    const fallbackHref = link.getAttribute('href') || link.dataset.fallback || '../index.html';
    link.dataset.fallback = fallbackHref;

    if (!document.referrer) return;

    const referrerUrl = new URL(document.referrer, window.location.href);
    if (referrerUrl.origin !== window.location.origin) return;

    link.setAttribute('href', `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`);
  });

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href*="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    const targetUrl = new URL(anchor.href, window.location.href);
    const isSamePage = targetUrl.pathname === window.location.pathname && targetUrl.origin === window.location.origin;

    if (!isSamePage || !targetUrl.hash) return;

    const didScroll = scrollToHash(targetUrl.hash, !prefersReducedMotion);
    if (!didScroll) return;

    event.preventDefault();
    history.pushState({ hash: targetUrl.hash }, '', targetUrl.hash);
  });
});

window.addEventListener('popstate', () => {
  if (window.location.hash) {
    scrollToHash(window.location.hash, false);
    return;
  }

  const savedScrollY = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || 0);
  window.scrollTo({ top: Math.max(0, savedScrollY), left: 0, behavior: 'auto' });
});

window.addEventListener('hashchange', () => {
  if (!window.location.hash) return;
  scrollToHash(window.location.hash, false);
});

let lastScrollY = window.scrollY;

const updateHeaderState = () => {
  if (!siteHeader) return;

  const currentScrollY = window.scrollY;
  const isPastTop = currentScrollY > 20;
  const isScrollingDown = currentScrollY > lastScrollY;
  const scrollDelta = Math.abs(currentScrollY - lastScrollY);

  siteHeader.classList.toggle('is-scrolled', isPastTop);

  if (!isPastTop) {
    siteHeader.classList.remove('is-hidden');
  } else if (scrollDelta > 6) {
    siteHeader.classList.toggle('is-hidden', isScrollingDown);
  }

  lastScrollY = currentScrollY;
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll('.reveal').forEach((section) => revealObserver.observe(section));

const initServiceCardAnimation = () => {
  const servicesGrid = document.querySelector('.service-grid');
  const serviceCards = [...document.querySelectorAll('.service-card')];

  if (!servicesGrid || !serviceCards.length) return;

  serviceCards.forEach((card, index) => {
    card.style.setProperty('--stagger-delay', `${index * 90}ms`);
  });

  if (prefersReducedMotion) {
    serviceCards.forEach((card) => card.classList.add('is-visible'));
    return;
  }

  const mobile = window.matchMedia('(max-width: 768px)').matches;

  let revealTimers = [];

  const clearTimers = () => {
    revealTimers.forEach((timer) => window.clearTimeout(timer));
    revealTimers = [];
  };

  const playReveal = () => {
    clearTimers();
    serviceCards.forEach((card, index) => {
      card.classList.remove('is-visible');
      const timer = window.setTimeout(() => {
        card.classList.add('is-visible');
      }, index * 90);
      revealTimers.push(timer);
    });
  };

  const playReverse = () => {
    clearTimers();
    [...serviceCards].reverse().forEach((card, index) => {
      const timer = window.setTimeout(() => {
        card.classList.remove('is-visible');
      }, index * 70);
      revealTimers.push(timer);
    });
  };

  const serviceCardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playReveal();
          return;
        }

        playReverse();
      });
    },
    {
      threshold: mobile ? 0.25 : 0.45,
      rootMargin: mobile ? '0px 0px -18% 0px' : '0px 0px -22% 0px'
    }
  );

  serviceCardObserver.observe(servicesGrid);
};

const initProjectCardAnimation = () => {
  const projectSection = document.querySelector('#projekt');
  const projectCards = [...document.querySelectorAll('.project-grid .project-item')];
  if (!projectSection || !projectCards.length) return;
  const isDesktopViewport = window.matchMedia('(min-width: 769px)').matches;
  let ticking = false;
  let isInView = false;
  let maxOffset = 0;

  projectCards.forEach((card) => {
    card.classList.remove('reveal-side-desktop');
    card.style.removeProperty('--project-shift');
    card.style.removeProperty('--slide-direction');
  });

  if (prefersReducedMotion || !isDesktopViewport) {
    return;
  }

  const recalculateOffset = () => {
    maxOffset = Math.max(window.innerWidth * 0.82, 720);
    projectSection.style.setProperty('--project-max-offset', `${maxOffset}px`);
  };

  projectCards.forEach((card, index) => {
    const comesFromLeft = index % 2 === 0;
    card.classList.add('reveal-side-desktop');
    card.style.setProperty('--slide-direction', comesFromLeft ? '-1' : '1');
    card.style.setProperty('--project-shift', '1');
  });

  const updateCards = () => {
    ticking = false;
    if (!isInView) return;

    const sectionRect = projectSection.getBoundingClientRect();
    const scrollRange = sectionRect.height + window.innerHeight;
    const rawProgress = (window.innerHeight - sectionRect.top) / scrollRange;
    const sectionProgress = Math.max(0, Math.min(1, rawProgress));
    const distanceFromCenter = Math.abs(sectionProgress - 0.5);

    // Keep cards parked in the center for a wider scroll window on desktop
    // so they do not immediately drift away after reaching the ideal position.
    const centerHoldRange = 0.14;
    const normalizedDistance = Math.max(0, (distanceFromCenter - centerHoldRange) / (0.5 - centerHoldRange));
    const projectShift = Math.min(1, normalizedDistance);

    projectCards.forEach((card) => {
      card.style.setProperty('--project-shift', projectShift.toFixed(4));
    });
  };

  const queueUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateCards);
  };

  const projectCardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== projectSection) return;
        isInView = entry.isIntersecting;
        if (!isInView) {
          projectCards.forEach((card) => {
            card.style.setProperty('--project-shift', '1');
          });
          return;
        }

        queueUpdate();
      });
    },
    { threshold: 0, rootMargin: '0px' }
  );

  recalculateOffset();
  projectCardObserver.observe(projectSection);

  window.addEventListener('resize', () => {
    recalculateOffset();
    queueUpdate();
  });

  window.addEventListener('scroll', queueUpdate, { passive: true });
};

initServiceCardAnimation();
initProjectCardAnimation();

// PROCESS ANIMATION START
const initProcessAnimation = () => {
  const processSection = document.querySelector('#process');
  const processWrap = processSection?.querySelector('[data-process]');
  const processSteps = processSection ? [...processSection.querySelectorAll('[data-step]')] : [];
  const disableProcessAnimation = prefersReducedMotion || isLowPowerDevice;

  if (!processSection || !processWrap || !processSteps.length) return;

  const setDoneSteps = (doneIndex) => {
    processSteps.forEach((step, index) => {
      const isDone = index <= doneIndex;
      step.classList.toggle('is-done', isDone);
      step.classList.toggle('is-pending', !isDone);
    });
  };

  if (disableProcessAnimation) {
    processSection.classList.add('process-static');
    processWrap.style.setProperty('--progress', '100%');
    setDoneSteps(processSteps.length - 1);
    return;
  }

  const activationRange = 0.7;
  const widthUpdateThreshold = 0.5;
  let ticking = false;
  let isInView = false;
  let lastProgressWidth = -1;
  let currentStepIndex = -1;

  processSteps.forEach((step) => {
    step.classList.add('is-pending');
  });

  const updateProcessState = () => {
    ticking = false;

    if (!isInView) return;

    const sectionRect = processSection.getBoundingClientRect();
    const scrollRange = sectionRect.height + window.innerHeight;
    const rawProgress = (window.innerHeight - sectionRect.top) / scrollRange;
    const clampedProgress = Math.max(0, Math.min(1, rawProgress));
    const effectiveProgress = Math.max(0, Math.min(1, clampedProgress / activationRange));
    const progressWidth = effectiveProgress * 100;

    if (Math.abs(progressWidth - lastProgressWidth) > widthUpdateThreshold) {
      processWrap.style.setProperty('--progress', `${progressWidth}%`);
      lastProgressWidth = progressWidth;
    }

    const nextStepIndex = Math.max(
      -1,
      Math.min(processSteps.length - 1, Math.floor(effectiveProgress * processSteps.length) - 1)
    );

    if (nextStepIndex !== currentStepIndex) {
      currentStepIndex = nextStepIndex;
      setDoneSteps(currentStepIndex);
    }
  };

  const requestProcessUpdate = () => {
    if (!isInView || ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProcessState);
  };

  const processViewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isInView = entry.isIntersecting;

        if (isInView) {
          requestProcessUpdate();
        }
      });
    },
    {
      threshold: 0,
      rootMargin: '15% 0px 15% 0px'
    }
  );

  processViewportObserver.observe(processSection);

  window.addEventListener(
    'scroll',
    () => {
      requestProcessUpdate();
    },
    { passive: true }
  );

  window.addEventListener('resize', requestProcessUpdate);
};

initProcessAnimation();
// PROCESS ANIMATION END

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const target = Number(el.dataset.target);
      const duration = 1200;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(progress * target).toLocaleString('sv-SE');
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.4 }
);

document.querySelectorAll('.counter').forEach((counter) => counterObserver.observe(counter));

const initContactForm = () => {
  const form = document.querySelector('#contactForm');
  const submitButton = document.querySelector('#contactSubmit');
  const formStatus = document.querySelector('#formStatus');

  if (!form || !submitButton || !formStatus) return;

  const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
  const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
  const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';

  if (window.emailjs) {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!window.emailjs) {
      formStatus.textContent = 'Formulärtjänsten kunde inte laddas. Försök igen senare eller ring oss.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Skickar…';
    formStatus.textContent = 'Skickar…';

    const formData = new FormData(form);
    const templateParams = {
      to_email: 'info@mceffektivbygg.se',
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      service: formData.get('service'),
      message: formData.get('message')
    };

    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      formStatus.textContent = 'Tack! Vi återkommer inom 24h.';
      form.reset();
    } catch (error) {
      formStatus.textContent = 'Något gick fel. Testa igen eller kontakta oss på 070-912 31 63.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Skicka förfrågan';
    }
  });
};

initContactForm();
