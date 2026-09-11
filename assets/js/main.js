/*
 * This port's only interactive behaviors: the mobile navigation toggle and
 * the in-page search modal. Both are standalone vanilla JS: no jQuery, no
 * carousel, no Ghost runtime hooks. The site must remain fully readable
 * with JavaScript disabled; neither script blocks rendering or navigation,
 * they only add optional interactivity on top of plain HTML links/buttons.
 */
(function () {
  var burger = document.querySelector('.gh-burger');
  if (!burger) return;

  burger.addEventListener('click', function () {
    document.body.classList.toggle('is-head-open');
    var expanded = document.body.classList.contains('is-head-open');
    burger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });
})();

/*
 * Accessible search modal (Ghost Search-style popover). Opens in place of
 * navigating to a standalone /search/ page, traps focus, and lazily loads
 * Pagefind's own UI bundle (/pagefind/pagefind-ui.js, /pagefind/pagefind-ui.css)
 * the first time it is opened. Pagefind's assets are generated after the
 * Hugo build by `pagefind --site public` and may be missing or fail to load
 * (offline builds, blocked requests, a stale/absent index); that failure
 * path is handled explicitly with a status message instead of a broken UI.
 */
(function () {
  var modal = document.getElementById('search-modal');
  var triggers = document.querySelectorAll('[data-search-trigger]');
  if (!modal || !triggers.length) return;

  // The rest of the page, rendered outside this modal in baseof.html, must
  // be made inert while the modal is open so assistive technology and
  // keyboard/pointer input cannot reach it. `inert` is supported by all
  // current evergreen browsers; aria-hidden is set alongside it as a
  // no-op-safe fallback for older assistive tech that doesn't yet honor
  // the inert attribute.
  var siteEl = document.querySelector('.site');
  var dialog = modal.querySelector('.search-modal-dialog');
  var statusEl = modal.querySelector('[data-search-status]');
  var resultsEl = modal.querySelector('#search');
  var FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  var lastFocused = null;
  var pagefindAssetsPromise = null;

  function loadStyle(href) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('link[href="' + href + '"]')) {
        resolve();
        return;
      }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = function () { resolve(); };
      link.onerror = function () { reject(new Error('Failed to load ' + href)); };
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.PagefindUI) {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(script);
    });
  }

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.hidden = !message;
  }

  function focusSearchInput() {
    var input = resultsEl && resultsEl.querySelector('input');
    if (input) {
      input.focus();
      return true;
    }
    return false;
  }

  // Fetches Pagefind's UI bundle once and caches the promise; a failed
  // attempt is not cached so a later open can retry a transient error.
  function loadPagefindAssets() {
    if (!pagefindAssetsPromise) {
      pagefindAssetsPromise = Promise.all([
        loadStyle('/pagefind/pagefind-ui.css'),
        loadScript('/pagefind/pagefind-ui.js')
      ]).catch(function (error) {
        pagefindAssetsPromise = null;
        throw error;
      });
    }
    return pagefindAssetsPromise;
  }

  function ensurePagefind() {
    setStatus('Loading search…');

    return loadPagefindAssets().then(function () {
      if (typeof window.PagefindUI !== 'function') {
        throw new Error('Pagefind UI script did not register PagefindUI');
      }
      if (!resultsEl.dataset.pagefindReady) {
        new window.PagefindUI({
          element: '#search',
          showSubResults: true,
          showImages: false,
          autofocus: true
        });
        resultsEl.dataset.pagefindReady = 'true';
      }
      setStatus('');
      if (!focusSearchInput()) {
        window.requestAnimationFrame(focusSearchInput);
      }
    }).catch(function (error) {
      setStatus('Search is unavailable right now. Please try again later.');
      if (window.console && console.error) {
        console.error('Pagefind failed to load', error);
      }
    });
  }

  function trapFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.prototype.filter.call(
      dialog.querySelectorAll(FOCUSABLE_SELECTOR),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openModal(trigger) {
    if (!modal.hidden) return;
    lastFocused = trigger || document.activeElement;
    modal.hidden = false;
    document.body.classList.add('search-modal-open');
    if (siteEl) {
      siteEl.setAttribute('inert', '');
      siteEl.setAttribute('aria-hidden', 'true');
    }
    document.addEventListener('keydown', trapFocus, true);
    dialog.focus();
    ensurePagefind();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('search-modal-open');
    if (siteEl) {
      siteEl.removeAttribute('inert');
      siteEl.removeAttribute('aria-hidden');
    }
    document.removeEventListener('keydown', trapFocus, true);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  Array.prototype.forEach.call(triggers, function (trigger) {
    trigger.addEventListener('click', function () {
      openModal(trigger);
    });
  });

  Array.prototype.forEach.call(modal.querySelectorAll('[data-search-dismiss]'), function (dismisser) {
    dismisser.addEventListener('click', closeModal);
  });
})();
