/* ═══════════════════════════════════════════════
   20-SONLI MAKTAB — script.js
   ═══════════════════════════════════════════════ */

// ─── Year ───────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ─── Theme ─────────────────────────────────────
const html = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const saved = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', saved);

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ─── Navbar scroll effect ───────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  document.getElementById('back-top').classList.toggle('visible', window.scrollY > 320);
}, { passive: true });

// ─── Mobile menu ───────────────────────────────
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;

menuToggle.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
});

mobileMenu.querySelectorAll('.mob-link').forEach(link => {
  link.addEventListener('click', () => {
    menuOpen = false;
    mobileMenu.classList.remove('open');
  });
});

document.addEventListener('click', e => {
  if (menuOpen && !mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
    menuOpen = false;
    mobileMenu.classList.remove('open');
  }
});

// ─── Back to top ────────────────────────────────
document.getElementById('back-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Scroll animations ──────────────────────────
const animObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.animate-in').forEach(el => animObserver.observe(el));

// ─── Animated counters ──────────────────────────
function animateCounter(el) {
  const target = Number(el.dataset.target);
  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString('uz-UZ');
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ─── Active nav highlight ───────────────────────
const sections = document.querySelectorAll('section[id], header[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--primary)' : '';
      });
    }
  });
}, { threshold: 0.45 });

sections.forEach(s => sectionObserver.observe(s));

// ─── Contact Form ───────────────────────────────
const submitBtn = document.getElementById('submit-btn');
const btnText   = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const statusEl  = document.getElementById('form-status');

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.style.display = loading ? 'none' : 'inline';
  btnLoader.style.display = loading ? 'inline-block' : 'none';
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = 'form-status ' + type;
  statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearStatus() {
  statusEl.textContent = '';
  statusEl.className = 'form-status';
}

function getField(id) {
  return document.getElementById(id).value.trim();
}

function validateForm() {
  const name    = getField('name');
  const email   = getField('email');
  const message = getField('message');

  if (name.length < 2) {
    showStatus('⚠️ Ism kamida 2 ta belgidan iborat bo\'lishi kerak.', 'error');
    document.getElementById('name').focus();
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showStatus('⚠️ Email manzili noto\'g\'ri formatda.', 'error');
    document.getElementById('email').focus();
    return false;
  }
  if (message.length < 5) {
    showStatus('⚠️ Xabar kamida 5 ta belgidan iborat bo\'lishi kerak.', 'error');
    document.getElementById('message').focus();
    return false;
  }
  return true;
}

submitBtn.addEventListener('click', async () => {
  clearStatus();
  if (!validateForm()) return;

  const payload = {
    name:    getField('name'),
    email:   getField('email'),
    message: getField('message')
  };

  setLoading(true);

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = Array.isArray(data.errors) ? data.errors.join(' ') : (data.message || 'Xatolik yuz berdi.');
      showStatus('❌ ' + msg, 'error');
      return;
    }

    showStatus('✅ ' + data.message, 'success');
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('message').value = '';

  } catch {
    showStatus('⚠️ Server bilan ulanishda muammo. Iltimos, qayta urinib ko\'ring yoki telefon orqali bog\'laning.', 'error');
  } finally {
    setLoading(false);
  }
});

// Clear status when user starts typing again
['name', 'email', 'message'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', clearStatus);
});






/* ═══════════════════════════════════════════════
   CURSOR · GLOW · SCROLL BAR · PARTICLES · CLOCK
   ═══════════════════════════════════════════════ */
(function initFX() {

  // ── Custom cursor ──────────────────────────────
  const dot  = document.getElementById('c-dot');
  const ring = document.getElementById('c-ring');
  const glow = document.getElementById('c-glow');
  if (!dot || !ring || !glow) return;

  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let rx = mx, ry = my, gx = mx, gy = my;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  (function loop() {
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    // Ring — medium lag
    rx += (mx - rx) * .15; ry += (my - ry) * .15;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    // Glow — heavy lag, big radius
    gx += (mx - gx) * .06; gy += (my - gy) * .06;
    glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
    requestAnimationFrame(loop);
  })();

  // Hover grow effect
  document.querySelectorAll('a, button, .card, .stat-card, .feature-card, .subject-card, .news-card, .leader-card, .gallery-item, .nav-item, .btn, input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hov'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hov'));
  });

  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

  // ── Scroll progress bar ────────────────────────
  const bar = document.getElementById('scroll-bar');
  if (bar) {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
  }

  // ── Floating background particles ─────────────
  const pbg = document.getElementById('ptcl-bg');
  if (pbg) {
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'ptcl';
      const s = 3 + Math.random() * 12;
      Object.assign(p.style, {
        width: s + 'px', height: s + 'px',
        left: Math.random() * 100 + 'vw',
        animationDuration: (10 + Math.random() * 22) + 's',
        animationDelay: '-' + (Math.random() * 22) + 's',
        opacity: 0.2 + Math.random() * 0.55,
      });
      pbg.appendChild(p);
    }
  }

  // ── Live clock ─────────────────────────────────
  const clk = document.getElementById('live-clock');
  if (clk) {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      const ss = String(now.getSeconds()).padStart(2,'0');
      clk.textContent = `${hh}:${mm}:${ss}`;
    };
    tick(); setInterval(tick, 1000);
  }

})();
