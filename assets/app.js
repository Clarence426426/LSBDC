/* ============================================================
   MSc BDC — shared interactions
   - scroll reveal
   - mobile nav
   - scientist head / eye pointer tracking (index only)
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    var burger = document.querySelector('.burger');
    var links = document.querySelector('.nav-links');
    if (!burger || !links) return;

    function setOpen(open) {
      links.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!links.classList.contains('open'));
    });

    /* closest('a'), not tagName — a tap on the bold title or the code badge
       inside an .apply-menu link is a tap on nested text, not the <a> itself */
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !links.contains(e.target) && !burger.contains(e.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && links.classList.contains('open')) setOpen(false);
    });
  }

  /* ---------- scientist pointer tracking ---------- */
  function initScientist() {
    var svg = document.getElementById('scientist');
    if (!svg) return;

    var head = document.getElementById('sci-head');
    var pupils = document.getElementById('sci-pupils');
    var body = document.getElementById('sci-body');
    var lidL = document.getElementById('lid-l');
    var lidR = document.getElementById('lid-r');
    if (!head || !pupils) return;

    /* target (raw pointer) and current (eased) values, range -1..1 */
    var tx = 0, ty = 0, cx = 0, cy = 0;

    function setTargetFromPoint(px, py) {
      var r = svg.getBoundingClientRect();
      /* anchor roughly at the head's screen position */
      var ax = r.left + r.width * 0.5;
      var ay = r.top + r.height * 0.19;
      var nx = (px - ax) / (Math.max(window.innerWidth, 600) * 0.5);
      var ny = (py - ay) / (Math.max(window.innerHeight, 500) * 0.5);
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));
    }

    window.addEventListener('mousemove', function (e) {
      setTargetFromPoint(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) setTargetFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    /* recentre when the pointer leaves the window */
    document.addEventListener('mouseleave', function () { tx = 0; ty = 0; });

    if (reduced) return;

    function frame() {
      cx += (tx - cx) * 0.085;
      cy += (ty - cy) * 0.085;

      /* head: gentle rotation + counter-shift, pivots near the neck */
      var rot = cx * 7;
      var hx = cx * 9;
      var hy = cy * 6;
      head.setAttribute('transform',
        'translate(' + hx.toFixed(2) + ',' + hy.toFixed(2) + ') ' +
        'rotate(' + rot.toFixed(2) + ' 200 210)');

      /* eyes: pupils travel a little further than the head */
      var ex = cx * 5.2;
      var ey = cy * 3.4;
      pupils.setAttribute('transform', 'translate(' + ex.toFixed(2) + ',' + ey.toFixed(2) + ')');

      /* body: subtle counter-parallax so the pose reads as a turn, not a slide */
      if (body) body.setAttribute('transform', 'translate(' + (cx * 2.6).toFixed(2) + ',0)');

      requestAnimationFrame(frame);
    }
    /* run once immediately so the rig has a valid transform before the first tick */
    frame();

    /* ---------- blinking ---------- */
    if (lidL && lidR) {
      var blink = function () {
        lidL.style.transform = 'scaleY(1)';
        lidR.style.transform = 'scaleY(1)';
        setTimeout(function () {
          lidL.style.transform = 'scaleY(0)';
          lidR.style.transform = 'scaleY(0)';
        }, 115);
        setTimeout(blink, 2600 + Math.random() * 3600);
      };
      setTimeout(blink, 1800);
    }
  }

  /* ---------- Apply chooser ----------
     17004 (Hong Kong, and the NTU dual award stream) and 17005 (Zhongshan)
     are separate applications, so Apply must ask which one. */
  function initApply() {
    var wraps = document.querySelectorAll('.apply-wrap');
    if (!wraps.length) return;

    function closeAll(except) {
      wraps.forEach(function (w) {
        if (w === except) return;
        w.classList.remove('open');
        var b = w.querySelector('.apply-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    wraps.forEach(function (wrap) {
      var btn = wrap.querySelector('.apply-btn');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAll(wrap);
        var open = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function (e) {
      var inside = false;
      wraps.forEach(function (w) { if (w.contains(e.target)) inside = true; });
      if (!inside) closeAll(null);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') closeAll(null);
    });
  }

  /* ---------- photo hero: perspective parallax ----------
     The hero is a photograph, so the head cannot be rotated independently
     without cutting it off the neck. Instead the whole scene tilts on a
     perspective stage, which reads as her turning toward the pointer. */
  function initPhoto() {
    /* any element with .par-photo rides the same cursor parallax —
       the home page hero and the programme hero photos */
    var layers = document.querySelectorAll('.par-photo');
    if (!layers.length) return;

    var tx = 0, ty = 0, cx = 0, cy = 0;

    window.addEventListener('mousemove', function (e) {
      tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight - 0.5) * 2));
    }, { passive: true });

    document.addEventListener('mouseleave', function () { tx = 0; ty = 0; });

    function apply() {
      /* scale keeps the rotated edges from exposing background */
      var t = 'scale(1.04) ' +
        'rotateY(' + (cx * 2.8).toFixed(3) + 'deg) ' +
        'rotateX(' + (-cy * 1.6).toFixed(3) + 'deg) ' +
        'translate3d(' + (cx * -9).toFixed(2) + 'px,' + (cy * -6).toFixed(2) + 'px,0)';
      for (var i = 0; i < layers.length; i++) layers[i].style.transform = t;
    }

    if (reduced) { apply(); return; }

    (function frame() {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      apply();
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- parallax on lab decor ---------- */
  function initDecor() {
    if (reduced) return;
    var layers = document.querySelectorAll('[data-par]');
    if (!layers.length) return;
    var px = 0, py = 0, ax = 0, ay = 0;
    window.addEventListener('mousemove', function (e) {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    (function loop() {
      ax += (px - ax) * 0.05;
      ay += (py - ay) * 0.05;
      layers.forEach(function (l) {
        var d = parseFloat(l.getAttribute('data-par')) || 10;
        l.style.transform = 'translate3d(' + (ax * d).toFixed(2) + 'px,' + (ay * d).toFixed(2) + 'px,0)';
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- count-up numbers ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var end = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduced) { el.textContent = end + suffix; return; }
        var t0 = performance.now(), dur = 1100;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  function boot() {
    initReveal(); initNav(); initApply(); initScientist(); initPhoto(); initDecor(); initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
