'use strict';

window.AuthModule = (() => {
  const KEYS = {
    USERS: 'ht_users',
    SESSION: 'ht_session',
    userData: (u) => `ht_data_${(u || '').toLowerCase().trim()}`,
  };

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '__ht_s4lt_k3y__');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getUsers() {
    try {
      const raw = localStorage.getItem(KEYS.USERS);
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error('HabitFlow: Failed to save users to localStorage', e);
    }
  }

  function generateAvatar(username) {
    const palette = ['#6C63FF','#00D4AA','#FF6B6B','#FFB347','#A855F7','#EC4899','#3B82F6','#10B981'];
    const uname = (username || 'U').trim();
    const color = palette[uname.charCodeAt(0) % palette.length];
    return { color, initials: uname.substring(0, 2).toUpperCase() };
  }

  function findUser(query) {
    if (!query || typeof query !== 'string') return null;
    const q = query.toLowerCase().trim();
    if (!q) return null;
    const users = getUsers();

    // 1. Direct key match
    if (users[q]) return users[q];

    // 2. Case-insensitive key match
    for (const k of Object.keys(users)) {
      if (k.toLowerCase().trim() === q) return users[k];
    }

    // 3. Match against username, displayName, or email properties
    for (const k of Object.keys(users)) {
      const u = users[k];
      if (!u) continue;
      if (u.username && u.username.toLowerCase().trim() === q) return u;
      if (u.displayName && u.displayName.toLowerCase().trim() === q) return u;
      if (u.email && u.email.toLowerCase().trim() === q) return u;
    }

    return null;
  }

  async function register(username, password, displayName) {
    if (!username || typeof username !== 'string') throw new Error('Username must be at least 3 characters');
    const key = username.toLowerCase().trim();
    if (!key || key.length < 3) throw new Error('Username must be at least 3 characters');
    if (!/^[a-z0-9_]+$/.test(key)) throw new Error('Username can only contain letters, numbers, and underscores');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

    const users = getUsers();
    if (users[key] || findUser(key)) throw new Error('Username already taken');

    const hash = await hashPassword(password);
    users[key] = {
      username: key,
      displayName: (displayName || '').trim() || key,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      avatar: generateAvatar(key),
    };
    saveUsers(users);

    const initialData = { habits: [], completions: {}, theme: 'dark' };
    localStorage.setItem(KEYS.userData(key), JSON.stringify(initialData));
    return users[key];
  }

  async function login(username, password) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error('Please enter your username');
    }
    if (!password) {
      throw new Error('Please enter your password');
    }

    const user = findUser(username);
    if (!user) throw new Error('No account found with that username');
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Incorrect password');

    const session = {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar || generateAvatar(user.username),
      loginTime: new Date().toISOString(),
    };
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(KEYS.SESSION);
  }

  function getCurrentSession() {
    try {
      const raw = sessionStorage.getItem(KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function isLoggedIn() {
    return getCurrentSession() !== null;
  }

  function getUserProfile(username) {
    return findUser(username);
  }

  function updateUserProfile(username, updates) {
    const users = getUsers();
    const user = findUser(username);
    if (!user) return null;
    const key = user.username;
    users[key] = { ...users[key], ...updates };
    saveUsers(users);

    const session = getCurrentSession();
    if (session && session.username.toLowerCase().trim() === key.toLowerCase().trim()) {
      if (updates.displayName) session.displayName = updates.displayName;
      if (updates.avatar) session.avatar = updates.avatar;
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    }
    return users[key];
  }

  return { register, login, logout, getCurrentSession, isLoggedIn, generateAvatar, getUserProfile, updateUserProfile, findUser };
})();

