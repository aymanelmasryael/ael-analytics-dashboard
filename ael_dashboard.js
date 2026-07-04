(function() {
  'use strict';

  let chartData = {};
  let animEnabled = true, gridEnabled = true, legendEnabled = true;
  let refreshInterval = null;

  const COLORS = ['#0074FF','#10b981','#ffd700','#ef4444','#8b5cf6','#f59e0b','#06b6d4','#ec4899'];

  const DOM = {};

  function cacheDOM() {
    DOM.navLinks = document.getElementById('navLinks');
    DOM.navToggle = document.getElementById('navToggle');
    DOM.navbar = document.getElementById('navbar');
    DOM.cursorGlow = document.getElementById('cursorGlow');
    DOM.heroCta = document.getElementById('heroCta');
    DOM.kpiGrid = document.getElementById('kpiGrid');
    DOM.revenueChart = document.getElementById('revenueChart');
    DOM.usersChart = document.getElementById('usersChart');
    DOM.trafficChart = document.getElementById('trafficChart');
    DOM.conversionChart = document.getElementById('conversionChart');
    DOM.dataTable = document.getElementById('dataTable');
    DOM.dataSummary = document.getElementById('dataSummary');
    DOM.dataGenerate = document.getElementById('dataGenerate');
    DOM.dataCsvInput = document.getElementById('dataCsvInput');
    DOM.dataExportCsv = document.getElementById('dataExportCsv');
    DOM.applySettings = document.getElementById('applySettings');
    DOM.resetSettings = document.getElementById('resetSettings');
    DOM.chartPrimaryColor = document.getElementById('chartPrimaryColor');
    DOM.chartSecondaryColor = document.getElementById('chartSecondaryColor');
    DOM.chartTertiaryColor = document.getElementById('chartTertiaryColor');
    DOM.animEnabled = document.getElementById('animEnabled');
    DOM.gridEnabled = document.getElementById('gridEnabled');
    DOM.legendEnabled = document.getElementById('legendEnabled');
    DOM.dataPointsRange = document.getElementById('dataPointsRange');
    DOM.dataPointCount = document.getElementById('dataPointCount');
    DOM.autoRefresh = document.getElementById('autoRefresh');
  }

  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const activate = (id) => {
      sections.forEach(s => s.classList.remove('active'));
      navItems.forEach(n => n.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
      document.querySelector(`.nav-link[href="#${id}"]`)?.classList.add('active');
      if (DOM.navLinks) DOM.navLinks.classList.remove('open');
    };
    navItems.forEach(l => l.addEventListener('click', e => { e.preventDefault(); activate(l.getAttribute('href').slice(1)); }));
    if (DOM.heroCta) DOM.heroCta.addEventListener('click', e => { e.preventDefault(); activate('dashboard'); });
    const hash = location.hash.slice(1) || 'overview';
    activate(hash);
  }

  // Data generation
  function generateData(count) {
    count = count || 12;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sources = ['Organic','Direct','Social','Email','Referral','Paid'];
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        label: months[i % 12] + (i >= 12 ? ` ${Math.floor(i/12)+1}` : ''),
        revenue: 30000 + Math.random() * 150000 + i * 3000,
        users: Math.floor(500 + Math.random() * 3000 + i * 50),
        traffic: Math.floor(2000 + Math.random() * 8000 + i * 100),
        conversion: 1.5 + Math.random() * 4 + i * 0.05,
        orders: Math.floor(100 + Math.random() * 500 + i * 10),
        bounce: 15 + Math.random() * 15 - i * 0.1,
      });
    }
    chartData = { months: data.map(d => d.label), revenue: data.map(d => d.revenue), users: data.map(d => d.users), traffic: data.map(d => d.traffic), conversion: data.map(d => d.conversion), orders: data.map(d => d.orders), bounce: data.map(d => d.bounce), sources };
    return data;
  }

  // SVG Chart Engine
  function createLineSvg(data, labels, w, h, colors) {
    const pad = { t: 20, r: 20, b: 30, l: 50 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...data) * 1.1, min = Math.min(...data) * 0.9;
    const range = max - min || 1;
    const xs = data.map((_, i) => pad.l + (i / (data.length - 1)) * cw);
    const ys = data.map(v => pad.t + ch - ((v - min) / range) * ch);
    const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

    let grid = '';
    if (gridEnabled) {
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * ch;
        grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
        grid += `<text x="${pad.l - 6}" y="${y + 4}" fill="#4a5a7a" font-size="9" font-family="monospace" text-anchor="end">${Math.round(max - (i/4)*range)}</text>`;
      }
    }

    let labelsSvg = '';
    if (labels) {
      const step = Math.max(1, Math.floor(data.length / 8));
      labels.forEach((l, i) => {
        if (i % step === 0 || i === data.length - 1) {
          labelsSvg += `<text x="${xs[i]}" y="${h - 6}" fill="#4a5a7a" font-size="8" font-family="monospace" text-anchor="middle">${l}</text>`;
        }
      });
    }

    const lineColor = colors?.[0] || '#0074FF';
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${grid}${labelsSvg}
      <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3" fill="${lineColor}" stroke="#000" stroke-width="1.5" opacity=".9"><title>${labels?.[i] || i}: ${Math.round(data[i])}</title></circle>`).join('')}
    </svg>`;
  }

  function createBarSvg(data, labels, w, h, colors) {
    const pad = { t: 20, r: 20, b: 30, l: 50 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...data) * 1.1;
    const bw = Math.min(30, cw / data.length * 0.6);
    const gap = cw / data.length;

    let grid = '';
    if (gridEnabled) {
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * ch;
        grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
        grid += `<text x="${pad.l - 6}" y="${y + 4}" fill="#4a5a7a" font-size="9" font-family="monospace" text-anchor="end">${Math.round(max - (i/4)*max)}</text>`;
      }
    }

    const barColor = colors?.[0] || '#0074FF';
    const bars = data.map((v, i) => {
      const x = pad.l + i * gap + (gap - bw) / 2;
      const bh = (v / max) * ch;
      const y = pad.t + ch - bh;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${barColor}" opacity="${0.5 + (i/data.length)*0.5}"><title>${labels?.[i] || i}: ${Math.round(v)}</title></rect>`;
    }).join('');

    let labelsSvg = '';
    if (labels) {
      const step = Math.max(1, Math.floor(data.length / 8));
      labels.forEach((l, i) => {
        if (i % step === 0 || i === data.length - 1) {
          labelsSvg += `<text x="${pad.l + i * gap + gap/2}" y="${h - 6}" fill="#4a5a7a" font-size="8" font-family="monospace" text-anchor="middle">${l}</text>`;
        }
      });
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${grid}${labelsSvg}${bars}</svg>`;
  }

  function createPieSvg(data, labels, w, h, colors) {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30;
    let start = -Math.PI / 2;
    const slices = data.map((v, i) => {
      const angle = (v / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(start + angle), y2 = cy + r * Math.sin(start + angle);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      const color = colors?.[i % colors.length] || COLORS[i % COLORS.length];
      const pct = ((v / total) * 100).toFixed(1);
      start += angle;
      return `<path d="${path}" fill="${color}" stroke="#000" stroke-width="2" opacity=".9"><title>${labels?.[i] || i}: ${pct}%</title></path>`;
    }).join('');

    let legend = '';
    if (legendEnabled) {
      const lx = 20, ly = h - 20;
      legend = labels.map((l, i) => {
        const color = colors?.[i % colors.length] || COLORS[i % COLORS.length];
        return `<rect x="${lx + i * 80}" y="${ly}" width="8" height="8" rx="2" fill="${color}"/><text x="${lx + i * 80 + 12}" y="${ly + 7}" fill="#64748b" font-size="8" font-family="monospace">${l}</text>`;
      }).join('');
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${slices}${legend}</svg>`;
  }

  function createAreaSvg(data, labels, w, h, colors) {
    const pad = { t: 20, r: 20, b: 30, l: 50 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...data) * 1.1, min = Math.min(...data) * 0.9;
    const range = max - min || 1;
    const xs = data.map((_, i) => pad.l + (i / (data.length - 1)) * cw);
    const ys = data.map(v => pad.t + ch - ((v - min) / range) * ch);
    const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    const areaPts = `${xs[0]},${pad.t + ch} ${pts} ${xs[xs.length-1]},${pad.t + ch}`;
    const color = colors?.[0] || '#0074FF';

    let grid = '';
    if (gridEnabled) {
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * ch;
        grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
        grid += `<text x="${pad.l - 6}" y="${y + 4}" fill="#4a5a7a" font-size="9" font-family="monospace" text-anchor="end">${Math.round(max - (i/4)*range)}</text>`;
      }
    }

    let labelsSvg = '';
    if (labels) {
      const step = Math.max(1, Math.floor(data.length / 8));
      labels.forEach((l, i) => {
        if (i % step === 0 || i === data.length - 1) {
          labelsSvg += `<text x="${xs[i]}" y="${h - 6}" fill="#4a5a7a" font-size="8" font-family="monospace" text-anchor="middle">${l}</text>`;
        }
      });
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${grid}${labelsSvg}
      <polygon points="${areaPts}" fill="url(#ag)"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3" fill="${color}" stroke="#000" stroke-width="1.5"><title>${labels?.[i] || i}: ${Math.round(data[i])}</title></circle>`).join('')}
    </svg>`;
  }

  function createDonutSvg(data, labels, w, h, colors) {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30, ir = r * 0.55;
    let start = -Math.PI / 2;
    const slices = data.map((v, i) => {
      const angle = (v / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(start + angle), y2 = cy + r * Math.sin(start + angle);
      const ix1 = cx + ir * Math.cos(start + angle), iy1 = cy + ir * Math.sin(start + angle);
      const ix2 = cx + ir * Math.cos(start), iy2 = cy + ir * Math.sin(start);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`;
      const color = colors?.[i % colors.length] || COLORS[i % COLORS.length];
      const pct = ((v / total) * 100).toFixed(1);
      start += angle;
      return `<path d="${path}" fill="${color}" stroke="#000" stroke-width="1.5" opacity=".9"><title>${labels?.[i] || i}: ${pct}%</title></path>`;
    }).join('');

    const centerLabel = `${data.length}`;
    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${slices}
      <text x="${cx}" y="${cy - 4}" fill="#eef2ff" font-size="24" font-weight="bold" font-family="monospace" text-anchor="middle">${centerLabel}</text>
      <text x="${cx}" y="${cy + 14}" fill="#64748b" font-size="10" font-family="monospace" text-anchor="middle">series</text>
    </svg>`;
  }

  // Render dashboard
  function renderDashboard() {
    const data = generateData(parseInt(DOM.dataPointsRange?.value || 12));

    // KPI cards
    const lastRev = data[data.length-1].revenue, prevRev = data[data.length-2]?.revenue || lastRev;
    const lastUsers = data[data.length-1].users, prevUsers = data[data.length-2]?.users || lastUsers;
    const lastOrders = data[data.length-1].orders, prevOrders = data[data.length-2]?.orders || lastOrders;
    const lastBounce = data[data.length-1].bounce, prevBounce = data[data.length-2]?.bounce || lastBounce;

    const revTrend = ((lastRev - prevRev) / prevRev * 100).toFixed(1);
    const userTrend = ((lastUsers - prevUsers) / prevUsers * 100).toFixed(1);
    const ordTrend = ((lastOrders - prevOrders) / prevOrders * 100).toFixed(1);
    const bounceTrend = ((lastBounce - prevBounce) / prevBounce * 100).toFixed(1);

    const formatKPI = (v) => v >= 1000 ? (v/1000).toFixed(1) + 'K' : Math.round(v).toString();

    DOM.kpiGrid.innerHTML = `
      <div class="kpi-card glass"><div class="kpi-label">Revenue</div><div class="kpi-value">$${formatKPI(lastRev)}</div><span class="kpi-trend up">↑ ${revTrend}%</span></div>
      <div class="kpi-card glass"><div class="kpi-label">Users</div><div class="kpi-value">${formatKPI(lastUsers)}</div><span class="kpi-trend up">↑ ${userTrend}%</span></div>
      <div class="kpi-card glass"><div class="kpi-label">Orders</div><div class="kpi-value">${lastOrders}</div><span class="kpi-trend up">↑ ${ordTrend}%</span></div>
      <div class="kpi-card glass"><div class="kpi-label">Bounce Rate</div><div class="kpi-value">${lastBounce.toFixed(1)}%</div><span class="kpi-trend down">↑ ${bounceTrend}%</span></div>
    `;

    const colors = [DOM.chartPrimaryColor?.value || '#0074FF', DOM.chartSecondaryColor?.value || '#10b981', DOM.chartTertiaryColor?.value || '#ffd700'];

    DOM.revenueChart.innerHTML = createLineSvg(data.map(d => d.revenue), data.map(d => d.label), 500, 220, colors);
    DOM.trafficChart.innerHTML = createBarSvg(data.map(d => d.traffic), data.map(d => d.label), 500, 220, colors);
    DOM.conversionChart.innerHTML = createAreaSvg(data.map(d => d.conversion), data.map(d => d.label), 500, 220, colors);

    // Pie: users by source
    const sourceData = [35, 25, 18, 12, 7, 3];
    DOM.usersChart.innerHTML = createPieSvg(sourceData, chartData.sources, 500, 220, colors);

    // Data table
    renderDataTable(data);
  }

  // Data table
  function renderDataTable(data) {
    const headers = ['Period','Revenue','Users','Traffic','Conversion%','Orders','Bounce%'];
    DOM.dataTable.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${data.map(d => `<tr><td>${d.label}</td><td>$${Math.round(d.revenue).toLocaleString()}</td><td>${d.users}</td><td>${d.traffic}</td><td>${d.conversion.toFixed(1)}%</td><td>${d.orders}</td><td>${d.bounce.toFixed(1)}%</td></tr>`).join('')}</tbody>`;

    const avg = n => (data.reduce((s,d) => s+d[n], 0) / data.length);
    DOM.dataSummary.innerHTML = `Summary: <strong>${data.length}</strong> periods · Avg Revenue: <strong>$${Math.round(avg('revenue')).toLocaleString()}</strong> · Avg Users: <strong>${Math.round(avg('users'))}</strong> · Avg Conversion: <strong>${avg('conversion').toFixed(1)}%</strong>`;
  }

  // Render individual chart demos
  function renderChartDemos() {
    const colors = [DOM.chartPrimaryColor?.value || '#0074FF', DOM.chartSecondaryColor?.value || '#10b981', DOM.chartTertiaryColor?.value || '#ffd700'];
    const demoData = [45, 52, 38, 60, 42, 55, 48, 62, 50, 58, 44, 56];
    const demoLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const pieData = [35, 25, 18, 12, 7, 3];
    const pieLabels = ['Organic','Direct','Social','Email','Referral','Paid'];

    document.getElementById('lineChartDemo').innerHTML = createLineSvg(demoData, demoLabels, 600, 280, colors);
    document.getElementById('barChartDemo').innerHTML = createBarSvg(demoData, demoLabels, 600, 280, colors);
    document.getElementById('pieChartDemo').innerHTML = createPieSvg(pieData, pieLabels, 600, 280, colors);
    document.getElementById('areaChartDemo').innerHTML = createAreaSvg(demoData, demoLabels, 600, 280, colors);
    document.getElementById('donutChartDemo').innerHTML = createDonutSvg(pieData, pieLabels, 600, 280, colors);
  }

  // SVG copy
  function setupCopyButtons() {
    const charts = ['line','bar','pie','area','donut'];
    charts.forEach(type => {
      const btn = document.getElementById(`copy${type.charAt(0).toUpperCase() + type.slice(1)}Svg`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const svg = document.getElementById(`${type}ChartDemo`)?.querySelector('svg');
        if (!svg) return;
        navigator.clipboard.writeText(svg.outerHTML).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy SVG'; btn.classList.remove('copied'); }, 1800);
        });
      });
    });
  }

  // Data controls
  function setupDataControls() {
    DOM.dataGenerate.addEventListener('click', renderDashboard);

    DOM.dataCsvInput.addEventListener('change', (e) => {
      if (!e.target.files.length) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',');
        const parsed = lines.slice(1).map(line => {
          const vals = line.split(',');
          const obj = {};
          headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim(); });
          return obj;
        });
        // Rebuild data for charts
        const newData = parsed.map(p => ({
          label: p.Period || p.period || p.label || '',
          revenue: parseFloat(p.Revenue || p.revenue || 0),
          users: parseInt(p.Users || p.users || 0),
          traffic: parseInt(p.Traffic || p.traffic || 0),
          conversion: parseFloat(p['Conversion%'] || p.conversion || 0),
          orders: parseInt(p.Orders || p.orders || 0),
          bounce: parseFloat(p['Bounce%'] || p.bounce || 0),
        })).filter(d => d.label);
        if (newData.length) {
          chartData = { months: newData.map(d => d.label), revenue: newData.map(d => d.revenue), users: newData.map(d => d.users), traffic: newData.map(d => d.traffic), conversion: newData.map(d => d.conversion), orders: newData.map(d => d.orders), bounce: newData.map(d => d.bounce), sources: chartData.sources };
          renderDataTable(newData);
          // Update dashboard charts
          const colors = [DOM.chartPrimaryColor?.value || '#0074FF', DOM.chartSecondaryColor?.value || '#10b981', DOM.chartTertiaryColor?.value || '#ffd700'];
          DOM.revenueChart.innerHTML = createLineSvg(newData.map(d => d.revenue), newData.map(d => d.label), 500, 220, colors);
          DOM.trafficChart.innerHTML = createBarSvg(newData.map(d => d.traffic), newData.map(d => d.label), 500, 220, colors);
          DOM.conversionChart.innerHTML = createAreaSvg(newData.map(d => d.conversion), newData.map(d => d.label), 500, 220, colors);
        }
      };
      reader.readAsText(e.target.files[0]);
    });

    DOM.dataExportCsv.addEventListener('click', () => {
      const headers = 'Period,Revenue,Users,Traffic,Conversion%,Orders,Bounce%';
      const currentTable = document.querySelector('#dataTable tbody');
      if (!currentTable) return;
      const rows = currentTable.querySelectorAll('tr');
      const csv = [headers, ...Array.from(rows).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ael-dashboard-data-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Chart tabs
  function setupChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    const contents = document.querySelectorAll('.chart-tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('chart-' + tab.dataset.chart)?.classList.add('active');
      });
    });
  }

  // Settings
  function setupSettings() {
    DOM.dataPointsRange.addEventListener('input', () => {
      DOM.dataPointCount.textContent = DOM.dataPointsRange.value;
    });

    DOM.applySettings.addEventListener('click', () => {
      animEnabled = DOM.animEnabled.checked;
      gridEnabled = DOM.gridEnabled.checked;
      legendEnabled = DOM.legendEnabled.checked;
      renderDashboard();
      renderChartDemos();
      // Auto refresh
      if (refreshInterval) clearInterval(refreshInterval);
      const sec = parseInt(DOM.autoRefresh.value);
      if (sec > 0) refreshInterval = setInterval(renderDashboard, sec * 1000);
    });

    DOM.resetSettings.addEventListener('click', () => {
      DOM.chartPrimaryColor.value = '#0074FF';
      DOM.chartSecondaryColor.value = '#10b981';
      DOM.chartTertiaryColor.value = '#ffd700';
      DOM.animEnabled.checked = true;
      DOM.gridEnabled.checked = true;
      DOM.legendEnabled.checked = true;
      DOM.dataPointsRange.value = 12;
      DOM.dataPointCount.textContent = '12';
      DOM.autoRefresh.value = '0';
      animEnabled = true; gridEnabled = true; legendEnabled = true;
      if (refreshInterval) clearInterval(refreshInterval);
      renderDashboard();
      renderChartDemos();
    });
  }

  function init() {
    cacheDOM();
    initNavigation();
    renderDashboard();
    renderChartDemos();
    setupCopyButtons();
    setupDataControls();
    setupChartTabs();
    setupSettings();

    // Cursor
    document.addEventListener('mousemove', e => {
      if (DOM.cursorGlow) { DOM.cursorGlow.style.opacity = '1'; DOM.cursorGlow.style.left = e.clientX + 'px'; DOM.cursorGlow.style.top = e.clientY + 'px'; }
    });
    document.addEventListener('mouseleave', () => { if (DOM.cursorGlow) DOM.cursorGlow.style.opacity = '0'; });

    DOM.navToggle.addEventListener('click', () => DOM.navLinks?.classList.toggle('open'));
    window.addEventListener('scroll', () => DOM.navbar?.classList.toggle('scrolled', window.scrollY > 50));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
