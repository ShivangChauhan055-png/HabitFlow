'use strict';

window.TrackerModule = (() => {
  function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function createProgressRing(pct, color, size = 60) {
    const r = size / 2 - 5;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(Math.max(pct, 0), 100) / 100) * circ;
    const cx = size / 2;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="progress-ring">
        <circle class="ring-track" cx="${cx}" cy="${cx}" r="${r}"
          fill="none" stroke-width="4"/>
        <circle class="ring-fill" cx="${cx}" cy="${cx}" r="${r}"
          fill="none" stroke="${color}" stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cx})"/>
      </svg>`;
  }

  function triggerConfetti(originX, originY) {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#6C63FF','#00D4AA','#FF6B6B','#FFB347','#FFFFFF','#A855F7'];
    for (let i = 0; i < 36; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const speed = 80 + Math.random() * 140;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 120;
      const rot = Math.random() * 720;
      const isRect = Math.random() > 0.5;
      Object.assign(el.style, {
        left: originX + 'px',
        top: originY + 'px',
        background: colors[Math.floor(Math.random() * colors.length)],
        width: isRect ? '8px' : '10px',
        height: isRect ? '12px' : '10px',
        borderRadius: isRect ? '2px' : '50%',
        '--vx': vx + 'px',
        '--vy': vy + 'px',
        '--rot': rot + 'deg',
      });
      container.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    }
  }

  function renderHabitCard(habit, username) {
    const done = window.HabitsModule.isCompletedToday(username, habit.id);
    const streak = window.HabitsModule.getCurrentStreak(username, habit.id);
    const best = window.HabitsModule.getLongestStreak(username, habit.id);
    const rate = window.HabitsModule.getCompletionRate(username, habit.id, 30);
    const ringPct = done ? 100 : rate;
    const ring = createProgressRing(ringPct, habit.color, 58);

    const card = document.createElement('div');
    card.className = `habit-card${done ? ' is-done' : ''}`;
    card.dataset.habitId = habit.id;
    card.draggable = true;

    card.innerHTML = `
      <div class="hc-drag-handle" title="Drag to reorder">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div class="hc-top">
        <div class="hc-emoji" style="background:${habit.color}22; box-shadow: 0 0 0 1px ${habit.color}44;">
          ${habit.emoji}
        </div>
        <div class="hc-info">
          <div class="hc-name">${escHtml(habit.name)}</div>
          <div class="hc-badges">
            ${streak > 0
              ? `<span class="badge badge-streak ${streak >= 7 ? 'badge-fire' : ''}">🔥 ${streak}d streak</span>`
              : `<span class="badge badge-start">Start today!</span>`}
            <span class="badge badge-rate">${rate}% / 30d</span>
          </div>
        </div>
        <div class="hc-actions">
          <button class="icon-btn edit-btn" data-id="${habit.id}" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn del-btn" data-id="${habit.id}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="hc-bottom">
        <div class="hc-ring-wrap">
          ${ring}
          <span class="ring-label">${done ? '✓' : rate + '%'}</span>
        </div>
        <div class="hc-stats">
          <div class="hc-stat">
            <span class="stat-val">${streak}</span>
            <span class="stat-lbl">Current</span>
          </div>
          <div class="hc-stat-divider"></div>
          <div class="hc-stat">
            <span class="stat-val">${best}</span>
            <span class="stat-lbl">Best</span>
          </div>
        </div>
        <button class="complete-btn${done ? ' done' : ''}" data-id="${habit.id}" style="--hc:${habit.color}">
          ${done
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Done!</span>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg><span>Mark Done</span>`}
        </button>
      </div>`;

    return card;
  }

  // ── Circular Progress Ring (larger, for progress cards) ─────────────────
  function createDashRing(pct, color, size = 96, strokeW = 8) {
    const r = size / 2 - strokeW;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(Math.max(pct, 0), 100) / 100) * circ;
    const cx = size / 2;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="progress-ring" style="transform:rotate(-90deg)">
        <circle class="ring-track" cx="${cx}" cy="${cx}" r="${r}"
          fill="none" stroke-width="${strokeW}"/>
        <circle cx="${cx}" cy="${cx}" r="${r}"
          fill="none" stroke="${color}" stroke-width="${strokeW}"
          stroke-linecap="round"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);"/>
      </svg>`;
  }

  function renderDashboard(username) {
    const session = window.AuthModule.getCurrentSession();
    const habits = window.HabitsModule.getHabits(username);
    const today = new Date();

    // ── Greeting ────────────────────────────────────────────────────────────
    const hour = today.getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = session?.displayName || username;
    setEl('greeting-text', `${greet}, ${name}! 👋`);
    setEl('today-date', today.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }));

    // ── Quote ────────────────────────────────────────────────────────────────
    const q = window.QuotesModule.getTodayQuote();
    setEl('quote-text', `"${q.text}"`);
    setEl('quote-author', `— ${q.author}`);

    // ── Core stats ──────────────────────────────────────────────────────────
    const doneToday = habits.filter(h => window.HabitsModule.isCompletedToday(username, h.id)).length;
    const total = habits.length;
    const todayPct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

    // Best current streak across all habits
    const allCurStreaks = habits.map(h => window.HabitsModule.getCurrentStreak(username, h.id));
    const topCurStreak  = allCurStreaks.length ? Math.max(...allCurStreaks) : 0;

    // Best longest streak across all habits
    const allLongest = habits.map(h => window.HabitsModule.getLongestStreak(username, h.id));
    const topLongest = allLongest.length ? Math.max(...allLongest) : 0;

    // Weekly % (last 7 days, across all habits)
    const weeklyData = window.HabitsModule.getWeeklyData(username);
    const weeklyTotals = weeklyData.reduce((a, d) => ({ done: a.done + d.completed, total: a.total + d.total }), { done: 0, total: 0 });
    const weeklyPct = weeklyTotals.total > 0 ? Math.round((weeklyTotals.done / weeklyTotals.total) * 100) : 0;

    // Monthly % (last 30 days)
    const monthlyRates = habits.map(h => window.HabitsModule.getCompletionRate(username, h.id, 30));
    const monthlyPct = monthlyRates.length > 0
      ? Math.round(monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length)
      : 0;

    // Perfect days in last 30 (all habits done)
    let perfectDays = 0;
    if (total > 0) {
      const heatmap = window.HabitsModule.getLast90DaysHeatmap(username).slice(-30);
      perfectDays = heatmap.filter(d => d.total > 0 && d.count === d.total).length;
    }

    // ── Populate stat cards ──────────────────────────────────────────────────
    setEl('dash-total-habits',    total);
    setEl('dash-completed-today', doneToday);
    setEl('dash-current-streak',  topCurStreak + (topCurStreak === 1 ? 'd' : 'd'));
    setEl('dash-longest-streak',  topLongest + (topLongest === 1 ? 'd' : 'd'));
    setEl('dash-completion-pct',  todayPct + '%');
    setEl('dash-perfect-days',    perfectDays);

    // ── Circular progress cards ──────────────────────────────────────────────
    const todayColor   = '#6C63FF';
    const weeklyColor  = '#00D4AA';
    const monthlyColor = '#FFB347';

    const todayWrap = document.getElementById('prog-today-wrap');
    if (todayWrap) {
      todayWrap.innerHTML = createDashRing(todayPct, todayColor, 100, 9)
        + `<span class="dash-circular-pct" id="prog-today-pct">${todayPct}%</span>`;
    }
    setEl('prog-today-sub', total === 0 ? 'No habits yet' : `${doneToday} of ${total} done`);

    const weeklyWrap = document.getElementById('prog-weekly-wrap');
    if (weeklyWrap) {
      weeklyWrap.innerHTML = createDashRing(weeklyPct, weeklyColor, 100, 9)
        + `<span class="dash-circular-pct" id="prog-weekly-pct">${weeklyPct}%</span>`;
    }
    setEl('prog-weekly-sub', `${weeklyTotals.done} completions`);

    const monthlyWrap = document.getElementById('prog-monthly-wrap');
    if (monthlyWrap) {
      monthlyWrap.innerHTML = createDashRing(monthlyPct, monthlyColor, 100, 9)
        + `<span class="dash-circular-pct" id="prog-monthly-pct">${monthlyPct}%</span>`;
    }
    setEl('prog-monthly-sub', `Avg across all habits`);

    // ── Legacy summary bar (hidden but populated for safety) ─────────────────
    const summaryWrap = document.getElementById('summary-ring');
    if (summaryWrap) {
      summaryWrap.innerHTML = createProgressRing(todayPct, '#6C63FF', 84)
        + `<span class="summary-pct">${todayPct}%</span>`;
    }
    setEl('summary-text', total === 0 ? 'No habits yet' : `${doneToday} of ${total} completed today`);
    setEl('summary-streak', `🏆 Keep it up!`);

    // ── Recent Activity ──────────────────────────────────────────────────────
    const activityList = document.getElementById('dash-activity-list');
    if (activityList) {
      if (habits.length === 0) {
        activityList.innerHTML = '<div class="activity-empty">No activity yet — start tracking!</div>';
      } else {
        // Show today's habits sorted: done first
        const sorted = [...habits].sort((a, b) => {
          const ad = window.HabitsModule.isCompletedToday(username, a.id);
          const bd = window.HabitsModule.isCompletedToday(username, b.id);
          return bd - ad;
        });
        const shown = sorted.slice(0, 6);
        activityList.innerHTML = shown.map((h, i) => {
          const done = window.HabitsModule.isCompletedToday(username, h.id);
          const streak = window.HabitsModule.getCurrentStreak(username, h.id);
          const streakText = streak > 0 ? `🔥 ${streak}d streak` : 'Start today!';
          return `
            <div class="activity-item" style="animation-delay:${i * 0.06}s">
              <div class="activity-emoji" style="background:${h.color}22">
                ${h.emoji}
              </div>
              <div class="activity-info">
                <div class="activity-name">${escHtml(h.name)}</div>
                <div class="activity-time">${streakText}</div>
              </div>
              <span class="activity-badge ${done ? 'done' : 'pending'}">
                ${done ? 'Done ✓' : 'Pending'}
              </span>
            </div>`;
        }).join('');
      }
    }

    // ── Quick Action buttons ─────────────────────────────────────────────────
    const qaAdd = document.getElementById('qa-add-habit');
    if (qaAdd) {
      qaAdd.onclick = () => window.AppModule.openAddModal();
    }
    const qaAnalytics = document.getElementById('qa-analytics');
    if (qaAnalytics) {
      qaAnalytics.onclick = () => window.AppModule.navigate('analytics');
    }
    const qaSettings = document.getElementById('qa-settings');
    if (qaSettings) {
      qaSettings.onclick = () => window.AppModule.navigate('settings');
    }
    const qaCompleteAll = document.getElementById('qa-complete-all');
    if (qaCompleteAll) {
      qaCompleteAll.onclick = () => {
        const ds = new Date().toISOString().split('T')[0];
        let anyMarked = false;
        habits.forEach(h => {
          if (!window.HabitsModule.isCompletedToday(username, h.id)) {
            window.HabitsModule.toggleCompletion(username, h.id, ds);
            anyMarked = true;
          }
        });
        if (anyMarked) {
          showToast('All habits marked done! 🎉');
          triggerConfetti(window.innerWidth / 2, window.innerHeight / 3);
        } else {
          showToast('All habits already done! 🏆');
        }
        renderDashboard(username);
      };
    }

    // ── Habits grid ──────────────────────────────────────────────────────────
    const grid = document.getElementById('habits-grid');
    if (!grid) return;
    grid.innerHTML = '';

    setEl('habits-count', `${total} habit${total !== 1 ? 's' : ''}`);

    if (habits.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌱</div>
          <h3>No habits yet</h3>
          <p>Start your journey — add your first habit below.</p>
          <button class="btn btn-primary" id="empty-cta-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Your First Habit
          </button>
        </div>`;
      document.getElementById('empty-cta-btn')?.addEventListener('click', () => {
        window.AppModule.openAddModal();
      });
      return;
    }

    habits.forEach(habit => {
      const card = renderHabitCard(habit, username);
      grid.appendChild(card);
    });

    // Complete buttons
    grid.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const ds = new Date().toISOString().split('T')[0];
        const nowDone = window.HabitsModule.toggleCompletion(username, id, ds);
        if (nowDone) {
          const r = btn.getBoundingClientRect();
          triggerConfetti(r.left + r.width / 2, r.top + r.height / 2);
          showToast('Great job! Keep it up! 🎉');
        }
        renderDashboard(username);
      });
    });

    // Edit / delete
    grid.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => window.AppModule.openEditModal(btn.dataset.id));
    });
    grid.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this habit? This cannot be undone.')) {
          window.HabitsModule.deleteHabit(username, btn.dataset.id);
          renderDashboard(username);
          showToast('Habit deleted.');
        }
      });
    });

    setupDragAndDrop(grid, username);
  }

  function setupDragAndDrop(grid, username) {
    let dragged = null;
    grid.querySelectorAll('.habit-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragged = card;
        setTimeout(() => card.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        grid.querySelectorAll('.habit-card').forEach(c => c.classList.remove('drag-over'));
        const ids = [...grid.querySelectorAll('.habit-card')].map(c => c.dataset.habitId);
        window.HabitsModule.reorderHabits(username, ids);
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        if (card === dragged) return;
        card.classList.add('drag-over');
        const mid = card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
        grid.insertBefore(dragged, e.clientY < mid ? card : card.nextSibling);
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    });
  }

  function showToast(msg) {
    const wrap = document.getElementById('toast-container');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 2800);
  }

  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return { renderDashboard, triggerConfetti, showToast, createProgressRing };
})();
