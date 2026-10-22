/* ==========================================================================
   北京餐厅 Top100 · 前端逻辑
   纯原生 JS，无依赖。数据由 assets/data.js 以全局对象注入，
   因此 file:// 双击打开也能跑，不依赖 fetch / CORS。
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S) return;

  var META = S.meta, ST = S.stats, ITEMS = S.items, POOL = S.pool, SC = META.scoring;

  /* 与样式表一致的数据色 */
  var D1 = '#1B4B72';   // 印蓝：主序列 / 评分贡献 / 入榜
  var D2 = '#A9713F';   // 赭：次序列 / 评论贡献
  var D3 = '#DDD9CE';   // 底纹：落榜 / 全量
  var D4 = '#6E7A6A';   // 苔绿：第三序列
  var INK = '#17191B', INK3 = '#7C8288', RULE = '#DCDAD3';

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
    return '<text x="' + x + '" y="' + y + '" fill="' + (o.fill || '#4A4F55') + '"' +
      ' font-size="' + (o.size || 11) + '" font-family="' +
      (o.serif ? 'Georgia,Times New Roman,serif' : 'Microsoft YaHei,PingFang SC,system-ui,sans-serif') + '"' +
      ' text-anchor="' + (o.anchor || 'start') + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') +
      (o.mono ? ' font-variant-numeric="tabular-nums"' : '') + '>' + esc(s) + '</text>';
  }
  function rect(x, y, w, h, fill, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + h +
      '" fill="' + fill + '"' + (o.opacity ? ' opacity="' + o.opacity + '"' : '') + '/>';
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
    var W = 600, labelW = opt.labelW || 150, padR = opt.padR || 66;
    var rowH = opt.rowH || 27, top = 4;
    var H = top * 2 + data.length * rowH;
    var barX = labelW, barW = W - labelW - padR;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var b = '';
    data.forEach(function (d, i) {
      var y = top + i * rowH, w = d.value / max * barW;
      b += txt(barX - 10, y + rowH * 0.64, clip(d.label, opt.labelChars || 13),
        { anchor: 'end', size: opt.size || 11.5, fill: '#4A4F55' });
      b += rect(barX, y + rowH * 0.3, barW, 7, '#F2F1EC');
      b += rect(barX, y + rowH * 0.3, w, 7, d.color || D1);
      b += txt(barX + barW + 8, y + rowH * 0.64, d.display != null ? d.display : nfmt(d.value),
        { size: opt.size || 11.5, fill: INK, weight: 700, serif: true, mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 竖向柱状 */
  function vbars(host, data, opt) {
    opt = opt || {};
    var W = 600, H = opt.height || 250, padL = 12, padB = 44, padT = 24;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(opt.barW || 52, slot * 0.52);
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, INK, { w: 1 });
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var h = d.value / max * plotH;
      var x = cx - bw / 2, y = H - padB - h;
      b += rect(x, y, bw, h, d.color || D1);
      b += txt(cx, y - 8, d.display != null ? d.display : nfmt(d.value),
        { anchor: 'middle', size: 12, fill: INK, weight: 700, serif: true, mono: true });
      b += txt(cx, H - padB + 19, d.label, { anchor: 'middle', size: 11.5, fill: '#4A4F55' });
      if (d.sub) b += txt(cx, H - padB + 34, d.sub, { anchor: 'middle', size: 10.5, fill: INK3, serif: true, mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 堆叠柱（进榜 / 落榜） */
  function stackedCols(host, data, opt) {
    opt = opt || {};
    var W = 600, H = opt.height || 268, padL = 16, padB = 46, padT = 34;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(76, slot * 0.46);
    var max = Math.max.apply(null, data.map(function (d) { return d.total; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, INK, { w: 1 });
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var hIn = d.in / max * plotH, hOut = (d.total - d.in) / max * plotH;
      var yOut = H - padB - hOut, yIn = yOut - hIn;
      b += rect(cx - bw / 2, yOut, bw, hOut, D3) + tip(d.label + ' 分：未入榜 ' + (d.total - d.in) + ' 家');
      b += rect(cx - bw / 2, yIn, bw, hIn, D1) + tip(d.label + ' 分：入榜 ' + d.in + ' 家');
      b += txt(cx, yIn - 21, d.rate + '%', { anchor: 'middle', size: 13, fill: D1, weight: 700, serif: true, mono: true });
      b += txt(cx, yIn - 8, d.in + '/' + d.total, { anchor: 'middle', size: 10.5, fill: INK3, serif: true, mono: true });
      b += txt(cx, H - padB + 19, d.label + ' 分', { anchor: 'middle', size: 12, fill: INK, weight: 700 });
      b += txt(cx, H - padB + 34, '进榜率', { anchor: 'middle', size: 10, fill: INK3 });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 分组柱（菜系） */
  function groupedBars(host, data, opt) {
    opt = opt || {};
    var W = 620, H = opt.height || 290, padL = 14, padB = 62, padT = 26;
    var plotH = H - padB - padT;
    var slot = (W - padL * 2) / data.length;
    var bw = Math.min(24, slot * 0.28);
    var max = Math.max.apply(null, data.map(function (d) { return d.total; })) || 1;
    var b = line(padL, H - padB, W - padL, H - padB, INK, { w: 1 });
    data.forEach(function (d, i) {
      var cx = padL + slot * (i + 0.5);
      var hT = d.total / max * plotH, hI = d.in / max * plotH;
      b += rect(cx - bw - 1.5, H - padB - hT, bw, hT, D3) + tip(d.name + '：全量 ' + d.total);
      b += rect(cx + 1.5, H - padB - hI, bw, hI, D1) + tip(d.name + '：进榜 ' + d.in);
      b += txt(cx - bw / 2 - 1.5, H - padB - hT - 5, d.total, { anchor: 'middle', size: 10, fill: INK3, serif: true, mono: true });
      b += txt(cx + bw / 2 + 1.5, H - padB - hI - 5, d.in, { anchor: 'middle', size: 10, fill: D1, weight: 700, serif: true, mono: true });
      b += txt(cx, H - padB + 15, clip(d.name, 5), { anchor: 'middle', size: 10.5, fill: '#4A4F55' });
      b += txt(cx, H - padB + 30, d.rate + '%', { anchor: 'middle', size: 9.5, fill: INK3, serif: true, mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 气泡图 */
  function scatter(host, pool) {
    var W = 620, H = 400, L = 54, R = 18, T = 22, B = 46;
    var pw = W - L - R, ph = H - T - B;
    var xmin = 3.4, xmax = 5.1, ymin = 3.0, ymax = 5.0;
    var b = '';
    for (var g = 0; g <= 4; g++) {
      var yv = ymin + (ymax - ymin) * g / 4;
      var yy = T + ph - (yv - ymin) / (ymax - ymin) * ph;
      b += line(L, yy, W - R, yy, g === 0 ? INK : '#F1F0EB');
      b += txt(L - 8, yy + 4, nfmt(Math.round(Math.pow(10, yv))),
        { anchor: 'end', size: 10.5, fill: INK3, serif: true, mono: true });
    }
    [3.5, 4.0, 4.5, 5.0].forEach(function (xv) {
      var xx = L + (xv - xmin) / (xmax - xmin) * pw;
      b += line(xx, T, xx, T + ph, '#F1F0EB');
      b += txt(xx, H - B + 18, xv.toFixed(1), { anchor: 'middle', size: 10.5, fill: INK3, serif: true, mono: true });
    });
    b += txt(W - R, H - 8, '评分', { anchor: 'end', size: 10.5, fill: INK3 });

    function pos(d) {
      var x = L + (Math.min(Math.max(d.rating, xmin), xmax) - xmin) / (xmax - xmin) * pw;
      var ly = Math.log10(d.review_count);
      var y = T + ph - (Math.min(Math.max(ly, ymin), ymax) - ymin) / (ymax - ymin) * ph;
      return { x: x, y: y };
    }
    pool.filter(function (d) { return !d.in_top; }).forEach(function (d) {
      var p = pos(d), r = 3 + Math.sqrt(d.avg_price) / 3.4;
      b += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="none" stroke="#BFB9AC" stroke-width="1.1">' +
        tip(d.name + '｜' + d.rating + ' 分｜' + nfmt(d.review_count) + ' 条｜未入榜') + '</circle>';
    });
    pool.filter(function (d) { return d.in_top; }).forEach(function (d) {
      var p = pos(d), r = 3 + Math.sqrt(d.avg_price) / 3.4;
      var c = d.rating === 5.0 ? D1 : D2;
      b += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + c + '" opacity=".5">' +
        tip(d.name + '｜' + d.rating + ' 分｜' + nfmt(d.review_count) + ' 条｜第 ' + d.rank + ' 名') + '</circle>';
    });

    var ty = T + ph - (Math.log10(SC.min_review) - ymin) / (ymax - ymin) * ph;
    b += line(L, ty, W - R, ty, D2, { dash: '4 4' });
    b += txt(L + 4, ty - 6, '评论数门槛 ' + nfmt(SC.min_review), { size: 10, fill: D2 });

    var mark = META.busiest;
    if (mark) {
      var mp = pos({ rating: mark.rating, review_count: mark.reviews });
      b += '<circle cx="' + mp.x.toFixed(1) + '" cy="' + mp.y.toFixed(1) +
        '" r="6" fill="none" stroke="' + INK + '" stroke-width="1.5"/>';
      b += line(mp.x - 10, mp.y, mp.x - 62, mp.y, INK, { w: 1 });
      b += txt(mp.x - 68, mp.y + 4,
        '评论数全站第一 · ' + clip(mark.name, 11) + ' · ' + nfmt(mark.reviews) + ' 条 · 第 ' + mark.rank + ' 名',
        { anchor: 'end', size: 10.5, fill: INK, weight: 700 });
    }
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 分数拆解条 */
  function stackedTop(host, items) {
    var data = items.slice(0, 15);
    var W = 620, labelW = 196, padR = 52, rowH = 27, top = 6;
    var H = top * 2 + data.length * rowH;
    var barX = labelW, barW = W - labelW - padR;
    var max = Math.max.apply(null, data.map(function (d) { return d.final_score; })) || 1;
    var b = line(barX, top - 2, barX, top + data.length * rowH - 8, RULE);
    data.forEach(function (d, i) {
      var y = top + i * rowH;
      var total = d.final_score / max * barW;
      var cR = SC.w_rating * d.rating_norm, cV = SC.w_review * d.review_norm;
      var wR = cR / (cR + cV) * total;
      b += txt(barX - 12, y + rowH * 0.64, clip(d.name, 17),
        { anchor: 'end', size: 11.5, fill: INK, weight: i < 3 ? 700 : 400 });
      b += rect(barX + 8, y + rowH * 0.28, barW, 9, '#F2F1EC');
      b += rect(barX + 8, y + rowH * 0.28, wR, 9, D1);
      b += rect(barX + 8 + wR, y + rowH * 0.28, total - wR, 9, D2);
      b += txt(barX + barW + 12, y + rowH * 0.64, d.final_score.toFixed(3),
        { size: 11.5, fill: INK, weight: 700, serif: true, mono: true });
    });
    host.innerHTML = svg(W, H, b);
  }

  /* ---------------------------------------------------------------- 首屏前三 */
  function initHead() {
    var host = el('#headList');
    if (!host) return;
    host.innerHTML = ITEMS.slice(0, 3).map(function (d) {
      return '<li>' +
        '<span class="rk">' + d.rank + '</span>' +
        '<span class="nm">' + esc(d.name) +
        '<span>' + esc(d.cuisine) + ' / ' + esc(d.category) + '　' + esc(d.district) + '</span></span>' +
        '<span class="rv num">' + nfmt(d.review_count) + ' 条评价</span>' +
        '<span class="sc num">' + d.final_score.toFixed(3) + '</span>' +
        '</li>';
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

    function render() {
      var list = rows();
      host.innerHTML = list.map(function (d) {
        var out = d.rank == null;
        return '<tr class="' + (out ? 'gone' : '') + '">' +
          '<td class="n">' + (out ? '—' : d.rank) + '</td>' +
          '<td class="name">' + esc(d.name) + '</td>' +
          '<td class="n">' + d.rating.toFixed(1) + '</td>' +
          '<td class="n">' + nfmt(d.review_count) + '</td>' +
          '<td class="n">¥' + d.avg_price + '</td>' +
          '<td>' + esc(d.cuisine) + '</td>' +
          '<td>' + esc(d.district) + '</td>' +
          '<td class="n">' + (out ? '—' : d.final_score.toFixed(3)) + '</td>' +
          '</tr>';
      }).join('');
      cnt.textContent = list.length + ' 条' + (state.scope ? '（Top100 内）' : '（全部 150 家）');
    }

    search.addEventListener('input', function (e) { state.q = e.target.value.trim(); render(); });
    fRating.addEventListener('change', function (e) { state.rating = e.target.value; render(); });
    fDistrict.addEventListener('change', function (e) { state.district = e.target.value; render(); });
    fCuisine.addEventListener('change', function (e) { state.cuisine = e.target.value; render(); });

    els('#rankHead th[data-k]').forEach(function (th) {
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
        els('[data-scope]').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        state.scope = parseInt(b.getAttribute('data-scope'), 10);
        render();
      });
    });

    render();
  }

  /* ---------------------------------------------------------------- 口径实验台 */
  /* 与 build_ranking.py 等价：过滤 → 归一化 → 加权 → 三级排序 → 品牌限额 → 取前 N */
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

  function initTrial() {
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

      var res = runPipeline(POOL, w, minReview, maxBrand, 100);
      var ids = res.map(function (r) { return r.d.shop_id; });
      var overlap = ids.filter(function (id) { return baseIds.indexOf(id) >= 0; }).length;
      var top15 = res.slice(0, 15);
      var max = top15.length ? top15[0].s : 1;
      var top15overlap = top15.filter(function (r) { return baseTop15.indexOf(r.d.shop_id) >= 0; }).length;

      rowsHost.innerHTML = top15.map(function (r, i) {
        var chg = baseTop15.indexOf(r.d.shop_id) < 0;
        var wR = r.s > 0 ? w * r.rn / r.s * 100 : 0;
        return '<div class="srow' + (chg ? ' chg' : '') + '">' +
          '<span class="rk">' + (i + 1) + '</span>' +
          '<span class="nm" title="' + esc(r.d.name) + '">' + esc(r.d.name) + '</span>' +
          '<span class="trk"><i style="width:' + (r.s / max * 100).toFixed(1) +
          '%;background:linear-gradient(90deg,' + D1 + ' ' + wR.toFixed(0) + '%,' + D2 + ' ' + wR.toFixed(0) + '%)"></i></span>' +
          '<span class="sc">' + r.s.toFixed(3) + '</span>' +
          '</div>';
      }).join('');

      var set = function (id, v) { var e = el(id); if (e) e.textContent = v; };
      set('#wShow', w.toFixed(3));
      set('#wrShow', (1 - w).toFixed(3));
      set('#simN', res.length + ' 家');
      set('#simBrand', new Set(res.map(function (r) { return r.d.brand; })).size + ' 个');
      set('#sim5', res.filter(function (r) { return r.d.rating === 5.0; }).length + ' 家');
      set('#simOverlap', overlap + ' / 100');
      set('#simChg', String(100 - overlap));
      set('#simTop15', top15overlap + ' / 15');
      set('#simTop1', res.length ? res[0].d.name : '—');
      var base = el('#simBaseline');
      if (base) {
        var isBase = Math.abs(w - SC.w_rating) < 1e-9 && maxBrand === SC.max_brand && minReview === SC.min_review;
        base.textContent = isBase ? '等同定稿口径' : '已偏离定稿口径';
        base.style.color = isBase ? D1 : D2;
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
      return { label: d.label, value: d.value, color: D1 };
    }), { labelChars: 12 });

    host = el('#cRating');
    if (host) stackedCols(host, ST.rating_bands);

    host = el('#cPrice');
    if (host) vbars(host, ST.price_bands.map(function (d) {
      return {
        label: d.label, value: d.value,
        sub: (d.value / ST.n_top * 100).toFixed(0) + '%',
        display: d.value + ' 家',
        color: d.label === '>¥350' ? D2 : D1
      };
    }), { height: 258, barW: 52 });

    host = el('#cCuisineRate');
    if (host) {
      hbars(host, ST.cuisine.slice().sort(function (a, b) { return b.rate - a.rate; })
        .map(function (c) {
          return {
            label: c.name, value: c.rate, display: c.rate + '%　' + c.in + '/' + c.total,
            color: c.rate >= 70 ? D1 : (c.rate >= 45 ? D4 : D3)
          };
        }), { labelChars: 7, labelW: 96, padR: 96 });
    }
  }

  /* ---------------------------------------------------------------- 对照表 */
  function initCompare() {
    var host = el('#compareBody');
    if (!host || !META.compare) return;
    host.innerHTML = META.compare.map(function (c, i) {
      var base = i === 0;
      return '<tr' + (base ? ' style="background:#F7F9FB"' : '') + '>' +
        '<td' + (base ? ' class="name"' : '') + '>' + esc(c.label) + '</td>' +
        '<td class="n">' + c.brands + '</td>' +
        '<td class="n">' + c.full_marks + '</td>' +
        '<td class="n">' + c.overlap + ' / 100</td>' +
        '<td class="n">' + (base ? '—' : c.changed) + '</td>' +
        '</tr>';
    }).join('');
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
      host.innerHTML = hlPython(s.src).join('');
      pathEl.textContent = s.name;
      tailEl.textContent = s.lines + ' 行';
      host.scrollTop = 0;
      tabs.forEach(function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-code') === key ? 'true' : 'false');
      });
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
        var on = host.style.maxHeight === 'none';
        host.style.maxHeight = on ? '' : 'none';
        expand.textContent = on ? '展开全文' : '收起';
      });
    }
    show(current);
  }

  /* ---------------------------------------------------------------- 数字绑定 */
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

  /* ---------------------------------------------------------------- 代码着色 */
  /* 与 build_site.py 的 highlight() 同一套规则，改为前端执行：
     源码只存一份字符串，四个页面切 tab 才解析，单文件版也不会被 span 撑大。 */
  var KW = {};
  ('False None True and as assert async await break class continue def del elif else '
    + 'except finally for from global if import in is lambda nonlocal not or pass raise '
    + 'return try while with yield self').split(' ').forEach(function (w) { KW[w] = 1; });
  var BT = {};
  ('print len int float str dict list set tuple range enumerate zip sorted sum min max '
    + 'open round abs isinstance type Exception Path Counter OrderedDict defaultdict'
  ).split(' ').forEach(function (w) { BT[w] = 1; });

  var TKR = /(\#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|([rbfu]?"(?:\\.|[^"\\\n])*"|[rbfu]?'(?:\\.|[^'\\\n])*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)|([^\w\s])|(\s+)/g;

  function hlPython(src) {
    var lines = [[]];
    function emit(cls, text) {
      var parts = text.split('\n');
      for (var i = 0; i < parts.length; i++) {
        if (i) lines.push([]);
        if (!parts[i]) continue;
        lines[lines.length - 1].push(cls ? '<span class="' + cls + '">' + esc(parts[i]) + '</span>'
          : esc(parts[i]));
      }
    }
    var m;
    TKR.lastIndex = 0;
    while ((m = TKR.exec(src)) !== null) {
      var t = m[0], cls = '';
      if (m[1] !== undefined) cls = 't-cm';
      else if (m[2] !== undefined || m[3] !== undefined) cls = 't-st';
      else if (m[4] !== undefined) cls = 't-nu';
      else if (m[5] !== undefined) {
        cls = KW[t] ? 't-kw' : (BT[t] ? 't-bt'
          : (t.length > 1 && t === t.toUpperCase() && /[A-Z]/.test(t) ? 't-cn' : ''));
      } else if (m[6] !== undefined) cls = 't-op';
      emit(cls, t);
    }
    return lines.map(function (frags, i) {
      var n = i + 1;
      return '<div class="cl"><a class="cln" href="#L' + n + '" id="L' + n + '">' + n +
        '</a><span class="clc">' + (frags.join('') || '&nbsp;') + '</span></div>';
    });
  }

  /* ---------------------------------------------------------------- 经纬度工具 */
  function toRad(d) { return d * Math.PI / 180; }

  function distanceKm(aLat, aLng, bLat, bLng) {
    var R = 6371, dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /* 浏览器定位给的是 WGS84，腾讯地图用 GCJ-02，北京一带偏移约 500 米，先转一下 */
  function wgs2gcj(lat, lng) {
    if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lat, lng];
    var a = 6378245.0, ee = 0.00669342162296594323;
    function tLat(x, y) {
      var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
      r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
      r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
      return r;
    }
    function tLng(x, y) {
      var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
      r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
      r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
      return r;
    }
    var dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35);
    var radLat = toRad(lat), magic = 1 - ee * Math.sin(radLat) * Math.sin(radLat);
    var sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sq) * Math.PI);
    dLng = (dLng * 180) / (a / sq * Math.cos(radLat) * Math.PI);
    return [lat + dLat, lng + dLng];
  }

  /* ---------------------------------------------------------------- 位置热力图 */
  var mapReady = false;

  function initMap() {
    if (mapReady) return;
    var box = el('#mapCanvas');
    if (!box || !window.SITE.geo) return;
    /* 单文件版里榜单页初始是隐藏的，容器高度为 0 时不能建图，等切到该页再来 */
    var page = document.querySelector('.page[data-route="list"]');
    if (page && page.hidden) {
      window.__onPageShown = function (r) { if (r === 'list') initMap(); };
      return;
    }
    mapReady = true;
    var geo = window.SITE.geo, dists = geo.districts || [];
    var tip = el('#mapTip'), readout = el('#mapReadout'), nearby = el('#nearbyList');
    var scaleBar = el('#scaleBar'), scaleTxt = el('#scaleTxt');

    function fallback(msg) {
      var holder = el('#mapFallback');
      if (holder) { holder.hidden = false; }
      box.style.display = 'none';
      var ctl = el('#mapCtl'); if (ctl) ctl.style.display = 'none';
      if (tip) tip.textContent = msg;
    }

    if (!window.TMap) {
      fallback('腾讯地图 SDK 未加载：底图需要 WorkBuddy 预览环境，或替换为自己的地图 key。');
      renderNearbyStatic();
      return;
    }

    var map = new TMap.Map(box, {
      center: new TMap.LatLng(geo.center.lat, geo.center.lng),
      zoom: 11.5,
      rotation: 0,
      pitch: 0,
      scale: 1,
      showControl: false,
      minZoom: 9,
      maxZoom: 18
    });

    /* 热度层用 DOM 叠加，位置由 projectToContainer 换算，随平移旋转缩放自动跟随 */
    var layer = document.createElement('div');
    layer.className = 'heat';
    box.appendChild(layer);

    var maxIn = Math.max.apply(null, dists.map(function (d) { return d.in_top; })) || 1;

    /* 热度配色：紫（少）→ 红（多），RGB 空间线性插值 */
    var COLD = [110, 63, 163], HOT = [217, 58, 50];
    function heatRGB(t) {
      return COLD.map(function (v, i) { return Math.round(v + (HOT[i] - v) * t); });
    }

    dists.forEach(function (d) {
      var dot = document.createElement('i');
      var t = Math.sqrt(d.in_top / maxIn);
      var c = heatRGB(t);
      dot.style.background = 'radial-gradient(circle, rgb(' + c.join(',') + ') 0%, rgba(' +
        c.join(',') + ',0.42) 38%, rgba(' + c.join(',') + ',0) 70%)';
      dot.dataset.lat = d.lat;
      dot.dataset.lng = d.lng;
      dot.dataset.r = (24 + 88 * t).toFixed(0);
      dot.dataset.o = (0.20 + 0.38 * t).toFixed(2);
      dot.title = d.name + '　入榜 ' + d.in_top + ' 家 / 候选 ' + d.total + ' 家';
      layer.appendChild(dot);
    });

    var me = document.createElement('i');
    me.className = 'me hidden';
    layer.appendChild(me);

    var routeFrom = null;   // 用户当前位置（GCJ-02）
    var routeTarget = null; // 目的地（商圈中心近似坐标）

    function place() {
      var zoomK = Math.pow(1.28, (map.getZoom() || 11) - 11.5);
      var nodes = layer.querySelectorAll('i');
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.classList.contains('me')) continue;
        var p = map.projectToContainer(new TMap.LatLng(+n.dataset.lat, +n.dataset.lng));
        var r = +n.dataset.r * zoomK;
        n.style.width = n.style.height = r + 'px';
        n.style.marginLeft = n.style.marginTop = (-r / 2) + 'px';
        n.style.opacity = n.dataset.o;
        n.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
      }
      var meNode = layer.querySelector('.me');
      if (meNode && meNode.dataset.lat) {
        var mp = map.projectToContainer(new TMap.LatLng(+meNode.dataset.lat, +meNode.dataset.lng));
        meNode.style.transform = 'translate3d(' + mp.x + 'px,' + mp.y + 'px,0)';
      }
      updateScale();
    }

    function updateScale() {
      var c = map.getCenter();
      var p1 = map.projectToContainer(c);
      var p2 = map.projectToContainer(new TMap.LatLng(c.lat, c.lng + 0.01));
      var pxPerKm = Math.abs(p2.x - p1.x) / (0.01 * 111.32 * Math.cos(toRad(c.lat)));
      if (!isFinite(pxPerKm) || pxPerKm <= 0) return;
      var wants = [0.2, 0.5, 1, 2, 5, 10, 20, 50];
      var pick = wants[0];
      for (var i = 0; i < wants.length; i++) { if (wants[i] * pxPerKm <= 140) pick = wants[i]; }
      if (scaleBar) scaleBar.style.width = (pick * pxPerKm).toFixed(0) + 'px';
      if (scaleTxt) scaleTxt.textContent = pick < 1 ? (pick * 1000) + ' m' : pick + ' km';
      if (readout) {
        readout.textContent = 'z ' + (map.getZoom() || 0).toFixed(1) +
          '　' + Math.round(map.getRotation() || 0) + '°　×' + (map.getScale() || 1).toFixed(2);
      }
    }

    var raf = 0;
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; place(); });
    }
    ['pan', 'zoom', 'rotate', 'pitch', 'resize', 'idle'].forEach(function (ev) {
      map.on(ev, schedule);
    });
    place();

    /* 控件 */
    function bind(id, fn) { var n = el(id); if (n) n.addEventListener('click', fn); }
    bind('#zIn', function () { map.setZoom(Math.min(18, (map.getZoom() || 11) + 1)); });
    bind('#zOut', function () { map.setZoom(Math.max(9, (map.getZoom() || 11) - 1)); });
    bind('#mReset', function () {
      map.setRotation(0); map.setScale(1);
      map.setCenter(new TMap.LatLng(geo.center.lat, geo.center.lng));
      map.setZoom(11.5);
      var rs = el('#rotRange'), ss = el('#scaleRange');
      if (rs) rs.value = 0;
      if (ss) ss.value = 1;
      schedule();
    });
    var rot = el('#rotRange');
    if (rot) rot.addEventListener('input', function () {
      map.setRotation(parseFloat(rot.value)); schedule();
    });
    var sc = el('#scaleRange');
    if (sc) sc.addEventListener('input', function () {
      map.setScale(parseFloat(sc.value)); schedule();
    });

    /* 定位 + 附近推荐 */
    function locate() {
      if (tip) tip.textContent = '正在获取定位…';
      if (!navigator.geolocation) {
        if (tip) tip.textContent = '当前浏览器不支持定位，可选择下面的商圈。';
        return;
      }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var g = wgs2gcj(pos.coords.latitude, pos.coords.longitude);
        me.dataset.lat = g[0]; me.dataset.lng = g[1];
        me.classList.remove('hidden');
        routeFrom = { lat: g[0], lng: g[1] };
        map.setCenter(new TMap.LatLng(g[0], g[1]));
        map.setZoom(13);
        schedule();
        if (tip) tip.textContent = '已定位，按商圈中心给出最近的五个区域。';
        var list = renderNearby(g[0], g[1]);
        if (list && list.length) {
          setTarget(list[0].d.lat, list[0].d.lng,
            list[0].d.best ? list[0].d.best.name : list[0].d.name);
        }
      }, function () {
        if (tip) tip.textContent = '定位未授权或被拒绝，可选择下面的商圈看附近推荐。';
        renderNearbyStatic();
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    }
    bind('#mLocate', locate);

    /* ---------------- 路线：交给腾讯地图，本页不画线 ---------------- */
    /* 用腾讯地图 URI API 生成链接，起点终点自动带好，点击后跳到地图里规划。 */
    var msgEl = el('#mapMsg'), routeLink = el('#routeLink');
    var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var URI_TYPE = { drive: 'drive', transit: 'bus', walk: 'walk', bike: 'bike' };

    function say(t) { if (msgEl) msgEl.textContent = t; }

    function routeURL() {
      var mode = (el('#routeMode') || {}).value || 'drive';
      var p = ['type=' + (URI_TYPE[mode] || 'drive'),
               'from=' + encodeURIComponent('我的位置')];
      if (routeFrom) {
        p.push('fromcoord=' + routeFrom.lat.toFixed(6) + ',' + routeFrom.lng.toFixed(6));
      }
      if (routeTarget) {
        p.push('to=' + encodeURIComponent(routeTarget.name));
        p.push('tocoord=' + routeTarget.lat.toFixed(6) + ',' + routeTarget.lng.toFixed(6));
      }
      p.push('referer=' + encodeURIComponent('北京餐厅Top100'));
      return (IS_MOBILE ? 'qqmap://map/routeplan?' : 'https://apis.map.qq.com/uri/v1/routeplan?') +
        p.join('&');
    }

    function refreshLink() {
      if (!routeLink) return;
      routeLink.href = routeURL();
      routeLink.textContent = routeTarget
        ? ('在腾讯地图中打开：' + routeTarget.name)
        : '在腾讯地图中打开路线';
    }

    function setTarget(lat, lng, name) {
      routeTarget = { lat: lat, lng: lng, name: name };
      refreshLink();
      say(routeFrom
        ? '已选好终点：' + name + '。点上面的链接跳到腾讯地图看路线。'
        : '已选好终点：' + name + '。没拿到你的位置，起点由腾讯地图自己定位。');
    }

    var modeSel = el('#routeMode');
    if (modeSel) {
      modeSel.addEventListener('change', refreshLink);
      if (!IS_MOBILE) {
        /* 桌面端 URI 只支持驾车与公交，步行/骑行交给 App */
        ['walk', 'bike'].forEach(function (v) {
          var o = modeSel.querySelector('option[value="' + v + '"]');
          if (o) o.disabled = true;
        });
        modeSel.value = 'drive';
      }
    }

    function ranked(lat, lng) {
      return dists.map(function (d) {
        return { d: d, km: distanceKm(lat, lng, d.lat, d.lng) };
      }).filter(function (x) { return x.d.in_top > 0; })
        .sort(function (a, b) { return a.km - b.km; })
        .slice(0, 5);
    }

    function paintNearby(rows, head) {
      if (!nearby) return;
      nearby.innerHTML = '<p class="nb-head">' + esc(head) + '</p>' +
        rows.map(function (x) {
          return '<div class="nb-row" data-lat="' + x.d.lat + '" data-lng="' + x.d.lng +
            '" data-name="' + esc(x.d.best ? x.d.best.name : x.d.name) + '">' +
            '<span class="nb-dist">' + esc(x.d.name) + '</span>' +
            '<span class="nb-km">' + x.km.toFixed(1) + ' km</span>' +
            '<span class="nb-shop">' + (x.d.best ? esc(x.d.best.name) + '　第 ' + x.d.best.rank + ' 名' : '—') + '</span>' +
            '</div>';
        }).join('') +
        '<p class="nb-note">距离按商圈近似中心计算，不代表门店实际位置。点一行把它设为路线终点。</p>';
      els('.nb-row', nearby).forEach(function (row) {
        row.addEventListener('click', function () {
          els('.nb-row', nearby).forEach(function (o) { o.classList.remove('on'); });
          row.classList.add('on');
          setTarget(+row.getAttribute('data-lat'), +row.getAttribute('data-lng'),
            row.getAttribute('data-name'));
        });
      });
      return rows;
    }

    function renderNearby(lat, lng) { return paintNearby(ranked(lat, lng), '离你最近的五个商圈'); }

    function renderNearbyStatic() {
      paintNearby(ranked(geo.center.lat, geo.center.lng), '以城区中心为参照的五个商圈');
    }
    renderNearbyStatic();

    var pick = el('#dPick');
    if (pick) {
      var ds = dists.slice().sort(function (a, b) { return b.in_top - a.in_top; });
      ds.forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.name;
        o.textContent = d.name + '（入榜 ' + d.in_top + '）';
        pick.appendChild(o);
      });
      pick.addEventListener('change', function () {
        var t = ds.filter(function (d) { return d.name === pick.value; })[0];
        if (!t) return;
        map.setCenter(new TMap.LatLng(t.lat, t.lng));
        map.setZoom(13.5);
        schedule();
        renderNearby(t.lat, t.lng);
        setTarget(t.lat, t.lng, t.best ? t.best.name : t.name);
      });
    }

    refreshLink();
  }

  /* ---------------------------------------------------------------- 单文件路由 */
  function initRouter() {
    var pages = els('.page');
    if (!pages.length) return;
    function go() {
      var id = (location.hash || '#home').slice(1);
      var hit = pages.filter(function (p) { return p.getAttribute('data-route') === id; })[0];
      if (!hit) { id = 'home'; hit = pages[0]; }
      pages.forEach(function (p) { p.hidden = p !== hit; });
      els('.nav a').forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      if (window.__onPageShown) window.__onPageShown(id);
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', go);
    go();
  }

  function boot() {
    initNumbers();
    initHead();
    initCharts();
    initRankTable();
    initTrial();
    initCompare();
    initCode();
    initMap();
    initRouter();
    var y = el('#year'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
