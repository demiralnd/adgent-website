/* ===========================================================================
   Adgent Charts — interactive SVG chart/graph library (engine)
   Zero dependencies. Renders real, data-driven SVG charts on the Adgent
   design tokens (assets/adgent-ui.css) with the Adgent motion language.

   Every chart is interactive by default:
   - hover crosshair / tooltip with exact values
   - legend click-to-toggle series (multi-series charts)
   - click-to-replay entrance animation
   - draws itself on scroll-into-view (IntersectionObserver)
   - responsive via SVG viewBox (no resize listeners needed)
   - respects prefers-reduced-motion

   See README.md in this folder for the full API + chart catalog.
   =========================================================================== */
(function (global) {
  "use strict";

  document.documentElement.classList.add("ac-js");

  var SVGNS = "http://www.w3.org/2000/svg";
  var PALETTE = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--mute)",
    "var(--warn)",
    "var(--chart-4)",
  ];

  // ---------------------------------------------------------------------
  // low-level helpers
  // ---------------------------------------------------------------------
  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVGNS, tag);
    if (attrs)
      for (var k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    return node;
  }
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === "class") node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    if (children)
      children.forEach(function (c) {
        if (c) node.appendChild(c);
      });
    return node;
  }
  function text(str) {
    return document.createTextNode(str);
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function extent(arr, acc) {
    acc =
      acc ||
      function (d) {
        return d;
      };
    var mn = Infinity,
      mx = -Infinity;
    arr.forEach(function (d) {
      var v = acc(d);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    });
    if (mn === Infinity) {
      mn = 0;
      mx = 1;
    }
    return [mn, mx];
  }
  function niceDomain(mn, mx, padRatio) {
    padRatio = padRatio == null ? 0.12 : padRatio;
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    var pad = (mx - mn) * padRatio;
    return [mn - pad, mx + pad];
  }
  function scaleLinear(domain, range) {
    var d0 = domain[0],
      d1 = domain[1],
      r0 = range[0],
      r1 = range[1];
    var span = d1 - d0 || 1;
    return function (v) {
      return r0 + ((v - d0) / span) * (r1 - r0);
    };
  }
  function fmtNum(n, opts) {
    opts = opts || {};
    var prefix = opts.prefix || "",
      suffix = opts.suffix || "";
    var sign = n < 0 ? "-" : "";
    var a = Math.abs(n);
    var out;
    if (a >= 1e9) out = (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
    else if (a >= 1e6) out = (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    else if (a >= 1e3) out = (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "K";
    else
      out =
        opts.decimals != null
          ? a.toFixed(opts.decimals)
          : a % 1 === 0
            ? String(a)
            : a.toFixed(1);
    return sign + prefix + out + suffix;
  }
  var __acMeasureCtx = null;
  function measureText(str, font) {
    if (!__acMeasureCtx)
      __acMeasureCtx = document.createElement("canvas").getContext("2d");
    __acMeasureCtx.font = font;
    return __acMeasureCtx.measureText(str).width;
  }
  function truncateToWidth(str, font, maxW) {
    if (measureText(str, font) <= maxW) return str;
    var lo = 0,
      hi = str.length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      var candidate = str.slice(0, mid) + "\u2026";
      if (measureText(candidate, font) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return lo === 0 ? "\u2026" : str.slice(0, lo) + "\u2026";
  }
  function fmtFn(f) {
    return typeof f === "function"
      ? f
      : function (v) {
          return fmtNum(v, f || {});
        };
  }

  // ---------------------------------------------------------------------
  // reveal-on-scroll + click-to-replay (shared, matches Adgent UI Library)
  // ---------------------------------------------------------------------
  var revealObs = null;
  function observeReveal(node, replay) {
    if (!revealObs) {
      revealObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.target.__acReplay)
              entry.target.classList.toggle("in", entry.isIntersecting);
            else if (entry.isIntersecting) {
              entry.target.classList.add("in");
              revealObs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
      );
    }
    node.__acReplay = !!replay;
    revealObs.observe(node);
  }
  function enableClickReplay(root) {
    root.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".ac-legend, .ac-controls"))
        return;
      root.classList.remove("in");
      void root.offsetWidth;
      requestAnimationFrame(function () {
        root.classList.add("in");
      });
    });
  }

  // ---------------------------------------------------------------------
  // card shell + legend + tabs + tooltip/crosshair
  // ---------------------------------------------------------------------
  function buildCard(container, opts) {
    opts = opts || {};
    container.innerHTML = "";
    var card = h("div", {
      class: "ac-card ac-chart" + (opts.span ? " span" : ""),
    });
    if (opts.title || opts.sub || opts.delta || opts.controls) {
      var head = h("div", { class: "ac-head" });
      if (opts.title)
        head.appendChild(h("span", { class: "ac-title" }, [text(opts.title)]));
      if (opts.sub)
        head.appendChild(h("span", { class: "ac-sub" }, [text(opts.sub)]));
      if (opts.delta)
        head.appendChild(
          h("span", { class: "ac-delta " + (opts.deltaDirection || "") }, [
            text(opts.delta),
          ]),
        );
      if (opts.controls) head.appendChild(opts.controls);
      card.appendChild(head);
    }
    var wrap = h("div", { class: "ac-wrap" });
    card.appendChild(wrap);
    container.appendChild(card);
    observeReveal(card, opts.replay === true);
    enableClickReplay(card);
    return { card: card, wrap: wrap };
  }

  function buildLegend(card, items, onToggle) {
    var legend = h("div", { class: "ac-legend" });
    items.forEach(function (it, i) {
      var btn = h("button", {}, [
        h("i", { style: "background:" + it.color }),
        text(it.label),
      ]);
      btn.addEventListener("click", function () {
        it.off = !it.off;
        btn.classList.toggle("off", it.off);
        onToggle(i, it.off);
      });
      legend.appendChild(btn);
    });
    card.appendChild(legend);
    return legend;
  }

  function tabs(options, onChange) {
    var wrap = h("div", { class: "ac-controls" });
    var active =
      options.filter(function (o) {
        return o.active;
      })[0] || options[0];
    function render() {
      wrap.innerHTML = "";
      options.forEach(function (o) {
        var btn = h("button", { class: o === active ? "active" : "" }, [
          text(o.label),
        ]);
        btn.addEventListener("click", function () {
          active = o;
          render();
          onChange(o);
        });
        wrap.appendChild(btn);
      });
    }
    render();
    return wrap;
  }

  function addHit(wrap) {
    var hit = h("div", { class: "ac-hit" });
    wrap.appendChild(hit);
    return hit;
  }

  function buildInteraction(wrap) {
    var tip = h("div", { class: "ac-tip" });
    var guide = h("div", { class: "ac-guide" });
    wrap.appendChild(guide);
    wrap.appendChild(tip);
    return {
      tip: tip,
      guide: guide,
      showGuide: function (xPct) {
        guide.style.left = xPct + "%";
        guide.style.opacity = 1;
      },
      hideGuide: function () {
        guide.style.opacity = 0;
      },
      showTip: function (xPct, yPx, html) {
        tip.innerHTML = html;
        tip.style.left = xPct + "%";
        tip.style.top = yPx + "px";
        tip.classList.add("on");
      },
      hideTip: function () {
        tip.classList.remove("on");
      },
    };
  }

  // generic nearest-column crosshair for line/area/bar/comparison/waterfall
  function attachCrosshair(hitEl, io, columns, viewBoxWidth, tooltipFormatter) {
    function locate(clientX) {
      var rect = hitEl.getBoundingClientRect();
      var relX = clamp((clientX - rect.left) / rect.width, 0, 1) * viewBoxWidth;
      var best = columns[0],
        bestDist = Infinity;
      columns.forEach(function (c) {
        var dist = Math.abs(c.xPix - relX);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      });
      return best;
    }
    hitEl.addEventListener("pointermove", function (e) {
      var col = locate(e.clientX);
      var xPct = (col.xPix / viewBoxWidth) * 100;
      io.showGuide(xPct);
      var rect = hitEl.getBoundingClientRect();
      var relY = e.clientY - rect.top;
      io.showTip(xPct, clamp(relY - 14, 0, rect.height), tooltipFormatter(col));
    });
    hitEl.addEventListener("pointerleave", function () {
      io.hideGuide();
      io.hideTip();
    });
  }

  function seriesTooltipHTML(colLabel, items, fmtY) {
    var rows = items
      .map(function (it) {
        return (
          '<div class="tt-row"><i style="background:' +
          it.color +
          '"></i>' +
          it.name +
          ": <b>" +
          fmtY(it.value) +
          "</b></div>"
        );
      })
      .join("");
    return (
      (colLabel ? '<span class="tt-d">' + colLabel + "</span>" : "") + rows
    );
  }

  // =====================================================================
  // 1. LINE / AREA / COMPARISON — one engine, three entry points
  // =====================================================================
  function lineFamily(container, opts) {
    var series = opts.series;
    var height = opts.height || 200,
      width = opts.width || 600;
    var margin = opts.margin || { l: 6, r: 6, t: 14, b: 10 };
    var gridLines = opts.gridLines || 3;
    var fmtY = fmtFn(opts.yFormat);
    var xLabels = opts.xLabels || [];

    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;

    var plotW = width - margin.l - margin.r,
      plotH = height - margin.t - margin.b;
    var n = series[0].data.length;
    var allY = [];
    series.forEach(function (s) {
      s.data.forEach(function (d) {
        allY.push(d.y);
      });
    });
    var ext = extent(allY);
    var ymin = ext[0],
      ymax = ext[1];
    if (opts.zeroBase) ymin = Math.min(0, ymin);
    var domain = niceDomain(ymin, ymax, 0.14);
    var yScale = scaleLinear(domain, [margin.t + plotH, margin.t]);
    var xScale = scaleLinear([0, n - 1], [margin.l, margin.l + plotW]);

    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
      preserveAspectRatio: "none",
    });
    for (var g = 0; g < gridLines; g++) {
      var gy = margin.t + (plotH / (gridLines - 1)) * g;
      svg.appendChild(
        svgEl("line", {
          class: "ac-grid",
          x1: margin.l,
          x2: margin.l + plotW,
          y1: gy.toFixed(1),
          y2: gy.toFixed(1),
        }),
      );
    }

    if (opts.annotations) {
      opts.annotations.forEach(function (a) {
        var ax = xScale(a.x);
        svg.appendChild(
          svgEl("line", {
            x1: ax.toFixed(1),
            x2: ax.toFixed(1),
            y1: margin.t,
            y2: margin.t + plotH,
            stroke: "var(--mute)",
            "stroke-width": 1,
            "stroke-dasharray": "2 3",
          }),
        );
        var at = svgEl("text", {
          x: ax.toFixed(1),
          y: margin.t - 3,
          "text-anchor": "middle",
          class: "ax",
          style: "font-size:9px",
        });
        at.textContent = a.label;
        svg.appendChild(at);
      });
    }

    var defsId = "acg" + Math.random().toString(36).slice(2, 9);
    var useArea = !!opts.area;
    if (useArea) {
      var defs = svgEl("defs");
      series.forEach(function (s, i) {
        var color = s.color || PALETTE[i % PALETTE.length];
        var grad = svgEl("linearGradient", {
          id: defsId + "-" + i,
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1,
        });
        grad.appendChild(
          svgEl("stop", {
            offset: 0,
            "stop-color": color,
            "stop-opacity": 0.28,
          }),
        );
        grad.appendChild(
          svgEl("stop", { offset: 1, "stop-color": color, "stop-opacity": 0 }),
        );
        defs.appendChild(grad);
      });
      svg.appendChild(defs);
    }

    var columns = [];
    for (var i = 0; i < n; i++)
      columns.push({ xPix: xScale(i), label: xLabels[i] || "", items: [] });

    var seriesEls = [];
    series.forEach(function (s, si) {
      var color = s.color || PALETTE[si % PALETTE.length];
      var pts = s.data.map(function (d, i) {
        return [xScale(i), yScale(d.y)];
      });
      pts.forEach(function (p, i) {
        columns[i].items.push({
          name: s.name,
          color: color,
          value: s.data[i].y,
        });
      });
      var sg = svgEl("g", { class: "ac-series" });
      if (useArea || s.area) {
        var areaD =
          "M" +
          pts
            .map(function (p) {
              return p[0].toFixed(2) + "," + p[1].toFixed(2);
            })
            .join(" L") +
          " L" +
          pts[pts.length - 1][0].toFixed(2) +
          "," +
          (margin.t + plotH) +
          " L" +
          pts[0][0].toFixed(2) +
          "," +
          (margin.t + plotH) +
          " Z";
        sg.appendChild(
          svgEl("path", {
            class: "ac-area",
            d: areaD,
            fill: "url(#" + defsId + "-" + si + ")",
          }),
        );
      }
      var lineD =
        "M" +
        pts
          .map(function (p) {
            return p[0].toFixed(2) + "," + p[1].toFixed(2);
          })
          .join(" L");
      sg.appendChild(
        svgEl("path", {
          class: si === 0 ? "ac-draw" : "ac-draw d2",
          pathLength: 1,
          d: lineD,
          fill: "none",
          stroke: color,
          "stroke-width": si === 0 ? 2.4 : 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
      var last = pts[pts.length - 1];
      sg.appendChild(
        svgEl("circle", {
          class: "ac-enddot",
          cx: last[0],
          cy: last[1],
          r: 3.6,
          fill: color,
        }),
      );
      sg.appendChild(
        svgEl("circle", {
          class: "ac-endpulse",
          cx: last[0],
          cy: last[1],
          r: 3.6,
          fill: "none",
          stroke: color,
          "stroke-width": 2,
        }),
      );
      svg.appendChild(sg);
      seriesEls.push({ g: sg, color: color, name: s.name });
    });

    wrap.appendChild(svg);
    var hit = addHit(wrap);
    var io = buildInteraction(wrap);
    attachCrosshair(hit, io, columns, width, function (col) {
      return seriesTooltipHTML(col.label, col.items, fmtY);
    });

    if (opts.legend !== false && series.length > 1) {
      buildLegend(
        card,
        series.map(function (s, i) {
          return {
            label: s.name,
            color: s.color || PALETTE[i % PALETTE.length],
          };
        }),
        function (i, off) {
          seriesEls[i].g.style.display = off ? "none" : "";
        },
      );
    }
    return { svg: svg, card: card };
  }
  function line(container, opts) {
    return lineFamily(container, opts);
  }
  function area(container, opts) {
    var o = {};
    for (var k in opts) o[k] = opts[k];
    o.area = true;
    return lineFamily(container, o);
  }
  function comparison(container, opts) {
    var o = {};
    for (var k in opts) o[k] = opts[k];
    if (o.legend == null) o.legend = true;
    return lineFamily(container, o);
  }

  // =====================================================================
  // 2. BAR — single / grouped / stacked
  // =====================================================================
  function bar(container, opts) {
    var mode = opts.mode || "single";
    var height = opts.height || 200,
      width = opts.width || 600;
    var margin = opts.margin || { l: 6, r: 6, t: 10, b: 24 };
    var fmtY = fmtFn(opts.yFormat);
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var plotW = width - margin.l - margin.r,
      plotH = height - margin.t - margin.b;
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l + plotW,
        y1: margin.t + plotH,
        y2: margin.t + plotH,
      }),
    );

    var labels, maxVal;
    if (mode === "single") {
      labels = opts.data.map(function (d) {
        return d.label;
      });
      maxVal = extent(opts.data, function (d) {
        return d.value;
      })[1];
    } else {
      labels = opts.labels;
      var totals = opts.labels.map(function (_, i) {
        if (mode === "stacked")
          return opts.series.reduce(function (sum, s) {
            return sum + s.values[i];
          }, 0);
        return Math.max.apply(
          null,
          opts.series.map(function (s) {
            return s.values[i];
          }),
        );
      });
      maxVal = Math.max.apply(null, totals);
    }
    maxVal = (maxVal || 1) * 1.15;
    var yScale = scaleLinear([0, maxVal], [margin.t + plotH, margin.t]);
    var n = labels.length;
    var groupW = plotW / n;
    var columns = [];

    if (mode === "single") {
      var barW = groupW * 0.56;
      opts.data.forEach(function (d, i) {
        var x = margin.l + groupW * i + (groupW - barW) / 2;
        var y0 = margin.t + plotH,
          y1 = yScale(d.value);
        svg.appendChild(
          svgEl("rect", {
            class: "ac-bar",
            style: "--i:" + i,
            x: x.toFixed(1),
            y: y1.toFixed(1),
            width: barW.toFixed(1),
            height: (y0 - y1).toFixed(1),
            rx: 3,
            fill: d.color || "var(--accent)",
          }),
        );
        columns.push({
          xPix: x + barW / 2,
          label: d.label,
          items: [
            {
              name: d.label,
              color: d.color || "var(--accent)",
              value: d.value,
            },
          ],
        });
      });
    } else {
      var seriesCount = opts.series.length;
      var barW2 =
        mode === "grouped" ? (groupW * 0.72) / seriesCount : groupW * 0.5;
      labels.forEach(function (label, gi) {
        var items = [];
        if (mode === "grouped") {
          opts.series.forEach(function (s, si) {
            var x =
              margin.l +
              groupW * gi +
              (groupW - barW2 * seriesCount) / 2 +
              si * barW2;
            var val = s.values[gi];
            var y0 = margin.t + plotH,
              y1 = yScale(val);
            var color = s.color || PALETTE[si % PALETTE.length];
            svg.appendChild(
              svgEl("rect", {
                class: "ac-bar",
                style: "--i:" + (gi * seriesCount + si),
                x: x.toFixed(1),
                y: y1.toFixed(1),
                width: (barW2 - 3).toFixed(1),
                height: (y0 - y1).toFixed(1),
                rx: 3,
                fill: color,
                "data-si": si,
              }),
            );
            items.push({ name: s.name, color: color, value: val });
          });
          columns.push({
            xPix: margin.l + groupW * gi + groupW / 2,
            label: label,
            items: items,
          });
        } else {
          var running = margin.t + plotH;
          var x2 = margin.l + groupW * gi + (groupW - barW2) / 2;
          opts.series.forEach(function (s, si) {
            var val = s.values[gi];
            var segH = plotH * (val / maxVal);
            var y1b = running - segH;
            var color = s.color || PALETTE[si % PALETTE.length];
            svg.appendChild(
              svgEl("rect", {
                class: "ac-bar",
                style: "--i:" + gi,
                x: x2.toFixed(1),
                y: y1b.toFixed(1),
                width: barW2.toFixed(1),
                height: segH.toFixed(1),
                rx: 3,
                fill: color,
                "data-si": si,
              }),
            );
            running = y1b;
            items.push({ name: s.name, color: color, value: val });
          });
          columns.push({ xPix: x2 + barW2 / 2, label: label, items: items });
        }
      });
    }

    wrap.appendChild(svg);
    var hit = addHit(wrap);
    var io = buildInteraction(wrap);
    attachCrosshair(hit, io, columns, width, function (col) {
      return seriesTooltipHTML(col.label, col.items, fmtY);
    });

    if (opts.legend !== false && mode !== "single") {
      buildLegend(
        card,
        opts.series.map(function (s, i) {
          return {
            label: s.name,
            color: s.color || PALETTE[i % PALETTE.length],
          };
        }),
        function (i, off) {
          svg.querySelectorAll('[data-si="' + i + '"]').forEach(function (r) {
            r.style.display = off ? "none" : "";
          });
        },
      );
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 3. RANKING — horizontal bar, sorted, click-to-drill
  // =====================================================================
  function ranking(container, opts) {
    var data = opts.data.slice();
    if (opts.sort !== false)
      data.sort(function (a, b) {
        return b.value - a.value;
      });
    var width = opts.width || 600;
    var rowHeight = opts.rowHeight || 34;
    var labelFont = "500 11px Switzer, sans-serif";
    var maxLabelW = width * 0.42;
    var neededW = 0;
    data.forEach(function (d) {
      neededW = Math.max(neededW, measureText(d.label, labelFont));
    });
    var labelW = opts.labelW || clamp(neededW + 14, 60, maxLabelW);
    var margin = { l: labelW, r: 50 };
    var height = data.length * rowHeight + 10;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format);
    var maxVal =
      (opts.max ||
        extent(data, function (d) {
          return d.value;
        })[1]) * 1.06;
    var xScale = scaleLinear([0, maxVal], [0, width - margin.l - margin.r]);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });

    var columns = [];
    data.forEach(function (d, i) {
      var y = 6 + i * rowHeight;
      var barW = xScale(d.value);
      var color = d.color || "var(--accent)";
      var lbl = svgEl("text", {
        x: 0,
        y: y + rowHeight / 2 + 4,
        style:
          "font-size:11px;fill:var(--ink-2);font-weight:600;font-family:var(--sans)",
      });
      lbl.textContent = truncateToWidth(d.label, labelFont, labelW - 10);
      if (lbl.textContent !== d.label) {
        var titleEl = svgEl("title", {});
        titleEl.textContent = d.label;
        lbl.appendChild(titleEl);
      }
      svg.appendChild(lbl);
      var rect = svgEl("rect", {
        class: "ac-hbar",
        style: "--i:" + i,
        x: margin.l,
        y: y + 4,
        width: barW.toFixed(1),
        height: rowHeight - 12,
        rx: 4,
        fill: color,
      });
      svg.appendChild(rect);
      var valTxt = svgEl("text", {
        x: margin.l + barW + 8,
        y: y + rowHeight / 2 + 4,
        style:
          "font-size:11px;fill:var(--ink-2);font-weight:600;font-family:var(--sans)",
      });
      valTxt.textContent = fmtV(d.value);
      svg.appendChild(valTxt);
      if (opts.onSelect) {
        rect.style.cursor = "pointer";
        rect.addEventListener("click", function () {
          opts.onSelect(d);
        });
      }
      columns.push({
        xPix: margin.l + barW / 2,
        yPix: y + rowHeight / 2,
        label: d.label,
        color: color,
        value: d.value,
      });
    });

    wrap.appendChild(svg);
    var hit = addHit(wrap);
    var io = buildInteraction(wrap);
    hit.addEventListener("pointermove", function (e) {
      var rect = hit.getBoundingClientRect();
      var relY = ((e.clientY - rect.top) / rect.height) * height;
      var best = columns[0],
        bd = Infinity;
      columns.forEach(function (c) {
        var dist = Math.abs(c.yPix - relY);
        if (dist < bd) {
          bd = dist;
          best = c;
        }
      });
      var xPct = (best.xPix / width) * 100;
      var relYPix = (best.yPix / height) * rect.height;
      io.showTip(
        xPct,
        relYPix - 30,
        seriesTooltipHTML(
          best.label,
          [{ name: best.label, color: best.color, value: best.value }],
          fmtV,
        ),
      );
    });
    hit.addEventListener("pointerleave", function () {
      io.hideTip();
    });
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 4. DONUT
  // =====================================================================
  function donut(container, opts) {
    var segments = opts.segments;
    var size = opts.size || 200,
      thickness = opts.thickness || 16;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var total =
      segments.reduce(function (s, d) {
        return s + d.value;
      }, 0) || 1;
    var r = size / 2 - thickness / 2 - 4,
      cx = size / 2,
      cy = size / 2;
    var circumference = 2 * Math.PI * r;
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + size + " " + size,
    });
    svg.appendChild(
      svgEl("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: "var(--grey)",
        "stroke-width": thickness,
      }),
    );
    var spinG = svgEl("g", { class: "ac-spin" });
    var offsetDeg = -90;
    var arcs = [];
    segments.forEach(function (s, i) {
      var frac = s.value / total;
      var len = circumference * frac;
      var color = s.color || PALETTE[i % PALETTE.length];
      var arcNode = svgEl("circle", {
        class: "donseg",
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: color,
        "stroke-width": thickness,
        "stroke-dasharray": len.toFixed(1) + " " + circumference.toFixed(1),
        transform: "rotate(" + offsetDeg + " " + cx + " " + cy + ")",
      });
      offsetDeg += frac * 360;
      spinG.appendChild(arcNode);
      arcs.push({ arc: arcNode, seg: s, frac: frac, color: color });
    });
    svg.appendChild(spinG);
    if (opts.centerLabel != null) {
      var t1 = svgEl("text", {
        x: cx,
        y: cy - 2,
        "text-anchor": "middle",
        style:
          "fill:var(--ink);font-family:var(--sans);font-size:" +
          size * 0.11 +
          "px;font-weight:600;letter-spacing:-.03em",
      });
      t1.textContent = opts.centerLabel;
      svg.appendChild(t1);
    }
    if (opts.centerSub) {
      var t2 = svgEl("text", {
        x: cx,
        y: cy + 16,
        "text-anchor": "middle",
        style:
          "fill:var(--ink-3);font-family:var(--sans);font-size:9px;letter-spacing:.06em",
      });
      t2.textContent = opts.centerSub.toUpperCase();
      svg.appendChild(t2);
    }
    wrap.appendChild(svg);
    var io = buildInteraction(wrap);
    arcs.forEach(function (a) {
      a.arc.style.cursor = "pointer";
      a.arc.addEventListener("pointerenter", function () {
        a.arc.setAttribute("stroke-width", thickness + 4);
      });
      a.arc.addEventListener("pointermove", function (e) {
        var rect = wrap.getBoundingClientRect();
        var xPct = ((e.clientX - rect.left) / rect.width) * 100;
        var yPix = e.clientY - rect.top;
        io.showTip(
          xPct,
          yPix - 14,
          seriesTooltipHTML(
            null,
            [{ name: a.seg.label, color: a.color, value: a.seg.value }],
            function (v) {
              return v + " (" + (a.frac * 100).toFixed(0) + "%)";
            },
          ),
        );
      });
      a.arc.addEventListener("pointerleave", function () {
        a.arc.setAttribute("stroke-width", thickness);
        io.hideTip();
      });
      if (opts.onSelect)
        a.arc.addEventListener("click", function () {
          opts.onSelect(a.seg);
        });
    });
    if (opts.legend !== false) {
      buildLegend(
        card,
        segments.map(function (s, i) {
          return {
            label: s.label,
            color: s.color || PALETTE[i % PALETTE.length],
          };
        }),
        function (i, off) {
          arcs[i].arc.style.display = off ? "none" : "";
        },
      );
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 5. GAUGE (arc, 0..max, threshold colored)
  // =====================================================================
  function gauge(container, opts) {
    var value = opts.value,
      max = opts.max || 100;
    var size = opts.size || 200,
      thickness = opts.thickness || 13;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var cx = size / 2,
      cy = size / 2 + 4;
    var r = size / 2 - thickness / 2 - 6;
    var sweep = 250,
      startAngle = -125;
    var circumference = 2 * Math.PI * r;
    var arcLen = circumference * (sweep / 360);
    var frac = clamp(value / max, 0, 1);
    var color = opts.color || "var(--accent)";
    if (opts.thresholds) {
      for (var t = 0; t < opts.thresholds.length; t++) {
        if (value <= opts.thresholds[t].upTo) {
          color = opts.thresholds[t].color;
          break;
        }
      }
    }
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + size + " " + size * 0.72,
    });
    svg.appendChild(
      svgEl("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: "var(--grey)",
        "stroke-width": thickness,
        "stroke-dasharray": arcLen.toFixed(1) + " 999",
        "stroke-linecap": "round",
        transform: "rotate(" + startAngle + " " + cx + " " + cy + ")",
      }),
    );
    var visLen = arcLen * frac;
    svg.appendChild(
      svgEl("circle", {
        class: "ac-arc",
        style: "--len:" + visLen.toFixed(1),
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: color,
        "stroke-width": thickness,
        "stroke-linecap": "round",
        "stroke-dasharray": visLen.toFixed(1) + " 999",
        transform: "rotate(" + startAngle + " " + cx + " " + cy + ")",
      }),
    );
    var t1 = svgEl("text", {
      x: cx,
      y: cy - 2,
      "text-anchor": "middle",
      style:
        "fill:" +
        color +
        ";font-family:var(--sans);font-size:" +
        size * 0.15 +
        "px;font-weight:600;letter-spacing:-.04em",
    });
    t1.textContent = Math.round(value);
    svg.appendChild(t1);
    if (opts.arcSub) {
      var t2 = svgEl("text", {
        x: cx,
        y: cy + 18,
        "text-anchor": "middle",
        style:
          "fill:var(--ink-3);font-family:var(--sans);font-size:9px;letter-spacing:.06em",
      });
      t2.textContent = opts.arcSub.toUpperCase();
      svg.appendChild(t2);
    }
    wrap.appendChild(svg);
    var io = buildInteraction(wrap);
    svg.addEventListener("pointermove", function (e) {
      var rect = wrap.getBoundingClientRect();
      io.showTip(
        ((e.clientX - rect.left) / rect.width) * 100,
        e.clientY - rect.top - 16,
        seriesTooltipHTML(
          opts.label || null,
          [{ name: "Value", color: color, value: value + " / " + max }],
          function (v) {
            return v;
          },
        ),
      );
    });
    svg.addEventListener("pointerleave", function () {
      io.hideTip();
    });
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 6. SPARKLINE (compact row) + KPI TILE (card)
  // =====================================================================
  function sparkline(container, opts) {
    var data = opts.data,
      color = opts.color || "var(--accent)";
    var width = opts.width || 120,
      height = opts.height || 30;
    var ext = extent(data),
      mn = ext[0],
      mx = ext[1],
      range = mx - mn || 1;
    var pts = data.map(function (v, i) {
      return [
        2 + (i / (data.length - 1)) * (width - 4),
        height - 4 - ((v - mn) / range) * (height - 8),
      ];
    });
    var d = pts
      .map(function (p, i) {
        return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
      })
      .join(" ");
    var row = h("div", { class: "ac-spk-row" });
    if (opts.label)
      row.appendChild(h("span", { class: "lab" }, [text(opts.label)]));
    var svg = svgEl("svg", { viewBox: "0 0 " + width + " " + height });
    svg.appendChild(
      svgEl("path", {
        class: "ac-draw",
        pathLength: 1,
        d: d,
        fill: "none",
        stroke: color,
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    );
    var last = pts[pts.length - 1];
    svg.appendChild(
      svgEl("circle", {
        class: "ac-enddot",
        cx: last[0],
        cy: last[1],
        r: 2.8,
        fill: color,
      }),
    );
    row.appendChild(svg);
    var fmtV = fmtFn(opts.format);
    if (opts.value != null)
      row.appendChild(h("span", { class: "v" }, [text(fmtV(opts.value))]));
    if (opts.deltaLabel)
      row.appendChild(
        h("span", { class: "d " + (opts.deltaDirection || "") }, [
          text(opts.deltaLabel),
        ]),
      );
    container.appendChild(row);
    observeReveal(row, opts.replay === true);
    return { row: row };
  }

  function kpiTile(container, opts) {
    var card = h("div", { class: "ac-card ac-chart ac-kpi" });
    card.appendChild(h("span", { class: "kl" }, [text(opts.label)]));
    var fmtV = fmtFn(opts.format);
    card.appendChild(h("span", { class: "kv" }, [text(fmtV(opts.value))]));
    if (opts.sparklineData) {
      var w = 160,
        ht = 34;
      var ext = extent(opts.sparklineData),
        mn = ext[0],
        mx = ext[1],
        range = mx - mn || 1;
      var pts = opts.sparklineData.map(function (v, i) {
        return [
          2 + (i / (opts.sparklineData.length - 1)) * (w - 4),
          ht - 4 - ((v - mn) / range) * (ht - 8),
        ];
      });
      var d = pts
        .map(function (p, i) {
          return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
        })
        .join(" ");
      var svg = svgEl("svg", { viewBox: "0 0 " + w + " " + ht });
      var color = opts.color || "var(--accent)";
      svg.appendChild(
        svgEl("path", {
          class: "ac-draw",
          pathLength: 1,
          d: d,
          fill: "none",
          stroke: color,
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        }),
      );
      card.appendChild(svg);
    }
    if (opts.delta)
      card.appendChild(
        h("span", { class: "ac-delta " + (opts.deltaDirection || "") }, [
          text(opts.delta),
        ]),
      );
    container.appendChild(card);
    observeReveal(card, opts.replay === true);
    enableClickReplay(card);
    return { card: card };
  }

  // =====================================================================
  // 7. SCATTER
  // =====================================================================
  function scatter(container, opts) {
    var points = opts.points,
      categories = opts.categories || {};
    var width = opts.width || 320,
      height = opts.height || 200;
    var margin = opts.margin || { l: 34, r: 12, t: 10, b: 26 };
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var plotW = width - margin.l - margin.r,
      plotH = height - margin.t - margin.b;
    var ex = extent(points, function (p) {
        return p.x;
      }),
      ey = extent(points, function (p) {
        return p.y;
      });
    var xScale = scaleLinear(niceDomain(ex[0], ex[1]), [
      margin.l,
      margin.l + plotW,
    ]);
    var yScale = scaleLinear(niceDomain(ey[0], ey[1]), [
      margin.t + plotH,
      margin.t,
    ]);
    var fmtX = fmtFn(opts.xFormat),
      fmtY = fmtFn(opts.yFormat);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l + plotW,
        y1: margin.t + plotH,
        y2: margin.t + plotH,
      }),
    );
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l,
        y1: margin.t,
        y2: margin.t + plotH,
      }),
    );
    var dotsEls = [];
    points.forEach(function (p, i) {
      var cat = categories[p.category] || { color: "var(--accent)" };
      var cx = xScale(p.x),
        cy = yScale(p.y);
      var dot = svgEl("circle", {
        class: "ac-dotmark",
        style: "--i:" + i,
        cx: cx.toFixed(1),
        cy: cy.toFixed(1),
        r: p.size || 4.6,
        fill: cat.color,
        "data-cat": p.category || "",
      });
      dot.style.cursor = "pointer";
      svg.appendChild(dot);
      dotsEls.push(dot);
    });
    wrap.appendChild(svg);
    var io = buildInteraction(wrap);
    dotsEls.forEach(function (dot, i) {
      var p = points[i];
      dot.addEventListener("pointerenter", function () {
        var xPct = (parseFloat(dot.getAttribute("cx")) / width) * 100;
        var yPix = parseFloat(dot.getAttribute("cy"));
        io.showTip(
          xPct,
          yPix - 12,
          seriesTooltipHTML(
            p.label || null,
            [
              {
                name: "x",
                color: dot.getAttribute("fill"),
                value: fmtX(p.x) + " · " + fmtY(p.y),
              },
            ],
            function (v) {
              return v;
            },
          ),
        );
      });
      dot.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        dot.addEventListener("click", function () {
          opts.onSelect(p);
        });
    });
    var catKeys = Object.keys(categories);
    if (opts.legend !== false && catKeys.length) {
      buildLegend(
        card,
        catKeys.map(function (k) {
          return {
            label: categories[k].label || k,
            color: categories[k].color,
            key: k,
          };
        }),
        function (i, off) {
          svg
            .querySelectorAll('[data-cat="' + catKeys[i] + '"]')
            .forEach(function (d) {
              d.style.display = off ? "none" : "";
            });
        },
      );
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 8. HEATMAP
  // =====================================================================
  function heatmap(container, opts) {
    var rows = opts.rows,
      cols = opts.cols,
      values = opts.values;
    var colorVar = opts.colorVar || "--chart-1";
    var width = opts.width || 320,
      cellGap = opts.cellGap || 3,
      cellH = opts.cellHeight || 22;
    var margin = { l: 46, t: 16, r: 10, b: 6 };
    var cellW = (width - margin.l - margin.r) / cols.length;
    var height = margin.t + rows.length * (cellH + cellGap) + margin.b;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format);
    var maxV = -Infinity;
    values.forEach(function (row) {
      row.forEach(function (v) {
        if (v > maxV) maxV = v;
      });
    });
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    cols.forEach(function (c, ci) {
      var t = svgEl("text", {
        x: margin.l + ci * cellW + cellW / 2,
        y: margin.t - 5,
        "text-anchor": "middle",
        class: "ax",
      });
      t.textContent = c;
      svg.appendChild(t);
    });
    var io = buildInteraction(wrap);
    var k = 0;
    rows.forEach(function (r, ri) {
      var t = svgEl("text", {
        x: margin.l - 8,
        y: margin.t + ri * (cellH + cellGap) + cellH / 2 + 3,
        "text-anchor": "end",
        class: "ax",
      });
      t.textContent = r;
      svg.appendChild(t);
      cols.forEach(function (c, ci) {
        var v = values[ri][ci];
        var op = clamp((v / maxV) * 0.82 + 0.1, 0.08, 1);
        var x = margin.l + ci * cellW + 1.5,
          y = margin.t + ri * (cellH + cellGap);
        var rect = svgEl("rect", {
          class: "ac-hm",
          style: "--i:" + k++,
          x: x.toFixed(1),
          y: y.toFixed(1),
          width: (cellW - 3).toFixed(1),
          height: cellH,
          rx: 4,
          fill: "var(" + colorVar + ")",
          "fill-opacity": op.toFixed(2),
        });
        rect.style.cursor = "pointer";
        rect.addEventListener("pointerenter", function () {
          var xPct = ((margin.l + ci * cellW + cellW / 2) / width) * 100;
          io.showTip(
            xPct,
            y - 6,
            seriesTooltipHTML(
              r + " · " + c,
              [{ name: "v", color: "var(" + colorVar + ")", value: fmtV(v) }],
              function (val) {
                return val;
              },
            ),
          );
        });
        rect.addEventListener("pointerleave", function () {
          io.hideTip();
        });
        svg.appendChild(rect);
      });
    });
    wrap.appendChild(svg);
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 9. DISTRIBUTION (segmented % bar)
  // =====================================================================
  function distribution(container, opts) {
    var segments = opts.segments;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var total =
      segments.reduce(function (s, d) {
        return s + d.value;
      }, 0) || 1;
    var fmtV = fmtFn(opts.format);
    var bar = h("div", { class: "ac-distbar" });
    var io = buildInteraction(wrap);
    segments.forEach(function (s, i) {
      var pct = (s.value / total) * 100;
      var color = s.color || PALETTE[i % PALETTE.length];
      var seg = h(
        "div",
        {
          class: "ac-seg",
          style: "--i:" + i + ";width:" + pct + "%;background:" + color,
        },
        [text(pct > 8 ? s.label : "")],
      );
      seg.addEventListener("pointerenter", function () {
        var wrapRect = wrap.getBoundingClientRect();
        var segRect = seg.getBoundingClientRect();
        var xPct =
          ((segRect.left + segRect.width / 2 - wrapRect.left) /
            wrapRect.width) *
          100;
        io.showTip(
          xPct,
          -6,
          seriesTooltipHTML(
            s.label,
            [
              {
                name: s.label,
                color: color,
                value: fmtV(s.value) + " · " + pct.toFixed(1) + "%",
              },
            ],
            function (v) {
              return v;
            },
          ),
        );
      });
      seg.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      bar.appendChild(seg);
    });
    wrap.appendChild(bar);
    if (opts.legend !== false) {
      buildLegend(
        card,
        segments.map(function (s, i) {
          return {
            label: s.label + " (" + fmtV(s.value) + ")",
            color: s.color || PALETTE[i % PALETTE.length],
          };
        }),
        function () {},
      );
    }
    return { card: card };
  }

  // =====================================================================
  // 10. FUNNEL
  // =====================================================================
  function funnel(container, opts) {
    var steps = opts.steps;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format);
    var max = steps[0].value || 1;
    var list = h("div", { class: "ac-funnel" });
    var io = buildInteraction(wrap);
    steps.forEach(function (s, i) {
      if (i > 0) {
        var dropPct = (
          ((steps[i - 1].value - s.value) / steps[i - 1].value) *
          100
        ).toFixed(0);
        list.appendChild(
          h("div", { class: "ac-funnel-drop" }, [
            text("\u2193 " + dropPct + "%"),
          ]),
        );
      }
      var pct = (s.value / max) * 100;
      var color = s.color || PALETTE[i % PALETTE.length];
      var row = h(
        "div",
        {
          class: "ac-funnel-step ac-fade",
          style:
            "--i:" +
            i +
            ";width:" +
            Math.max(pct, 14) +
            "%;background:" +
            color +
            ";margin:0 auto",
        },
        [text(s.label + " \u00b7 " + fmtV(s.value))],
      );
      row.addEventListener("pointerenter", function () {
        var wrapRect = wrap.getBoundingClientRect();
        var rowRect = row.getBoundingClientRect();
        var xPct =
          ((rowRect.left + rowRect.width / 2 - wrapRect.left) /
            wrapRect.width) *
          100;
        var drop =
          i > 0
            ? (
                ((steps[i - 1].value - s.value) / steps[i - 1].value) *
                100
              ).toFixed(0) + "% drop"
            : "";
        io.showTip(
          xPct,
          rowRect.top - wrapRect.top - 8,
          seriesTooltipHTML(
            s.label,
            [
              {
                name: s.label,
                color: color,
                value: fmtV(s.value) + (drop ? " \u00b7 " + drop : ""),
              },
            ],
            function (v) {
              return v;
            },
          ),
        );
      });
      row.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return { card: card };
  }

  // =====================================================================
  // 11. WATERFALL (cumulative bridge)
  // =====================================================================
  function waterfall(container, opts) {
    var items = opts.items;
    var width = opts.width || 600,
      height = opts.height || 220;
    var margin = opts.margin || { l: 6, r: 6, t: 14, b: 30 };
    var fmtV = fmtFn(opts.format);
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var running = 0;
    var bars = items.map(function (it) {
      if (it.type === "total") {
        var b = {
          label: it.label,
          value: it.value,
          color: it.color,
          from: 0,
          to: it.value,
          type: it.type,
        };
        running = it.value;
        return b;
      }
      var from = running;
      running += it.value;
      return {
        label: it.label,
        value: it.value,
        color: it.color,
        from: from,
        to: running,
        type: it.type,
      };
    });
    var allVals = [];
    bars.forEach(function (b) {
      allVals.push(b.from, b.to);
    });
    var ext = extent(allVals);
    var domain = niceDomain(Math.min(0, ext[0]), ext[1], 0.12);
    var plotW = width - margin.l - margin.r,
      plotH = height - margin.t - margin.b;
    var yScale = scaleLinear(domain, [margin.t + plotH, margin.t]);
    var n = bars.length,
      gap = 10;
    var barW = (plotW - gap * (n - 1)) / n;
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    var zeroY = yScale(0);
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l + plotW,
        y1: zeroY.toFixed(1),
        y2: zeroY.toFixed(1),
      }),
    );
    var columns = [];
    bars.forEach(function (b, i) {
      var x = margin.l + i * (barW + gap);
      var y1 = yScale(Math.max(b.from, b.to)),
        y2 = yScale(Math.min(b.from, b.to));
      var color =
        b.color ||
        (b.type === "total"
          ? "var(--chart-1)"
          : b.value >= 0
            ? "var(--ok)"
            : "var(--crit)");
      svg.appendChild(
        svgEl("rect", {
          class: "ac-bar",
          style: "--i:" + i,
          x: x.toFixed(1),
          y: y1.toFixed(1),
          width: barW.toFixed(1),
          height: Math.max(y2 - y1, 2).toFixed(1),
          rx: 3,
          fill: color,
        }),
      );
      var lbl = svgEl("text", {
        x: x + barW / 2,
        y: height - 8,
        "text-anchor": "middle",
        class: "ax",
      });
      lbl.textContent = b.label;
      svg.appendChild(lbl);
      columns.push({
        xPix: x + barW / 2,
        label: b.label,
        items: [{ name: b.label, color: color, value: b.value }],
      });
    });
    wrap.appendChild(svg);
    var hit = addHit(wrap);
    var io = buildInteraction(wrap);
    attachCrosshair(hit, io, columns, width, function (col) {
      return seriesTooltipHTML(col.label, col.items, fmtV);
    });
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 12. RADAR / SPIDER (multi-metric comparison)
  // =====================================================================
  function radar(container, opts) {
    var axes = opts.axes,
      series = opts.series;
    var size = opts.size || 240;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var cx = size / 2,
      cy = size / 2,
      r = size / 2 - 30;
    var n = axes.length;
    var allVals = [];
    series.forEach(function (s) {
      allVals = allVals.concat(s.values);
    });
    var maxVal = opts.max || Math.max.apply(null, allVals);
    function angle(i) {
      return -Math.PI / 2 + (i / n) * Math.PI * 2;
    }
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + size + " " + size,
    });
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = axes.map(function (_, i) {
        var a = angle(i);
        return (
          (cx + Math.cos(a) * r * f).toFixed(1) +
          "," +
          (cy + Math.sin(a) * r * f).toFixed(1)
        );
      });
      svg.appendChild(
        svgEl("polygon", {
          class: "ac-grid",
          points: pts.join(" "),
          fill: "none",
        }),
      );
    });
    axes.forEach(function (label, i) {
      var a = angle(i);
      svg.appendChild(
        svgEl("line", {
          class: "ac-grid",
          x1: cx,
          y1: cy,
          x2: (cx + Math.cos(a) * r).toFixed(1),
          y2: (cy + Math.sin(a) * r).toFixed(1),
        }),
      );
      var lx = cx + Math.cos(a) * (r + 16),
        ly = cy + Math.sin(a) * (r + 16);
      var t = svgEl("text", {
        x: lx.toFixed(1),
        y: ly.toFixed(1),
        "text-anchor": "middle",
        class: "ax",
        style: "font-size:10px",
      });
      t.textContent = label;
      svg.appendChild(t);
    });
    var io = buildInteraction(wrap);
    var polys = [];
    series.forEach(function (s, si) {
      var color = s.color || PALETTE[si % PALETTE.length];
      var pts = s.values.map(function (v, i) {
        var a = angle(i);
        var rr = (v / maxVal) * r;
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
      });
      var pg = svgEl("g", { class: "ac-poly" });
      pg.appendChild(
        svgEl("polygon", {
          points: pts
            .map(function (p) {
              return p[0].toFixed(1) + "," + p[1].toFixed(1);
            })
            .join(" "),
          fill: color,
          "fill-opacity": 0.14,
          stroke: color,
          "stroke-width": 2,
        }),
      );
      pts.forEach(function (p, i) {
        var dot = svgEl("circle", {
          cx: p[0].toFixed(1),
          cy: p[1].toFixed(1),
          r: 3.4,
          fill: color,
        });
        dot.style.cursor = "pointer";
        dot.addEventListener("pointerenter", function () {
          var xPct = (p[0] / size) * 100;
          io.showTip(
            xPct,
            p[1] - 14,
            seriesTooltipHTML(
              axes[i] + " \u00b7 " + s.name,
              [{ name: s.name, color: color, value: s.values[i] }],
              function (v) {
                return v;
              },
            ),
          );
        });
        dot.addEventListener("pointerleave", function () {
          io.hideTip();
        });
        pg.appendChild(dot);
      });
      svg.appendChild(pg);
      polys.push(pg);
    });
    wrap.appendChild(svg);
    if (opts.legend !== false && series.length > 1) {
      buildLegend(
        card,
        series.map(function (s, i) {
          return {
            label: s.name,
            color: s.color || PALETTE[i % PALETTE.length],
          };
        }),
        function (i, off) {
          polys[i].style.display = off ? "none" : "";
        },
      );
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 13. BULLET (target vs actual — e.g. ROAS target tracking)
  // =====================================================================
  function bullet(container, opts) {
    var value = opts.value,
      target = opts.target,
      ranges = opts.ranges;
    var width = opts.width || 320,
      height = opts.height || 32;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format);
    var maxRange =
      ranges && ranges.length
        ? ranges[ranges.length - 1].to
        : Math.max(target, value);
    var max = Math.max(target, value, maxRange) * 1.05;
    var margin = { l: 4, r: 4 };
    var plotW = width - margin.l - margin.r;
    var xScale = scaleLinear([0, max], [margin.l, margin.l + plotW]);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    var prev = 0;
    (ranges || [{ to: max, color: "var(--grey)" }]).forEach(function (rg) {
      svg.appendChild(
        svgEl("rect", {
          x: xScale(prev).toFixed(1),
          y: 6,
          width: (xScale(rg.to) - xScale(prev)).toFixed(1),
          height: 14,
          fill: rg.color,
        }),
      );
      prev = rg.to;
    });
    svg.appendChild(
      svgEl("rect", {
        class: "ac-hbar",
        x: margin.l,
        y: 12,
        width: xScale(value).toFixed(1),
        height: 6,
        rx: 3,
        fill: "var(--ink)",
      }),
    );
    svg.appendChild(
      svgEl("line", {
        x1: xScale(target).toFixed(1),
        x2: xScale(target).toFixed(1),
        y1: 2,
        y2: 24,
        stroke: "var(--accent)",
        "stroke-width": 2.5,
      }),
    );
    wrap.appendChild(svg);
    var io = buildInteraction(wrap);
    svg.addEventListener("pointermove", function (e) {
      var rect = wrap.getBoundingClientRect();
      io.showTip(
        ((e.clientX - rect.left) / rect.width) * 100,
        -6,
        seriesTooltipHTML(
          opts.label || null,
          [
            { name: "Actual", color: "var(--ink)", value: fmtV(value) },
            { name: "Target", color: "var(--accent)", value: fmtV(target) },
          ],
          function (v) {
            return v;
          },
        ),
      );
    });
    svg.addEventListener("pointerleave", function () {
      io.hideTip();
    });
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 14. PROGRESS RING (full-circle %)
  // =====================================================================
  function progressRing(container, opts) {
    var value = opts.value,
      max = opts.max || 100;
    var size = opts.size || 120,
      thickness = opts.thickness || 10;
    var color = opts.color || "var(--accent)";
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var cx = size / 2,
      cy = size / 2,
      r = size / 2 - thickness / 2 - 3;
    var circumference = 2 * Math.PI * r;
    var frac = clamp(value / max, 0, 1);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + size + " " + size,
    });
    svg.appendChild(
      svgEl("circle", {
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: "var(--grey)",
        "stroke-width": thickness,
      }),
    );
    var visLen = circumference * frac;
    svg.appendChild(
      svgEl("circle", {
        class: "ac-arc",
        style: "--len:" + visLen.toFixed(1),
        cx: cx,
        cy: cy,
        r: r,
        fill: "none",
        stroke: color,
        "stroke-width": thickness,
        "stroke-linecap": "round",
        "stroke-dasharray": visLen.toFixed(1) + " 999",
        transform: "rotate(-90 " + cx + " " + cy + ")",
      }),
    );
    var t = svgEl("text", {
      x: cx,
      y: cy + 6,
      "text-anchor": "middle",
      style:
        "fill:var(--ink);font-family:var(--sans);font-size:" +
        size * 0.19 +
        "px;font-weight:600",
    });
    t.textContent = Math.round(frac * 100) + "%";
    svg.appendChild(t);
    wrap.appendChild(svg);
    var io = buildInteraction(wrap);
    svg.addEventListener("pointermove", function (e) {
      var rect = wrap.getBoundingClientRect();
      io.showTip(
        ((e.clientX - rect.left) / rect.width) * 100,
        e.clientY - rect.top - 16,
        seriesTooltipHTML(
          opts.label || null,
          [{ name: "Value", color: color, value: value + " / " + max }],
          function (v) {
            return v;
          },
        ),
      );
    });
    svg.addEventListener("pointerleave", function () {
      io.hideTip();
    });
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 15. PIE — full pie (thin wrapper on donut, no center hole)
  // =====================================================================
  function pie(container, opts) {
    var o = {};
    for (var k in opts) o[k] = opts[k];
    var size = o.size || 200;
    o.thickness = size / 2 - 4;
    if (o.centerLabel === undefined) o.centerLabel = null;
    return donut(container, o);
  }

  // =====================================================================
  // 16. GEO MAP — world choropleth / bubble map, with pan & zoom
  // =====================================================================
  function geoMap(container, opts) {
    var mapData = global.AdgentWorldMap;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    if (!mapData) {
      wrap.innerHTML =
        '<div style="padding:28px 12px;text-align:center;color:var(--ink-3);font-size:12px">World map data not loaded \u2014 include world-map-data.js before adgent-charts.js.</div>';
      return { card: card };
    }
    var mode = opts.mode || "choropleth";
    var data = opts.data || {};
    var colorVar = opts.colorVar || "--chart-1";
    var fmtV = fmtFn(opts.format);
    var values = [];
    for (var k in data) values.push(data[k]);
    var maxVal = values.length ? Math.max.apply(null, values) : 1;
    var minVal = values.length ? Math.min.apply(null, values) : 0;

    var W = mapData.width,
      H = mapData.height;
    var svg = svgEl("svg", { class: "ac-svg", viewBox: "0 0 " + W + " " + H });
    svg.style.cursor = "grab";
    var viewport = svgEl("g", { class: "ac-geo-viewport" });
    svg.appendChild(viewport);

    var countryEls = [];
    mapData.countries.forEach(function (c, i) {
      var val = data[c.id];
      var hasVal = val != null;
      var fill = "var(--grey)",
        opacity = 1;
      if (mode !== "bubble" && hasVal) {
        fill = "var(" + colorVar + ")";
        opacity = clamp(
          ((val - minVal) / (maxVal - minVal || 1)) * 0.82 + 0.14,
          0.14,
          1,
        );
      }
      var p = svgEl("path", {
        class: "ac-fade",
        style: "--i:" + (i % 40),
        d: c.d,
        fill: fill,
        "fill-opacity": opacity,
        stroke: "var(--card)",
        "stroke-width": 0.6,
      });
      p.style.cursor = hasVal || mode === "bubble" ? "pointer" : "default";
      viewport.appendChild(p);
      countryEls.push({ el: p, c: c, val: val });
    });

    var bubbleEls = [];
    if (mode === "bubble" || mode === "both") {
      var maxR = opts.maxRadius || 22,
        minR = opts.minRadius || 3;
      countryEls.forEach(function (row, i) {
        if (row.val == null) return;
        var frac = (row.val - minVal) / (maxVal - minVal || 1);
        var r = minR + Math.sqrt(Math.max(frac, 0)) * (maxR - minR);
        var dot = svgEl("circle", {
          class: "ac-dotmark",
          style: "--i:" + (i % 30),
          cx: row.c.cx,
          cy: row.c.cy,
          r: r.toFixed(1),
          fill: "var(--accent)",
          "fill-opacity": 0.55,
          stroke: "var(--accent)",
          "stroke-width": 1.4,
        });
        dot.style.cursor = "pointer";
        viewport.appendChild(dot);
        bubbleEls.push({ el: dot, c: row.c, val: row.val });
      });
    }

    wrap.appendChild(svg);
    var io = buildInteraction(wrap);

    function pointTip(clientX, clientY, name, val) {
      var rect = wrap.getBoundingClientRect();
      var xPct = ((clientX - rect.left) / rect.width) * 100;
      var yPix = clientY - rect.top;
      io.showTip(
        xPct,
        yPix - 16,
        seriesTooltipHTML(
          name,
          [
            {
              name: name,
              color: "var(--accent)",
              value: val == null ? "No data" : fmtV(val),
            },
          ],
          function (v) {
            return v;
          },
        ),
      );
    }
    countryEls.forEach(function (row) {
      row.el.addEventListener("pointermove", function (e) {
        pointTip(e.clientX, e.clientY, row.c.name, row.val);
      });
      row.el.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        row.el.addEventListener("click", function () {
          opts.onSelect(row.c.id, row.val);
        });
    });
    bubbleEls.forEach(function (row) {
      row.el.addEventListener("pointermove", function (e) {
        pointTip(e.clientX, e.clientY, row.c.name, row.val);
      });
      row.el.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        row.el.addEventListener("click", function () {
          opts.onSelect(row.c.id, row.val);
        });
    });

    // ---- pan & zoom ----
    var scale = 1,
      tx = 0,
      ty = 0;
    function applyTransform() {
      viewport.setAttribute(
        "transform",
        "translate(" + tx + "," + ty + ") scale(" + scale + ")",
      );
    }
    var dragging = false,
      lastX = 0,
      lastY = 0;
    svg.addEventListener("pointerdown", function (e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.style.cursor = "grabbing";
    });
    window.addEventListener("pointerup", function () {
      dragging = false;
      svg.style.cursor = "grab";
    });
    svg.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var rect = svg.getBoundingClientRect();
      var k2 = W / rect.width;
      tx += (e.clientX - lastX) * k2;
      ty += (e.clientY - lastY) * k2;
      lastX = e.clientX;
      lastY = e.clientY;
      applyTransform();
    });
    svg.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var rect = svg.getBoundingClientRect();
        var k3 = W / rect.width;
        var mx = (e.clientX - rect.left) * k3,
          my = (e.clientY - rect.top) * k3;
        var factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        var newScale = clamp(scale * factor, 1, 8);
        factor = newScale / scale;
        tx = mx - (mx - tx) * factor;
        ty = my - (my - ty) * factor;
        scale = newScale;
        applyTransform();
      },
      { passive: false },
    );
    svg.addEventListener("dblclick", function () {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    });

    if (opts.legend !== false) {
      if (mode === "bubble") {
        card.appendChild(
          h("div", { class: "ac-note" }, [
            text(
              "Bubble size = value \u00b7 scroll to zoom, drag to pan, double-click to reset",
            ),
          ]),
        );
      } else {
        var scaleBar = h(
          "div",
          {
            style:
              "display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:var(--ink-3);font-family:var(--sans)",
          },
          [
            text(fmtV(minVal)),
            h("div", {
              style:
                "flex:1 1 auto;height:8px;border-radius:4px;background:linear-gradient(90deg, color-mix(in srgb, var(" +
                colorVar +
                ") 14%, var(--card)), var(" +
                colorVar +
                "))",
            }),
            text(fmtV(maxVal)),
          ],
        );
        card.appendChild(scaleBar);
        card.appendChild(
          h("div", { class: "ac-note" }, [
            text(
              "Scroll to zoom \u00b7 drag to pan \u00b7 double-click to reset",
            ),
          ]),
        );
      }
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 17. BUBBLE — x / y / size scatter (e.g. CAC vs LTV vs deal volume)
  // =====================================================================
  function bubble(container, opts) {
    var points = opts.points,
      categories = opts.categories || {};
    var width = opts.width || 400,
      height = opts.height || 260;
    var margin = opts.margin || { l: 40, r: 16, t: 14, b: 30 };
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var plotW = width - margin.l - margin.r,
      plotH = height - margin.t - margin.b;
    var ex = extent(points, function (p) {
        return p.x;
      }),
      ey = extent(points, function (p) {
        return p.y;
      });
    var es = extent(points, function (p) {
      return p.size;
    });
    var xScale = scaleLinear(niceDomain(ex[0], ex[1]), [
      margin.l,
      margin.l + plotW,
    ]);
    var yScale = scaleLinear(niceDomain(ey[0], ey[1]), [
      margin.t + plotH,
      margin.t,
    ]);
    var maxR = opts.maxRadius || 34,
      minR = opts.minRadius || 6;
    var rScale = function (s) {
      var frac = (s - es[0]) / (es[1] - es[0] || 1);
      return minR + Math.sqrt(Math.max(frac, 0)) * (maxR - minR);
    };
    var fmtX = fmtFn(opts.xFormat),
      fmtY = fmtFn(opts.yFormat),
      fmtS = fmtFn(opts.sizeFormat);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l + plotW,
        y1: margin.t + plotH,
        y2: margin.t + plotH,
      }),
    );
    svg.appendChild(
      svgEl("line", {
        class: "ac-grid",
        x1: margin.l,
        x2: margin.l,
        y1: margin.t,
        y2: margin.t + plotH,
      }),
    );
    var io = buildInteraction(wrap);
    var dotsEls = [];
    var ordered = points
      .map(function (p, i) {
        return { p: p, i: i };
      })
      .sort(function (a, b) {
        return b.p.size - a.p.size;
      });
    ordered.forEach(function (row) {
      var p = row.p,
        i = row.i;
      var cat = categories[p.category] || { color: "var(--accent)" };
      var cx = xScale(p.x),
        cy = yScale(p.y),
        r = rScale(p.size);
      var dot = svgEl("circle", {
        class: "ac-dotmark",
        style: "--i:" + i,
        cx: cx.toFixed(1),
        cy: cy.toFixed(1),
        r: r.toFixed(1),
        fill: cat.color,
        "fill-opacity": 0.5,
        stroke: cat.color,
        "stroke-width": 1.6,
        "data-cat": p.category || "",
      });
      dot.style.cursor = "pointer";
      svg.appendChild(dot);
      dotsEls.push({ dot: dot, p: p });
    });
    wrap.appendChild(svg);
    dotsEls.forEach(function (row) {
      row.dot.addEventListener("pointerenter", function () {
        var cx = parseFloat(row.dot.getAttribute("cx")),
          cy = parseFloat(row.dot.getAttribute("cy")),
          r = parseFloat(row.dot.getAttribute("r"));
        var xPct = (cx / width) * 100;
        io.showTip(
          xPct,
          cy - r - 8,
          seriesTooltipHTML(
            row.p.label || null,
            [
              {
                name: "x",
                color: row.dot.getAttribute("fill"),
                value:
                  fmtX(row.p.x) +
                  " \u00b7 " +
                  fmtY(row.p.y) +
                  " \u00b7 " +
                  fmtS(row.p.size),
              },
            ],
            function (v) {
              return v;
            },
          ),
        );
      });
      row.dot.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        row.dot.addEventListener("click", function () {
          opts.onSelect(row.p);
        });
    });
    var catKeys = Object.keys(categories);
    if (opts.legend !== false && catKeys.length) {
      buildLegend(
        card,
        catKeys.map(function (k) {
          return {
            label: categories[k].label || k,
            color: categories[k].color,
          };
        }),
        function (i, off) {
          svg
            .querySelectorAll('[data-cat="' + catKeys[i] + '"]')
            .forEach(function (d) {
              d.style.display = off ? "none" : "";
            });
        },
      );
    }
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 18. PYRAMID — layered market-sizing chart (e.g. TAM / SAM / SOM)
  // =====================================================================
  function pyramid(container, opts) {
    var layers =
      opts.sort === false
        ? opts.layers.slice()
        : opts.layers.slice().sort(function (a, b) {
            return b.value - a.value;
          });
    var width = opts.width || 360,
      height = opts.height || 240;
    var margin = opts.margin || { t: 10, b: 10 };
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format);
    var n = layers.length;
    var gap = 4;
    var layerH = (height - margin.t - margin.b - gap * (n - 1)) / n;
    var maxVal = layers[0].value || 1;
    var maxHalfW = width / 2 - 10;
    function halfW(v) {
      return Math.max((v / maxVal) * maxHalfW, maxHalfW * 0.06);
    }
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    var io = buildInteraction(wrap);
    var cx = width / 2;
    layers.forEach(function (layer, i) {
      var yTop = margin.t + i * (layerH + gap);
      var yBot = yTop + layerH;
      var topHW = halfW(layer.value);
      var nextVal = i < n - 1 ? layers[i + 1].value : layer.value * 0.62;
      var botHW = halfW(nextVal);
      var color = layer.color || PALETTE[i % PALETTE.length];
      var points = [
        (cx - topHW).toFixed(1) + "," + yTop.toFixed(1),
        (cx + topHW).toFixed(1) + "," + yTop.toFixed(1),
        (cx + botHW).toFixed(1) + "," + yBot.toFixed(1),
        (cx - botHW).toFixed(1) + "," + yBot.toFixed(1),
      ].join(" ");
      var poly = svgEl("polygon", {
        class: "ac-fade",
        style: "--i:" + i,
        points: points,
        fill: color,
      });
      poly.style.cursor = "pointer";
      svg.appendChild(poly);
      var label = svgEl("text", {
        x: cx,
        y: (yTop + yBot) / 2 - 3,
        "text-anchor": "middle",
        style:
          "fill:#fff;font-family:var(--sans);font-size:12px;font-weight:600",
      });
      label.textContent = layer.label;
      var valueLbl = svgEl("text", {
        x: cx,
        y: (yTop + yBot) / 2 + 12,
        "text-anchor": "middle",
        style:
          "fill:rgba(255,255,255,.85);font-family:var(--sans);font-size:10px",
      });
      valueLbl.textContent = fmtV(layer.value);
      svg.appendChild(label);
      svg.appendChild(valueLbl);
      poly.addEventListener("pointerenter", function () {
        var pct = i === 0 ? 100 : (layer.value / maxVal) * 100;
        io.showTip(
          50,
          yTop - 6,
          seriesTooltipHTML(
            layer.label,
            [
              {
                name: layer.label,
                color: color,
                value:
                  fmtV(layer.value) +
                  " \u00b7 " +
                  pct.toFixed(0) +
                  "% of " +
                  layers[0].label,
              },
            ],
            function (v) {
              return v;
            },
          ),
        );
      });
      poly.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        poly.addEventListener("click", function () {
          opts.onSelect(layer);
        });
    });
    wrap.appendChild(svg);
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 19. GANTT / TIMELINE — campaign planning calendar
  // =====================================================================
  function gantt(container, opts) {
    var rows = opts.rows;
    var width = opts.width || 640;
    var rowHeight = opts.rowHeight || 36;
    var labelW = opts.labelW || 120;
    var margin = { l: labelW, r: 14, t: 26, b: 6 };
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    function toDays(v) {
      return typeof v === "number"
        ? v
        : (new Date(v) - new Date(opts.rangeStart)) / 86400000;
    }
    var rangeStart = 0,
      rangeEnd = opts.totalDays || 30;
    if (opts.rangeStart && opts.rangeEnd) rangeEnd = toDays(opts.rangeEnd);
    var height = margin.t + rows.length * rowHeight + margin.b;
    var plotW = width - margin.l - margin.r;
    var xScale = scaleLinear(
      [rangeStart, rangeEnd],
      [margin.l, margin.l + plotW],
    );
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    var weekStep = Math.max(1, Math.round(rangeEnd / 8));
    for (var d = 0; d <= rangeEnd; d += weekStep) {
      var gx = xScale(d);
      svg.appendChild(
        svgEl("line", {
          class: "ac-grid",
          x1: gx.toFixed(1),
          x2: gx.toFixed(1),
          y1: margin.t - 8,
          y2: height - margin.b,
        }),
      );
      var lbl = svgEl("text", {
        x: gx.toFixed(1),
        y: margin.t - 12,
        "text-anchor": "middle",
        class: "ax",
      });
      lbl.textContent = opts.dayLabel ? opts.dayLabel(d) : "D" + d;
      svg.appendChild(lbl);
    }
    var io = buildInteraction(wrap);
    rows.forEach(function (row, ri) {
      var y = margin.t + ri * rowHeight;
      var lblEl = svgEl("text", {
        x: 0,
        y: y + rowHeight / 2 + 4,
        style:
          "font-size:11.5px;fill:var(--ink-2);font-weight:600;font-family:var(--sans)",
      });
      lblEl.textContent = row.label;
      svg.appendChild(lblEl);
      (row.bars || []).forEach(function (b, bi) {
        var x1 = xScale(toDays(b.start)),
          x2 = xScale(toDays(b.end));
        var color = b.color || PALETTE[bi % PALETTE.length];
        var rect = svgEl("rect", {
          class: "ac-hbar",
          style: "--i:" + (ri + bi),
          x: x1.toFixed(1),
          y: y + 6,
          width: Math.max(x2 - x1, 3).toFixed(1),
          height: rowHeight - 14,
          rx: 6,
          fill: color,
        });
        rect.style.cursor = "pointer";
        svg.appendChild(rect);
        rect.addEventListener("pointerenter", function () {
          var xPct = ((x1 + x2) / 2 / width) * 100;
          var range = opts.dayLabel
            ? opts.dayLabel(toDays(b.start)) +
              " \u2192 " +
              opts.dayLabel(toDays(b.end))
            : b.start + " \u2192 " + b.end;
          io.showTip(
            xPct,
            y,
            seriesTooltipHTML(
              b.label || row.label,
              [{ name: b.label || row.label, color: color, value: range }],
              function (v) {
                return v;
              },
            ),
          );
        });
        rect.addEventListener("pointerleave", function () {
          io.hideTip();
        });
        if (opts.onSelect)
          rect.addEventListener("click", function () {
            opts.onSelect(b, row);
          });
      });
    });
    if (opts.today != null) {
      var tx2 = xScale(toDays(opts.today));
      svg.appendChild(
        svgEl("line", {
          x1: tx2.toFixed(1),
          x2: tx2.toFixed(1),
          y1: margin.t - 8,
          y2: height - margin.b,
          stroke: "var(--accent)",
          "stroke-width": 1.6,
          "stroke-dasharray": "3 3",
        }),
      );
    }
    wrap.appendChild(svg);
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 20. WORD CLOUD — content / SEO / social-listening keyword themes
  // =====================================================================
  function wordCloud(container, opts) {
    var words = opts.words.slice().sort(function (a, b) {
      return b.weight - a.weight;
    });
    var width = opts.width || 420,
      height = opts.height || 260;
    var minSize = opts.minSize || 12,
      maxSize = opts.maxSize || 40;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var ext = extent(words, function (w) {
      return w.weight;
    });
    var sizeScale = scaleLinear(ext, [minSize, maxSize]);
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    var cx = width / 2,
      cy = height / 2;
    var placed = [];
    function box(x, y, w, hgt) {
      return { l: x - w / 2, r: x + w / 2, t: y - hgt / 2, b: y + hgt / 2 };
    }
    function overlaps(a, b) {
      return !(a.r < b.l || a.l > b.r || a.b < b.t || a.t > b.b);
    }
    var io = buildInteraction(wrap);
    words.forEach(function (wd, i) {
      var fs = sizeScale(wd.weight);
      var font = "600 " + fs + "px Switzer, sans-serif";
      var tw = measureText(wd.text, font) + 6,
        th = fs * 1.15;
      var angle = 0,
        radius = 0,
        x = cx,
        y = cy,
        tries = 0;
      while (tries < 900) {
        var b = box(x, y, tw, th);
        var hit = placed.some(function (pb) {
          return overlaps(b, pb);
        });
        if (!hit && b.l > 2 && b.r < width - 2 && b.t > 2 && b.b < height - 2)
          break;
        angle += 0.35;
        radius += 1.6;
        x = cx + Math.cos(angle) * radius;
        y = cy + Math.sin(angle) * radius * 0.72;
        tries++;
      }
      placed.push(box(x, y, tw, th));
      var color =
        (opts.colors && opts.colors[i % opts.colors.length]) ||
        PALETTE[i % PALETTE.length];
      var t = svgEl("text", {
        class: "ac-fade",
        style: "--i:" + (i % 24),
        x: x.toFixed(1),
        y: (y + fs * 0.32).toFixed(1),
        "text-anchor": "middle",
        fill: color,
        "font-family": "Switzer, sans-serif",
        "font-weight": 600,
        "font-size": fs.toFixed(1),
      });
      t.textContent = wd.text;
      t.style.cursor = "pointer";
      svg.appendChild(t);
      t.addEventListener("pointerenter", function () {
        var xPct = (x / width) * 100;
        io.showTip(
          xPct,
          y - fs,
          seriesTooltipHTML(
            null,
            [{ name: wd.text, color: color, value: wd.weight }],
            function (v) {
              return v;
            },
          ),
        );
      });
      t.addEventListener("pointerleave", function () {
        io.hideTip();
      });
      if (opts.onSelect)
        t.addEventListener("click", function () {
          opts.onSelect(wd);
        });
    });
    wrap.appendChild(svg);
    return { svg: svg, card: card };
  }

  // =====================================================================
  // 21. COHORT — retention matrix (green intensity + in-cell %)
  // =====================================================================
  function cohort(container, opts) {
    var cohorts = opts.cohorts;
    var width = opts.width || 640;
    var labelW = opts.labelW || 110;
    var cellH = opts.cellHeight || 30,
      cellGap = 2;
    var maxCols = Math.max.apply(
      null,
      cohorts.map(function (c) {
        return c.values.length;
      }),
    );
    var margin = { l: labelW, t: 22, r: 6, b: 4 };
    var cellW = (width - margin.l - margin.r) / maxCols;
    var height = margin.t + cohorts.length * (cellH + cellGap) + margin.b;
    var built = buildCard(container, opts);
    var card = built.card,
      wrap = built.wrap;
    var fmtV = fmtFn(opts.format || { suffix: "%", decimals: 0 });
    var svg = svgEl("svg", {
      class: "ac-svg",
      viewBox: "0 0 " + width + " " + height,
    });
    for (var c = 0; c < maxCols; c++) {
      var t = svgEl("text", {
        x: margin.l + c * cellW + cellW / 2,
        y: margin.t - 8,
        "text-anchor": "middle",
        class: "ax",
      });
      t.textContent = opts.colLabel ? opts.colLabel(c) : "W" + c;
      svg.appendChild(t);
    }
    var io = buildInteraction(wrap);
    var k = 0;
    cohorts.forEach(function (row, ri) {
      var y = margin.t + ri * (cellH + cellGap);
      var lbl = svgEl("text", {
        x: 0,
        y: y + cellH / 2 + 4,
        style:
          "font-size:11px;fill:var(--ink-2);font-weight:600;font-family:var(--sans)",
      });
      lbl.textContent =
        row.label + (row.size != null ? " \u00b7 n=" + row.size : "");
      svg.appendChild(lbl);
      row.values.forEach(function (v, ci) {
        var x = margin.l + ci * cellW;
        if (v == null) {
          svg.appendChild(
            svgEl("rect", {
              x: (x + 1.5).toFixed(1),
              y: y.toFixed(1),
              width: (cellW - 3).toFixed(1),
              height: cellH - cellGap,
              rx: 4,
              fill: "var(--paper)",
            }),
          );
          return;
        }
        var op = clamp((v / 100) * 0.85 + 0.1, 0.08, 0.95);
        var rect = svgEl("rect", {
          class: "ac-hm",
          style: "--i:" + k++,
          x: (x + 1.5).toFixed(1),
          y: y.toFixed(1),
          width: (cellW - 3).toFixed(1),
          height: cellH - cellGap,
          rx: 4,
          fill: "var(--ok)",
          "fill-opacity": op.toFixed(2),
        });
        rect.style.cursor = "pointer";
        svg.appendChild(rect);
        var vt = svgEl("text", {
          x: x + cellW / 2,
          y: y + cellH / 2 + 4,
          "text-anchor": "middle",
          style:
            "font-size:10.5px;font-weight:600;font-family:var(--sans);fill:" +
            (v > 55 ? "#fff" : "var(--ink-2)"),
        });
        vt.textContent = fmtV(v);
        svg.appendChild(vt);
        rect.addEventListener("pointerenter", function () {
          var xPct = ((x + cellW / 2) / width) * 100;
          var colLbl = opts.colLabel ? opts.colLabel(ci) : "W" + ci;
          io.showTip(
            xPct,
            y - 6,
            seriesTooltipHTML(
              row.label + " \u00b7 " + colLbl,
              [{ name: "retention", color: "var(--ok)", value: fmtV(v) }],
              function (val) {
                return val;
              },
            ),
          );
        });
        rect.addEventListener("pointerleave", function () {
          io.hideTip();
        });
      });
    });
    wrap.appendChild(svg);
    return { svg: svg, card: card };
  }

  // ---------------------------------------------------------------------
  global.AdgentCharts = {
    line: line,
    area: area,
    comparison: comparison,
    bar: bar,
    ranking: ranking,
    donut: donut,
    pie: pie,
    gauge: gauge,
    progressRing: progressRing,
    bullet: bullet,
    sparkline: sparkline,
    kpiTile: kpiTile,
    scatter: scatter,
    bubble: bubble,
    heatmap: heatmap,
    cohort: cohort,
    distribution: distribution,
    funnel: funnel,
    pyramid: pyramid,
    waterfall: waterfall,
    radar: radar,
    gantt: gantt,
    wordCloud: wordCloud,
    geoMap: geoMap,
    tabs: tabs,
    _internal: {
      fmtNum: fmtNum,
      scaleLinear: scaleLinear,
      extent: extent,
      measureText: measureText,
    },
  };
})(window);
