(function () {
  var root = document.documentElement;
  var L = root.lang, up = root.getAttribute("data-up") || "";
  var LANGS = ["en", "hi", "pa"], li = LANGS.indexOf(L);
  var INDEX = window.RM_INDEX || [];

  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem("rm:" + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("rm:" + k, JSON.stringify(v)); } catch (e) {}
    }
  };
  var readIds = store.get("read", []), saved = store.get("saved", []);
  store.set("lang", L);

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function find(id) { return INDEX.filter(function (s) { return s.id === id; })[0]; }
  function link(id) { return up + L + "/s/" + id + "/"; }
  function isRead(id) { return readIds.indexOf(id) >= 0; }
  function doorSym(d) {
    var el = document.querySelector('.door[data-d="' + d + '"] .sym');
    return el ? el.cloneNode(true) : null;
  }

  // Theme
  var MOON = '<svg viewBox="0 0 24 24"><path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>';
  var themeBtn = $("theme");
  function paintTheme() {
    var dark = root.getAttribute("data-theme") === "dark";
    themeBtn.innerHTML = dark ? SUN : MOON;
    var label = themeBtn.getAttribute(dark ? "data-day" : "data-night");
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
  }
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("theme", next);
    paintTheme();
  });
  paintTheme();

  document.querySelectorAll("[data-lang]").forEach(function (a) {
    a.addEventListener("click", function () { store.set("lang", a.getAttribute("data-lang")); });
  });

  // Padhi hui kahaniyon ke nishaan aur ginti
  function paintMarks() {
    document.querySelectorAll("[data-story]").forEach(function (a) {
      var m = a.querySelector(".mark");
      if (m) m.textContent = isRead(a.getAttribute("data-story")) ? "✓" : "";
      if (m) m.classList.toggle("tick", isRead(a.getAttribute("data-story")));
    });
    document.querySelectorAll(".count[data-ids]").forEach(function (c) {
      var ids = c.getAttribute("data-ids").split(",");
      var n = ids.filter(isRead).length;
      var base = c.getAttribute("data-base") || c.textContent;
      c.setAttribute("data-base", base);
      c.textContent = n ? base + " · " + n + " " + c.getAttribute("data-read") : base;
    });
  }
  paintMarks();

  // Home: Aaj ki Kahani aur "jahan chhodi thi"
  if ($("today") && INDEX.length) {
    var now = new Date();
    var day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    var s = INDEX[day % INDEX.length], box = $("today");
    box.setAttribute("data-d", s.d);
    var sym = doorSym(s.d), old = box.querySelector(".sym");
    if (sym && old) box.replaceChild(sym, old);
    $("todayTitle").textContent = s.t[li];
    $("todayDharm").textContent = s.dn[li];
    $("todayLink").href = "s/" + s.id + "/";

    var last = store.get("last", null), ls = last && find(last.id);
    if (ls && !isRead(ls.id)) {
      var cont = $("continue");
      cont.setAttribute("data-d", ls.d);
      var cs = doorSym(ls.d);
      if (cs) $("contSym").appendChild(cs);
      $("contTitle").textContent = ls.t[li];
      $("contLink").href = "s/" + ls.id + "/#p" + last.p;
      cont.hidden = false;
    }
  }

  function rowHtml(s, n) {
    return '<li><a href="' + link(s.id) + '" data-story="' + s.id + '" data-d="' + s.d + '"><span class="n">' + n + "</span><div><h2>" + esc(s.t[li]) +
      "</h2><p>" + esc(s.dn[li]) + " · " + esc(s.c[li]) + '</p></div><span class="mark"></span></a></li>';
  }

  // Search: teeno bhasha mein dhoondta hai
  var q = $("q");
  if (q) {
    var hint = $("hint"), results = $("results"), startHint = hint.textContent;
    var hay = INDEX.map(function (s) {
      return [s.t, s.dn, s.c, s.g, s.l, s.f].concat(s.th).map(function (a) { return a.join(" "); }).join(" ").toLowerCase();
    });
    var runSearch = function () {
      var v = q.value.trim().toLowerCase();
      if (!v) { results.innerHTML = ""; hint.textContent = startHint; hint.hidden = false; return; }
      var hits = INDEX.filter(function (s, i) { return hay[i].indexOf(v) >= 0; });
      results.innerHTML = hits.map(function (s, i) { return rowHtml(s, i + 1); }).join("");
      hint.textContent = hint.getAttribute("data-none");
      hint.hidden = hits.length > 0;
      paintMarks();
    };
    q.addEventListener("input", runSearch);
    q.focus();
  }

  // Meri Kitaab
  if ($("savedList")) {
    var fill = function (ids, listId, emptyId) {
      var items = ids.map(find).filter(Boolean);
      $(listId).innerHTML = items.map(function (s, i) { return rowHtml(s, i + 1); }).join("");
      $(emptyId).hidden = items.length > 0;
    };
    fill(saved.slice().reverse(), "savedList", "savedEmpty");
    fill(readIds.slice().reverse(), "readList", "readEmpty");
    paintMarks();
  }

  // Kahani ka page
  var reader = document.querySelector(".reader");
  if (reader) {
    var id = reader.getAttribute("data-id");
    var done = $("done"), bar = $("progress");

    var saveBtn = $("save");
    var paintSave = function () {
      var on = saved.indexOf(id) >= 0;
      saveBtn.textContent = saveBtn.getAttribute(on ? "data-saved" : "data-save");
      saveBtn.classList.toggle("on", on);
      saveBtn.setAttribute("aria-pressed", String(on));
    };
    saveBtn.addEventListener("click", function () {
      var i = saved.indexOf(id);
      if (i >= 0) saved.splice(i, 1); else saved.push(id);
      store.set("saved", saved);
      paintSave();
    });
    paintSave();

    var scale = store.get("font", 1);
    var setScale = function (v) {
      scale = Math.min(1.4, Math.max(0.85, Math.round(v * 100) / 100));
      root.style.setProperty("--scale", scale);
      store.set("font", scale);
    };
    $("fontUp").addEventListener("click", function () { setScale(scale + 0.1); });
    $("fontDown").addEventListener("click", function () { setScale(scale - 0.1); });

    var copyBtn = $("copy");
    copyBtn.addEventListener("click", function () {
      var url = copyBtn.getAttribute("data-url");
      var ok = function () {
        var txt = copyBtn.textContent;
        copyBtn.textContent = copyBtn.getAttribute("data-done");
        setTimeout(function () { copyBtn.textContent = txt; }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, function () {});
    });

    if (isRead(id)) done.classList.add("on");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        if (!isRead(id)) { readIds.push(id); store.set("read", readIds); }
        done.classList.add("on");
      }).observe(done);

      // Jahan tak padha, woh panel yaad rakho
      var po = new IntersectionObserver(function (es) {
        es.forEach(function (x) {
          if (x.isIntersecting) store.set("last", { id: id, p: Number(x.target.id.slice(1)) });
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      document.querySelectorAll(".panel").forEach(function (p) { po.observe(p); });
    }

    var onScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = max > 0 ? Math.min(100, (window.scrollY / max) * 100) + "%" : "0";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(up + "sw.js").catch(function () {});
    });
  }
})();
