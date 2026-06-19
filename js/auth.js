'use strict';

window.AuthModule = (() => {
  const KEYS = {
    USERS: 'ht_users',
    SESSION: 'ht_session',
    userData: (u) => `ht_data_${u}`,
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
    try { return JSON.parse(localStorage.getItem(KEYS.USERS) || '{}'); }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  function generateAvatar(username) {
    const palette = ['#6C63FF','#00D4AA','#FF6B6B','#FFB347','#A855F7','#EC4899','#3B82F6','#10B981'];
    const color = palette[username.charCodeAt(0) % palette.length];
    return { color, initials: username.substring(0, 2).toUpperCase() };
  }

  async function register(username, password, displayName) {
    const users = getUsers();
    const key = username.toLowerCase().trim();
    if (!key || key.length < 3) throw new Error('Username must be at least 3 characters');
    if (!/^[a-z0-9_]+$/.test(key)) throw new Error('Username can only contain letters, numbers, and underscores');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    if (users[key]) throw new Error('Username already taken');

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
    const users = getUsers();
    const key = username.toLowerCase().trim();
    if (!users[key]) throw new Error('No account found with that username');
    const hash = await hashPassword(password);
    if (hash !== users[key].passwordHash) throw new Error('Incorrect password');

    const session = {
      username: key,
      displayName: users[key].displayName,
      avatar: users[key].avatar,
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

  return { register, login, logout, getCurrentSession, isLoggedIn, generateAvatar };
})();
