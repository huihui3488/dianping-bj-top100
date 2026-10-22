/* ==========================================================================
   北京餐厅 Top100 · 前端逻辑
   纯原生 JS，无依赖。数据由 assets/data.js 以全局对象注入，
   因此 file:// 双击打开也能跑，不依赖 fetch / CORS。
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S) return;

  var META = S.meta, ST = S.stats, ITEMS = S.items, POOL = S.pool;
  var SC = META.scoring;
  var BRAND = '#DD4B22', TEAL = '#2A6C60', GOLD = '#A8792A', INK4 = '#9AA0A9', LINE = '#E3E0DA';

  /* 未入榜门店追加在 Top100 之后，构成统一的 150 行候选池 */
  var ALL = ITEMS.slice();
  POOL.filter(function (p) { return !p.in_top; })
    .sort(function (a, b) { return b.review_count - a.review_count; })
    .forEach(function (p) {
      ALL.push({
        rank: null, shop_id: p.shop_id, name: p.name, brand: p.brand,
        category: p.category, cuisine: p.cuisine, district: p.district,
        rating: p.rating, review_count: p.review_count, avg_price: p.avg_price,
        source_page: p.source_page, in_top: false
      });
    });

  /* ---------------------------------------------------------------- 小工具 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function nfmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function svg(w, h, body) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" ' +
      'role="img" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" fill="' + (o.fill || '#3C424B') + '"' +
      ' font-size="' + (o.size || 11) + '" font-family="system-ui,-apple-system,Segoe UI,Microsoft YaHei,sans-serif"' +
      ' text-anchor="' + (o.anchor || 'start') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') +
      (o.opacity ? ' opacity="' + o.opacity + '"' : '') +
      (o.mono ? ' font-variant-numeric="tabular-nums"' : '') + '>' + esc(s) + '</text>';
  }
  function rect(x, y, w, h, fill, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + h +
      '" fill="' + fill + '" rx="' + (o.rx == null ? 2 : o.rx) + '"' +
      (o.opacity ? ' opacity="' + o.opacity + '"' : '') + '/>';
  }
  function line(x1, y1, x2, y2, stroke, o) {
    o = o || {};
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + stroke + '" stroke-width="' + (o.w || 1) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
  }
  function tip(s) { return '<title>' + esc(s) + '</title>'; }

  /* ---------------------------------------------------------------- 横向条形 */
  function hbars(host, data, opt) {
    opt = opt || {};
    var W = 600, labelW = opt.labelW || 148, padR = opt.padR || 66;
    var rowH = opt.rowH || 26, top = 6;
    var H = top * 2 + data.length * rowH;
    var barX = labelW, barW = W - labelW - padR;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var b = '';
    data.forEach(function (d, i) {
      var y = top + i * rowH, w = d.value / max * barW;
      b += txt(barX - 10, y + rowH * 0.62, clip(d.label, opt.labelChars || 13),
        { anchor: 'end', size: opt.size || 11.5, fill: '#3C424B' });
      b += rect(barX, y + rowH * 0.22, barW, rowH * 0.52, '#F0EDE7', { rx: 3 });
      b += rect(barX, y + rowH * 0.22, w, rowH * 0.52, d.color || BRAND, { rx: 3 });
      b += txt(barX + barW + 8, y + rowH * 0.62, d.display != null ? d.display : nfmt(d.value),
        { size: opt.size || 11.5, fill: '#15181D', weight: 600, mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 竖向柱状 */
  function vbars(host, data, opt) {
    opt = opt || {};
    var W = 600, H = opt.height || 250, padL = 14, padB = 42, padT = 26;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(opt.barW || 54, slot * 0.58);
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, LINE);
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var h = d.value / max * plotH;
      var x = cx - bw / 2, y = H - padB - h;
      b += rect(x, y, bw, h, d.color || BRAND, { rx: 3 });
      b += txt(cx, y - 8, d.display != null ? d.display : nfmt(d.value),
        { anchor: 'middle', size: 12, fill: '#15181D', weight: 650, mono: true });
      b += txt(cx, H - padB + 20, d.label, { anchor: 'middle', size: 11.5, fill: '#6E7480' });
      if (d.sub) b += txt(cx, H - padB + 35, d.sub, { anchor: 'middle', size: 10.5, fill: '#9AA0A9' });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 堆叠柱（进榜 / 落榜） */
  function stackedCols(host, data, opt) {
    opt = opt || {};
    var W = 600, H = opt.height || 270, padL = 20, padB = 46, padT = 30;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(78, slot * 0.5);
    var max = Math.max.apply(null, data.map(function (d) { return d.total; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, LINE);
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var hIn = d.in / max * plotH, hOut = (d.total - d.in) / max * plotH;
      var yOut = H - padB - hOut, yIn = yOut - hIn;
      b += rect(cx - bw / 2, yOut, bw, hOut, '#DFD9CE', { rx: 2 }) + tip(d.label + ' 分：未入榜 ' + (d.total - d.in) + ' 家');
      b += rect(cx - bw / 2, yIn, bw, hIn, BRAND, { rx: 2 }) + tip(d.label + ' 分：入榜 ' + d.in + ' 家');
      b += txt(cx, yIn - 22, d.rate + '%', { anchor: 'middle', size: 13, fill: BRAND, weight: 700, mono: true });
      b += txt(cx, yIn - 8, d.in + '/' + d.total, { anchor: 'middle', size: 10.5, fill: '#6E7480', mono: true });
      b += txt(cx, H - padB + 20, d.label + ' 分', { anchor: 'middle', size: 12, fill: '#15181D', weight: 600 });
      b += txt(cx, H - padB + 35, '进榜率', { anchor: 'middle', size: 10, fill: '#9AA0A9' });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 分组柱（菜系 全量 vs 进榜） */
  function groupedBars(host, data, opt) {
    opt = opt || {};
    var W = 620, H = opt.height || 300, padL = 16, padB = 64, padT = 26;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(26, slot * 0.3);
    var max = Math.max.apply(null, data.map(function (d) { return d.total; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, LINE);
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var hT = d.total / max * plotH, hI = d.in / max * plotH;
      b += rect(cx - bw - 2, H - padB - hT, bw, hT, '#DFD9CE', { rx: 2 }) + tip(d.name + '：全量 ' + d.total);
      b += rect(cx + 2, H - padB - hI, bw, hI, TEAL, { rx: 2 }) + tip(d.name + '：进榜 ' + d.in);
      b += txt(cx - bw / 2 - 2, H - padB - hT - 5, d.total, { anchor: 'middle', size: 10, fill: '#8B8578', mono: true });
      b += txt(cx + bw / 2 + 2, H - padB - hI - 5, d.in, { anchor: 'middle', size: 10, fill: TEAL, weight: 650, mono: true });
      b += txt(cx, H - padB + 16, clip(d.name, 5), { anchor: 'middle', size: 10.5, fill: '#3C424B' });
      b += txt(cx, H - padB + 31, d.rate + '%', { anchor: 'middle', size: 9.5, fill: '#9AA0A9', mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 气泡图 */
  function scatter(host, pool, opt) {
    opt = opt || {};
    var W = 620, H = 400, L = 54, R = 18, T = 18, B = 48;
    var pw = W - L - R, ph = H - T - B;
    var xmin = 3.4, xmax = 5.1, ymin = 3.0, ymax = 5.0;
    var b = '';
    for (var g = 0; g <= 4; g++) {
      var yv = ymin + (ymax - ymin) * g / 4;
      var yy = T + ph - (yv - ymin) / (ymax - ymin) * ph;
      b += line(L, yy, W - R, yy, g === 0 ? LINE : '#F2EFE9');
      b += txt(L - 8, yy + 4, nfmt(Math.round(Math.pow(10, yv))),
        { anchor: 'end', size: 10.5, fill: INK4, mono: true });
    }
    [3.5, 4.0, 4.5, 5.0].forEach(function (xv) {
      var xx = L + (xv - xmin) / (xmax - xmin) * pw;
      b += line(xx, T, xx, T + ph, '#F2EFE9');
      b += txt(xx, H - B + 18, xv.toFixed(1), { anchor: 'middle', size: 10.5, fill: INK4, mono: true });
    });
    b += txt(L + 6, T + 12, '评论数（对数轴）', { size: 10.5, fill: INK4 });
    b += txt(W - R, H - 8, '评分', { anchor: 'end', size: 10.5, fill: INK4 });

    function pos(d) {
      var x = L + (Math.min(Math.max(d.rating, xmin), xmax) - xmin) / (xmax - xmin) * pw;
      var ly = Math.log10(d.review_count);
      var y = T + ph - (Math.min(Math.max(ly, ymin), ymax) - ymin) / (ymax - ymin) * ph;
      return { x: x, y: y };
    }

    // 先画落榜（空心），再画入榜（实心），保证入榜在上层
    pool.slice().filter(function (d) { return !d.in_top; }).forEach(function (d) {
      var p = pos(d), r = 3 + Math.sqrt(d.avg_price) / 3.4;
      b += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="none" stroke="#B9B2A5" stroke-width="1.1">' +
        tip(d.name + '｜' + d.rating + ' 分｜' + nfmt(d.review_count) + ' 条｜未入榜') + '</circle>';
    });
    pool.slice().filter(function (d) { return d.in_top; }).forEach(function (d) {
      var p = pos(d), r = 3 + Math.sqrt(d.avg_price) / 3.4;
      var c = d.rating === 5.0 ? BRAND : (d.rating === 4.5 ? '#E8843D' : GOLD);
      b += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + c + '" opacity=".42" stroke="' + c + '" stroke-width=".7">' +
        tip(d.name + '｜' + d.rating + ' 分｜' + nfmt(d.review_count) + ' 条｜第 ' + d.rank + ' 名') + '</circle>';
    });

    // 评论数门槛线
    var ty = T + ph - (Math.log10(SC.min_review) - ymin) / (ymax - ymin) * ph;
    b += line(L, ty, W - R, ty, '#C24A2A', { dash: '4 4' });
    b += txt(L + 4, ty - 6, '评论数门槛 ' + nfmt(SC.min_review), { size: 10, fill: '#C24A2A' });

    // 标注反直觉的那一个点：评论数全站第一，却因评分档差排在中段
    var mark = META.busiest;
    if (mark) {
      var mp = pos(mark);
      b += '<circle cx="' + mp.x.toFixed(1) + '" cy="' + mp.y.toFixed(1) +
        '" r="6" fill="none" stroke="#15181D" stroke-width="1.5"/>';
      b += line(mp.x - 10, mp.y, mp.x - 62, mp.y, '#15181D', { w: 1 });
      b += txt(mp.x - 68, mp.y + 4,
        '评论数全站第一 · ' + clip(mark.name, 11) + ' · ' + nfmt(mark.reviews) + ' 条 · 第 ' + mark.rank + ' 名',
        { anchor: 'end', size: 10.5, fill: '#15181D', weight: 650 });
    }
    host.innerHTML = svg(W, H, b);
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 堆叠横条（Top15） */
  function stackedTop(host, items) {
    var data = items.slice(0, 15);
    var W = 620, labelW = 196, padR = 54, rowH = 27, top = 8;
    var H = top * 2 + data.length * rowH + 26;
    var barX = labelW, barW = W - labelW - padR;
    var max = Math.max.apply(null, data.map(function (d) { return d.final_score; })) || 1;
    var b = '';
    data.forEach(function (d, i) {
      var y = top + i * rowH;
      var total = d.final_score / max * barW;
      var cR = SC.w_rating * d.rating_norm, cV = SC.w_review * d.review_norm;
      var wR = cR / (cR + cV) * total;
      b += txt(barX - 10, y + rowH * 0.62, clip(d.name, 17),
        { anchor: 'end', size: 11.5, fill: '#15181D', weight: i < 3 ? 650 : 400 });
      b += rect(barX, y + rowH * 0.2, barW, rowH * 0.56, '#F7F4EE', { rx: 3 });
      b += rect(barX, y + rowH * 0.2, wR, rowH * 0.56, BRAND, { rx: 3 });
      b += rect(barX + wR, y + rowH * 0.2, total - wR, rowH * 0.56, TEAL, { rx: 3 });
      b += txt(barX + barW + 8, y + rowH * 0.62, d.final_score.toFixed(3),
        { size: 11.5, fill: '#15181D', weight: 600, mono: true });
    });
    var ly = H - 12;
    b += rect(W - 300, ly - 8, 9, 9, BRAND, { rx: 2 });
    b += txt(W - 286, ly, '评分贡献 0.625×n', { size: 10.5, fill: '#6E7480' });
    b += rect(W - 190, ly - 8, 9, 9, TEAL, { rx: 2 });
    b += txt(W - 176, ly, '评论贡献 0.375×n', { size: 10.5, fill: '#6E7480' });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 前三名 */
  function initPodium() {
    var host = el('#podium');
    if (!host) return;
    var labels = ['TOP 1', 'TOP 2', 'TOP 3'];
    host.innerHTML = ITEMS.slice(0, 3).map(function (d, i) {
      return '<div class="pod r' + (i + 1) + '">' +
        '<div class="rk">' + labels[i] + '</div>' +
        '<div class="nm">' + esc(d.name) + '</div>' +
        '<div class="meta">' + esc(d.cuisine) + ' · ' + esc(d.category) + ' · ' + esc(d.district) + '</div>' +
        '<div class="sc">' + d.final_score.toFixed(3) + '<small>综合分</small></div>' +
        '<div class="meta num" style="margin:10px 0 0">' + d.rating.toFixed(1) + ' 分 · 评论 ' +
        nfmt(d.review_count) + ' · 人均 ¥' + d.avg_price + '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- 榜单表格 */
  function initRankTable() {
    var host = el('#rankBody');
    if (!host) return;
    var search = el('#fSearch'), fRating = el('#fRating'),
      fDistrict = el('#fDistrict'), fCuisine = el('#fCuisine'), cnt = el('#rankCount');
    var state = { q: '', rating: '', district: '', cuisine: '', sort: 'rank', asc: true, scope: 100 };

    POOL.reduce(function (acc, d) {
      if (acc.indexOf(d.district) < 0) acc.push(d.district);
      return acc;
    }, []).sort().forEach(function (v) {
      var n = POOL.filter(function (d) { return d.district === v; }).length;
      var o = document.createElement('option');
      o.value = v; o.textContent = v + '（' + n + '）';
      fDistrict.appendChild(o);
    });
    ST.cuisine.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.name; o.textContent = c.name + '（' + c.total + '）';
      fCuisine.appendChild(o);
    });

    function rows() {
      var out = ALL.filter(function (d) {
        if (state.scope && (d.rank == null || d.rank > state.scope)) return false;
        if (state.rating && d.rating !== parseFloat(state.rating)) return false;
        if (state.district && d.district !== state.district) return false;
        if (state.cuisine && d.cuisine !== state.cuisine) return false;
        if (state.q) {
          var q = state.q.toLowerCase();
          if ((d.name + d.category + d.cuisine + d.district + d.brand).toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      });
      var k = state.sort, dir = state.asc ? 1 : -1;
      out.sort(function (a, b) {
        if (k === 'rank') {
          if (a.rank == null && b.rank == null) return b.review_count - a.review_count;
          if (a.rank == null) return 1;
          if (b.rank == null) return -1;
          return (a.rank - b.rank) * dir;
        }
        if (k === 'name') return a.name.localeCompare(b.name, 'zh') * dir;
        if (k === 'final_score') {
          if (a.final_score == null && b.final_score == null) return b.review_count - a.review_count;
          if (a.final_score == null) return 1;
          if (b.final_score == null) return -1;
        }
        return ((a[k] || 0) - (b[k] || 0)) * dir;
      });
      return out;
    }

    function starHTML(r) {
      var full = Math.floor(r), half = r - full >= 0.5, s = '';
      for (var i = 0; i < 5; i++) {
        s += i < full ? '★' : (i === full && half ? '☆' : '<span style="color:' + LINE + '">★</span>');
      }
      return s;
    }

    function render() {
      var list = rows();
      var maxScore = ITEMS[0].final_score;
      host.innerHTML = list.map(function (d) {
        var out = d.rank == null;
        var pct = out ? 0 : (d.final_score / maxScore * 100).toFixed(1);
        return '<tr class="' + (out ? 'dim' : '') + '">' +
          '<td class="n"><b>' + (out ? '—' : d.rank) + '</b></td>' +
          '<td class="name">' + esc(d.name) + '</td>' +
          '<td><span class="stars">' + starHTML(d.rating) + '</span> <span class="dim num">' + d.rating.toFixed(1) + '</span></td>' +
          '<td class="n num">' + nfmt(d.review_count) + '</td>' +
          '<td class="n num">¥' + d.avg_price + '</td>' +
          '<td class="dim">' + esc(d.cuisine) + '</td>' +
          '<td class="dim">' + esc(d.district) + '</td>' +
          '<td class="n num"><b>' + (out ? '落榜' : d.final_score.toFixed(3)) + '</b></td>' +
          '<td><div class="bar"><span style="width:' + pct + '%"></span></div></td>' +
          '</tr>';
      }).join('');
      cnt.textContent = '显示 ' + list.length + ' 家' + (state.scope ? '（Top100 内）' : '（全部 150 家候选）');
    }

    search.addEventListener('input', function (e) { state.q = e.target.value.trim(); render(); });
    fRating.addEventListener('change', function (e) { state.rating = e.target.value; render(); });
    fDistrict.addEventListener('change', function (e) { state.district = e.target.value; render(); });
    fCuisine.addEventListener('change', function (e) { state.cuisine = e.target.value; render(); });

    els('#rankHead th[data-k]').forEach(function (th) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-k');
        if (state.sort === k) state.asc = !state.asc;
        else { state.sort = k; state.asc = (k === 'rank' || k === 'name'); }
        els('#rankHead th[data-k]').forEach(function (o) {
          o.textContent = o.textContent.replace(/ [▲▼]$/, '');
        });
        if (k !== 'name') th.textContent = th.textContent.replace(/ [▲▼]$/, '') + (state.asc ? ' ▲' : ' ▼');
        render();
      });
    });

    els('[data-scope]').forEach(function (b) {
      b.addEventListener('click', function () {
        els('[data-scope]').forEach(function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        state.scope = parseInt(b.getAttribute('data-scope'), 10);
        render();
      });
    });

    render();
  }

  /* ---------------------------------------------------------------- 口径实验台 */
  /* 与 build_ranking.py 等价的浏览器实现：
     过滤 → 归一化（minmax / log1p）→ 加权 → 三级排序兜底 → 品牌限额 → 取前 N */
  function runPipeline(pool, w, minReview, maxBrand, topN) {
    var kept = pool.filter(function (d) { return d.review_count >= minReview; });
    if (!kept.length) return [];
    var rs = kept.map(function (d) { return d.rating; });
    var ls = kept.map(function (d) { return Math.log1p(d.review_count); });
    var rmin = Math.min.apply(null, rs), rmax = Math.max.apply(null, rs);
    var lmin = Math.min.apply(null, ls), lmax = Math.max.apply(null, ls);
    var rows = kept.map(function (d) {
      var rn = rmax > rmin ? (d.rating - rmin) / (rmax - rmin) : 1;
      var vn = lmax > lmin ? (Math.log1p(d.review_count) - lmin) / (lmax - lmin) : 1;
      return { d: d, rn: rn, vn: vn, s: w * rn + (1 - w) * vn };
    });
    rows.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      if (b.d.rating !== a.d.rating) return b.d.rating - a.d.rating;
      if (b.d.review_count !== a.d.review_count) return b.d.review_count - a.d.review_count;
      return a.d.name.localeCompare(b.d.name, 'zh');
    });
    if (maxBrand) {
      var seen = {}, picked = [];
      rows.forEach(function (r) {
        var n = seen[r.d.brand] || 0;
        if (n < maxBrand) { seen[r.d.brand] = n + 1; picked.push(r); }
      });
      rows = picked;
    }
    return rows.slice(0, topN);
  }

  function initSim() {
    var slider = el('#wSlider');
    if (!slider) return;
    var rowsHost = el('#simRows');
    var fBrand = el('#fBrand'), fThr = el('#fThr');
    var baseIds = ITEMS.map(function (d) { return d.shop_id; });
    var baseTop15 = ITEMS.slice(0, 15).map(function (d) { return d.shop_id; });

    function paint() {
      var w = parseFloat(slider.value) / 1000;
      var maxBrand = parseInt(fBrand.value, 10);
      var minReview = parseInt(fThr.value, 10);
      slider.style.setProperty('--pct', (w * 100).toFixed(1) + '%');

      var res = runPipeline(POOL, w, minReview, maxBrand, 100);
      var ids = res.map(function (r) { return r.d.shop_id; });
      var overlap = ids.filter(function (id) { return baseIds.indexOf(id) >= 0; }).length;
      var top15 = res.slice(0, 15);
      var max = top15.length ? top15[0].s : 1;
      var top15overlap = top15.filter(function (r) { return baseTop15.indexOf(r.d.shop_id) >= 0; }).length;

      rowsHost.innerHTML = top15.map(function (r, i) {
        var chg = baseTop15.indexOf(r.d.shop_id) < 0;
        var wR = r.s > 0 ? w * r.rn / r.s * 100 : 0;
        return '<div class="sim-row' + (chg ? ' chg' : '') + '">' +
          '<span class="rk">' + (i + 1) + '</span>' +
          '<span class="nm" title="' + esc(r.d.name) + '">' + esc(r.d.name) + '</span>' +
          '<span class="track"><span style="width:' + (r.s / max * 100).toFixed(1) +
          '%;background:linear-gradient(90deg,' + BRAND + ' ' + wR.toFixed(0) + '%,' + TEAL + ' ' + wR.toFixed(0) + '%)"></span></span>' +
          '<span class="sc">' + r.s.toFixed(3) + '</span>' +
          '</div>';
      }).join('');

      var set = function (id, v) { var e = el(id); if (e) e.textContent = v; };
      set('#wShow', w.toFixed(3));
      set('#wrShow', (1 - w).toFixed(3));
      set('#simN', res.length + ' 家');
      set('#simBrand', new Set(res.map(function (r) { return r.d.brand; })).size + ' 个品牌');
      set('#sim5', res.filter(function (r) { return r.d.rating === 5.0; }).length + ' 家满分');
      set('#simOverlap', overlap + ' / 100');
      set('#simChg', String(100 - overlap));
      set('#simTop15', top15overlap + ' / 15');
      set('#simTop1', res.length ? res[0].d.name : '—');
      var base = el('#simBaseline');
      if (base) {
        var isBase = Math.abs(w - SC.w_rating) < 1e-9 && maxBrand === SC.max_brand && minReview === SC.min_review;
        base.textContent = isBase ? '当前＝定稿口径' : '与定稿口径不同';
        base.style.color = isBase ? 'var(--teal)' : 'var(--brand-ink)';
      }
    }

    slider.addEventListener('input', paint);
    if (fBrand) fBrand.addEventListener('change', paint);
    if (fThr) fThr.addEventListener('change', paint);
    paint();
  }

  /* ---------------------------------------------------------------- 图表总装 */
  function initCharts() {
    var host;

    host = el('#cTop15');
    if (host) stackedTop(host, ITEMS);

    host = el('#cScatter');
    if (host) scatter(host, POOL);

    host = el('#cCuisine');
    if (host) groupedBars(host, ST.cuisine);

    host = el('#cDistrict');
    if (host) hbars(host, ST.district_top.map(function (d) {
      return { label: d.label, value: d.value, color: TEAL };
    }), { labelChars: 12 });

    host = el('#cRating');
    if (host) stackedCols(host, ST.rating_bands);

    host = el('#cPrice');
    if (host) vbars(host, ST.price_bands.map(function (d) {
      return {
        label: d.label, value: d.value,
        sub: (d.value / ST.n_top * 100).toFixed(0) + '%',
        display: d.value + ' 家',
        color: d.label === '>¥350' ? GOLD : TEAL
      };
    }), { height: 262, barW: 54 });

    host = el('#cCuisineRate');
    if (host) {
      hbars(host, ST.cuisine.slice().sort(function (a, b) { return b.rate - a.rate; })
        .map(function (c) {
          return {
            label: c.name, value: c.rate, display: c.rate + '%  ' + c.in + '/' + c.total,
            color: c.rate >= 70 ? TEAL : (c.rate >= 45 ? GOLD : '#C9BBA8')
          };
        }), { labelChars: 7, labelW: 96, padR: 92 });
    }
  }

  /* ---------------------------------------------------------------- 代码页 */
  function initCode() {
    var host = el('#codeHost');
    if (!host || !window.CODE_SNIPPETS) return;
    var tabs = els('.tabs button[data-code]');
    var pathEl = el('#codePath'), tailEl = el('#codeMeta'), copy = el('#codeCopy');
    var current = document.body.getAttribute('data-code-default') || 'crawler';

    function show(key) {
      var s = window.CODE_SNIPPETS[key];
      if (!s) return;
      current = key;
      host.innerHTML = s.html.join('');
      pathEl.textContent = s.name;
      tailEl.textContent = s.lines + ' 行';
      host.scrollTop = 0;
      tabs.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-code') === key); });
      if (copy) copy.setAttribute('data-for', key);
    }
    tabs.forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-code')); });
    });
    if (copy) {
      copy.addEventListener('click', function () {
        var s = window.CODE_SNIPPETS[current];
        if (!s) return;
        var text = s.html.map(function (l) {
          return l.replace(/<span class="cln"[^>]*>.*?<\/a>/, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            .replace(/&nbsp;/g, ' ');
        }).join('\n');
        var tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp); tmp.select();
        try { document.execCommand('copy'); copy.textContent = '已复制'; } catch (e) { copy.textContent = '复制失败'; }
        document.body.removeChild(tmp);
        setTimeout(function () { copy.textContent = '复制全文'; }, 1600);
      });
    }
    var expand = el('#codeExpand');
    if (expand) {
      expand.addEventListener('click', function () {
        var on = host.classList.toggle('full');
        host.style.maxHeight = on ? 'none' : '';
        expand.textContent = on ? '收起' : '展开全文';
      });
    }
    show(current);
  }

  /* ---------------------------------------------------------------- 贯穿数字 */
  function initNumbers() {
    els('[data-num]').forEach(function (e) {
      var v = e.getAttribute('data-num').split('.')
        .reduce(function (o, p) { return o == null ? o : o[p]; }, S);
      if (v != null) e.textContent = typeof v === 'number' ? nfmt(v) : v;
    });
    els('[data-w]').forEach(function (e) {
      var v = SC[e.getAttribute('data-w')];
      if (v != null) e.textContent = typeof v === 'number' && v < 1 ? Number(v).toFixed(3) : v;
    });
  }

  /* ---------------------------------------------------------------- 口径对比表 */
  function initCompare() {
    var host = el('#compareBody');
    if (!host || !META.compare) return;
    host.innerHTML = META.compare.map(function (c, i) {
      var base = i === 0;
      return '<tr' + (base ? ' style="background:#FBF3E4"' : '') + '>' +
        '<td>' + (base ? '<b>' + esc(c.label) + '</b>' : esc(c.label)) + '</td>' +
        '<td class="n num">' + c.brands + '</td>' +
        '<td class="n num">' + c.full_marks + '</td>' +
        '<td class="n num">' + c.overlap + ' / 100</td>' +
        '<td class="n num">' + (base ? '—' : '<b style="color:var(--brand-ink)">' + c.changed + '</b>') + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---------------------------------------------------------------- 启动 */
  function boot() {
    initNumbers();
    initPodium();
    initCharts();
    initRankTable();
    initSim();
    initCompare();
    initCode();
    var y = el('#year'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
