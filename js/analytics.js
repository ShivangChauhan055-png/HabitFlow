'use strict';

window.AnalyticsModule = (() => {
  let weeklyChart = null;

  function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function renderAnalytics(username) {
    renderWeeklyChart(username);
    renderHeatmap(username);
    renderLeaderboard(username);
    renderStatCards(username);
  }

  function renderStatCards(username) {
    const habits = window.HabitsModule.getHabits(username);
    const today = new Date().toISOString().split('T')[0];

    const totalHabits = habits.length;
    const completedToday = habits.filter(h => window.HabitsModule.isCompletedOnDate(username, h.id, today)).length;
    const avgRate = habits.length > 0
      ? Math.round(habits.reduce((s, h) => s + window.HabitsModule.getCompletionRate(username, h.id, 30), 0) / habits.length)
      : 0;
    const topStreak = habits.length > 0
      ? Math.max(...habits.map(h => window.HabitsModule.getCurrentStreak(username, h.id)))
      : 0;

    setEl('stat-habits', totalHabits);
    setEl('stat-today', `${completedToday}/${totalHabits}`);
    setEl('stat-avg', `${avgRate}%`);
    setEl('stat-streak', `${topStreak}d`);
  }

  function renderWeeklyChart(username) {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    if (weeklyChart) { weeklyChart.destroy(); weeklyChart = null; }

    const weeklyData = window.HabitsModule.getWeeklyData(username);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#8888BB' : '#6666AA';

    const completedColors = weeklyData.map(d => {
      if (d.total === 0) return 'rgba(108,99,255,0.2)';
      const r = d.completed / d.total;
      if (r >= 0.8) return '#00D4AA';
      if (r >= 0.5) return '#6C63FF';
      if (r > 0) return '#FF6B6B';
      return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    });

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.map(d => d.isToday ? 'Today' : d.label),
        datasets: [
          {
            label: 'Completed',
            data: weeklyData.map(d => d.completed),
            backgroundColor: completedColors,
            borderRadius: 10,
            borderSkipped: false,
            order: 1,
          },
          {
            label: 'Total',
            data: weeklyData.map(d => d.total),
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderRadius: 10,
            borderSkipped: false,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1A1A2E' : '#fff',
            titleColor: isDark ? '#EEE' : '#1A1A2E',
            bodyColor: isDark ? '#8888BB' : '#6666AA',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 12 } },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, stepSize: 1, font: { family: 'Inter', size: 12 } },
            border: { display: false },
          },
        },
      },
    });
  }

  function renderHeatmap(username) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = window.HabitsModule.getLast90DaysHeatmap(username);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    data.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      const ratio = day.total > 0 ? day.count / day.total : 0;
      const lvl = ratio === 0 ? 0 : ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
      cell.dataset.lvl = lvl;
      const d = new Date(day.date);
      cell.title = `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}: ${day.count}/${day.total} habits`;
      grid.appendChild(cell);
    });

    // Month labels
    const monthBar = document.getElementById('heatmap-months');
    if (monthBar) {
      monthBar.innerHTML = '';
      let lastMonth = -1;
      data.forEach((day, i) => {
        const m = new Date(day.date).getMonth();
        if (m !== lastMonth) {
          const span = document.createElement('span');
          span.className = 'hm-month';
          span.textContent = MONTHS[m];
          span.style.gridColumnStart = i + 1;
          monthBar.appendChild(span);
          lastMonth = m;
        }
      });
    }
  }

  function renderLeaderboard(username) {
    const el = document.getElementById('streak-leaderboard');
    if (!el) return;

    const habits = window.HabitsModule.getHabits(username);
    if (!habits.length) {
      el.innerHTML = '<p class="empty-msg">Add some habits to see your streak leaderboard!</p>';
      return;
    }

    const rows = habits
      .map(h => ({
        habit: h,
        current: window.HabitsModule.getCurrentStreak(username, h.id),
        best: window.HabitsModule.getLongestStreak(username, h.id),
        rate: window.HabitsModule.getCompletionRate(username, h.id, 30),
      }))
      .sort((a, b) => b.current - a.current || b.rate - a.rate);

    const medals = ['🥇','🥈','🥉'];

    el.innerHTML = rows.map((row, i) => `
      <div class="lb-row">
        <span class="lb-rank">${medals[i] || `#${i+1}`}</span>
        <span class="lb-emoji" style="background:${row.habit.color}22;">${row.habit.emoji}</span>
        <div class="lb-info">
          <div class="lb-name">${escHtml(row.habit.name)}</div>
          <div class="lb-sub">Best: ${row.best}d &middot; ${row.rate}% this month</div>
        </div>
        <div class="lb-streak ${row.current >= 7 ? 'on-fire' : ''}">
          <span class="lb-streak-num">${row.current}</span>
          <span class="lb-streak-unit">day${row.current !== 1 ? 's' : ''}</span>
        </div>
      </div>`).join('');
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { renderAnalytics, renderWeeklyChart, renderHeatmap, renderLeaderboard };
})();
