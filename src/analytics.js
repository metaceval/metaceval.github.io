(function () {
  const ANALYTICS_FALLBACK_ENDPOINT = 'https://bilateria.org/app/estadistica/metaceval/track.php';
  const ANALYTICS_FALLBACK_SITE_ID = 'metaceval';
  const ANALYTICS_COOLDOWN_MS = 30 * 60 * 1000;
  const ANALYTICS_TIMEOUT_MS = 4000;

  function getMetaContent(name) {
    const node = document.querySelector(`meta[name="${name}"]`);
    return node ? String(node.getAttribute('content') || '').trim() : '';
  }

  function getAnalyticsConfig() {
    return {
      endpoint: getMetaContent('analytics-endpoint') || ANALYTICS_FALLBACK_ENDPOINT,
      siteId: getMetaContent('analytics-site-id') || ANALYTICS_FALLBACK_SITE_ID
    };
  }

  function shouldTrackAnalytics() {
    const protocol = String(window.location.protocol || '');
    const hostname = String(window.location.hostname || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    return !hostname.endsWith('.local');
  }

  function getStorageKey(siteId) {
    return `analytics:last-visit:${siteId}`;
  }

  function shouldCountVisit(siteId) {
    try {
      const lastVisit = Number.parseInt(window.localStorage.getItem(getStorageKey(siteId)) || '', 10);
      return !Number.isFinite(lastVisit) || (Date.now() - lastVisit) > ANALYTICS_COOLDOWN_MS;
    } catch (error) {
      return true;
    }
  }

  function rememberVisit(siteId) {
    try {
      window.localStorage.setItem(getStorageKey(siteId), String(Date.now()));
    } catch (error) {
      // Analytics must never affect the public app.
    }
  }

  function requestAnalytics() {
    if (!shouldTrackAnalytics()) return;

    const config = getAnalyticsConfig();
    if (!config.endpoint) return;

    const countVisit = shouldCountVisit(config.siteId);
    const callbackName = `__metacAnalytics_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const pageParams = new URLSearchParams(window.location.search || '');
    const query = new URLSearchParams();
    const script = document.createElement('script');
    let settled = false;
    let timeoutId = 0;

    function cleanup() {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    query.set('site', config.siteId);
    query.set('callback', callbackName);
    query.set('page_url', window.location.href);
    query.set('referrer', document.referrer || '');
    if (!countVisit) query.set('summary_only', '1');

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const value = String(pageParams.get(key) || '').trim();
      if (value) query.set(key, value);
    });

    window[callbackName] = function (payload) {
      try {
        if (countVisit && payload && payload.ok) rememberVisit(config.siteId);
      } finally {
        cleanup();
      }
    };

    script.async = true;
    script.src = `${config.endpoint}${config.endpoint.includes('?') ? '&' : '?'}${query.toString()}`;
    script.onerror = cleanup;
    timeoutId = window.setTimeout(cleanup, ANALYTICS_TIMEOUT_MS);
    document.head.appendChild(script);
  }

  function initAnalytics() {
    const run = function () {
      try {
        window.setTimeout(requestAnalytics, 0);
      } catch (error) {
        // Silent failure by design.
      }
    };

    // Un <script async> inyectado antes de que se dispare «load» retrasa ese
    // evento hasta que la peticion termina. Si el servidor de estadisticas se
    // cuelga, «load» no llegaria a dispararse nunca. Por eso se espera siempre
    // a «load» antes de programar nada.
    const programar = function () {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 2500 });
      } else {
        window.setTimeout(run, 0);
      }
    };
    if (document.readyState === 'complete') {
      programar();
      return;
    }
    window.addEventListener('load', programar, { once: true });
  }

  initAnalytics();
})();
