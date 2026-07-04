'use strict';

window.AnalyticsModule = (() => {
  /* ── Chart instances (destroyed + rebuilt on each render) ────────────────── */
  let charts = {};
  let activeFilter = '30d';
  let currentUser  = null;

  /* ══ HELPERS ════════════════════════════════════════════════════════════════ */
  function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function dateStr(date) {
    return date.toISOString().split('T')[0];
  }
  function todayStr() {
    return dateStr(new Date());
  }
  function daysAgo(n) {
    return dateStr(new Date(Date.now() - n * 86400000));
  }

  /* Get { startDate, days } for a given filter key */
  function getFilterRange(filter) {
    const end   = todayStr();
    const today = new Date();
    switch (filter) {
      case 'today': return { start: end, end, days: 1 };
      case '7d':    return { start: daysAgo(6), end, days: 7 };
      case '30d':   return { start: daysAgo(29), end, days: 30 };
      case '90d':   return { start: daysAgo(89), end, days: 90 };
      case 'year': {
        const s = new Date(today.getFullYear(), 0, 1);
        const days = Math.ceil((today - s) / 86400000) + 1;
        return { start: dateStr(s), end, days };
      }
      default: return { start: daysAgo(29), end, days: 30 };
    }
  }

  /* Returns how many habits were done on a given date string */
  function getDayDone(username, habits, ds) {
    return habits.filter(h => window.HabitsModule.isCompletedOnDate(username, h.id, ds)).length;
  }

  /* Build last N days array: [{ date, done, total, pct }] */
  function buildDaysArray(username, habits, days) {
    return Array.from({ length: days }, (_, i) => {
      const d  = new Date(Date.now() - (days - 1 - i) * 86400000);
      const ds = dateStr(d);
      const done = getDayDone(username, habits, ds);
      const total = habits.length;
      return {
        date:  ds,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: ds === todayStr(),
        done, total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  }

  /* Chart.js shared defaults */
  function chartDefaults(isDark) {
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#8888BB' : '#6666AA';
    const tooltipBg = isDark ? '#1A1A2E' : '#fff';
    const tooltipText = isDark ? '#EEE' : '#1A1A2E';
    const tooltipSub  = isDark ? '#8888BB' : '#6666AA';
    return { gridColor, textColor, tooltipBg, tooltipText, tooltipSub };
  }

  /* Destroy a chart instance safely */
  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
  }

  /* ══ ANIMATED COUNTER ════════════════════════════════════════════════════════ */
  function animateCounter(el, target, duration = 600) {
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    const range = target - start;
    if (range === 0) { el.textContent = target; return; }
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      el.textContent = Math.round(start + range * ease);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ══ OVERVIEW STATS ══════════════════════════════════════════════════════════ */
  function renderOverview(username) {
    const habits  = window.HabitsModule.getHabits(username);
    const total   = habits.length;
    const today   = todayStr();
    const doneNow = getDayDone(username, habits, today);

    /* streaks */
    const curStreaks = habits.map(h => window.HabitsModule.getCurrentStreak(username, h.id));
    const longestAll = habits.map(h => window.HabitsModule.getLongestStreak(username, h.id));
    const topCur   = curStreaks.length  ? Math.max(...curStreaks)  : 0;
    const topBest  = longestAll.length  ? Math.max(...longestAll)  : 0;

    /* completion rate (30d avg across habits) */
    const rates30 = habits.map(h => window.HabitsModule.getCompletionRate(username, h.id, 30));
    const avgRate  = rates30.length > 0
      ? Math.round(rates30.reduce((a, b) => a + b, 0) / rates30.length) : 0;

    /* total completions (all time) */
    const totalDone = habits.reduce((sum, h) => {
      return sum + (window.HabitsModule.getCompletions(username, h.id) || []).length;
    }, 0);

    /* weekly % */
    const week7 = buildDaysArray(username, habits, 7);
    const weekDone  = week7.reduce((s, d) => s + d.done, 0);
    const weekTotal = week7.reduce((s, d) => s + d.total, 0);
    const weekPct   = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

    /* today pct */
    const todayPct = total > 0 ? Math.round((doneNow / total) * 100) : 0;

    /* productivity score */
    const score = Math.min(100, Math.round(
      0.4 * todayPct + 0.3 * weekPct + 0.2 * Math.min(100, (topCur / 30) * 100) + 0.1 * avgRate
    ));

    /* perfect days (last 30) */
    const hm30 = window.HabitsModule.getLast90DaysHeatmap(username).slice(-30);
    const perfectDays = hm30.filter(d => d.total > 0 && d.count === d.total).length;

    /* XP / Level */
    const xp    = totalDone * 10 + perfectDays * 50 + topCur * 5;
    const level = Math.floor(xp / 500) + 1;
    const xpInLevel = xp % 500;

    /* Populate stat cards with animated counters */
    animateCounter(document.getElementById('stat-habits'), total);
    setEl('stat-today', `${doneNow}/${total}`);
    animateCounter(document.getElementById('an-active'), total);
    setEl('stat-streak', `${topCur}d`);
    setEl('an-longest',  `${topBest}d`);
    setEl('stat-avg',    `${avgRate}%`);
    animateCounter(document.getElementById('an-score'), score);
    animateCounter(document.getElementById('an-total-done'), totalDone);

    /* Empty state toggle */
    const emptyEl = document.getElementById('an-empty-state');
    const gridEl  = document.getElementById('an-overview-grid');
    if (emptyEl) emptyEl.style.display = total === 0 ? 'flex' : 'none';
    if (total === 0) {
      document.querySelectorAll('.an-charts-row, .an-two-col, .an-panel-full, .an-panel.an-panel-full')
        .forEach(el => el.style.opacity = '0.35');
    } else {
      document.querySelectorAll('.an-charts-row, .an-two-col, .an-panel-full, .an-panel.an-panel-full')
        .forEach(el => el.style.opacity = '');
    }

    /* Wire empty state CTA */
    document.getElementById('an-empty-cta')?.addEventListener('click', () => {
      window.AppModule.openAddModal();
    });

    return { total, doneNow, todayPct, topCur, topBest, avgRate, weekPct,
             totalDone, score, perfectDays, xp, level, xpInLevel };
  }

  /* ══ WEEKLY CHART ════════════════════════════════════════════════════════════ */
  function renderWeeklyChart(username) {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    destroyChart('weekly');

    const habits = window.HabitsModule.getHabits(username);
    const data7  = buildDaysArray(username, habits, 7);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const { gridColor, textColor, tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    const barColors = data7.map(d => {
      if (d.total === 0) return 'rgba(108,99,255,0.15)';
      if (d.pct >= 80)   return '#00D4AA';
      if (d.pct >= 50)   return '#6C63FF';
      if (d.pct > 0)     return '#FF6B6B';
      return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    });

    charts['weekly'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data7.map(d => d.isToday ? 'Today' : d.label),
        datasets: [
          {
            label: 'Completed',
            data: data7.map(d => d.done),
            backgroundColor: barColors,
            borderRadius: 10, borderSkipped: false, order: 1,
          },
          {
            label: 'Total',
            data: data7.map(d => d.total),
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
            borderRadius: 10, borderSkipped: false, order: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText,
            bodyColor: tooltipSub, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              label: c => ` ${c.dataset.label}: ${c.parsed.y}`,
              afterLabel: c => c.datasetIndex === 0 && data7[c.dataIndex].total > 0
                ? ` (${data7[c.dataIndex].pct}%)` : '',
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 12 } }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, font: { family: 'Inter', size: 12 } }, border: { display: false } },
        },
      },
    });
  }

  /* ══ MONTHLY LINE CHART ══════════════════════════════════════════════════════ */
  function renderMonthlyChart(username) {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;
    destroyChart('monthly');

    const { days } = getFilterRange(activeFilter);
    const useDays  = Math.min(days, 30);
    const habits   = window.HabitsModule.getHabits(username);
    const data     = buildDaysArray(username, habits, useDays);
    const isDark   = document.documentElement.getAttribute('data-theme') !== 'light';
    const { gridColor, textColor, tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    /* Sample labels: show only every Nth label to avoid crowding */
    const step = useDays > 14 ? 5 : 2;

    charts['monthly'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((d, i) => (i % step === 0) ? d.dateLabel : ''),
        datasets: [{
          label: 'Completion %',
          data: data.map(d => d.pct),
          borderColor: '#6C63FF',
          backgroundColor: isDark ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#6C63FF',
          pointBorderColor: isDark ? '#12122A' : '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText,
            bodyColor: tooltipSub, borderColor: 'rgba(108,99,255,0.25)',
            borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              title: items => data[items[0].dataIndex].dateLabel,
              label: c => ` ${c.parsed.y}% complete`,
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 11 } }, border: { display: false } },
          y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: textColor, callback: v => v + '%', font: { family: 'Inter', size: 11 } }, border: { display: false } },
        },
      },
    });
  }

  /* ══ HABIT COMPARISON CHART ══════════════════════════════════════════════════ */
  function renderComparisonChart(username) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;
    destroyChart('comparison');

    const { days } = getFilterRange(activeFilter);
    const habits   = window.HabitsModule.getHabits(username);
    if (!habits.length) { ctx.parentElement.innerHTML = '<p class="empty-msg">No habits to compare.</p>'; return; }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const { gridColor, textColor, tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    const rates = habits.map(h => window.HabitsModule.getCompletionRate(username, h.id, days));

    charts['comparison'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: habits.map(h => h.emoji + ' ' + (h.name.length > 12 ? h.name.slice(0,12) + '…' : h.name)),
        datasets: [{
          label: 'Completion Rate',
          data: rates,
          backgroundColor: habits.map(h => h.color + 'CC'),
          borderColor: habits.map(h => h.color),
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText, bodyColor: tooltipSub,
            borderColor: 'rgba(108,99,255,0.2)', borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: { label: c => ` ${c.parsed.x}% completion rate` },
          },
        },
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: textColor, callback: v => v + '%', font: { family: 'Inter', size: 11 } }, border: { display: false } },
          y: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter', size: 11 } }, border: { display: false } },
        },
      },
    });
  }

  /* ══ CATEGORY / DISTRIBUTION DOUGHNUT ═══════════════════════════════════════ */
  function renderCategoryChart(username) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;
    destroyChart('category');

    const { days } = getFilterRange(activeFilter);
    const habits   = window.HabitsModule.getHabits(username);
    if (!habits.length) { ctx.parentElement.innerHTML = '<p class="empty-msg">No habits yet.</p>'; return; }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const { tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    const completions = habits.map(h => {
      const comps = window.HabitsModule.getCompletions(username, h.id);
      const cutoff = daysAgo(days - 1);
      return comps.filter(ds => ds >= cutoff).length;
    });
    const total = completions.reduce((a, b) => a + b, 0);

    if (total === 0) {
      ctx.parentElement.innerHTML = '<p class="empty-msg">No completions in this period.</p>';
      return;
    }

    charts['category'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: habits.map(h => h.emoji + ' ' + h.name),
        datasets: [{
          data: completions,
          backgroundColor: habits.map(h => h.color + 'CC'),
          borderColor: habits.map(h => h.color),
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: habits.length <= 6,
            position: 'bottom',
            labels: { color: tooltipText, font: { family: 'Inter', size: 11 }, padding: 10, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText, bodyColor: tooltipSub,
            borderColor: 'rgba(108,99,255,0.2)', borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              label: c => ` ${c.parsed} completions (${total > 0 ? Math.round((c.parsed / total) * 100) : 0}%)`,
            },
          },
        },
      },
    });
  }

  /* ══ LAST 30 DAYS ACTIVITY AREA CHART ════════════════════════════════════════ */
  function renderActivityChart(username) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    destroyChart('activity');

    const habits = window.HabitsModule.getHabits(username);
    const data   = buildDaysArray(username, habits, 30);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const { gridColor, textColor, tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    charts['activity'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d, i) => i % 5 === 0 ? d.dateLabel : ''),
        datasets: [
          {
            label: 'Completed',
            data: data.map(d => d.done),
            backgroundColor: 'rgba(0,212,170,0.7)',
            borderRadius: 6, borderSkipped: false, order: 1,
          },
          {
            label: 'Remaining',
            data: data.map(d => Math.max(0, d.total - d.done)),
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderRadius: 6, borderSkipped: false, order: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText, bodyColor: tooltipSub,
            borderColor: 'rgba(0,212,170,0.25)', borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              title: items => data[items[0].dataIndex].dateLabel,
              label: c => ` ${c.dataset.label}: ${c.parsed.y}`,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter', size: 10 } }, border: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, font: { family: 'Inter', size: 11 } }, border: { display: false } },
        },
      },
    });
  }

  /* ══ COMPLETION TREND CHART ══════════════════════════════════════════════════ */
  function renderTrendChart(username) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;
    destroyChart('trend');

    const { days } = getFilterRange(activeFilter);
    const useDays  = Math.min(days, 90);
    const habits   = window.HabitsModule.getHabits(username);
    const data     = buildDaysArray(username, habits, useDays);
    const isDark   = document.documentElement.getAttribute('data-theme') !== 'light';
    const { gridColor, textColor, tooltipBg, tooltipText, tooltipSub } = chartDefaults(isDark);

    /* 7-day rolling average */
    const rolling = data.map((d, i) => {
      const slice = data.slice(Math.max(0, i - 6), i + 1);
      const avg = slice.reduce((s, x) => s + x.pct, 0) / slice.length;
      return Math.round(avg);
    });

    const step = useDays > 14 ? 7 : 2;

    charts['trend'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((d, i) => i % step === 0 ? d.dateLabel : ''),
        datasets: [
          {
            label: 'Daily %',
            data: data.map(d => d.pct),
            borderColor: 'rgba(108,99,255,0.5)',
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          {
            label: '7-Day Avg',
            data: rolling,
            borderColor: '#6C63FF',
            backgroundColor: isDark ? 'rgba(108,99,255,0.1)' : 'rgba(108,99,255,0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true, position: 'top', align: 'end',
            labels: { color: textColor, font: { family: 'Inter', size: 11 }, boxWidth: 14, padding: 10 },
          },
          tooltip: {
            backgroundColor: tooltipBg, titleColor: tooltipText, bodyColor: tooltipSub,
            borderColor: 'rgba(108,99,255,0.2)', borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              title: items => data[items[0].dataIndex]?.dateLabel || '',
              label: c => ` ${c.dataset.label}: ${c.parsed.y}%`,
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 10 } }, border: { display: false } },
          y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: textColor, callback: v => v + '%', font: { family: 'Inter', size: 11 } }, border: { display: false } },
        },
      },
    });
  }

  /* ══ 365-DAY HEATMAP ════════════════════════════════════════════════════════ */
  function renderHeatmap(username) {
    const gridEl   = document.getElementById('heatmap-grid');
    const monthsEl = document.getElementById('heatmap-months');
    if (!gridEl) return;
    gridEl.innerHTML   = '';
    if (monthsEl) monthsEl.innerHTML = '';

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const tooltip = document.getElementById('hm-tooltip');

    /* Build 365-day data */
    const habits = window.HabitsModule.getHabits(username);
    const data365 = Array.from({ length: 365 }, (_, i) => {
      const d  = new Date(Date.now() - (364 - i) * 86400000);
      const ds = dateStr(d);
      const done = getDayDone(username, habits, ds);
      const total = habits.length;
      return { date: ds, d, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });

    /* GitHub-style: columns = weeks (Sun→Sat rows) */
    /* Find day-of-week for first day */
    const firstDow = data365[0].d.getDay(); // 0=Sun … 6=Sat

    /* Build 53-column × 7-row grid — fill leading empty slots */
    const cells = Array(firstDow).fill(null).concat(data365);

    /* Determine which week each month label starts in */
    const monthCols = {};
    cells.forEach((day, idx) => {
      if (!day) return;
      const weekCol = Math.floor(idx / 7);
      const month   = day.d.getMonth();
      const key     = day.d.getFullYear() + '-' + month;
      if (!(key in monthCols)) monthCols[key] = { month, col: weekCol };
    });

    /* Month label row */
    if (monthsEl) {
      const totalCols = Math.ceil(cells.length / 7);
      monthsEl.style.gridTemplateColumns = `repeat(${totalCols}, 13px)`;
      const colsWithMonth = {};
      Object.values(monthCols).forEach(({ month, col }) => { colsWithMonth[col] = month; });
      for (let c = 0; c < totalCols; c++) {
        const span = document.createElement('span');
        if (colsWithMonth[c] !== undefined) {
          span.className   = 'hm-month';
          span.textContent = MONTHS[colsWithMonth[c]];
        }
        monthsEl.appendChild(span);
      }
    }

    /* Heat cells */
    const totalCols = Math.ceil(cells.length / 7);
    gridEl.style.gridTemplateColumns = `repeat(${totalCols}, 13px)`;

    cells.forEach((day, idx) => {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';

      if (!day) {
        cell.dataset.lvl = '0';
        cell.style.visibility = 'hidden';
      } else {
        const ratio = day.total > 0 ? day.done / day.total : 0;
        const lvl = ratio === 0 ? 0 : ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
        cell.dataset.lvl = lvl;

        /* Hover tooltip */
        if (tooltip) {
          cell.addEventListener('mouseenter', e => {
            const dStr = day.d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            tooltip.innerHTML = `
              <div class="hm-tooltip-date">${dStr}</div>
              <div class="hm-tooltip-done">${day.done}/${day.total} habits</div>
              <div class="hm-tooltip-pct">${day.pct}% completion</div>`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY - 10) + 'px';
          });
          cell.addEventListener('mousemove', e => {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY - 10) + 'px';
          });
          cell.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
        }
      }
      gridEl.appendChild(cell);
    });
  }

  /* ══ SMART INSIGHTS ══════════════════════════════════════════════════════════ */
  function renderInsights(username) {
    const el = document.getElementById('an-insights-list');
    if (!el) return;

    const habits = window.HabitsModule.getHabits(username);
    if (!habits.length) {
      el.innerHTML = '<p class="empty-msg">Add habits to see insights.</p>';
      return;
    }

    /* Best / worst habit (30d rate) */
    const ratesObj = habits.map(h => ({
      habit: h,
      rate: window.HabitsModule.getCompletionRate(username, h.id, 30),
      streak: window.HabitsModule.getCurrentStreak(username, h.id),
      longest: window.HabitsModule.getLongestStreak(username, h.id),
    })).sort((a, b) => b.rate - a.rate);

    const best   = ratesObj[0];
    const worst  = ratesObj[ratesObj.length - 1];

    /* Most productive day of week */
    const dowTotals = Array(7).fill(0);
    const dowCounts = Array(7).fill(0);
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const data90 = Array.from({ length: 90 }, (_, i) => {
      const d  = new Date(Date.now() - (89 - i) * 86400000);
      const ds = dateStr(d);
      const done = getDayDone(username, habits, ds);
      const total = habits.length;
      const dow = d.getDay();
      if (total > 0) { dowTotals[dow] += (done / total) * 100; dowCounts[dow]++; }
    });
    const dowAvg = dowTotals.map((t, i) => dowCounts[i] > 0 ? t / dowCounts[i] : 0);
    const bestDow = dowAvg.indexOf(Math.max(...dowAvg));

    /* Average daily completion (last 30d) */
    const data30 = buildDaysArray(username, habits, 30);
    const activeDays = data30.filter(d => d.total > 0);
    const avgDaily = activeDays.length > 0
      ? Math.round(activeDays.reduce((s, d) => s + d.pct, 0) / activeDays.length) : 0;

    /* Perfect days (last 30) */
    const perfectDays = data30.filter(d => d.total > 0 && d.done === d.total).length;

    /* Total completed (all time) */
    const totalDone = habits.reduce((sum, h) =>
      sum + (window.HabitsModule.getCompletions(username, h.id) || []).length, 0);

    /* Longest current consistency */
    const allLongest = habits.map(h => window.HabitsModule.getLongestStreak(username, h.id));
    const topLongest = allLongest.length ? Math.max(...allLongest) : 0;
    const allCurrent = habits.map(h => window.HabitsModule.getCurrentStreak(username, h.id));
    const topCurrent = allCurrent.length ? Math.max(...allCurrent) : 0;

    const insights = [
      { icon: '🌟', label: 'Best Performing Habit', value: best.habit.emoji + ' ' + best.habit.name, badge: best.rate + '%' },
      { icon: '⚠️', label: 'Needs Attention',       value: worst.habit.emoji + ' ' + worst.habit.name, badge: worst.rate + '%' },
      { icon: '📅', label: 'Most Productive Day',   value: DAYS[bestDow], badge: Math.round(dowAvg[bestDow]) + '%' },
      { icon: '📊', label: 'Avg Daily Completion',  value: avgDaily + '%', badge: null },
      { icon: '🎯', label: 'Perfect Days (30d)',     value: perfectDays + ' days', badge: null },
      { icon: '✅', label: 'Total Completions',      value: totalDone.toLocaleString(), badge: null },
      { icon: '🔥', label: 'Current Best Streak',   value: topCurrent + ' days', badge: null },
      { icon: '🏆', label: 'Longest Ever Streak',   value: topLongest + ' days', badge: null },
    ];

    el.innerHTML = insights.map((ins, i) => `
      <div class="an-insight-row" style="animation-delay:${i * 0.05}s">
        <div class="an-insight-icon">${ins.icon}</div>
        <div class="an-insight-body">
          <div class="an-insight-label">${ins.label}</div>
          <div class="an-insight-value">${escHtml(ins.value)}</div>
        </div>
        ${ins.badge !== null ? `<span class="an-insight-badge">${ins.badge}</span>` : ''}
      </div>`).join('');
  }

  /* ══ ACHIEVEMENTS ════════════════════════════════════════════════════════════ */
  function renderAchievements(username) {
    const el = document.getElementById('an-achievements');
    if (!el) return;

    const habits     = window.HabitsModule.getHabits(username);
    const totalDone  = habits.reduce((s, h) => s + (window.HabitsModule.getCompletions(username, h.id) || []).length, 0);
    const hm30       = window.HabitsModule.getLast90DaysHeatmap(username).slice(-30);
    const perfectDays= hm30.filter(d => d.total > 0 && d.count === d.total).length;
    const allStreaks  = habits.map(h => window.HabitsModule.getCurrentStreak(username, h.id));
    const topStreak  = allStreaks.length ? Math.max(...allStreaks) : 0;
    const allLongest = habits.map(h => window.HabitsModule.getLongestStreak(username, h.id));
    const topLongest = allLongest.length ? Math.max(...allLongest) : 0;

    /* XP */
    const xp    = totalDone * 10 + perfectDays * 50 + topStreak * 5;
    const level = Math.floor(xp / 500) + 1;
    const xpInLevel   = xp % 500;
    const xpToNext    = 500;
    const xpPct       = Math.min(100, Math.round((xpInLevel / xpToNext) * 100));

    const levelNames = ['Beginner', 'Apprentice', 'Practitioner', 'Expert', 'Master', 'Legend'];
    const levelEmojis = ['🌱', '⚡', '🔥', '💎', '👑', '🌟'];
    const levelName  = levelNames[Math.min(level - 1, levelNames.length - 1)] || 'Legend';
    const levelEmoji = levelEmojis[Math.min(level - 1, levelEmojis.length - 1)] || '🌟';

    /* Badge definitions */
    const BADGES = [
      { emoji: '🌱', label: 'First Step',   unlocked: totalDone >= 1       },
      { emoji: '📅', label: 'Week Warrior', unlocked: topLongest >= 7      },
      { emoji: '🔥', label: '30-Day Fire',  unlocked: topLongest >= 30     },
      { emoji: '💎', label: 'Centurion',    unlocked: totalDone >= 100     },
      { emoji: '🎯', label: 'Perfectionist',unlocked: perfectDays >= 7     },
      { emoji: '🌟', label: 'Habit Builder',unlocked: habits.length >= 5   },
      { emoji: '⚡', label: 'Consistent',   unlocked: topStreak >= 14      },
      { emoji: '👑', label: 'Legend',        unlocked: totalDone >= 500     },
    ];
    const unlockedCount = BADGES.filter(b => b.unlocked).length;

    el.innerHTML = `
      <div class="an-level-row">
        <div class="an-level-badge">${levelEmoji}</div>
        <div class="an-level-info">
          <div class="an-level-label">Level ${level}</div>
          <div class="an-level-name">${levelName}</div>
        </div>
      </div>
      <div class="an-xp-row">
        <div class="an-xp-meta">
          <span>XP Progress</span>
          <span>${xpInLevel} / ${xpToNext} XP</span>
        </div>
        <div class="an-xp-bar-track">
          <div class="an-xp-bar-fill" style="width:${xpPct}%"></div>
        </div>
      </div>
      <div style="font-size:0.72rem;color:var(--text-sub);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
        Badges — ${unlockedCount}/${BADGES.length} unlocked
      </div>
      <div class="an-badge-grid">
        ${BADGES.map(b => `
          <div class="an-badge-item ${b.unlocked ? '' : 'locked'}" title="${b.label}${b.unlocked ? ' (Unlocked!)' : ' (Locked)'}">
            <div class="an-badge-emoji">${b.emoji}</div>
            <div class="an-badge-label">${b.label}</div>
          </div>`).join('')}
      </div>`;
  }

  /* ══ ACTIVITY TIMELINE ═══════════════════════════════════════════════════════ */
  function renderTimeline(username) {
    const el = document.getElementById('activity-timeline');
    if (!el) return;

    const habits = window.HabitsModule.getHabits(username);
    if (!habits.length) {
      el.innerHTML = '<p class="an-tl-empty">No activity yet. Add habits to get started!</p>';
      return;
    }

    /* Build events: habit creations + recent completions */
    const events = [];

    /* Habit creation events */
    habits.forEach(h => {
      events.push({
        type: 'created',
        date: new Date(h.createdAt),
        emoji: h.emoji,
        title: `Habit created: ${h.name}`,
        dotClass: 'tl-created',
      });
    });

    /* Last 14 days completions */
    for (let i = 0; i < 14; i++) {
      const d  = new Date(Date.now() - i * 86400000);
      const ds = dateStr(d);
      habits.forEach(h => {
        if (window.HabitsModule.isCompletedOnDate(username, h.id, ds)) {
          const streak = window.HabitsModule.getCurrentStreak(username, h.id);
          events.push({
            type: 'done',
            date: d,
            emoji: h.emoji,
            title: `${h.name} completed` + (streak >= 3 ? ` 🔥 ${streak}d streak` : ''),
            dotClass: 'tl-done',
          });
        }
      });
    }

    /* Sort newest first and cap at 20 */
    const sorted = events.sort((a, b) => b.date - a.date).slice(0, 20);

    if (!sorted.length) {
      el.innerHTML = '<p class="an-tl-empty">No recent activity.</p>';
      return;
    }

    el.innerHTML = sorted.map((ev, i) => `
      <div class="an-tl-item" style="animation-delay:${i * 0.04}s">
        <div class="an-tl-dot ${ev.dotClass}"></div>
        <div class="an-tl-emoji">${ev.emoji}</div>
        <div class="an-tl-body">
          <div class="an-tl-title">${escHtml(ev.title)}</div>
          <div class="an-tl-time">${ev.date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}</div>
        </div>
      </div>`).join('');
  }

  /* ══ STREAK LEADERBOARD ══════════════════════════════════════════════════════ */
  function renderLeaderboard(username) {
    const el = document.getElementById('streak-leaderboard');
    if (!el) return;

    const habits = window.HabitsModule.getHabits(username);
    if (!habits.length) {
      el.innerHTML = '<p class="empty-msg">Add some habits to see your leaderboard!</p>';
      return;
    }

    const { days } = getFilterRange(activeFilter);

    const rows = habits.map(h => ({
      habit:   h,
      current: window.HabitsModule.getCurrentStreak(username, h.id),
      best:    window.HabitsModule.getLongestStreak(username, h.id),
      rate:    window.HabitsModule.getCompletionRate(username, h.id, days),
    })).sort((a, b) => b.current - a.current || b.rate - a.rate);

    const medals = ['🥇', '🥈', '🥉'];

    el.innerHTML = rows.map((row, i) => `
      <div class="lb-row" style="animation-delay:${i * 0.05}s">
        <span class="lb-rank">${medals[i] || `#${i + 1}`}</span>
        <span class="lb-emoji" style="background:${row.habit.color}22">${row.habit.emoji}</span>
        <div class="lb-info">
          <div class="lb-name">${escHtml(row.habit.name)}</div>
          <div class="lb-sub">Best: ${row.best}d &middot; ${row.rate}% (${days}d)</div>
        </div>
        <div class="lb-streak ${row.current >= 7 ? 'on-fire' : ''}">
          <span class="lb-streak-num">${row.current}</span>
          <span class="lb-streak-unit">day${row.current !== 1 ? 's' : ''}</span>
        </div>
      </div>`).join('');
  }

  /* ══ STAT CARDS (legacy compat kept) ════════════════════════════════════════ */
  function renderStatCards(username) {
    /* delegated to renderOverview — no-op here to avoid double work */
  }

  /* ══ FILTER BINDING ══════════════════════════════════════════════════════════ */
  function bindFilters(username) {
    const bar = document.getElementById('an-filter-bar');
    if (!bar) return;
    bar.querySelectorAll('.an-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        bar.querySelectorAll('.an-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        /* re-render only filter-sensitive components */
        renderMonthlyChart(username);
        renderComparisonChart(username);
        renderCategoryChart(username);
        renderTrendChart(username);
        renderLeaderboard(username);
      });
    });
  }

  /* ══ EXPORT ══════════════════════════════════════════════════════════════════ */
  function bindExports(username) {
    /* CSV Export */
    document.getElementById('an-export-csv')?.addEventListener('click', () => {
      const habits = window.HabitsModule.getHabits(username);
      const rows   = [['Habit', 'Emoji', '30d Rate %', 'Current Streak', 'Longest Streak', 'Total Completions']];
      habits.forEach(h => {
        rows.push([
          h.name,
          h.emoji,
          window.HabitsModule.getCompletionRate(username, h.id, 30),
          window.HabitsModule.getCurrentStreak(username, h.id),
          window.HabitsModule.getLongestStreak(username, h.id),
          (window.HabitsModule.getCompletions(username, h.id) || []).length,
        ]);
      });
      const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `habitflow-analytics-${todayStr()}.csv`;
      a.click(); URL.revokeObjectURL(url);
      window.TrackerModule?.showToast('CSV exported! 📥');
    });

    /* Print */
    document.getElementById('an-export-print')?.addEventListener('click', () => {
      window.print();
    });
  }

  /* ══ MAIN ENTRY POINT ════════════════════════════════════════════════════════ */
  function renderAnalytics(username) {
    currentUser = username;

    /* Run all renderers */
    renderOverview(username);
    renderWeeklyChart(username);
    renderMonthlyChart(username);
    renderComparisonChart(username);
    renderCategoryChart(username);
    renderHeatmap(username);
    renderActivityChart(username);
    renderTrendChart(username);
    renderInsights(username);
    renderAchievements(username);
    renderTimeline(username);
    renderLeaderboard(username);

    /* Bind interactive controls (idempotent — clones prevent duplicate handlers) */
    bindFilters(username);
    bindExports(username);
  }

  /* ── Public API (backward-compatible) ───────────────────────────────────── */
  return { renderAnalytics, renderWeeklyChart, renderHeatmap, renderLeaderboard };
})();
