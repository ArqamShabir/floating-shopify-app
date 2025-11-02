(function () {
  if (window.__FP_WIDGET_INIT__) return;
  window.__FP_WIDGET_INIT__ = true;

  var defaults = {
    enabled: true,
    textTemplate: "{{count}} people are viewing this store",
    position: "bottom-right",
    countMin: 80,
    countMax: 140,
    updateIntervalMs: 10000,
    backgroundColor: "#111827",
    textColor: "#ffffff",
    borderRadius: 12,
    shadow: true,
    showOnMobile: true,
    zIndex: 9999
  };

  function loadSettings() {
    try {
      var el = document.getElementById('fp-settings');
      if (!el) return defaults;
      var json = el.textContent && el.textContent.trim();
      if (!json || json === 'null') return defaults;
      var parsed = JSON.parse(json);
      return Object.assign({}, defaults, parsed || {});
    } catch (e) {
      return defaults;
    }
  }

  function loadContext() {
    try {
      var el = document.getElementById('fp-context');
      if (!el) return {};
      var json = el.textContent && el.textContent.trim();
      if (!json) return {};
      return JSON.parse(json) || {};
    } catch (e) { return {}; }
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function pickCount(s) {
    var min = Number(s.countMin || 0);
    var max = Number(s.countMax || 0);
    if (min > max) { var t = min; min = max; max = t; }
    var range = Math.max(0, max - min);
    var value = min + Math.round(Math.random() * range);
    return clamp(value, min, max);
  }

  function computePositionStyle(pos, zIndex) {
    var style = { position: 'fixed', zIndex: String(zIndex || 9999) };
    if (/bottom/.test(pos)) style.bottom = '16px'; else style.top = '16px';
    if (/right/.test(pos)) style.right = '16px'; else style.left = '16px';
    return style;
  }

  function applyStyles(el, styles) {
    for (var k in styles) { if (Object.prototype.hasOwnProperty.call(styles, k)) el.style[k] = styles[k]; }
  }

  function render() {
    var s = loadSettings();
    var ctx = loadContext();

    // Respect mobile visibility
    var isMobile = window.matchMedia('(max-width: 749px)').matches; // Shopify common breakpoint
    if (!s.enabled) return;
    if (!s.showOnMobile && isMobile) return;

    // Visibility by page type
    if (s.visibility) {
      var pt = (ctx.pageType || '').toLowerCase();
      if (pt.includes('product') && s.visibility.showOnProduct === false) return;
      if (pt.includes('collection') && s.visibility.showOnCollection === false) return;
      if ((pt === 'index' || pt.includes('home')) && s.visibility.showOnHome === false) return;
      if (pt.includes('cart') && s.visibility.showOnCart === false) return;
    }

    // Exclusions
    var handle = (ctx.productHandle || '').toString();
    if (Array.isArray(s.excludeProductHandles) && s.excludeProductHandles.indexOf(handle) >= 0) return;
    var id = (ctx.productId || '').toString();
    if (Array.isArray(s.excludeProductIds) && s.excludeProductIds.map(String).indexOf(id) >= 0) return;
    if (Array.isArray(s.excludeTags) && Array.isArray(ctx.productTags)) {
      var tags = (ctx.productTags || []).map(function(t){return (t||'').toString().toLowerCase();});
      var deny = (s.excludeTags || []).map(function(t){return (t||'').toString().toLowerCase();});
      var hit = deny.some(function(tag){ return tags.indexOf(tag) >= 0; });
      if (hit) return;
    }

    var count = pickCount(s);
    var text = (s.textTemplate || defaults.textTemplate).replace('{{count}}', String(count));

    var container = document.createElement('div');
    container.setAttribute('data-fp-widget', '1');
    applyStyles(container, computePositionStyle(s.position, s.zIndex));
    var borderRadius = (s.variant === 'pill') ? '999px' : (s.borderRadius || 0) + 'px';
    var bg = s.backgroundColor;
    var style = {
      background: bg,
      color: s.textColor,
      padding: Math.max(0, s.paddingY || 10) + 'px ' + Math.max(0, s.paddingX || 14) + 'px',
      borderRadius: borderRadius,
      boxShadow: s.shadow ? '0 6px 20px rgba(0,0,0,0.2)' : 'none',
      fontSize: Math.max(10, Math.min(24, s.fontSize || 14)) + 'px',
      fontWeight: '500',
      fontFamily: 'inherit',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      opacity: String(Math.max(0, Math.min(1, (typeof s.opacity === 'number' ? s.opacity : 1)))) ,
      border: (s.borderWidth ? Math.max(0, s.borderWidth) + 'px solid ' + (s.borderColor || '#000') : 'none')
    };
    if (s.variant === 'glass') {
      style.background = 'rgba(17,24,39,0.5)';
      style.backdropFilter = s.backdropBlur ? 'saturate(180%) blur(8px)' : 'none';
    }
    applyStyles(container, style);

    // Content with optional icon
    if (s.iconType === 'emoji' && s.iconEmoji) {
      var span = document.createElement('span');
      span.textContent = s.iconEmoji;
      span.setAttribute('aria-hidden', 'true');
      container.appendChild(span);
    } else if (s.iconType === 'url' && s.iconUrl) {
      var img = document.createElement('img');
      img.src = s.iconUrl; img.alt = '';
      img.style.width = '18px'; img.style.height = '18px';
      container.appendChild(img);
    }
    var textNode = document.createElement('span');
    textNode.textContent = text;
    container.appendChild(textNode);

    // Avoid duplicates
    var existing = document.querySelector('[data-fp-widget="1"]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var attach = function () {
      if (!document.body) return;
      document.body.appendChild(container);
      // simple entrance animation
      container.style.transition = 'opacity 300ms ease, transform 300ms ease';
      container.style.opacity = '0';
      container.style.transform = 'translateY(8px)';
      requestAnimationFrame(function () {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attach);
    } else {
      attach();
    }

    // Live update count
    var timer = setInterval(function () {
      try {
        var s2 = loadSettings();
        if (!s2.enabled) { clearInterval(timer); if (container.parentNode) container.parentNode.removeChild(container); return; }
        var c = pickCount(s2);
        var t = (s2.textTemplate || defaults.textTemplate).replace('{{count}}', String(c));
        // Update text span only (last child)
        var last = container.querySelector('span:last-child');
        if (last) last.textContent = t; else container.textContent = t;
      } catch (_) { /* noop */ }
    }, Math.max(1000, s.updateIntervalMs || defaults.updateIntervalMs));
  }

  try { render(); } catch (e) { /* swallow */ }
})();
