'use strict';

window.HabitsModule = (() => {
  function dataKey(username) { return `ht_data_${username}`; }

  function getUserData(username) {
    try {
      const raw = localStorage.getItem(dataKey(username));
      const data = raw ? JSON.parse(raw) : {};
      if (!data.habits) data.habits = [];
      if (!data.completions) data.completions = {};
      if (!data.theme) data.theme = 'dark';
      return data;
    } catch { return { habits: [], completions: {}, theme: 'dark' }; }
  }

  function saveUserData(username, data) {
    localStorage.setItem(dataKey(username), JSON.stringify(data));
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayStr() {
    return dateStr(new Date());
  }

  function dateStr(date) {
    return date.toISOString().split('T')[0];
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  function getHabits(username) {
    const data = getUserData(username);
    return data.habits.filter(h => !h.archived).sort((a, b) => a.order - b.order);
  }

  function createHabit(username, { name, emoji, color }) {
    const data = getUserData(username);
    const habit = {
      id: genId(),
      name: name.trim(),
      emoji: emoji || '⭐',
      color: color || '#6C63FF',
      createdAt: new Date().toISOString(),
      order: data.habits.length,
      archived: false,
    };
    data.habits.push(habit);
    saveUserData(username, data);
    return habit;
  }

  function updateHabit(username, habitId, updates) {
    const data = getUserData(username);
    const idx = data.habits.findIndex(h => h.id === habitId);
    if (idx === -1) throw new Error('Habit not found');
    data.habits[idx] = { ...data.habits[idx], ...updates };
    saveUserData(username, data);
    return data.habits[idx];
  }

  function deleteHabit(username, habitId) {
    const data = getUserData(username);
    data.habits = data.habits.filter(h => h.id !== habitId);
    delete data.completions[habitId];
    saveUserData(username, data);
  }

  function reorderHabits(username, orderedIds) {
    const data = getUserData(username);
    orderedIds.forEach((id, idx) => {
      const h = data.habits.find(h => h.id === id);
      if (h) h.order = idx;
    });
    saveUserData(username, data);
  }

  // ─── COMPLETIONS ──────────────────────────────────────────────────────────
  function getCompletions(username, habitId) {
    const data = getUserData(username);
    return data.completions[habitId] || [];
  }

  function isCompletedOnDate(username, habitId, ds) {
    return getCompletions(username, habitId).includes(ds);
  }

  function isCompletedToday(username, habitId) {
    return isCompletedOnDate(username, habitId, todayStr());
  }

  function toggleCompletion(username, habitId, ds) {
    const data = getUserData(username);
    if (!data.completions[habitId]) data.completions[habitId] = [];
    const idx = data.completions[habitId].indexOf(ds);
    if (idx === -1) {
      data.completions[habitId].push(ds);
      data.completions[habitId].sort();
      saveUserData(username, data);
      return true;
    } else {
      data.completions[habitId].splice(idx, 1);
      saveUserData(username, data);
      return false;
    }
  }

  // ─── STREAKS ──────────────────────────────────────────────────────────────
  function getCurrentStreak(username, habitId) {
    const completions = getCompletions(username, habitId);
    if (!completions.length) return 0;

    const sorted = [...completions].sort().reverse();
    const today = todayStr();
    const yesterday = dateStr(new Date(Date.now() - 86400000));

    // Only count if completed today or yesterday (not stale)
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

    let streak = 0;
    let cur = new Date(sorted[0]);
    while (true) {
      if (completions.includes(dateStr(cur))) {
        streak++;
        cur = new Date(cur.getTime() - 86400000);
      } else break;
    }
    return streak;
  }

  function getLongestStreak(username, habitId) {
    const completions = getCompletions(username, habitId);
    if (!completions.length) return 0;

    const sorted = [...completions].sort();
    let longest = 1;
    let cur = 1;

    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      if (diff === 1) { cur++; longest = Math.max(longest, cur); }
      else if (diff > 1) { cur = 1; }
    }
    return longest;
  }

  function getCompletionRate(username, habitId, days = 30) {
    const completions = getCompletions(username, habitId);
    const data = getUserData(username);
    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const today = new Date();
    const createdAt = new Date(habit.createdAt);
    let count = 0;
    let denom = 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      if (d < createdAt) break;
      denom++;
      if (completions.includes(dateStr(d))) count++;
    }

    return denom > 0 ? Math.round((count / denom) * 100) : 0;
  }

  // ─── ANALYTICS DATA ───────────────────────────────────────────────────────
  function getWeeklyData(username) {
    const habits = getHabits(username);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const ds = dateStr(d);
      return {
        date: ds,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: ds === todayStr(),
        completed: habits.filter(h => isCompletedOnDate(username, h.id, ds)).length,
        total: habits.length,
      };
    });
  }

  function getLast90DaysHeatmap(username) {
    const habits = getHabits(username);
    return Array.from({ length: 90 }, (_, i) => {
      const d = new Date(Date.now() - (89 - i) * 86400000);
      const ds = dateStr(d);
      return {
        date: ds,
        count: habits.filter(h => isCompletedOnDate(username, h.id, ds)).length,
        total: habits.length,
      };
    });
  }

  // ─── THEME ────────────────────────────────────────────────────────────────
  function getUserTheme(username) {
    return getUserData(username).theme || 'dark';
  }

  function setUserTheme(username, theme) {
    const data = getUserData(username);
    data.theme = theme;
    saveUserData(username, data);
  }

  return {
    getUserData, saveUserData,
    getHabits, createHabit, updateHabit, deleteHabit, reorderHabits,
    getCompletions, isCompletedOnDate, isCompletedToday, toggleCompletion,
    getCurrentStreak, getLongestStreak, getCompletionRate,
    getWeeklyData, getLast90DaysHeatmap,
    getUserTheme, setUserTheme,
  };
})();
