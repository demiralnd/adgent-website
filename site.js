/* Adgent · consent and measurement.

   Loaded from every page's <head> by build.py (deferred). Nothing here touches
   layout or behaviour; app.js owns the site's interactions.

   Optional measurement stays off until the visitor explicitly enables it:
   - Consent Mode defaults are set to "denied" before anything else can run.
   - GA4 (/metrics) and the GTM container (/tagging) are injected only after the
     visitor accepts the matching category. Both are first-party paths that
     vercel.json rewrites to the Google tag gateway origins; build.py audit()
     check 7 fails the build if the two files ever disagree.
   - The banner is vanilla-cookieconsent 3.1.0 (self-hosted, assets/vendor/),
     themed by /consent.css to the v2 tokens.
   Ported from the live site (adgent-website/site.js) on 2026-10-11. */
/* Legacy anchors. The live site's /built-from-chat had four sections that
   other pages and shared links point at (#campaign, #plan, #dashboards,
   #agents). vercel.json 308s the page to /campaign-build and the browser keeps
   the fragment, which no server rule can read; three of those sections are
   pages of their own now, so forward them here. */
(function () {
  if (location.pathname !== '/campaign-build') return;
  var to = { '#plan': '/planning', '#dashboards': '/dashboards', '#agents': '/agents' }[location.hash];
  if (to) location.replace(to);
})();

(function () {
  var d = document;
  var dataLayer = window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
  window.gtag('set', 'ads_data_redaction', true);

  /* The tags load on the production host only. /metrics and /tagging exist
     only behind vercel.json's rewrites, so anywhere else (serve.py, a preview
     deployment) they would 404 and, on a preview, count test traffic as real.
     To test the accept path locally: localStorage.setItem('adgent-measure','1'). */
  var MEASURE = location.hostname === 'adgent.app';
  try { MEASURE = MEASURE || localStorage.getItem('adgent-measure') === '1'; } catch (e) {}

  function loadGoogleAnalytics() {
    if (d.querySelector('script[data-adgent-ga]')) return;
    var script = d.createElement('script');
    script.async = true;
    /* First-party path, not googletagmanager.com: /metrics is rewritten in
       vercel.json to g-1ncs2zfmlr.fps.goog, the tag gateway origin for this
       measurement ID. No trailing slash: trailingSlash:false would 308 it
       away, and the origin 404s the slashless path, so the rewrite adds the
       slash on the way out. */
    script.src = '/metrics';
    script.setAttribute('data-adgent-ga', '');
    d.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', 'G-1NCS2ZFMLR');
    window.gtag('config', 'G-7BSLN2NWVP');
  }

  function loadGoogleTagManager() {
    if (d.querySelector('script[data-adgent-gtm]')) return;
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var script = d.createElement('script');
    script.async = true;
    /* Same pattern: /tagging is rewritten to gtm-mwr4pvrf.fps.goog, this
       container's gateway origin. The container ID lives in the origin. */
    script.src = '/tagging';
    script.setAttribute('data-adgent-gtm', '');
    d.head.appendChild(script);
  }

  /* CookieConsent focuses its banner as soon as it opens. Wait for both stylesheets:
     without the vendor's fixed positioning, that focus scrolls to the end of the
     document. Keep loading non-blocking, but never mount an unstyled consent UI. */
  var consentStyles = ['/assets/vendor/cookieconsent-3.1.0.css', '/consent.css?v=bfd309d7'].map(function (href) {
    return new Promise(function (resolve, reject) {
      var link = d.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = function () { reject(new Error('Could not load consent stylesheet: ' + href)); };
      d.head.appendChild(link);
    });
  });

  Promise.all([import('/assets/vendor/cookieconsent-3.1.0.esm.js'), Promise.all(consentStyles)]).then(function (loaded) {
    var cc = loaded[0];
    function syncConsent() {
      var analytics = cc.acceptedCategory('analytics');
      var advertising = cc.acceptedCategory('advertising');
      window.gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: advertising ? 'granted' : 'denied',
        ad_user_data: advertising ? 'granted' : 'denied',
        ad_personalization: advertising ? 'granted' : 'denied'
      });
      if (!MEASURE) return;
      if (analytics) loadGoogleAnalytics();
      if (advertising) loadGoogleTagManager();
    }

    return cc.run({
      mode: 'opt-in',
      revision: 1,
      cookie: {
        name: 'adgent_cookie_consent',
        expiresAfterDays: 182,
        sameSite: 'Lax'
      },
      guiOptions: {
        consentModal: {
          layout: 'box inline',
          position: 'bottom right',
          equalWeightButtons: true
        },
        preferencesModal: {
          layout: 'box',
          equalWeightButtons: true
        }
      },
      categories: {
        necessary: { readOnly: true },
        analytics: {
          autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }], reloadPage: false }
        },
        advertising: {
          autoClear: { cookies: [{ name: /^_gcl/ }, { name: '_fbp' }], reloadPage: false }
        }
      },
      onConsent: syncConsent,
      onChange: syncConsent,
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              label: 'Cookie consent',
              title: 'Your choice, before measurement.',
              description: 'Analytics and advertising tags stay off until you allow them. <a href="/privacy">Privacy policy</a>',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject optional',
              showPreferencesBtn: 'Choose'
            },
            preferencesModal: {
              title: 'Cookie settings',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject optional',
              savePreferencesBtn: 'Save choice',
              closeIconLabel: 'Close cookie settings',
              sections: [
                {
                  description: 'Optional tags are off unless you enable them. You can change this choice anytime from Cookie settings in the footer.'
                },
                {
                  title: 'Necessary',
                  description: 'Remembers your cookie choice and supports essential security. Always on.',
                  linkedCategory: 'necessary'
                },
                {
                  title: 'Analytics',
                  description: 'Google Analytics measures visits and page use only after you enable it.',
                  linkedCategory: 'analytics'
                },
                {
                  title: 'Advertising',
                  description: 'Google Tag Manager loads advertising measurement tags and Microsoft Clarity (heatmaps and session recordings of website pages) only after you enable it.',
                  linkedCategory: 'advertising'
                }
              ]
            }
          }
        }
      }
    }).then(function () {
      d.querySelectorAll('[data-cookie-settings]').forEach(function (button) {
        button.addEventListener('click', function () { cc.showPreferences(); });
      });
      /* The inline banner is not a dialog: nothing behind it is blocked, so the
         keyboard must not be either. The vendor traps Tab inside the banner from a
         listener on <html> (no option disables it), which also pulled focus back
         from the page. While only the banner is open, Tab is stopped before that
         listener and the browser's own focus order runs; Escape means Reject
         optional. The preferences modal is a real dialog and keeps its trap; with
         the mobile drawer open, app.js owns the keyboard (the banner is inert). */
      var drawer = d.getElementById('drawer');
      addEventListener('keydown', function (e) {
        var cls = d.documentElement.classList;
        if (!cls.contains('show--consent') || cls.contains('show--preferences')) return;
        if (drawer && !drawer.hidden) return;
        if (e.key === 'Tab') { e.stopImmediatePropagation(); return; }
        if (e.key === 'Escape') {
          e.stopImmediatePropagation();
          cc.acceptCategory([]);
          cc.hide();
        }
      }, true);
    });
  }).catch(function (error) {
    console.error('Cookie settings failed to load; optional measurement remains disabled.', error);
  });
})();
