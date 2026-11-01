// Landing behaviour: fade-up on scroll, and the drifting wall of diff cards behind the issue. Nothing here is needed to read the page.
(function () {
  document.documentElement.classList.add('js');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    // the wall: columns of the small diffs tripwire actually files
    var diffs = [['customer_id', 'customer'], ['legacy_id', 'external_id'], ['DELETE /v1/charges', 3], ['webhook_secret?', 'webhook_secret'],
      ['GET /v2/messages', 1], ['amount_cents', 'amount'], ['Bearer {token}', 'ApiKey {token}'], ['POST /v1/refunds', 2],
      ['currency?', 'currency'], ['rate_limit_remaining', 'x-ratelimit-remaining'], ['GET /users/{id}', 4], ['card.brand', 'card.network']];
    function tile(d) {
      return typeof d[1] === 'number'
        ? '<div class="wtile">' + d[0] + '<br>&minus; gone, ' + d[1] + ' file' + (d[1] === 1 ? '' : 's') + '</div>'
        : '<div class="wtile">&minus; ' + d[0] + '<br>+ ' + d[1] + '</div>';
    }
    document.querySelectorAll('.wall').forEach(function (host) {
      var cols = Math.max(3, Math.min(8, Math.round(host.offsetWidth / 170)));
      for (var c = 0; c < cols; c++) {
        var items = '';
        for (var i = 0; i < 7; i++) items += tile(diffs[(c * 5 + i) % diffs.length]);
        var col = document.createElement('div');
        col.className = 'wall-col' + (c % 2 ? ' down' : '');
        col.style.setProperty('--dur', (60 + c * 9) + 's');
        col.innerHTML = items + items; // doubled so the loop is seamless
        host.appendChild(col);
      }
    });

    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (still || !('IntersectionObserver' in window)) { items.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (e) { io.observe(e); });
  });
})();

// Hero wall: real exercises from content/courses, each card picks, gets marked right, and moves on. Decoration only.
(function () {
  var wall = document.getElementById('lwall'); if (!wall) return;
  var Q = [["Spanish","Hello","Hola",["Por favor","Hola","Gracias","Adiós"]],["French","Thank you","Merci",["Bonne nuit","Merci","Bonjour","De rien"]],["Japanese","Hello","Konnichiwa",["Sayounara","Sumimasen","Konnichiwa","Arigatou"]],["Chemistry","pH of pure water?","7",["14","1","0","7"]],["Italian","Thank you","Grazie",["Buono","Ciao","Grazie","Prego"]],["Korean","Hello","Annyeonghaseyo",["Annyeonghaseyo","Kamsahamnida","Annyeong","Mianhamnida"]],["German","Hello","Hallo",["Danke","Bitte","Hallo","Tschuss"]],["Astronomy","Largest planet in the solar system?","Jupiter",["Uranus","Saturn","Jupiter","Neptune"]],["Portuguese","Thank you","Obrigado",["Tchau","Obrigado","Desculpa","Ola"]],["Spanish","Good morning","Buenos días",["Buenos días","Buenas noches","Hasta luego","De nada"]],["Chinese","Thank you","Xiexie",["Ni hao","Xiexie","Zaijian","Buke qi"]],["French","Hello","Bonjour",["Au revoir","Bonsoir","Merci","Bonjour"]],["Astronomy","Closest star to Earth?","The Sun",["Proxima Centauri","The Sun","Sirius","Alpha Centauri"]],["Chemistry","Noble gas group?","Group 18",["Group 7","Group 1","Group 14","Group 18"]],["German","Thank you","Danke",["Hallo","Bitte","Ja","Danke"]],["Japanese","Thank you","Arigatou",["Hai","Arigatou","Konnichiwa","Gomen"]]];
  var mq = function (q) { return matchMedia(q).matches; };
  var n = mq('(max-width: 560px)') ? 3 : mq('(max-width: 760px)') ? 6 : mq('(max-width: 1100px)') ? 9 : 12;
  var still = mq('(prefers-reduced-motion: reduce)');
  for (var i = 0; i < n; i++) (function (i) {
    var el = document.createElement('div'); el.className = 'lc';
    el.innerHTML = '<div class="lc-top"><span></span><div class="lc-bar"><i></i></div></div><p class="lc-q"></p><div class="lc-ch"></div>';
    wall.appendChild(el);
    var name = el.querySelector('.lc-top span'), bar = el.querySelector('.lc-bar i'), q = el.querySelector('.lc-q'), ch = el.querySelector('.lc-ch');
    var k = i, step = (i * 37) % 5;
    function show() {
      var x = Q[k % Q.length]; k += n; step = (step % 5) + 1;
      name.textContent = x[0]; bar.style.width = ((step - 1) * 20) + '%';
      q.innerHTML = ''; var sm = document.createElement('small'); sm.textContent = x[1].length > 14 ? 'Pick one' : 'Translate'; q.append(sm, x[1]);
      ch.innerHTML = ''; var right;
      x[3].forEach(function (c) { var s = document.createElement('span'); s.textContent = c; ch.appendChild(s); if (c === x[2]) right = s; });
      if (still) { right.className = 'ok'; return; }
      setTimeout(function () { right.className = 'pick'; }, 1600 + Math.random() * 1400);
      setTimeout(function () { right.className = 'ok'; bar.style.width = (step * 20) + '%'; }, 3300 + Math.random() * 600);
      setTimeout(show, 5600 + Math.random() * 1500);
    }
    setTimeout(show, i * 450);
  })(i);
})();

// Hero parallax: the wall drifts at 0.45, the copy lifts at 0.2 and fades. Off under reduced motion.
(function () {
  var bg = document.querySelector('.hero-bg'), copy = document.querySelector('.hero-copy');
  if (!bg || !copy || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var t = 0;
  addEventListener('scroll', function () {
    if (t) return;
    t = requestAnimationFrame(function () {
      t = 0; var y = scrollY, h = innerHeight; if (y > h * 1.2) return;
      bg.style.setProperty('--py', (y * .45) + 'px');
      copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .7));
    });
  }, { passive: true });
})();
