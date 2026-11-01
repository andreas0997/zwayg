/**
 * zwayg — Smart Link Generator & Redirector
 * 
 * All link data is encoded directly into the URL hash as base64 JSON.
 * No backend required. The generated URL contains everything needed
 * to detect the device and redirect.
 * 
 * URL format: page.html#z_BASE64_JSON
 * JSON schema: { n?: string, ios?: string, android?: string, huawei?: string, windows?: string, mac?: string, fallback?: string }
 */

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────
  const HASH_PREFIX = 'z_';
  const PROFILE_PREFIX = 'p_';
  const BASE_URL = getBaseUrl();

  function getBaseUrl() {
    const loc = window.location;
    return `${loc.protocol}//${loc.host}${loc.pathname}`;
  }

  // ─── Device Detection ──────────────────────────────────
  function detectPlatform() {
    const ua = navigator.userAgent || navigator.vendor || '';
    const platform = navigator.platform || '';

    // iOS detection
    if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return 'ios';
    }

    // Android detection
    if (/Android/i.test(ua)) {
      return 'android';
    }

    // Huawei detection (some Huawei devices have Android UA but also specific identifiers)
    if (/HuaweiBrowser|HUAWEI|HMSCore/i.test(ua)) {
      return 'huawei';
    }

    // Windows detection
    if (/Win/i.test(platform) || /Windows/i.test(ua)) {
      return 'windows';
    }

    // macOS detection (non-touch = real Mac)
    if (/Mac/i.test(platform) && navigator.maxTouchPoints <= 1) {
      return 'mac';
    }

    return 'unknown';
  }

  // ─── Encoding / Decoding ───────────────────────────────
  function encodeData(data) {
    const json = JSON.stringify(data);
    // Use encodeURIComponent to handle unicode, then btoa
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return HASH_PREFIX + encoded;
  }

  function decodeData(hash) {
    if (!hash || !hash.startsWith(HASH_PREFIX)) return null;
    try {
      const encoded = hash.slice(HASH_PREFIX.length);
      const json = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(json);
    } catch (e) {
      console.error('[zwayg] Failed to decode link data:', e);
      return null;
    }
  }

  // ─── Redirect Logic ────────────────────────────────────
  function handleRedirect() {
    const hash = window.location.hash.slice(1); // Remove leading #
    const data = decodeData(hash);

    if (!data) return false; // Not a redirect URL

    // Show redirect view, hide generator
    document.getElementById('generator-view').style.display = 'none';
    const redirectView = document.getElementById('redirect-view');
    redirectView.style.display = 'block';

    const platform = detectPlatform();
    console.log(`[zwayg] Detected platform: ${platform}`);

    // Priority chain for redirection
    const redirectMap = {
      ios: data.ios || data.mac || data.fallback,
      android: data.android || data.fallback,
      huawei: data.huawei || data.android || data.fallback,
      windows: data.windows || data.fallback,
      mac: data.mac || data.ios || data.fallback,
      unknown: data.fallback || data.ios || data.android
    };

    const targetUrl = redirectMap[platform];

    if (targetUrl) {
      // Show fallback link after a short delay
      setTimeout(() => {
        const fallbackMsg = document.getElementById('redirect-fallback-msg');
        const fallbackLink = document.getElementById('redirect-fallback-link');
        fallbackLink.href = targetUrl;
        fallbackMsg.style.display = 'block';
      }, 1500);

      // Redirect
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 600);
    } else {
      // No valid URL found
      const redirectMsg = document.querySelector('.redirect-msg');
      redirectMsg.textContent = 'Kein passender Link für dein Gerät gefunden.';
      const spinner = document.querySelector('.redirect-spinner');
      spinner.style.display = 'none';
    }

    return true;
  }

  // ─── Generator Logic ───────────────────────────────────
  function initGenerator() {
    const form = document.getElementById('link-form');
    const resultSection = document.getElementById('result-section');
    const resultUrl = document.getElementById('result-url');
    const copyBtn = document.getElementById('copy-btn');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');
    const newLinkBtn = document.getElementById('new-link-btn');
    const addPlatformsBtn = document.getElementById('add-platforms-btn');
    const scrollToGenerator = document.getElementById('scroll-to-generator');

    // Input fields
    const inputs = {
      name: document.getElementById('link-name'),
      ios: document.getElementById('link-ios'),
      android: document.getElementById('link-android'),
      huawei: document.getElementById('link-huawei'),
      windows: document.getElementById('link-windows'),
      mac: document.getElementById('link-mac'),
      fallback: document.getElementById('link-fallback')
    };

    // Add visual feedback when inputs have values
    Object.values(inputs).forEach(input => {
      input.addEventListener('input', () => {
        input.classList.toggle('has-value', input.value.trim().length > 0);
        // Clear error state on input
        input.classList.remove('error');
        const errorEl = input.parentElement.querySelector('.error-message');
        if (errorEl) errorEl.remove();
      });
    });

    // Scroll to generator
    scrollToGenerator.addEventListener('click', () => {
      document.getElementById('generator-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Show extra platforms
    addPlatformsBtn.addEventListener('click', () => {
      document.querySelectorAll('.collapsible-group').forEach(el => {
        el.style.display = 'block';
      });
      addPlatformsBtn.classList.add('expanded');
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Gather data
      const data = {};
      if (inputs.name.value.trim()) data.n = inputs.name.value.trim();
      if (inputs.ios.value.trim()) data.ios = inputs.ios.value.trim();
      if (inputs.android.value.trim()) data.android = inputs.android.value.trim();
      if (inputs.huawei.value.trim()) data.huawei = inputs.huawei.value.trim();
      if (inputs.windows.value.trim()) data.windows = inputs.windows.value.trim();
      if (inputs.mac.value.trim()) data.mac = inputs.mac.value.trim();
      if (inputs.fallback.value.trim()) data.fallback = inputs.fallback.value.trim();

      // Validate: at least one URL must be provided
      const urlKeys = ['ios', 'android', 'huawei', 'windows', 'mac', 'fallback'];
      const hasAnyUrl = urlKeys.some(key => data[key]);

      if (!hasAnyUrl) {
        // Shake the button and highlight empty fields
        const btn = document.getElementById('generate-btn');
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);

        showToast('Füge mindestens einen Link ein!');
        return;
      }

      // Validate URLs
      for (const key of urlKeys) {
        if (data[key] && !isValidUrl(data[key])) {
          const input = inputs[key];
          input.classList.add('error');
          input.focus();

          // Add error message
          let errorEl = input.parentElement.querySelector('.error-message');
          if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            input.parentElement.appendChild(errorEl);
          }
          errorEl.textContent = 'Bitte gib eine gültige URL ein (mit https://)';
          return;
        }
      }

      // Generate the smart link
      const hash = encodeData(data);
      const smartLink = `${BASE_URL}#${hash}`;

      // Display result
      resultUrl.value = smartLink;
      resultSection.style.display = 'block';
      form.style.display = 'none';

      // Update info dots
      document.getElementById('info-ios').textContent = data.ios ? '✓ iOS' : '✗ iOS';
      document.getElementById('info-android').textContent = data.android ? '✓ Android' : '✗ Android';
      document.getElementById('info-fallback').textContent = data.fallback ? '✓ Fallback' : '✗ Fallback';

      // Scroll to result
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Copy button
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(resultUrl.value).then(() => {
        copyBtn.classList.add('copied');
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
        showToast('Link kopiert! 🌿');

        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyIcon.style.display = 'block';
          checkIcon.style.display = 'none';
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        resultUrl.select();
        document.execCommand('copy');
        showToast('Link kopiert!');
      });
    });

    // New link button
    newLinkBtn.addEventListener('click', () => {
      resultSection.style.display = 'none';
      form.style.display = 'block';
      // Clear inputs
      Object.values(inputs).forEach(input => {
        input.value = '';
        input.classList.remove('has-value');
      });
      // Scroll to form
      document.getElementById('generator-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Logo click resets
    document.getElementById('nav-logo').addEventListener('click', (e) => {
      e.preventDefault();
      resultSection.style.display = 'none';
      form.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Utilities ─────────────────────────────────────────
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ─── Profile: Helpers ──────────────────────────────────
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  // ─── Profile: Encoding / Decoding ──────────────────────
  function encodeProfile(data) {
    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return PROFILE_PREFIX + encoded;
  }

  function decodeProfile(hash) {
    if (!hash || !hash.startsWith(PROFILE_PREFIX)) return null;
    try {
      const encoded = hash.slice(PROFILE_PREFIX.length);
      const json = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(json);
    } catch (e) {
      console.error('[zwayg] Failed to decode profile data:', e);
      return null;
    }
  }

  // ─── Profile: View (renders the public profile page) ───
  function handleProfileView() {
    const hash = window.location.hash.slice(1);
    const data = decodeProfile(hash);
    if (!data) return false;

    document.getElementById('generator-view').style.display = 'none';
    document.getElementById('redirect-view').style.display = 'none';

    const profileView = document.getElementById('profile-view');
    profileView.style.display = 'block';

    const initials = getInitials(data.name);
    const avatarHtml = data.avatar
      ? `<img src="${escapeHtml(data.avatar)}" alt="Avatar" class="profile-avatar-img" onerror="this.style.display='none';document.getElementById('pv-initials').style.display='flex'"><div id="pv-initials" class="profile-avatar-initials" style="display:none;">${escapeHtml(initials)}</div>`
      : `<div class="profile-avatar-initials">${escapeHtml(initials)}</div>`;

    const linksHtml = (data.links || []).map(link => {
      const emoji = link.e ? `<span class="plb-emoji">${escapeHtml(link.e)}</span>` : '';
      return `<a class="profile-link-btn" href="${escapeHtml(link.u)}" target="_blank" rel="noopener noreferrer">${emoji}<span>${escapeHtml(link.t)}</span></a>`;
    }).join('');

    profileView.innerHTML = `
      <div class="profile-bg-effects">
        <div class="bg-orb bg-orb-1"></div>
        <div class="bg-orb bg-orb-2"></div>
      </div>
      <div class="profile-page">
        <div class="profile-header">
          <div class="profile-avatar">${avatarHtml}</div>
          ${data.name ? `<h1 class="profile-name">${escapeHtml(data.name)}</h1>` : ''}
          ${data.bio ? `<p class="profile-bio">${escapeHtml(data.bio)}</p>` : ''}
        </div>
        <div class="profile-links">
          ${linksHtml || '<p style="color:var(--text-muted);text-align:center;font-size:14px;">Keine Links vorhanden.</p>'}
        </div>
        <div class="profile-footer">
          <a href="${escapeHtml(BASE_URL)}" class="profile-brand">🌿 erstellt mit zwayg</a>
        </div>
      </div>
    `;

    return true;
  }

  // ─── Profile: Mode Tabs ────────────────────────────────
  function initModeTabs() {
    const tabSmartlink = document.getElementById('tab-smartlink');
    const tabProfile = document.getElementById('tab-profile');
    const linkForm = document.getElementById('link-form');
    const resultSection = document.getElementById('result-section');
    const profileBuilder = document.getElementById('profile-builder');
    const profileResultSection = document.getElementById('profile-result-section');
    const headerEl = document.getElementById('generator-header');
    const headerTitle = headerEl.querySelector('h2');
    const headerSub = headerEl.querySelector('p');

    tabSmartlink.addEventListener('click', () => {
      tabSmartlink.classList.add('active');
      tabProfile.classList.remove('active');
      linkForm.style.display = 'block';
      resultSection.style.display = 'none';
      profileBuilder.style.display = 'none';
      profileResultSection.style.display = 'none';
      headerTitle.textContent = 'Smart-Link erstellen';
      headerSub.textContent = 'Füge mindestens einen Link ein. Leere Felder werden übersprungen.';
    });

    tabProfile.addEventListener('click', () => {
      tabProfile.classList.add('active');
      tabSmartlink.classList.remove('active');
      linkForm.style.display = 'none';
      resultSection.style.display = 'none';
      profileBuilder.style.display = 'block';
      headerTitle.textContent = 'Profil-Seite erstellen';
      headerSub.textContent = 'Erstelle eine persönliche Seite mit all deinen wichtigen Links.';
    });
  }

  // ─── Profile: Builder Form ─────────────────────────────
  function initProfileBuilder() {
    const linksList = document.getElementById('profile-links-list');
    const addLinkBtn = document.getElementById('add-profile-link-btn');
    const generateBtn = document.getElementById('generate-profile-btn');
    const profileResultSection = document.getElementById('profile-result-section');
    const profileResultUrl = document.getElementById('profile-result-url');
    const copyProfileBtn = document.getElementById('copy-profile-btn');
    const copyProfileIcon = document.getElementById('copy-profile-icon');
    const checkProfileIcon = document.getElementById('check-profile-icon');
    const newProfileBtn = document.getElementById('new-profile-btn');
    const previewLink = document.getElementById('profile-preview-link');

    function addLinkRow() {
      const row = document.createElement('div');
      row.className = 'profile-link-row';

      const emojiInput = document.createElement('input');
      emojiInput.type = 'text';
      emojiInput.className = 'plink-emoji';
      emojiInput.placeholder = '🔗';
      emojiInput.maxLength = 2;

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'plink-title';
      titleInput.placeholder = 'Titel';
      titleInput.maxLength = 60;

      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.className = 'plink-url';
      urlInput.placeholder = 'https://...';

      // Clear error state on input
      [titleInput, urlInput].forEach(el => {
        el.addEventListener('input', () => el.classList.remove('error'));
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-link-btn';
      removeBtn.title = 'Entfernen';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        if (linksList.children.length > 1) row.remove();
      });

      row.appendChild(emojiInput);
      row.appendChild(titleInput);
      row.appendChild(urlInput);
      row.appendChild(removeBtn);
      linksList.appendChild(row);
      return row;
    }

    // Start with 2 empty rows
    addLinkRow();
    addLinkRow();

    addLinkBtn.addEventListener('click', () => {
      const row = addLinkRow();
      row.querySelector('.plink-title').focus();
    });

    generateBtn.addEventListener('click', () => {
      const nameEl = document.getElementById('profile-name');
      const name = nameEl.value.trim();
      const bio = document.getElementById('profile-bio').value.trim();
      const avatar = document.getElementById('profile-avatar').value.trim();

      if (!name) {
        nameEl.classList.add('error');
        showToast('Bitte gib deinen Namen ein!');
        nameEl.focus();
        return;
      }
      nameEl.classList.remove('error');

      const links = [];
      let hasError = false;
      linksList.querySelectorAll('.profile-link-row').forEach(row => {
        const emoji = row.querySelector('.plink-emoji').value.trim();
        const title = row.querySelector('.plink-title').value.trim();
        const url = row.querySelector('.plink-url').value.trim();
        if (!title && !url) return; // skip completely empty rows
        if (title && url && isValidUrl(url)) {
          links.push({ e: emoji, t: title, u: url });
        } else {
          if (!title) row.querySelector('.plink-title').classList.add('error');
          if (!url || !isValidUrl(url)) row.querySelector('.plink-url').classList.add('error');
          hasError = true;
        }
      });

      if (hasError) {
        showToast('Bitte prüfe die Link-Felder!');
        return;
      }
      if (links.length === 0) {
        showToast('Füge mindestens einen Link hinzu!');
        return;
      }

      const profileData = { name };
      if (bio) profileData.bio = bio;
      if (avatar && isValidUrl(avatar)) profileData.avatar = avatar;
      profileData.links = links;

      const hash = encodeProfile(profileData);
      const url = `${BASE_URL}#${hash}`;

      profileResultUrl.value = url;
      if (previewLink) previewLink.href = url;
      generateBtn.style.display = 'none';
      addLinkBtn.style.display = 'none';
      profileResultSection.style.display = 'block';
      profileResultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    copyProfileBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(profileResultUrl.value).then(() => {
        copyProfileBtn.classList.add('copied');
        copyProfileIcon.style.display = 'none';
        checkProfileIcon.style.display = 'block';
        showToast('Link kopiert! 🌿');
        setTimeout(() => {
          copyProfileBtn.classList.remove('copied');
          copyProfileIcon.style.display = 'block';
          checkProfileIcon.style.display = 'none';
        }, 2000);
      }).catch(() => {
        profileResultUrl.select();
        document.execCommand('copy');
        showToast('Link kopiert!');
      });
    });

    newProfileBtn.addEventListener('click', () => {
      profileResultSection.style.display = 'none';
      generateBtn.style.display = 'flex';
      addLinkBtn.style.display = 'flex';
      document.getElementById('profile-name').value = '';
      document.getElementById('profile-bio').value = '';
      document.getElementById('profile-avatar').value = '';
      linksList.innerHTML = '';
      addLinkRow();
      addLinkRow();
    });
  }

  // ─── Intersection Observer for Animations ──────────────
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.step-card').forEach(el => {
      observer.observe(el);
    });
  }

  // ─── Init ──────────────────────────────────────────────
  function init() {
    const hash = window.location.hash.slice(1);

    // Check if this is a profile URL
    if (hash.startsWith(PROFILE_PREFIX)) {
      handleProfileView();
      return;
    }

    // Check if this is a smart-link redirect URL
    const isRedirect = handleRedirect();

    if (!isRedirect) {
      // Show generator with both tabs
      initGenerator();
      initModeTabs();
      initProfileBuilder();
      initScrollAnimations();
    }

    // Handle hash changes (e.g., user navigates back)
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.slice(1);
      if (newHash.startsWith(PROFILE_PREFIX)) {
        handleProfileView();
      } else if (window.location.hash && window.location.hash.startsWith('#' + HASH_PREFIX)) {
        handleRedirect();
      }
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
