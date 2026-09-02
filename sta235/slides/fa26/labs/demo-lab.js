(() => {
  'use strict';

  const app = document.getElementById('demo-app');
  const demo = document.body.dataset.demo;
  if (!app || !demo) return;

  const byId = id => document.getElementById(id);
  const fmt = (value, digits = 1) => Number(value).toFixed(digits);
  const pct = value => `${fmt(100 * value, 1)}%`;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const sum = values => values.reduce((total, value) => total + value, 0);
  const variance = values => {
    const m = mean(values);
    return sum(values.map(value => (value - m) ** 2)) / Math.max(1, values.length - 1);
  };
  const covariance = (a, b) => {
    const am = mean(a), bm = mean(b);
    return sum(a.map((value, i) => (value - am) * (b[i] - bm))) / Math.max(1, a.length - 1);
  };
  const correlation = (a, b) => covariance(a, b) / Math.sqrt(variance(a) * variance(b));
  const path = points => points.map((point, index) => `${index ? 'L' : 'M'} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(' ');

  function rng(seed) {
    let state = seed >>> 0;
    return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function normal(random) {
    let u = 0, v = 0;
    while (!u) u = random();
    while (!v) v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function axes({w = 720, h = 380, l = 58, r = 18, t = 18, b = 48, xmin, xmax, ymin, ymax, xLabel, yLabel, xTicks = 5, yTicks = 5}) {
    const x = value => l + (value - xmin) / (xmax - xmin) * (w - l - r);
    const y = value => h - b - (value - ymin) / (ymax - ymin) * (h - t - b);
    let markup = '';
    if (yTicks > 0) {
      for (let i = 0; i <= yTicks; i += 1) {
        const value = ymin + (ymax - ymin) * i / yTicks;
        markup += `<line x1="${l}" y1="${y(value)}" x2="${w-r}" y2="${y(value)}" class="demo-gridline"/>`;
        markup += `<text x="${l-9}" y="${y(value)+4}" text-anchor="end" class="demo-tick">${fmt(value, Math.abs(ymax-ymin) < 12 ? 1 : 0)}</text>`;
      }
    }
    if (xTicks > 0) {
      for (let i = 0; i <= xTicks; i += 1) {
        const value = xmin + (xmax - xmin) * i / xTicks;
        markup += `<line x1="${x(value)}" y1="${h-b}" x2="${x(value)}" y2="${h-b+5}" class="demo-axis"/>`;
        markup += `<text x="${x(value)}" y="${h-b+21}" text-anchor="middle" class="demo-tick">${fmt(value, Math.abs(xmax-xmin) < 12 ? 1 : 0)}</text>`;
      }
    }
    markup += `<line x1="${l}" y1="${t}" x2="${l}" y2="${h-b}" class="demo-axis"/><line x1="${l}" y1="${h-b}" x2="${w-r}" y2="${h-b}" class="demo-axis"/>`;
    markup += `<text x="${(l+w-r)/2}" y="${h-8}" text-anchor="middle" class="demo-label">${xLabel}</text>`;
    markup += `<text x="15" y="${(t+h-b)/2}" text-anchor="middle" transform="rotate(-90 15 ${(t+h-b)/2})" class="demo-label">${yLabel}</text>`;
    return {x, y, markup, w, h, l, r, t, b};
  }

  function solve(matrix, vector) {
    const n = vector.length;
    const a = matrix.map((row, i) => [...row, vector[i]]);
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      [a[col], a[pivot]] = [a[pivot], a[col]];
      if (Math.abs(a[col][col]) < 1e-10) a[col][col] = 1e-10;
      const divisor = a[col][col];
      for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
      }
    }
    return a.map(row => row[n]);
  }

  function regression(rows, predictors) {
    const x = rows.map(row => [1, ...predictors.map(name => row[name])]);
    const y = rows.map(row => row.y);
    const p = x[0].length;
    const xtx = Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => sum(x.map(row => row[i] * row[j]))));
    const xty = Array.from({length: p}, (_, i) => sum(x.map((row, index) => row[i] * y[index])));
    const beta = solve(xtx, xty);
    const residuals = rows.map((row, i) => y[i] - sum(x[i].map((value, j) => value * beta[j])));
    const mse = sum(residuals.map(value => value ** 2)) / Math.max(1, rows.length - p);
    const inverseColumns = Array.from({length: p}, (_, col) => solve(xtx, Array.from({length: p}, (_, i) => i === col ? 1 : 0)));
    const inverse = inverseColumns[0].map((_, row) => inverseColumns.map(column => column[row]));
    return {beta, se: beta.map((_, i) => Math.sqrt(Math.max(0, mse * inverse[i][i]))), residuals, mse};
  }

  function polyFit(rows, degree) {
    const predictors = Array.from({length: degree}, (_, index) => `p${index + 1}`);
    const transformed = rows.map(row => {
      const z = (row.x - 5) / 5;
      const result = {...row};
      predictors.forEach((name, index) => { result[name] = z ** (index + 1); });
      return result;
    });
    const fit = regression(transformed, predictors);
    return {
      predict(x) {
        const z = (x - 5) / 5;
        return fit.beta.reduce((total, coefficient, index) => total + coefficient * (index ? z ** index : 1), 0);
      },
      rmse: Math.sqrt(mean(fit.residuals.map(value => value ** 2)))
    };
  }

  function week1() {
    app.innerHTML = `
      <section class="demo-callout"><strong>Core idea:</strong> The intercept lifts the entire line, the slope tilts it, and a predictor value chooses one point on it.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls" aria-label="Regression controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w1-intercept">Intercept</label><output id="w1-intercept-out"></output></div><input id="w1-intercept" type="range" min="-5" max="20" step="1" value="8"><div class="demo-scale"><span>−5</span><span>20</span></div></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w1-slope">Slope</label><output id="w1-slope-out"></output></div><input id="w1-slope" type="range" min="-3" max="4" step=".25" value="2"><div class="demo-scale"><span>−3</span><span>4</span></div></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w1-x">Predictor x</label><output id="w1-x-out"></output></div><input id="w1-x" type="range" min="0" max="10" step=".5" value="6"><div class="demo-scale"><span>0</span><span>10</span></div></div>
          <div id="w1-equation" class="demo-equation"></div>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Prediction line</strong><span>The gold point is the current prediction</span></div><div class="demo-chart-frame"><svg id="w1-chart" viewBox="0 0 720 380" role="img" aria-label="Regression line controlled by intercept, slope, and predictor value"></svg></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Intercept</span><strong id="w1-stat-a"></strong></div><div class="demo-stat"><span>Rise for +1 in x</span><strong id="w1-stat-b"></strong></div><div class="demo-stat"><span>Predicted y</span><strong id="w1-stat-y"></strong></div></div>
          <div id="w1-reading" class="demo-reading" aria-live="polite"></div>
        </section>
      </div>`;
    const update = () => {
      const a = +byId('w1-intercept').value, b = +byId('w1-slope').value, selected = +byId('w1-x').value;
      const prediction = a + b * selected;
      byId('w1-intercept-out').value = fmt(a, 0);
      byId('w1-slope-out').value = fmt(b, 2);
      byId('w1-x-out').value = fmt(selected, 1);
      byId('w1-equation').textContent = `Predicted y = ${fmt(a, 0)} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b), 2)}x`;
      byId('w1-stat-a').textContent = fmt(a, 0);
      byId('w1-stat-b').textContent = `${b >= 0 ? '+' : '−'}${fmt(Math.abs(b), 2)}`;
      byId('w1-stat-y').textContent = fmt(prediction, 2);
      byId('w1-reading').innerHTML = `<strong>Read the model:</strong> At x = 0, predicted y is ${fmt(a, 0)}. Each one-unit increase in x changes predicted y by ${fmt(b, 2)}. At x = ${fmt(selected, 1)}, the model predicts ${fmt(prediction, 2)}.`;
      const frame = axes({xmin: 0, xmax: 10, ymin: -35, ymax: 60, xLabel: 'Predictor x', yLabel: 'Predicted outcome y'});
      const p1 = [frame.x(0), frame.y(a)], p2 = [frame.x(10), frame.y(a + b * 10)];
      byId('w1-chart').innerHTML = `<title>Interactive simple regression line</title>${frame.markup}<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="demo-fit"/><line x1="${frame.x(selected)}" y1="${frame.y(-35)}" x2="${frame.x(selected)}" y2="${frame.y(prediction)}" class="demo-zero"/><circle cx="${frame.x(selected)}" cy="${frame.y(prediction)}" r="7" class="demo-point-secondary"/><text x="${frame.x(selected)}" y="${frame.y(prediction)-13}" text-anchor="middle" class="demo-label">(${fmt(selected, 1)}, ${fmt(prediction, 1)})</text>`;
    };
    ['w1-intercept', 'w1-slope', 'w1-x'].forEach(id => byId(id).addEventListener('input', update));
    update();
  }

  function week2() {
    const data = [{x:1,y:25},{x:2,y:30},{x:3,y:29},{x:4,y:39},{x:5,y:43},{x:6,y:42},{x:7,y:51},{x:8,y:56},{x:9,y:53},{x:10,y:65}];
    app.innerHTML = `
      <section class="demo-callout"><strong>Residual = observed − predicted.</strong> Move the selected observation above and below the line and watch the sign and squared penalty change.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w2-x">Selected x</label><output id="w2-x-out"></output></div><input id="w2-x" type="range" min="1" max="10" step="1" value="6"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w2-y">Observed y</label><output id="w2-y-out"></output></div><input id="w2-y" type="range" min="15" max="75" step="1" value="52"></div>
          <div class="demo-equation">Predicted y = 20 + 4x</div>
          <button id="w2-on-line" type="button">Place point on fitted line</button>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Observed point and its fitted value</strong><span>The red segment is the residual</span></div><div class="demo-chart-frame"><svg id="w2-chart" viewBox="0 0 720 380" role="img" aria-label="Observed point, fitted line, and vertical residual"></svg></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Predicted</span><strong id="w2-pred"></strong></div><div class="demo-stat"><span>Residual</span><strong id="w2-resid"></strong></div><div class="demo-stat"><span>Squared residual</span><strong id="w2-square"></strong></div></div>
          <div id="w2-reading" class="demo-reading" aria-live="polite"></div>
        </section>
      </div>`;
    const update = () => {
      const selectedX = +byId('w2-x').value, observed = +byId('w2-y').value, predicted = 20 + 4 * selectedX, residual = observed - predicted;
      byId('w2-x-out').value = selectedX;
      byId('w2-y-out').value = fmt(observed, 0);
      byId('w2-pred').textContent = fmt(predicted, 0);
      byId('w2-resid').textContent = `${residual >= 0 ? '+' : '−'}${fmt(Math.abs(residual), 0)}`;
      byId('w2-square').textContent = fmt(residual ** 2, 0);
      const direction = residual > 0 ? 'above' : residual < 0 ? 'below' : 'on';
      byId('w2-reading').innerHTML = `<strong>${residual === 0 ? 'No prediction error.' : `The model predicts ${Math.abs(residual)} units too ${residual > 0 ? 'low' : 'high'}.`}</strong> The observation sits ${direction} the line, so its residual is ${residual > 0 ? 'positive' : residual < 0 ? 'negative' : 'zero'}. Squaring removes the sign and emphasizes larger misses.`;
      const frame = axes({xmin: 0, xmax: 11, ymin: 10, ymax: 80, xLabel: 'Predictor x', yLabel: 'Outcome y'});
      let marks = data.map(point => `<circle cx="${frame.x(point.x)}" cy="${frame.y(point.y)}" r="4" class="demo-point"/>`).join('');
      marks += `<line x1="${frame.x(0)}" y1="${frame.y(20)}" x2="${frame.x(11)}" y2="${frame.y(64)}" class="demo-fit"/>`;
      marks += `<line x1="${frame.x(selectedX)}" y1="${frame.y(predicted)}" x2="${frame.x(selectedX)}" y2="${frame.y(observed)}" class="demo-residual"/><circle cx="${frame.x(selectedX)}" cy="${frame.y(predicted)}" r="6" fill="var(--panel)" stroke="var(--teal)" stroke-width="2"/><circle cx="${frame.x(selectedX)}" cy="${frame.y(observed)}" r="7" class="demo-point-secondary"/>`;
      byId('w2-chart').innerHTML = `<title>Residual as a vertical distance</title>${frame.markup}${marks}`;
    };
    byId('w2-x').addEventListener('input', update);
    byId('w2-y').addEventListener('input', update);
    byId('w2-on-line').addEventListener('click', () => { byId('w2-y').value = 20 + 4 * +byId('w2-x').value; update(); });
    update();
  }

  function week3() {
    const scenarios = ['healthy', 'curve', 'fan', 'outlier'];
    const labels = {healthy: 'No clear violation', curve: 'Nonlinearity', fan: 'Unequal variance', outlier: 'Influential outlier'};
    let scenario = 'fan', seed = 303, choice = '';
    app.innerHTML = `
      <section class="demo-callout"><strong>Diagnostic detective:</strong> Fit the line, inspect the residual pattern, and name the most important issue before revealing the answer.</section>
      <div class="demo-actions" style="margin-top:16px"><button id="w3-new" type="button">New mystery sample</button>${scenarios.map(value => `<button class="w3-choice" data-choice="${value}" type="button">${labels[value]}</button>`).join('')}<button id="w3-check" class="button primary" type="button">Check diagnosis</button></div>
      <div class="demo-grid equal">
        <div class="demo-chart"><div class="demo-chart-title"><strong>Outcome vs predictor</strong><span>What does the fitted line miss?</span></div><div class="demo-chart-frame"><svg id="w3-data" viewBox="0 0 560 340" role="img" aria-label="Mystery scatterplot with a fitted line"></svg></div></div>
        <div class="demo-chart"><div class="demo-chart-title"><strong>Residuals vs fitted</strong><span>Look for shape, spread, or leverage</span></div><div class="demo-chart-frame"><svg id="w3-residuals" viewBox="0 0 560 340" role="img" aria-label="Residuals versus fitted values for the mystery sample"></svg></div></div>
      </div>
      <div id="w3-result" class="demo-reading" style="margin-top:14px" aria-live="polite">Choose a diagnosis, then check it.</div>`;

    function makeData() {
      const random = rng(seed);
      return Array.from({length: 34}, (_, i) => {
        const x = .5 + 9 * i / 33 + (random() - .5) * .18;
        let mu = 8 + 3.4 * x, spread = 2.2;
        if (scenario === 'curve') mu += .65 * (x - 5) ** 2 - 5;
        if (scenario === 'fan') spread = .5 + .55 * x;
        let y = mu + spread * normal(random);
        if (scenario === 'outlier' && i === 31) y += 28;
        return {x, y};
      });
    }

    function render() {
      const rows = makeData(), fit = regression(rows, ['x']), a = fit.beta[0], b = fit.beta[1];
      const dataFrame = axes({w:560,h:340,l:52,r:14,t:16,b:44,xmin:0,xmax:10,ymin:0,ymax:55,xLabel:'Predictor x',yLabel:'Outcome y'});
      const residualFrame = axes({w:560,h:340,l:52,r:14,t:16,b:44,xmin:5,xmax:45,ymin:-24,ymax:24,xLabel:'Fitted value',yLabel:'Residual'});
      const dots = rows.map((row, i) => `<circle cx="${dataFrame.x(row.x)}" cy="${dataFrame.y(row.y)}" r="${scenario === 'outlier' && i === 31 ? 7 : 4}" class="${scenario === 'outlier' && i === 31 ? 'demo-point-secondary' : 'demo-point'}"/>`).join('');
      byId('w3-data').innerHTML = `<title>Mystery regression sample</title>${dataFrame.markup}<line x1="${dataFrame.x(0)}" y1="${dataFrame.y(a)}" x2="${dataFrame.x(10)}" y2="${dataFrame.y(a+b*10)}" class="demo-fit"/>${dots}`;
      const residualDots = rows.map((row, i) => { const fitted = a + b * row.x; return `<circle cx="${residualFrame.x(fitted)}" cy="${residualFrame.y(row.y-fitted)}" r="${scenario === 'outlier' && i === 31 ? 7 : 4}" class="${scenario === 'outlier' && i === 31 ? 'demo-point-secondary' : 'demo-point'}"/>`; }).join('');
      byId('w3-residuals').innerHTML = `<title>Residual diagnostic plot</title>${residualFrame.markup}<line x1="${residualFrame.x(5)}" y1="${residualFrame.y(0)}" x2="${residualFrame.x(45)}" y2="${residualFrame.y(0)}" class="demo-zero"/>${residualDots}`;
    }

    document.querySelectorAll('.w3-choice').forEach(button => button.addEventListener('click', () => {
      choice = button.dataset.choice;
      document.querySelectorAll('.w3-choice').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }));
    byId('w3-check').addEventListener('click', () => {
      if (!choice) { byId('w3-result').textContent = 'Choose a diagnosis first.'; return; }
      const correct = choice === scenario;
      byId('w3-result').innerHTML = `<strong class="${correct ? 'demo-status-good' : 'demo-status-bad'}">${correct ? 'Correct.' : `Not quite—the strongest signal is ${labels[scenario].toLowerCase()}.`}</strong> ${scenario === 'healthy' ? 'Residuals are roughly centered with steady spread and no systematic shape.' : scenario === 'curve' ? 'The residuals bend from positive to negative and back, signaling a missed nonlinear mean.' : scenario === 'fan' ? 'Residual spread grows with fitted values, so the constant-variance assumption fails.' : 'One high-leverage point pulls the fitted line and produces an unusually large residual.'}`;
    });
    byId('w3-new').addEventListener('click', () => { seed += 701; scenario = scenarios[(scenarios.indexOf(scenario) + 1) % scenarios.length]; choice = ''; document.querySelectorAll('.w3-choice').forEach(item => item.setAttribute('aria-pressed', 'false')); byId('w3-result').textContent = 'Choose a diagnosis, then check it.'; render(); });
    render();
  }

  function week4() {
    const groups = [{name:'Gen Z',mean:4.28},{name:'Millennial',mean:4.46},{name:'Gen X',mean:4.18},{name:'Boomer',mean:3.91}];
    app.innerHTML = `
      <section class="demo-callout"><strong>Reference categories change the coefficients—not the fitted group means.</strong> Relevel the model and watch the same four predictions receive different algebraic labels.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><label for="w4-reference">Reference generation</label><select id="w4-reference">${groups.map((group, index) => `<option value="${index}">${group.name}</option>`).join('')}</select></div>
          <div id="w4-equation" class="demo-equation"></div>
          <div class="demo-reading"><strong>Dummy coding rule:</strong> The intercept equals the reference-group mean. Every other coefficient is that group’s difference from the reference.</div>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Predicted evaluation by generation</strong><span>Bar heights never change when the reference changes</span></div><div class="demo-chart-frame"><svg id="w4-chart" viewBox="0 0 720 360" role="img" aria-label="Group mean predictions under changing reference categories"></svg></div></div>
          <div class="table-wrap"><table class="demo-table"><thead><tr><th>Term</th><th>Estimate</th><th>Meaning</th></tr></thead><tbody id="w4-rows"></tbody></table></div>
        </section>
      </div>`;
    const update = () => {
      const reference = +byId('w4-reference').value, baseline = groups[reference];
      const terms = groups.filter((_, index) => index !== reference).map(group => ({name:`I(${group.name})`, value:group.mean-baseline.mean, meaning:`${group.name} − ${baseline.name}`}));
      byId('w4-equation').textContent = `Predicted evaluation = ${fmt(baseline.mean, 2)} ${terms.map(term => `${term.value < 0 ? '−' : '+'} ${fmt(Math.abs(term.value), 2)}${term.name}`).join(' ')}`;
      byId('w4-rows').innerHTML = `<tr><td>Intercept</td><td>${fmt(baseline.mean, 2)}</td><td>${baseline.name} mean</td></tr>${terms.map(term => `<tr><td>${term.name}</td><td>${term.value >= 0 ? '+' : '−'}${fmt(Math.abs(term.value), 2)}</td><td>${term.meaning}</td></tr>`).join('')}`;
      const frame = axes({xmin:-.5,xmax:3.5,ymin:3.5,ymax:4.7,xLabel:'Generation',yLabel:'Predicted evaluation',xTicks:0,yTicks:4});
      let markup = frame.markup;
      groups.forEach((group, index) => {
        const x = frame.x(index), base = frame.y(3.5), top = frame.y(group.mean), width = 78;
        markup += `<rect x="${x-width/2}" y="${top}" width="${width}" height="${base-top}" fill="${index === reference ? 'var(--teal)' : 'color-mix(in srgb, var(--purple) 55%, var(--panel))'}"/><text x="${x}" y="${top-9}" text-anchor="middle" class="demo-label">${fmt(group.mean, 2)}</text><text x="${x}" y="${base+21}" text-anchor="middle" class="demo-tick">${group.name}</text>`;
      });
      byId('w4-chart').innerHTML = `<title>Generation group means with selected reference group</title>${markup}`;
    };
    byId('w4-reference').addEventListener('change', update);
    update();
  }

  function week5() {
    app.innerHTML = `
      <section class="demo-callout"><strong>An interaction changes a slope.</strong> When the interaction is zero, the group lines are parallel; otherwise the group difference depends on x.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w5-main">Group B main effect</label><output id="w5-main-out"></output></div><input id="w5-main" type="range" min="-5" max="5" step=".5" value="2"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w5-interaction">Interaction effect</label><output id="w5-interaction-out"></output></div><input id="w5-interaction" type="range" min="-1.5" max="1.5" step=".1" value=".6"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w5-x">Compare at x</label><output id="w5-x-out"></output></div><input id="w5-x" type="range" min="0" max="10" step=".5" value="5"></div>
          <div id="w5-equation" class="demo-equation"></div>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Group-specific regression lines</strong><span>The vertical bracket is the group difference</span></div><div class="demo-chart-frame"><svg id="w5-chart" viewBox="0 0 720 380" role="img" aria-label="Two regression lines controlled by main and interaction effects"></svg></div><div class="demo-legend"><span><i class="demo-key"></i>Group A</span><span><i class="demo-key purple"></i>Group B</span></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Slope: Group A</span><strong>+1.00</strong></div><div class="demo-stat"><span>Slope: Group B</span><strong id="w5-slope-b"></strong></div><div class="demo-stat"><span>B − A at selected x</span><strong id="w5-gap"></strong></div></div>
          <div id="w5-reading" class="demo-reading"></div>
        </section>
      </div>`;
    const update = () => {
      const main = +byId('w5-main').value, interaction = +byId('w5-interaction').value, selected = +byId('w5-x').value;
      const a = x => 8 + x, b = x => 8 + main + (1 + interaction) * x, gap = main + interaction * selected;
      byId('w5-main-out').value = fmt(main, 1);
      byId('w5-interaction-out').value = fmt(interaction, 1);
      byId('w5-x-out').value = fmt(selected, 1);
      byId('w5-equation').textContent = `Predicted y = 8 + 1.00x ${main < 0 ? '−' : '+'} ${fmt(Math.abs(main),1)}GroupB ${interaction < 0 ? '−' : '+'} ${fmt(Math.abs(interaction),1)}(x × GroupB)`;
      byId('w5-slope-b').textContent = `${1+interaction >= 0 ? '+' : '−'}${fmt(Math.abs(1+interaction),2)}`;
      byId('w5-gap').textContent = `${gap >= 0 ? '+' : '−'}${fmt(Math.abs(gap),2)}`;
      byId('w5-reading').innerHTML = interaction === 0 ? '<strong>Parallel lines:</strong> Group B stays the same distance from Group A at every x, so there is no interaction.' : `<strong>The group gap changes by ${fmt(interaction,1)} for each +1 in x.</strong> At x = ${fmt(selected,1)}, Group B is ${fmt(Math.abs(gap),1)} units ${gap >= 0 ? 'above' : 'below'} Group A.`;
      const frame = axes({xmin:0,xmax:10,ymin:0,ymax:32,xLabel:'Quantitative predictor x',yLabel:'Predicted outcome'});
      const yA = a(selected), yB = b(selected);
      byId('w5-chart').innerHTML = `<title>Interaction changes the slope for Group B</title>${frame.markup}<line x1="${frame.x(0)}" y1="${frame.y(a(0))}" x2="${frame.x(10)}" y2="${frame.y(a(10))}" class="demo-fit"/><line x1="${frame.x(0)}" y1="${frame.y(b(0))}" x2="${frame.x(10)}" y2="${frame.y(b(10))}" class="demo-fit-secondary"/><line x1="${frame.x(selected)}" y1="${frame.y(yA)}" x2="${frame.x(selected)}" y2="${frame.y(yB)}" class="demo-residual"/><circle cx="${frame.x(selected)}" cy="${frame.y(yA)}" r="5" fill="var(--teal)"/><circle cx="${frame.x(selected)}" cy="${frame.y(yB)}" r="5" fill="var(--purple)"/>`;
    };
    ['w5-main','w5-interaction','w5-x'].forEach(id => byId(id).addEventListener('input', update));
    update();
  }

  function week6() {
    const random = rng(606);
    const rows = Array.from({length: 22}, (_, i) => { const x = .4 + 9.2 * i / 21; return {x, y: 12 + 5.2*x - .46*x*x + normal(random)*1.9}; });
    const degrees = [1,2,5,9];
    let degree = 2;
    app.innerHTML = `
      <section class="demo-callout"><strong>Flexibility helps until it starts fitting noise.</strong> Compare polynomial degrees inside the data range, then move the prediction into extrapolation territory.</section>
      <div class="demo-actions" style="margin-top:16px">${degrees.map(value => `<button class="w6-degree" data-degree="${value}" type="button">Degree ${value}</button>`).join('')}</div>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w6-x">Prediction x</label><output id="w6-x-out"></output></div><input id="w6-x" type="range" min="-3" max="13" step=".25" value="8"><div class="demo-scale"><span>−3</span><span>Observed: 0–10</span><span>13</span></div></div>
          <div class="demo-equation">Degree controls the highest power of x included in the fitted model.</div>
          <div id="w6-warning" class="demo-reading"></div>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Polynomial fit and extrapolation</strong><span>The gray region lies outside observed x</span></div><div class="demo-chart-frame"><svg id="w6-chart" viewBox="0 0 720 390" role="img" aria-label="Polynomial regression curve within and beyond the observed predictor range"></svg></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Degree</span><strong id="w6-degree-stat"></strong></div><div class="demo-stat"><span>Training RMSE</span><strong id="w6-rmse"></strong></div><div class="demo-stat"><span>Prediction</span><strong id="w6-pred"></strong></div></div>
        </section>
      </div>`;
    const update = () => {
      const selected = +byId('w6-x').value, fit = polyFit(rows, degree), prediction = fit.predict(selected);
      byId('w6-x-out').value = fmt(selected, 2);
      byId('w6-degree-stat').textContent = degree;
      byId('w6-rmse').textContent = fmt(fit.rmse, 2);
      byId('w6-pred').textContent = fmt(prediction, 2);
      const outside = selected < 0 || selected > 10;
      byId('w6-warning').innerHTML = outside ? '<strong class="demo-status-warn">Extrapolation:</strong> The model is extending its shape beyond observed x. High-degree curves can change dramatically here even when training error is tiny.' : '<strong>Interpolation:</strong> This prediction is supported by nearby observations. Compare degrees using error on new data, not training fit alone.';
      document.querySelectorAll('.w6-degree').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.degree === degree)));
      const frame = axes({xmin:-3,xmax:13,ymin:-30,ymax:50,xLabel:'Predictor x',yLabel:'Outcome y'});
      const curve = Array.from({length:161},(_,i)=>-3+16*i/160).map(x => [frame.x(x),frame.y(clamp(fit.predict(x),-50,70))]);
      const observed = rows.map(row => `<circle cx="${frame.x(row.x)}" cy="${frame.y(row.y)}" r="4" class="demo-point"/>`).join('');
      byId('w6-chart').innerHTML = `<title>Polynomial degree and extrapolation</title><rect x="${frame.x(-3)}" y="${frame.t}" width="${frame.x(0)-frame.x(-3)}" height="${frame.h-frame.t-frame.b}" fill="color-mix(in srgb, var(--muted) 10%, transparent)"/><rect x="${frame.x(10)}" y="${frame.t}" width="${frame.x(13)-frame.x(10)}" height="${frame.h-frame.t-frame.b}" fill="color-mix(in srgb, var(--muted) 10%, transparent)"/>${frame.markup}<path d="${path(curve)}" class="demo-fit"/>${observed}<line x1="${frame.x(selected)}" y1="${frame.y(-30)}" x2="${frame.x(selected)}" y2="${frame.y(clamp(prediction,-30,50))}" class="demo-zero"/><circle cx="${frame.x(selected)}" cy="${frame.y(clamp(prediction,-30,50))}" r="7" class="demo-point-secondary"/>`;
    };
    document.querySelectorAll('.w6-degree').forEach(button => button.addEventListener('click', () => { degree = +button.dataset.degree; update(); }));
    byId('w6-x').addEventListener('input', update);
    update();
  }

  function week7() {
    app.innerHTML = `
      <section class="demo-callout"><strong>A time series can combine trend, seasonality, shocks, and dependence.</strong> Change each component and watch both the observed series and lag-1 residual correlation respond.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w7-trend">Quarterly trend</label><output id="w7-trend-out"></output></div><input id="w7-trend" type="range" min="0" max="2" step=".1" value=".8"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w7-season">Seasonal amplitude</label><output id="w7-season-out"></output></div><input id="w7-season" type="range" min="0" max="12" step="1" value="7"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w7-shock">Quarter 13 shock</label><output id="w7-shock-out"></output></div><input id="w7-shock" type="range" min="-24" max="0" step="1" value="-15"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w7-ar">Autoregression ρ</label><output id="w7-ar-out"></output></div><input id="w7-ar" type="range" min="0" max=".9" step=".1" value=".6"></div>
          <button id="w7-new" type="button">New innovations</button>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Quarterly outcome</strong><span>Dashed line: trend + seasonality + shock</span></div><div class="demo-chart-frame"><svg id="w7-chart" viewBox="0 0 760 390" role="img" aria-label="Time series composed of trend, seasonality, a shock, and autocorrelated noise"></svg></div><div class="demo-legend"><span><i class="demo-key"></i>observed</span><span><i class="demo-key dashed"></i>systematic component</span></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Trend over 24 quarters</span><strong id="w7-trend-stat"></strong></div><div class="demo-stat"><span>Peak-to-trough seasonality</span><strong id="w7-season-stat"></strong></div><div class="demo-stat"><span>Lag-1 residual correlation</span><strong id="w7-corr"></strong></div></div>
          <div id="w7-reading" class="demo-reading"></div>
        </section>
      </div>`;
    let seed = 707;
    const update = () => {
      const trend = +byId('w7-trend').value, season = +byId('w7-season').value, shock = +byId('w7-shock').value, rho = +byId('w7-ar').value;
      const random = rng(seed), rows = [], errors = [];
      let previous = 0;
      for (let t = 0; t < 24; t += 1) {
        const systematic = 42 + trend*t + season*[.2,-.55,-.05,1][t%4] + (t >= 12 ? shock : 0);
        const error = rho*previous + normal(random)*2.4;
        rows.push({t:t+1, systematic, observed:systematic+error}); errors.push(error); previous=error;
      }
      byId('w7-trend-out').value = fmt(trend,1);
      byId('w7-season-out').value = fmt(season,0);
      byId('w7-shock-out').value = fmt(shock,0);
      byId('w7-ar-out').value = fmt(rho,1);
      byId('w7-trend-stat').textContent = `+${fmt(trend*23,1)}`;
      byId('w7-season-stat').textContent = fmt(1.55*season,1);
      const corr = correlation(errors.slice(1), errors.slice(0,-1));
      byId('w7-corr').textContent = fmt(corr,2);
      byId('w7-reading').innerHTML = Math.abs(corr) > .35 ? '<strong class="demo-status-warn">Residual dependence remains.</strong> A trend-and-seasonality model misses the way one quarter’s surprise carries into the next; a lag term may help.' : '<strong class="demo-status-good">Residual dependence is modest.</strong> After modeling the visible components, the remaining quarter-to-quarter surprises are closer to independent.';
      const frame = axes({w:760,h:390,xmin:1,xmax:24,ymin:15,ymax:72,xLabel:'Quarter',yLabel:'Outcome',xTicks:6,yTicks:5});
      const observedPath = path(rows.map(row => [frame.x(row.t),frame.y(row.observed)]));
      const systematicPath = path(rows.map(row => [frame.x(row.t),frame.y(row.systematic)]));
      const dots = rows.map(row => `<circle cx="${frame.x(row.t)}" cy="${frame.y(row.observed)}" r="3.5" class="demo-point"/>`).join('');
      byId('w7-chart').innerHTML = `<title>Time-series components</title>${frame.markup}<line x1="${frame.x(12.5)}" y1="${frame.t}" x2="${frame.x(12.5)}" y2="${frame.h-frame.b}" class="demo-zero"/><text x="${frame.x(12.5)+6}" y="${frame.t+15}" class="demo-tick">shock begins</text><path d="${systematicPath}" class="demo-fit-secondary" stroke-dasharray="6 4"/><path d="${observedPath}" class="demo-fit"/>${dots}`;
    };
    ['w7-trend','w7-season','w7-shock','w7-ar'].forEach(id=>byId(id).addEventListener('input',update));
    byId('w7-new').addEventListener('click',()=>{seed+=997;update();});
    update();
  }

  function week8() {
    const random = rng(808);
    const rows = Array.from({length:36},(_,i)=>{const x=.2+9.6*i/35;return{x,y:8+4*x-.35*x*x+normal(random)*2.4,id:i};});
    const degrees=[1,2,9];
    let folds=5,current=0;
    app.innerHTML = `
      <section class="demo-callout"><strong>Cross-validation rotates the test set.</strong> Every observation is held out once, and model quality is the average error across folds.</section>
      <div class="demo-actions" style="margin-top:16px"><label for="w8-folds"><strong>Number of folds</strong></label><select id="w8-folds"><option>3</option><option selected>5</option><option>10</option></select><button id="w8-prev" type="button">Previous fold</button><button id="w8-next" type="button">Next fold</button></div>
      <div class="demo-grid">
        <section class="demo-card demo-stack">
          <div><h2 id="w8-fold-title"></h2><p class="demo-muted">Gold observations are validation cases for this round. The fitted curves use only blue training cases.</p></div>
          <div class="table-wrap"><table class="demo-table"><thead><tr><th>Model</th><th>Current fold RMSE</th><th>Mean CV RMSE</th></tr></thead><tbody id="w8-rows"></tbody></table></div>
          <div id="w8-reading" class="demo-reading"></div>
        </section>
        <section class="demo-chart"><div class="demo-chart-title"><strong>One cross-validation round</strong><span>Degree 1, 2, and 9 fits</span></div><div class="demo-chart-frame"><svg id="w8-chart" viewBox="0 0 760 410" role="img" aria-label="Training and validation observations with three polynomial fits"></svg></div><div class="demo-legend"><span><i class="demo-key blue"></i>training</span><span><i class="demo-key gold"></i>validation</span><span><i class="demo-key"></i>degree 2</span><span><i class="demo-key red"></i>degree 9</span></div></section>
      </div>`;
    function scores() {
      return degrees.map(degree => {
        const foldErrors=[];
        for(let fold=0;fold<folds;fold+=1){const train=rows.filter(row=>row.id%folds!==fold),test=rows.filter(row=>row.id%folds===fold),fit=polyFit(train,degree);foldErrors.push(Math.sqrt(mean(test.map(row=>(row.y-fit.predict(row.x))**2))));}
        return {degree,foldErrors,average:mean(foldErrors)};
      });
    }
    const update = () => {
      current=(current+folds)%folds;
      const result=scores(),best=[...result].sort((a,b)=>a.average-b.average)[0];
      const train=rows.filter(row=>row.id%folds!==current),test=rows.filter(row=>row.id%folds===current);
      byId('w8-fold-title').textContent=`Fold ${current+1} of ${folds}`;
      byId('w8-rows').innerHTML=result.map(item=>`<tr class="${item.degree===best.degree?'selected':''}"><td>Degree ${item.degree}</td><td>${fmt(item.foldErrors[current],2)}</td><td>${fmt(item.average,2)}</td></tr>`).join('');
      byId('w8-reading').innerHTML=`<strong>Current winner: degree ${best.degree}.</strong> It has the lowest mean validation RMSE across all ${folds} held-out folds. Training error alone would tend to reward the degree-9 model.`;
      const frame=axes({w:760,h:410,xmin:0,xmax:10,ymin:0,ymax:28,xLabel:'Predictor x',yLabel:'Outcome y'});
      let markup=frame.markup;
      const classes={1:'demo-fit-secondary',2:'demo-fit',9:'demo-residual'};
      degrees.forEach(degree=>{const fit=polyFit(train,degree),curve=Array.from({length:101},(_,i)=>i/10).map(x=>[frame.x(x),frame.y(clamp(fit.predict(x),0,28))]);markup+=`<path d="${path(curve)}" class="${classes[degree]}" fill="none"/>`;});
      markup+=train.map(row=>`<circle cx="${frame.x(row.x)}" cy="${frame.y(row.y)}" r="4" class="demo-point"/>`).join('');
      markup+=test.map(row=>`<circle cx="${frame.x(row.x)}" cy="${frame.y(row.y)}" r="6" class="demo-point-secondary"/>`).join('');
      byId('w8-chart').innerHTML=`<title>Cross-validation training and validation fold</title>${markup}`;
    };
    byId('w8-folds').addEventListener('change',event=>{folds=+event.target.value;current=0;update();});
    byId('w8-prev').addEventListener('click',()=>{current-=1;update();});
    byId('w8-next').addEventListener('click',()=>{current+=1;update();});
    update();
  }

  function week9() {
    const random=rng(909),rows=[];
    for(let i=0;i<320;i+=1){const ability=normal(random),stress=normal(random),cohort=random()<.5?0:1,prior=2.7+.35*ability+.22*normal(random),sleep=6.2+.55*prior+.5*cohort+.65*normal(random),energy=.7*sleep+.55*normal(random),caffeine=-.75*sleep+.9*stress+.65*normal(random),noise=normal(random);const y=1+.10*sleep+.30*prior+.22*cohort+.16*energy-.24*stress+.32*normal(random);rows.push({y,sleep,prior,cohort,energy,caffeine,noise});}
    const options=[{name:'prior',label:'Prior GPA',role:'Pre-treatment confounder',checked:true},{name:'cohort',label:'Study cohort',role:'Design variable / confounder',checked:true},{name:'energy',label:'Daytime energy',role:'Post-treatment mediator',checked:false},{name:'caffeine',label:'Caffeine use',role:'Collider of sleep and stress',checked:false},{name:'noise',label:'Random ID score',role:'Irrelevant noise',checked:false}];
    app.innerHTML=`
      <section class="demo-callout"><strong>Explanation models need a causal reason for each control.</strong> Add and remove variables to see how the estimated sleep coefficient and its uncertainty respond.</section>
      <div class="demo-grid">
        <section class="demo-card"><h2>Build the adjustment set</h2><div class="demo-checks">${options.map(option=>`<label class="demo-check"><input type="checkbox" data-variable="${option.name}" ${option.checked?'checked':''}><div><strong>${option.label}</strong><span>${option.role}</span></div></label>`).join('')}</div></section>
        <section class="demo-stack">
          <div class="demo-stat-grid"><div class="demo-stat"><span>Sleep coefficient</span><strong id="w9-beta"></strong></div><div class="demo-stat"><span>Standard error</span><strong id="w9-se"></strong></div><div class="demo-stat"><span>Controls included</span><strong id="w9-count"></strong></div></div>
          <div class="demo-chart"><div class="demo-chart-title"><strong>Estimated sleep effect with 95% interval</strong><span>Truth in this simulation: total effect ≈ 0.21</span></div><div class="demo-chart-frame"><svg id="w9-chart" viewBox="0 0 720 250" role="img" aria-label="Estimated sleep coefficient and confidence interval under selected controls"></svg></div></div>
          <div id="w9-equation" class="demo-equation"></div><div id="w9-reading" class="demo-reading"></div>
        </section>
      </div>`;
    const update=()=>{
      const selected=[...document.querySelectorAll('[data-variable]:checked')].map(input=>input.dataset.variable),fit=regression(rows,['sleep',...selected]),beta=fit.beta[1],se=fit.se[1],lo=beta-1.96*se,hi=beta+1.96*se;
      byId('w9-beta').textContent=fmt(beta,3);byId('w9-se').textContent=fmt(se,3);byId('w9-count').textContent=selected.length;
      byId('w9-equation').textContent=`Term GPA ~ sleep${selected.map(name=>` + ${name}`).join('')}`;
      const risky=selected.filter(name=>['energy','caffeine'].includes(name)),missing=['prior','cohort'].filter(name=>!selected.includes(name));
      byId('w9-reading').innerHTML=missing.length?`<strong class="demo-status-warn">Missing pre-treatment adjustment:</strong> ${missing.join(' and ')} can confound the sleep association.`:risky.length?`<strong class="demo-status-warn">Causal target changed or bias introduced:</strong> ${risky.join(' and ')} should not be controlled automatically because they occur downstream or act as a collider.`:'<strong class="demo-status-good">Defensible core model:</strong> It adjusts for pre-treatment differences without conditioning on a mediator, collider, or irrelevant kitchen-sink variable.';
      const frame=axes({w:720,h:250,l:70,r:30,t:25,b:55,xmin:-.1,xmax:.4,ymin:0,ymax:1,xLabel:'Coefficient on sleep',yLabel:'',xTicks:5,yTicks:0});
      const cy=95;byId('w9-chart').innerHTML=`<title>Sleep coefficient confidence interval</title>${frame.markup}<line x1="${frame.x(.21)}" y1="30" x2="${frame.x(.21)}" y2="180" class="demo-truth"/><text x="${frame.x(.21)}" y="22" text-anchor="middle" class="demo-tick">total effect</text><line x1="${frame.x(lo)}" y1="${cy}" x2="${frame.x(hi)}" y2="${cy}" stroke="var(--teal)" stroke-width="5"/><line x1="${frame.x(lo)}" y1="${cy-12}" x2="${frame.x(lo)}" y2="${cy+12}" stroke="var(--teal)" stroke-width="2"/><line x1="${frame.x(hi)}" y1="${cy-12}" x2="${frame.x(hi)}" y2="${cy+12}" stroke="var(--teal)" stroke-width="2"/><circle cx="${frame.x(beta)}" cy="${cy}" r="8" class="demo-point-secondary"/><text x="${frame.x(beta)}" y="${cy+32}" text-anchor="middle" class="demo-label">${fmt(beta,3)} [${fmt(lo,3)}, ${fmt(hi,3)}]</text>`;
    };
    document.querySelectorAll('[data-variable]').forEach(input=>input.addEventListener('change',update));update();
  }

  function week10() {
    let mode='simple',seed=1010;
    app.innerHTML=`
      <section class="demo-callout"><strong>Randomization balances groups on average; blocking balances chosen covariates by design.</strong> Re-randomize to compare gender imbalance and treatment-effect estimates.</section>
      <div class="demo-actions" style="margin-top:16px"><button class="w10-mode" data-mode="simple" type="button">Simple randomization</button><button class="w10-mode" data-mode="blocked" type="button">Block by gender</button><button id="w10-new" class="button primary" type="button">Re-randomize</button></div>
      <div class="demo-grid">
        <section class="demo-stack"><div class="demo-stat-grid"><div class="demo-stat"><span>Women: treatment − control</span><strong id="w10-balance"></strong></div><div class="demo-stat"><span>Estimated effect</span><strong id="w10-effect"></strong></div><div class="demo-stat"><span>True effect</span><strong>+5.0</strong></div></div><div id="w10-reading" class="demo-reading"></div></section>
        <section class="demo-chart"><div class="demo-chart-title"><strong>Assignment and observed outcomes</strong><span>Each dot is one participant</span></div><div class="demo-chart-frame"><svg id="w10-chart" viewBox="0 0 720 390" role="img" aria-label="Participant assignments and outcomes under simple or blocked randomization"></svg></div></section>
      </div>`;
    const update=()=>{
      const random=rng(seed),people=Array.from({length:48},(_,i)=>{const woman=i<28,base=woman?62:54;return{id:i,woman,base:base+normal(random)*8};});
      if(mode==='simple'){const order=[...people].sort(()=>random()-.5);order.forEach((person,i)=>person.treated=i<24);}else{[true,false].forEach(woman=>{const group=people.filter(person=>person.woman===woman).sort(()=>random()-.5);group.forEach((person,i)=>person.treated=i<group.length/2);});}
      people.forEach(person=>person.outcome=person.base+(person.treated?5:0)+normal(random)*2);
      const treated=people.filter(p=>p.treated),control=people.filter(p=>!p.treated),effect=mean(treated.map(p=>p.outcome))-mean(control.map(p=>p.outcome)),balance=treated.filter(p=>p.woman).length-control.filter(p=>p.woman).length;
      byId('w10-balance').textContent=`${balance>=0?'+':'−'}${Math.abs(balance)}`;byId('w10-effect').textContent=`${effect>=0?'+':'−'}${fmt(Math.abs(effect),1)}`;
      byId('w10-reading').innerHTML=mode==='blocked'?'<strong class="demo-status-good">Exact balance on gender.</strong> Blocking prevents chance imbalance in a prognostic covariate, usually stabilizing the treatment-effect estimate.':'<strong>Simple randomization is unbiased over repeated trials,</strong> but this single assignment can have chance imbalance. Re-randomize to see the estimate move.';
      document.querySelectorAll('.w10-mode').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
      const frame=axes({xmin:-.5,xmax:1.5,ymin:30,ymax:95,xLabel:'Assignment group',yLabel:'Observed outcome',xTicks:0,yTicks:5});
      let markup=frame.markup;people.forEach((person,i)=>{const baseX=person.treated?1:0,jitter=((i*37)%17-8)/45;markup+=`<circle cx="${frame.x(baseX+jitter)}" cy="${frame.y(person.outcome)}" r="5" fill="${person.woman?'var(--purple)':'var(--teal)'}" fill-opacity=".72"><title>${person.woman?'Woman':'Man'}, ${person.treated?'treatment':'control'}, outcome ${fmt(person.outcome,1)}</title></circle>`;});
      [['Control',0,control],['Treatment',1,treated]].forEach(([label,xValue,group])=>{markup+=`<line x1="${frame.x(xValue-.23)}" y1="${frame.y(mean(group.map(p=>p.outcome)))}" x2="${frame.x(xValue+.23)}" y2="${frame.y(mean(group.map(p=>p.outcome)))}" stroke="var(--red)" stroke-width="4"/><text x="${frame.x(xValue)}" y="${frame.y(30)+22}" text-anchor="middle" class="demo-label">${label}</text>`;});byId('w10-chart').innerHTML=`<title>Randomized assignment outcomes</title>${markup}`;
    };
    document.querySelectorAll('.w10-mode').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;seed+=11;update();}));byId('w10-new').addEventListener('click',()=>{seed+=997;update();});update();
  }

  function week11() {
    app.innerHTML=`
      <section class="demo-callout"><strong>Difference-in-differences subtracts two changes.</strong> It recovers the treatment effect only when the untreated trends would have remained parallel.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w11-effect">True treatment effect</label><output id="w11-effect-out"></output></div><input id="w11-effect" type="range" min="-8" max="10" step="1" value="4"></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w11-drift">Untreated trend difference</label><output id="w11-drift-out"></output></div><input id="w11-drift" type="range" min="-2" max="2" step=".25" value="0"></div>
          <div id="w11-equation" class="demo-equation"></div><button id="w11-parallel" type="button">Restore parallel trends</button>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Treated and comparison groups over time</strong><span>Dashed line: treated group without treatment</span></div><div class="demo-chart-frame"><svg id="w11-chart" viewBox="0 0 760 390" role="img" aria-label="Difference-in-differences trends and counterfactual"></svg></div><div class="demo-legend"><span><i class="demo-key"></i>treated</span><span><i class="demo-key purple"></i>comparison</span><span><i class="demo-key dashed"></i>counterfactual</span></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Treated change</span><strong id="w11-treated-change"></strong></div><div class="demo-stat"><span>Comparison change</span><strong id="w11-control-change"></strong></div><div class="demo-stat"><span>DID estimate</span><strong id="w11-did"></strong></div></div><div id="w11-reading" class="demo-reading"></div>
        </section>
      </div>`;
    const update=()=>{
      const effect=+byId('w11-effect').value,drift=+byId('w11-drift').value,control=t=>42+1.2*t,untreated=t=>48+(1.2+drift)*t,treated=t=>untreated(t)+(t>=4?effect:0),treatedChange=treated(7)-treated(3),controlChange=control(7)-control(3),did=treatedChange-controlChange;
      byId('w11-effect-out').value=fmt(effect,0);byId('w11-drift-out').value=fmt(drift,2);byId('w11-treated-change').textContent=`${treatedChange>=0?'+':'−'}${fmt(Math.abs(treatedChange),1)}`;byId('w11-control-change').textContent=`${controlChange>=0?'+':'−'}${fmt(Math.abs(controlChange),1)}`;byId('w11-did').textContent=`${did>=0?'+':'−'}${fmt(Math.abs(did),1)}`;byId('w11-equation').textContent=`DID = (${fmt(treated(7),1)} − ${fmt(treated(3),1)}) − (${fmt(control(7),1)} − ${fmt(control(3),1)}) = ${fmt(did,1)}`;
      byId('w11-reading').innerHTML=Math.abs(drift)<.01?`<strong class="demo-status-good">Parallel trends:</strong> DID equals the true treatment effect (${fmt(effect,1)}). The comparison group supplies the treated group’s missing counterfactual change.`:`<strong class="demo-status-warn">Parallel trends fails:</strong> DID equals treatment effect plus ${fmt(4*drift,1)} points of trend bias, so ${fmt(did,1)} is not the causal effect ${fmt(effect,1)}.`;
      const frame=axes({w:760,h:390,xmin:0,xmax:7,ymin:35,ymax:75,xLabel:'Period',yLabel:'Outcome',xTicks:7,yTicks:4}),times=Array.from({length:8},(_,i)=>i),line=fn=>path(times.map(t=>[frame.x(t),frame.y(fn(t))]));
      byId('w11-chart').innerHTML=`<title>Difference-in-differences and parallel trends</title>${frame.markup}<rect x="${frame.x(3.5)}" y="${frame.t}" width="${frame.x(7)-frame.x(3.5)}" height="${frame.h-frame.t-frame.b}" fill="color-mix(in srgb, var(--teal) 8%, transparent)"/><line x1="${frame.x(3.5)}" y1="${frame.t}" x2="${frame.x(3.5)}" y2="${frame.h-frame.b}" class="demo-zero"/><text x="${frame.x(3.5)+6}" y="${frame.t+14}" class="demo-tick">treatment</text><path d="${line(control)}" class="demo-fit-secondary"/><path d="${line(untreated)}" class="demo-truth"/><path d="${line(treated)}" class="demo-fit"/>`;
    };
    ['w11-effect','w11-drift'].forEach(id=>byId(id).addEventListener('input',update));byId('w11-parallel').addEventListener('click',()=>{byId('w11-drift').value=0;update();});update();
  }

  function week12() {
    const purposeEffects={debt_consolidation:0,credit_card:.35,small_business:-.65};
    const purposeLabels={debt_consolidation:'Debt consolidation',credit_card:'Credit card',small_business:'Small business'};
    app.innerHTML=`
      <section class="demo-callout"><strong>One model creates three differently shaped views.</strong> Log odds change in a straight line, odds change exponentially, and probability follows an S-curve.</section>
      <div class="demo-grid equal">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w12-score">Credit score index</label><output id="w12-score-out"></output></div><input id="w12-score" type="range" min="20" max="100" step="1" value="65"></div>
          <div class="demo-control"><label for="w12-purpose">Loan purpose</label><select id="w12-purpose">${Object.entries(purposeLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></div>
          <div id="w12-equation" class="demo-equation"></div><div class="demo-reading"><strong>Conversions:</strong> odds = p/(1−p), and p = odds/(1+odds). A one-unit predictor change multiplies the odds by e<sup>β</sup>.</div>
        </section>
        <section class="demo-stack">
          <div class="demo-stat-grid"><div class="demo-stat"><span>Log odds</span><strong id="w12-logodds"></strong></div><div class="demo-stat"><span>Odds</span><strong id="w12-odds"></strong></div><div class="demo-stat"><span>Probability</span><strong id="w12-prob"></strong></div></div><div id="w12-reading" class="demo-reading"></div>
        </section>
      </div>
      <section class="demo-small-multiples" aria-label="Three synchronized views of the logistic regression prediction">
        <div class="demo-chart"><div class="demo-chart-title"><strong>Log odds</strong><span>Linear scale</span></div><div class="demo-chart-frame"><svg id="w12-logodds-chart" viewBox="0 0 420 300" role="img" aria-label="Log odds of full repayment by credit score and loan purpose"></svg></div></div>
        <div class="demo-chart"><div class="demo-chart-title"><strong>Odds</strong><span>Exponential scale</span></div><div class="demo-chart-frame"><svg id="w12-odds-chart" viewBox="0 0 420 300" role="img" aria-label="Odds of full repayment by credit score and loan purpose"></svg></div></div>
        <div class="demo-chart"><div class="demo-chart-title"><strong>Probability</strong><span>S-shaped scale</span></div><div class="demo-chart-frame"><svg id="w12-probability-chart" viewBox="0 0 420 300" role="img" aria-label="Probability of full repayment by credit score and loan purpose"></svg></div></div>
      </section>
      <div class="demo-legend"><span><i class="demo-key"></i>debt consolidation</span><span><i class="demo-key purple"></i>credit card</span><span><i class="demo-key red"></i>small business</span><span><i class="demo-key gold"></i>selected borrower</span></div>`;
    const logistic=z=>1/(1+Math.exp(-z)),logOdds=(score,purpose)=>-4.25+.072*score+purposeEffects[purpose];
    const drawPlot=(id,title,yMin,yMax,yLabel,transform)=>{
      const score=+byId('w12-score').value,purpose=byId('w12-purpose').value,value=transform(logOdds(score,purpose));
      const frame=axes({w:420,h:300,l:55,r:12,t:14,b:44,xmin:20,xmax:100,ymin:yMin,ymax:yMax,xLabel:'Credit score',yLabel,xTicks:4,yTicks:4});
      let markup=frame.markup;
      Object.keys(purposeEffects).forEach((key,index)=>{
        const curve=Array.from({length:81},(_,i)=>20+i).map(x=>[frame.x(x),frame.y(transform(logOdds(x,key)))]);
        markup+=`<path d="${path(curve)}" class="${index===0?'demo-fit':index===1?'demo-fit-secondary':'demo-residual'}" fill="none" opacity="${key===purpose?1:.28}"/>`;
      });
      markup+=`<line x1="${frame.x(score)}" y1="${frame.y(yMin)}" x2="${frame.x(score)}" y2="${frame.y(value)}" class="demo-zero"/><circle cx="${frame.x(score)}" cy="${frame.y(value)}" r="7" class="demo-point-secondary"/><text x="${frame.x(score)}" y="${frame.y(value)-11}" text-anchor="middle" class="demo-label">${yLabel==='Probability'?pct(value):fmt(value,2)}</text>`;
      byId(id).innerHTML=`<title>${title}</title>${markup}`;
    };
    const update=()=>{const score=+byId('w12-score').value,purpose=byId('w12-purpose').value,z=logOdds(score,purpose),odds=Math.exp(z),probability=logistic(z);byId('w12-score-out').value=score;byId('w12-logodds').textContent=fmt(z,2);byId('w12-odds').textContent=`${fmt(odds,2)} : 1`;byId('w12-prob').textContent=pct(probability);byId('w12-equation').textContent=`log(p/(1−p)) = −4.25 + 0.072(credit score) ${purposeEffects[purpose]<0?'−':'+'} ${fmt(Math.abs(purposeEffects[purpose]),2)}(${purposeLabels[purpose]})`;byId('w12-reading').innerHTML=`<strong>At score ${score},</strong> the same fitted value appears as ${fmt(z,2)} log odds, ${fmt(odds,2)}:1 odds, and ${pct(probability)} probability for a ${purposeLabels[purpose].toLowerCase()} loan.`;
      drawPlot('w12-logodds-chart','Log odds increase linearly with credit score',-4,4,'Log odds',value=>value);
      drawPlot('w12-odds-chart','Odds increase exponentially with credit score',0,30,'Odds',value=>Math.exp(value));
      drawPlot('w12-probability-chart','Probability follows an S-shaped logistic curve',0,1,'Probability',value=>logistic(value));
    };
    ['w12-score','w12-purpose'].forEach(id=>byId(id).addEventListener(id==='w12-score'?'input':'change',update));update();
  }

  function week12interaction() {
    const purposeModels={
      debt_consolidation:{label:'Debt consolidation',intercept:0,interaction:0},
      credit_card:{label:'Credit card',intercept:.30,interaction:.008},
      small_business:{label:'Small business',intercept:-.35,interaction:-.012}
    };
    app.innerHTML=`
      <section class="demo-callout"><strong>A logistic interaction changes the log-odds slope.</strong> Because odds and probability are nonlinear transformations, one interaction creates increasingly different curve shapes across all three views.</section>
      <div class="demo-grid equal">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w12i-score">Credit score index</label><output id="w12i-score-out"></output></div><input id="w12i-score" type="range" min="20" max="100" step="1" value="65"></div>
          <div class="demo-control"><label for="w12i-purpose">Loan purpose</label><select id="w12i-purpose">${Object.entries(purposeModels).map(([value,model])=>`<option value="${value}">${model.label}</option>`).join('')}</select></div>
          <div id="w12i-equation" class="demo-equation"></div>
          <div class="demo-reading"><strong>Interaction rule:</strong> purpose changes both the starting log odds and the amount log odds change for each additional credit-score point.</div>
        </section>
        <section class="demo-stack">
          <div class="demo-stat-grid"><div class="demo-stat"><span>Log-odds slope</span><strong id="w12i-slope"></strong></div><div class="demo-stat"><span>Odds multiplier for +1</span><strong id="w12i-multiplier"></strong></div><div class="demo-stat"><span>Probability</span><strong id="w12i-prob"></strong></div></div>
          <div id="w12i-reading" class="demo-reading"></div>
        </section>
      </div>
      <section class="demo-small-multiples" aria-label="Three synchronized views of a logistic regression interaction">
        <div class="demo-chart"><div class="demo-chart-title"><strong>Log odds</strong><span>Different straight-line slopes</span></div><div class="demo-chart-frame"><svg id="w12i-logodds-chart" viewBox="0 0 420 300" role="img" aria-label="Interacting log-odds lines by credit score and loan purpose"></svg></div></div>
        <div class="demo-chart"><div class="demo-chart-title"><strong>Odds</strong><span>Different exponential curves</span></div><div class="demo-chart-frame"><svg id="w12i-odds-chart" viewBox="0 0 420 300" role="img" aria-label="Interacting odds curves by credit score and loan purpose"></svg></div></div>
        <div class="demo-chart"><div class="demo-chart-title"><strong>Probability</strong><span>Different logistic curves</span></div><div class="demo-chart-frame"><svg id="w12i-probability-chart" viewBox="0 0 420 300" role="img" aria-label="Interacting probability curves by credit score and loan purpose"></svg></div></div>
      </section>
      <div class="demo-legend"><span><i class="demo-key"></i>debt consolidation</span><span><i class="demo-key purple"></i>credit card</span><span><i class="demo-key red"></i>small business</span><span><i class="demo-key gold"></i>selected borrower</span></div>`;
    const logistic=value=>1/(1+Math.exp(-value));
    const slope=purpose=>.065+purposeModels[purpose].interaction;
    const logOdds=(score,purpose)=>-4+purposeModels[purpose].intercept+slope(purpose)*score;
    const drawPlot=(id,title,yMin,yMax,yLabel,transform)=>{
      const score=+byId('w12i-score').value,purpose=byId('w12i-purpose').value,value=transform(logOdds(score,purpose));
      const frame=axes({w:420,h:300,l:55,r:12,t:14,b:44,xmin:20,xmax:100,ymin:yMin,ymax:yMax,xLabel:'Credit score',yLabel,xTicks:4,yTicks:4});
      let markup=frame.markup;
      Object.keys(purposeModels).forEach((key,index)=>{
        const curve=Array.from({length:81},(_,i)=>20+i).map(x=>[frame.x(x),frame.y(transform(logOdds(x,key)))]);
        markup+=`<path d="${path(curve)}" class="${index===0?'demo-fit':index===1?'demo-fit-secondary':'demo-residual'}" fill="none" opacity="${key===purpose?1:.28}"/>`;
      });
      markup+=`<line x1="${frame.x(score)}" y1="${frame.y(yMin)}" x2="${frame.x(score)}" y2="${frame.y(value)}" class="demo-zero"/><circle cx="${frame.x(score)}" cy="${frame.y(value)}" r="7" class="demo-point-secondary"/><text x="${frame.x(score)}" y="${frame.y(value)-11}" text-anchor="middle" class="demo-label">${yLabel==='Probability'?pct(value):fmt(value,2)}</text>`;
      byId(id).innerHTML=`<title>${title}</title>${markup}`;
    };
    const update=()=>{
      const score=+byId('w12i-score').value,purpose=byId('w12i-purpose').value,model=purposeModels[purpose],currentSlope=slope(purpose),z=logOdds(score,purpose),odds=Math.exp(z),probability=logistic(z);
      byId('w12i-score-out').value=score;
      byId('w12i-slope').textContent=fmt(currentSlope,3);
      byId('w12i-multiplier').textContent=`×${fmt(Math.exp(currentSlope),3)}`;
      byId('w12i-prob').textContent=pct(probability);
      byId('w12i-equation').textContent=`log odds = −4 + 0.065(score) ${model.intercept<0?'−':'+'} ${fmt(Math.abs(model.intercept),2)}(${model.label}) ${model.interaction<0?'−':'+'} ${fmt(Math.abs(model.interaction),3)}(score × ${model.label})`;
      byId('w12i-reading').innerHTML=`<strong>${model.label}:</strong> each +1 in credit score changes log odds by ${fmt(currentSlope,3)} and multiplies repayment odds by ${fmt(Math.exp(currentSlope),3)}. At score ${score}, the fitted odds are ${fmt(odds,2)}:1 and probability is ${pct(probability)}.`;
      drawPlot('w12i-logodds-chart','Interaction produces different log-odds slopes',-4,5,'Log odds',value=>value);
      drawPlot('w12i-odds-chart','Interaction produces different odds growth rates',0,40,'Odds',value=>Math.exp(value));
      drawPlot('w12i-probability-chart','Interaction produces different probability curves',0,1,'Probability',value=>logistic(value));
    };
    ['w12i-score','w12i-purpose'].forEach(id=>byId(id).addEventListener(id==='w12i-score'?'input':'change',update));
    update();
  }

  function week2noise() {
    const truth = {intercept: 10, slope: 2};
    let sampleNumber = 1;
    let rows = [];

    app.innerHTML = `
      <section class="demo-callout"><strong>Data-generating process:</strong> every sample comes from y = 10 + 2x + error, where error has standard deviation σ. The fitted line will change from sample to sample; the true line does not.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls" aria-label="Simulation controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w2n-sigma">Noise standard deviation, σ</label><output id="w2n-sigma-out"></output></div><input id="w2n-sigma" type="range" min="0.5" max="12" step="0.5" value="4"><div class="demo-scale"><span>Almost no noise</span><span>Very noisy</span></div></div>
          <div class="demo-control"><div class="demo-control-head"><label for="w2n-n">Number of points</label><output id="w2n-n-out"></output></div><input id="w2n-n" type="range" min="10" max="100" step="10" value="50"><div class="demo-scale"><span>10</span><span>100</span></div></div>
          <div class="demo-actions"><button id="w2n-simulate" class="active" type="button">Generate new sample</button></div>
          <div class="demo-equation">True equation: y = 10 + 2x</div>
          <p class="demo-small">The shaded area gives a 95% prediction interval for one new outcome at each x-value.</p>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>True line, fitted line, and prediction interval</strong><span id="w2n-chart-note"></span></div><div class="demo-chart-frame"><svg id="w2n-chart" viewBox="0 0 760 430" role="img" aria-label="Simulated points with a true regression line, an estimated regression line, and a shaded 95 percent prediction interval"></svg></div><div class="demo-legend"><span><i class="demo-key dashed"></i>true line</span><span><i class="demo-key"></i>estimated line</span><span><i class="demo-key band"></i>95% prediction interval</span><span><i class="demo-key gold"></i>inside prediction interval</span><span><i class="demo-key red"></i>outside prediction interval</span></div></div>
          <div class="demo-stat-grid five"><div class="demo-stat"><span>Estimated intercept</span><strong id="w2n-intercept"></strong></div><div class="demo-stat"><span>Estimated slope</span><strong id="w2n-slope"></strong></div><div class="demo-stat"><span>R²</span><strong id="w2n-r2"></strong></div><div class="demo-stat"><span>RSE</span><strong id="w2n-rse"></strong></div><div class="demo-stat"><span>Inside 95% PI</span><strong id="w2n-coverage"></strong></div></div>
          <div id="w2n-equation" class="demo-equation"></div>
          <div id="w2n-reading" class="demo-reading" aria-live="polite"></div>
        </section>
      </div>
      <section class="demo-card" style="margin-top:18px"><h2>Try this</h2><p>Set σ to 1, 4, and 10. For each value, generate several samples. What stays fixed? What varies? Does the interval become wider when the residuals become more variable?</p></section>`;

    const simulate = () => {
      const sigma = +byId('w2n-sigma').value;
      const n = +byId('w2n-n').value;
      const random = rng(20260200 + sampleNumber * 7919);
      rows = Array.from({length: n}, () => {
        const x = 10 * random();
        return {x, y: truth.intercept + truth.slope * x + sigma * normal(random)};
      });
      sampleNumber += 1;
    };

    const update = ({newData = false} = {}) => {
      if (newData || !rows.length) simulate();
      const sigma = +byId('w2n-sigma').value;
      const n = rows.length;
      const xbar = mean(rows.map(row => row.x));
      const sxx = sum(rows.map(row => (row.x - xbar) ** 2));
      const fit = regression(rows, ['x']);
      const [intercept, slope] = fit.beta;
      const residualSD = Math.sqrt(fit.mse);
      const ybar = mean(rows.map(row => row.y));
      const rSquared = 1 - sum(fit.residuals.map(value => value ** 2)) / sum(rows.map(row => (row.y - ybar) ** 2));
      const tCriticalByN = {10: 2.306, 20: 2.101, 30: 2.048, 40: 2.024, 50: 2.011, 60: 2.002, 70: 1.995, 80: 1.991, 90: 1.987, 100: 1.984};
      const tCritical = tCriticalByN[n];
      const interval = x => {
        const estimate = intercept + slope * x;
        const margin = tCritical * residualSD * Math.sqrt(1 + 1 / rows.length + (x - xbar) ** 2 / sxx);
        return {estimate, lower: estimate - margin, upper: estimate + margin};
      };
      const covered = rows.filter(row => row.y >= interval(row.x).lower && row.y <= interval(row.x).upper).length;
      const allY = rows.flatMap(row => [row.y, interval(row.x).lower, interval(row.x).upper, truth.intercept + truth.slope * row.x]);
      const ymin = Math.floor((Math.min(...allY) - 2) / 5) * 5;
      const ymax = Math.ceil((Math.max(...allY) + 2) / 5) * 5;
      const frame = axes({w: 760, h: 430, l: 60, r: 20, t: 18, b: 50, xmin: 0, xmax: 10, ymin, ymax, xLabel: 'Predictor x', yLabel: 'Outcome y'});
      const xs = Array.from({length: 101}, (_, i) => i / 10);
      const upper = xs.map(x => [frame.x(x), frame.y(interval(x).upper)]);
      const lower = xs.map(x => [frame.x(x), frame.y(interval(x).lower)]);
      const band = `${path(upper)} ${lower.slice().reverse().map(point => `L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(' ')} Z`;
      const fitted = path(xs.map(x => [frame.x(x), frame.y(intercept + slope * x)]));
      const trueLine = path(xs.map(x => [frame.x(x), frame.y(truth.intercept + truth.slope * x)]));
      const points = rows.map(row => {
        const isCovered = row.y >= interval(row.x).lower && row.y <= interval(row.x).upper;
        return `<circle cx="${frame.x(row.x)}" cy="${frame.y(row.y)}" r="3.7" fill="${isCovered ? 'var(--gold)' : 'var(--red)'}" fill-opacity=".76"/>`;
      }).join('');
      byId('w2n-sigma-out').value = fmt(sigma, 1);
      byId('w2n-n-out').value = n;
      byId('w2n-chart-note').textContent = `n = ${n} · σ = ${fmt(sigma, 1)} · sample ${sampleNumber - 1}`;
      byId('w2n-chart').innerHTML = `<title>Simulated regression data and 95 percent prediction interval</title>${frame.markup}<path d="${band}" class="demo-band"/><path d="${trueLine}" class="demo-truth"/><path d="${fitted}" class="demo-fit"/>${points}`;
      byId('w2n-intercept').textContent = fmt(intercept, 2);
      byId('w2n-slope').textContent = fmt(slope, 2);
      byId('w2n-r2').textContent = fmt(rSquared, 3);
      byId('w2n-rse').textContent = fmt(residualSD, 2);
      const capture = covered / n;
      byId('w2n-coverage').textContent = `${covered} / ${n} (${pct(capture)})`;
      byId('w2n-equation').textContent = `Estimated equation: ŷ = ${fmt(intercept, 2)} ${slope < 0 ? '−' : '+'} ${fmt(Math.abs(slope), 2)}x`;
      byId('w2n-reading').innerHTML = `<strong>${covered} of ${n} points (${pct(capture)}) are inside the fitted 95% prediction interval.</strong> The residual standard error is ${fmt(residualSD, 2)}. The interval is wider than a confidence interval because it is meant to cover one individual future outcome, not just the mean outcome.`;
    };

    byId('w2n-sigma').addEventListener('input', () => update({newData: true}));
    byId('w2n-n').addEventListener('input', () => update({newData: true}));
    byId('w2n-simulate').addEventListener('click', () => update({newData: true}));
    update({newData: true});
  }

  function week13() {
    const random=rng(1313),rows=Array.from({length:140},(_,i)=>{const score=20+80*random(),probability=1/(1+Math.exp(-(-4.1+.068*score))),actual=random()<probability?1:0;return{score,probability,actual,id:i};});
    app.innerHTML=`
      <section class="demo-callout"><strong>A classification threshold encodes a tradeoff.</strong> Lower it to catch more true repayments, but expect more false positives; raise it to be more selective.</section>
      <div class="demo-grid">
        <section class="demo-card demo-controls">
          <div class="demo-control"><div class="demo-control-head"><label for="w13-threshold">Classification threshold</label><output id="w13-threshold-out"></output></div><input id="w13-threshold" type="range" min=".1" max=".9" step=".05" value=".5"><div class="demo-scale"><span>More positive predictions</span><span>More selective</span></div></div>
          <div class="demo-matrix"><div><span>True positive</span><strong id="w13-tp"></strong></div><div><span>False positive</span><strong id="w13-fp"></strong></div><div><span>False negative</span><strong id="w13-fn"></strong></div><div><span>True negative</span><strong id="w13-tn"></strong></div></div>
          <button id="w13-balance" type="button">Use 0.50 threshold</button>
        </section>
        <section class="demo-stack">
          <div class="demo-chart"><div class="demo-chart-title"><strong>Predicted probabilities and outcomes</strong><span>Vertical line is the decision threshold</span></div><div class="demo-chart-frame"><svg id="w13-chart" viewBox="0 0 760 350" role="img" aria-label="Predicted loan repayment probabilities, actual outcomes, and classification threshold"></svg></div><div class="demo-legend"><span><i class="demo-key"></i>actually repaid</span><span><i class="demo-key red"></i>did not repay</span></div></div>
          <div class="demo-stat-grid"><div class="demo-stat"><span>Sensitivity / TPR</span><strong id="w13-tpr"></strong></div><div class="demo-stat"><span>False positive rate</span><strong id="w13-fpr"></strong></div><div class="demo-stat"><span>Accuracy</span><strong id="w13-accuracy"></strong></div></div><div id="w13-reading" class="demo-reading"></div>
        </section>
      </div>`;
    const update=()=>{const threshold=+byId('w13-threshold').value;let tp=0,fp=0,fn=0,tn=0;rows.forEach(row=>{const predicted=row.probability>=threshold;if(predicted&&row.actual)tp++;else if(predicted&&!row.actual)fp++;else if(!predicted&&row.actual)fn++;else tn++;});const tpr=tp/(tp+fn),fpr=fp/(fp+tn),accuracy=(tp+tn)/rows.length;byId('w13-threshold-out').value=fmt(threshold,2);byId('w13-tp').textContent=tp;byId('w13-fp').textContent=fp;byId('w13-fn').textContent=fn;byId('w13-tn').textContent=tn;byId('w13-tpr').textContent=pct(tpr);byId('w13-fpr').textContent=pct(fpr);byId('w13-accuracy').textContent=pct(accuracy);byId('w13-reading').innerHTML=threshold<.5?'<strong>Lower threshold:</strong> sensitivity rises because fewer actual repayments are missed, but more non-repayments are incorrectly approved.':threshold>.5?'<strong>Higher threshold:</strong> false positives fall, but more actual repayments become false negatives.':'<strong>0.50 is conventional, not automatically optimal.</strong> The right cutoff depends on the relative costs of false approvals and false rejections.';
      const frame=axes({w:760,h:350,l:64,r:20,t:20,b:52,xmin:0,xmax:1,ymin:-.5,ymax:1.5,xLabel:'Predicted probability',yLabel:'Actual outcome',xTicks:5,yTicks:2});let markup=frame.markup+`<line x1="${frame.x(threshold)}" y1="${frame.t}" x2="${frame.x(threshold)}" y2="${frame.h-frame.b}" class="demo-zero"/><text x="${frame.x(threshold)+5}" y="${frame.t+14}" class="demo-tick">threshold ${fmt(threshold,2)}</text>`;markup+=rows.map(row=>{const jitter=((row.id*29)%19-9)/55;return`<circle cx="${frame.x(row.probability)}" cy="${frame.y(row.actual+jitter)}" r="4" fill="${row.actual?'var(--teal)':'var(--red)'}" fill-opacity=".55"/>`;}).join('');byId('w13-chart').innerHTML=`<title>Classification threshold and outcomes</title>${markup}`;};
    byId('w13-threshold').addEventListener('input',update);byId('w13-balance').addEventListener('click',()=>{byId('w13-threshold').value=.5;update();});update();
  }

  const demos = {week1, week2, week2noise, week3, week4, week5, week6, week7, week8, week9, week10, week11, week12, week12interaction, week13};
  if (demos[demo]) demos[demo]();
})();
