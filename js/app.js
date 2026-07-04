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
    if (section === 'settings') {
      renderSettings();
      updateRemindersUI();
    }
    if (section === 'profile') renderProfile();

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
    document.getElementById('habit-category-input').value = 'Study';
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
    document.getElementById('habit-category-input').value = habit.category || 'Study';
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
    const category = document.getElementById('habit-category-input').value;
    const errEl = document.getElementById('habit-error');

    if (!name) {
      errEl.textContent = 'Please enter a habit name.';
      document.getElementById('habit-name-input').classList.add('input-error');
      return;
    }
    errEl.textContent = '';
    document.getElementById('habit-name-input').classList.remove('input-error');

    if (editingHabitId) {
      window.HabitsModule.updateHabit(currentUser, editingHabitId, { name, emoji, color, category });
    } else {
      window.HabitsModule.createHabit(currentUser, { name, emoji, color, category });
    }

    closeModal();
    window.TrackerModule.renderDashboard(currentUser);
    if (currentSection === 'analytics') window.AnalyticsModule.renderAnalytics(currentUser);
    window.TrackerModule.showToast(editingHabitId ? 'Habit updated! ✏️' : 'Habit created! 🌱');
  }

  // ── Reminders ──────────────────────────────────────────────────────────────
  function getReminderSettings(username) {
    try {
      const raw = localStorage.getItem(`ht_reminders_${username}`);
      return raw ? JSON.parse(raw) : { enabled: false, time: '20:00', lastTriggeredDate: '' };
    } catch {
      return { enabled: false, time: '20:00', lastTriggeredDate: '' };
    }
  }

  function saveReminderSettings(username, settings) {
    localStorage.setItem(`ht_reminders_${username}`, JSON.stringify(settings));
  }

  function initReminders() {
    setInterval(checkReminders, 30000);
    checkReminders();
  }

  function checkReminders() {
    if (!currentUser) return;
    const settings = getReminderSettings(currentUser);
    if (!settings.enabled || !settings.time) return;

    const now = new Date();
    const currentHourMin = now.toTimeString().slice(0, 5);
    const today = now.toDateString();

    if (currentHourMin === settings.time && settings.lastTriggeredDate !== today) {
      triggerReminderNotification();
      settings.lastTriggeredDate = today;
      saveReminderSettings(currentUser, settings);
    }
  }

  function triggerReminderNotification() {
    if (Notification.permission === 'granted') {
      const habits = window.HabitsModule.getHabits(currentUser);
      const pendingCount = habits.filter(h => !window.HabitsModule.isCompletedToday(currentUser, h.id)).length;
      let bodyText = "Time to check off your habits today!";
      if (pendingCount > 0) {
        bodyText = `You have ${pendingCount} pending habit${pendingCount !== 1 ? 's' : ''} left for today!`;
      } else {
        bodyText = "All habits completed today! Keep up the amazing work! 🔥";
      }
      new Notification("HabitFlow Reminder", {
        body: bodyText,
        icon: "🔥"
      });
    }
  }

  function updateRemindersUI() {
    const settings = getReminderSettings(currentUser);
    const toggle = document.getElementById('reminder-toggle');
    const timeInput = document.getElementById('reminder-time');
    if (toggle) toggle.checked = settings.enabled;
    if (timeInput) timeInput.value = settings.time || '20:00';
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  function renderProfile() {
    const profile = window.AuthModule.getUserProfile(currentUser);
    if (!profile) return;

    const displayName = profile.displayName || currentUser;
    const email = profile.email || 'No email set';
    const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const av = profile.avatar || window.AuthModule.generateAvatar(currentUser);
    const avEl = document.getElementById('profile-avatar');
    if (avEl) {
      avEl.style.background = av.color;
      avEl.textContent = av.initials;
    }

    setEl('profile-display-name', displayName);
    setEl('profile-username', '@' + currentUser);
    setEl('profile-email-display', email);
    setEl('profile-join-date', `Joined: ${joinDate}`);

    const habits = window.HabitsModule.getHabits(currentUser);
    const total = habits.length;
    const doneToday = habits.filter(h => window.HabitsModule.isCompletedToday(currentUser, h.id)).length;

    const totalCompletions = habits.reduce((sum, h) => {
      return sum + (window.HabitsModule.getCompletions(currentUser, h.id) || []).length;
    }, 0);

    const curStreaks = habits.map(h => window.HabitsModule.getCurrentStreak(currentUser, h.id));
    const longestStreaks = habits.map(h => window.HabitsModule.getLongestStreak(currentUser, h.id));
    const topCur = curStreaks.length ? Math.max(...curStreaks) : 0;
    const topBest = longestStreaks.length ? Math.max(...longestStreaks) : 0;

    const rates30 = habits.map(h => window.HabitsModule.getCompletionRate(currentUser, h.id, 30));
    const avgRate = rates30.length > 0 ? Math.round(rates30.reduce((a, b) => a + b, 0) / rates30.length) : 0;

    const week7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const ds = d.toISOString().split('T')[0];
      const done = habits.filter(h => window.HabitsModule.isCompletedOnDate(currentUser, h.id, ds)).length;
      return { done, total };
    });
    const weekDone = week7.reduce((s, d) => s + d.done, 0);
    const weekTotal = week7.reduce((s, d) => s + d.total, 0);
    const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

    const todayPct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

    const score = Math.min(100, Math.round(
      0.4 * todayPct + 0.3 * weekPct + 0.2 * Math.min(100, (topCur / 30) * 100) + 0.1 * avgRate
    ));

    setEl('profile-total-habits', total);
    setEl('profile-completed-habits', totalCompletions);
    setEl('profile-current-streak', `${topCur}d`);
    setEl('profile-longest-streak', `${topBest}d`);
    setEl('profile-prod-score', score);
    setEl('profile-completion-pct', `${avgRate}%`);
  }

  function openProfileEditModal() {
    const profile = window.AuthModule.getUserProfile(currentUser);
    if (!profile) return;
    document.getElementById('profile-name-input').value = profile.displayName || '';
    document.getElementById('profile-email-input').value = profile.email || '';
    document.getElementById('profile-edit-error').textContent = '';

    const m = document.getElementById('modal-profile');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.add('visible'));
  }

  function closeProfileEditModal() {
    const m = document.getElementById('modal-profile');
    m.classList.remove('visible');
    setTimeout(() => m.classList.add('hidden'), 250);
  }

  function saveProfileChanges() {
    const displayName = document.getElementById('profile-name-input').value.trim();
    const email = document.getElementById('profile-email-input').value.trim();
    const errEl = document.getElementById('profile-edit-error');

    if (!displayName) {
      errEl.textContent = 'Display name cannot be empty.';
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.';
      return;
    }

    const initials = displayName.substring(0, 2).toUpperCase() || currentUser.substring(0, 2).toUpperCase();
    const profile = window.AuthModule.getUserProfile(currentUser);
    const avatar = profile.avatar || window.AuthModule.generateAvatar(currentUser);
    avatar.initials = initials;

    window.AuthModule.updateUserProfile(currentUser, { displayName, email, avatar });
    closeProfileEditModal();
    renderProfile();
    renderSettings();
    window.TrackerModule.showToast('Profile updated! 👤');
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
