// Footer scene: this app's own engraved scene, on the engine from Atlin's FooterScene.jsx.
// Ink is the page's --scene-ink (the app accent), paper is --scene-paper. Animates only while on screen.
(function () {
  var canvas = document.querySelector('canvas.footer-scene');
  var gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { if (canvas) canvas.style.display = 'none'; return; }
  var FRAG = `#define WATER 0.0

precision highp float;
uniform vec2 res;
uniform float time;
uniform vec3 paper;
uniform vec3 ink;
uniform float dpr;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(float x) { float i = floor(x), f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
}
// Two octaves only: the big shapes a light would actually catch.
float lo(float x) { return noise(x) * 0.5 + noise(x * 2.03) * 0.25; }
float fbm(float x) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(x); x *= 2.03; a *= 0.5; } return v; }

// Ink lines at angle a, spacing s pixels. Returns 1 where ink falls for tone t.
float hatch(vec2 px, float a, float s, float t) {
  float d = abs(fract(dot(px, vec2(cos(a), sin(a))) / s) - 0.5) * 2.0;
  return 1.0 - smoothstep(t - 0.12, t + 0.12, d);
}

// Palms in the warm air, undergrowth below, and a flock flapping across.
float scene(vec2 uv, out float kind) {
  float ar = res.x / res.y, x = uv.x * ar;
  kind = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 b = vec2(mod(time * 0.1 * (0.8 + hash(fi) * 0.5) + hash(fi * 3.0) * ar, ar + 0.6) - 0.3, 0.60 + hash(fi * 7.0) * 0.26);
    vec2 d = vec2(x, uv.y) - b;
    float flap = 0.018 * sin(time * 5.0 + fi * 2.0);
    if (abs(d.x) < 0.055 && abs(d.y - abs(d.x) * 0.45 - flap * abs(d.x) * 18.0) < 0.007) { kind = 2.0; return 0.95; }
  }
  float sp = 1.25, id = floor(x / sp);
  float px = (fract(x / sp) - 0.5) * sp + (hash(id) - 0.5) * 0.4;
  float top = 0.55 + hash(id * 2.0) * 0.18, lean = (hash(id * 5.0) - 0.5) * 0.5;
  float bend = lean * pow(clamp(uv.y / top, 0.0, 1.0), 2.0) * 0.3;
  if (uv.y < top && abs(px - bend) < 0.022) { kind = 2.0; return 0.78 - step(0.5, fract(uv.y * 34.0)) * 0.25; }
  vec2 c = vec2(px - lean * 0.3, uv.y - top);
  for (int k = 0; k < 7; k++) {
    float a = float(k) * 0.9 + 0.2;
    vec2 dir = vec2(cos(a), abs(sin(a)) * 0.45);
    float t = clamp(dot(c, dir) / dot(dir, dir), 0.0, 0.34);
    vec2 p = dir * t; p.y -= t * t * 1.4;
    if (length(c - p) < 0.02 * (1.0 - t * 2.4) + 0.004) { kind = 1.0; return 0.82; }
  }
  float front = 0.15 + fbm(x * 2.6 + 1.0) * 0.12;
  if (uv.y < front) { kind = 1.0; return 0.55; }
  float back = 0.28 + fbm(x * 1.1 + 6.0) * 0.18;
  if (uv.y < back) { kind = 3.0; return 0.28; }
  return 0.0;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / res;
  float water = WATER;
  float kind;
  float tone;
  if (uv.y < water) {
    // Mirror the town into the water, broken up by slow ripples.
    float ripple = sin(uv.y * 220.0 - time * 0.8) * 0.004 + (noise2(vec2(uv.x * 40.0, uv.y * 90.0 + time * 0.2)) - 0.5) * 0.01;
    vec2 m = vec2(uv.x + ripple, water + (water - uv.y) * 0.9);
    float depth = uv.y / water;
    tone = scene(m, kind) * 0.45 * depth + 0.06;
    kind = 4.0;
  } else {
    tone = scene(uv, kind);
  }
  float s = 4.0 * dpr;
  float a = kind == 2.0 ? 0.0 : kind == 4.0 ? 1.5708 : kind == 1.0 ? 0.785 : kind == 3.0 ? -0.6 : 0.35;
  float lines = hatch(px, a, s, tone);
  // A cross hatch in the darkest places, like a real engraving.
  lines = max(lines, hatch(px, a + 1.5708, s, tone - 0.55));
  // Fade the whole plate in from the top so it sits under the footer text.
  float fade = smoothstep(1.0, 0.72, uv.y);
  float grain = (hash2(px) - 0.5) * 0.06;
  float amt = clamp(lines * fade + grain * fade, 0.0, 1.0);
  gl_FragColor = vec4(mix(paper, ink, amt), 1.0);
}`;
  var VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  function rgb(css) {
    var c = document.createElement('canvas').getContext('2d'); c.fillStyle = css; var h = c.fillStyle;
    if (h.charAt(0) === '#') return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; });
    return (h.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(function (n) { return +n / 255; });
  }
  var prog = gl.createProgram();
  [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]].forEach(function (s) {
    var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh); gl.attachShader(prog, sh);
  });
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  function u(n) { return gl.getUniformLocation(prog, n); }
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches, raf = 0, visible = false, start = performance.now();
  function draw() {
    // ponytail: dpr capped at 2; a 3x phone canvas costs memory for no visible gain.
    var dpr = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    var css = getComputedStyle(canvas);
    gl.uniform2f(u('res'), w, h); gl.uniform1f(u('time'), (performance.now() - start) / 1000); gl.uniform1f(u('dpr'), dpr);
    gl.uniform3fv(u('paper'), rgb(css.getPropertyValue('--scene-paper').trim() || '#fdfdfd'));
    gl.uniform3fv(u('ink'), rgb(css.getPropertyValue('--scene-ink').trim() || '#1a1a1a'));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() { draw(); if (visible && !still) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; cancelAnimationFrame(raf); if (visible) loop(); }).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  draw();
})();
