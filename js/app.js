'use strict';

window.AppModule = (() => {
  const EMOJIS = ['⭐','💪','🏃','📚','🧘','🥗','💧','😴','🎯','✍️','🏋️','🚴','🎨','🎵','🧹','💊','🌅','🌿','💡','🤝','🧠','❤️','🏊','🍎','💻','🌍','🦷','🛁','🧗','📝'];

  let currentUser = null;
  let currentSection = 'dashboard';
  let editingHabitId = null;

  // ── Section routing ────────────────────────────────────────────────────────
  function navigate(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.section === section));
    document.querySelectorAll('.app-section').forEach(el =>
      el.classList.toggle('hidden', el.id !== `section-${section}`));

    if (section === 'dashboard') window.TrackerModule.renderDashboard(currentUser);
    if (section === 'analytics') window.AnalyticsModule.renderAnalytics(currentUser);
    if (section === 'settings') renderSettings();

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
  }

  // ── Auth views ─────────────────────────────────────────────────────────────
  function showAuth() {
    document.getElementById('view-auth').classList.remove('hidden');
    document.getElementById('view-app').classList.add('hidden');
  }

  function showApp(session) {
    currentUser = session.username;
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');

    // Apply saved theme
    const theme = window.HabitsModule.getUserTheme(currentUser);
    applyTheme(theme);

    // Populate sidebar user info
    const av = session.avatar || window.AuthModule.generateAvatar(session.username);
    const avatarEl = document.getElementById('sidebar-avatar');
    if (avatarEl) { avatarEl.style.background = av.color; avatarEl.textContent = av.initials; }
    setEl('sidebar-name', session.displayName);
    setEl('sidebar-username', '@' + session.username);

    navigate('dashboard');
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (currentUser) window.HabitsModule.setUserTheme(currentUser, next);
  }

  // ── Habit modal ────────────────────────────────────────────────────────────
  function openAddModal() {
    editingHabitId = null;
    setEl('modal-title', 'New Habit');
    document.getElementById('habit-name-input').value = '';
    document.getElementById('habit-color-input').value = '#6C63FF';
    selectEmoji('⭐');
    openModal();
  }

  function openEditModal(habitId) {
    const data = window.HabitsModule.getUserData(currentUser);
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return;
    editingHabitId = habitId;
    setEl('modal-title', 'Edit Habit');
    document.getElementById('habit-name-input').value = habit.name;
    document.getElementById('habit-color-input').value = habit.color;
    selectEmoji(habit.emoji);
    openModal();
  }

  function openModal() {
    const m = document.getElementById('modal-habit');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.add('visible'));
    setTimeout(() => document.getElementById('habit-name-input')?.focus(), 150);
  }

  function closeModal() {
    const m = document.getElementById('modal-habit');
    m.classList.remove('visible');
    setTimeout(() => m.classList.add('hidden'), 250);
    editingHabitId = null;
  }

  function selectEmoji(emoji) {
    setEl('selected-emoji', emoji);
    document.querySelectorAll('.emoji-opt').forEach(b =>
      b.classList.toggle('selected', b.textContent === emoji));
  }

  function saveHabit() {
    const name = document.getElementById('habit-name-input').value.trim();
    const emoji = document.getElementById('selected-emoji').textContent;
    const color = document.getElementById('habit-color-input').value;
    const errEl = document.getElementById('habit-error');

    if (!name) {
      errEl.textContent = 'Please enter a habit name.';
      document.getElementById('habit-name-input').classList.add('input-error');
      return;
    }
    errEl.textContent = '';
    document.getElementById('habit-name-input').classList.remove('input-error');

    if (editingHabitId) {
      window.HabitsModule.updateHabit(currentUser, editingHabitId, { name, emoji, color });
    } else {
      window.HabitsModule.createHabit(currentUser, { name, emoji, color });
    }

    closeModal();
    window.TrackerModule.renderDashboard(currentUser);
    if (currentSection === 'analytics') window.AnalyticsModule.renderAnalytics(currentUser);
    window.TrackerModule.showToast(editingHabitId ? 'Habit updated! ✏️' : 'Habit created! 🌱');
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  function renderSettings() {
    const session = window.AuthModule.getCurrentSession();
    if (!session) return;
    setEl('settings-display-name', session.displayName);
    setEl('settings-username', '@' + session.username);
    const av = session.avatar || window.AuthModule.generateAvatar(session.username);
    const avEl = document.getElementById('settings-avatar');
    if (avEl) { avEl.style.background = av.color; avEl.textContent = av.initials; }
    const theme = window.HabitsModule.getUserTheme(currentUser);
    const themeBtn = document.getElementById('settings-theme-btn');
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode';
  }

  // ── Auth tab switching ─────────────────────────────────────────────────────
  function switchTab(tab) {
    ['login','signup'].forEach(t => {
      document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
      document.getElementById(`form-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    document.getElementById(`${tab}-error`).textContent = '';
  }

  // ── Event binding ──────────────────────────────────────────────────────────
  function bindEvents() {
    // Auth tabs
    document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('tab-signup')?.addEventListener('click', () => switchTab('signup'));

    // Login
    document.getElementById('login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('[type=submit]');
      const errEl = document.getElementById('login-error');
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        const session = await window.AuthModule.login(
          document.getElementById('login-user').value,
          document.getElementById('login-pass').value
        );
        showApp(session);
      } catch (err) {
        errEl.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Sign In';
      }
    });

    // Signup
    document.getElementById('signup-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('[type=submit]');
      const errEl = document.getElementById('signup-error');
      const pass = document.getElementById('signup-pass').value;
      const confirm = document.getElementById('signup-confirm').value;
      if (pass !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
      btn.disabled = true; btn.textContent = 'Creating account…';
      try {
        await window.AuthModule.register(
          document.getElementById('signup-user').value,
          pass,
          document.getElementById('signup-name').value
        );
        const session = await window.AuthModule.login(
          document.getElementById('signup-user').value, pass);
        showApp(session);
      } catch (err) {
        errEl.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(el =>
      el.addEventListener('click', () => navigate(el.dataset.section)));

    // Theme
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('settings-theme-btn')?.addEventListener('click', () => {
      toggleTheme(); renderSettings();
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      window.AuthModule.logout();
      currentUser = null;
      showAuth();
    });

    // Add habit button
    document.getElementById('add-habit-btn')?.addEventListener('click', openAddModal);

    // Modal actions
    document.getElementById('save-habit-btn')?.addEventListener('click', saveHabit);
    document.getElementById('cancel-habit-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
    document.getElementById('habit-name-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveHabit();
    });

    // Emoji grid
    const emojiGrid = document.getElementById('emoji-grid');
    if (emojiGrid) {
      EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-opt';
        btn.textContent = emoji;
        btn.addEventListener('click', () => selectEmoji(emoji));
        emojiGrid.appendChild(btn);
      });
    }

    // Mobile menu
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () =>
      document.getElementById('sidebar')?.classList.toggle('open'));

    // Password show/hide
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.previousElementSibling;
        if (!inp) return;
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    // Default theme from system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    bindEvents();

    const session = window.AuthModule.getCurrentSession();
    if (session) showApp(session);
    else showAuth();
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { openAddModal, openEditModal, navigate, toggleTheme };
})();
