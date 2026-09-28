// Custom GLSL for the FlowVision world. Written in GLSL1-style syntax; three.js compiles it
// as GLSL ES 3.0 on WebGL2, so derivatives (dFdx) are available. Every fragment shader ends
// with <colorspace_fragment> so uniform colours (stored linear) render as their sRGB hex.

const pickTier = /* glsl */ `
float pickTier(vec4 v, float t) {
  return t < 0.5 ? v.x : (t < 1.5 ? v.y : (t < 2.5 ? v.z : v.w));
}
`

// ── Intelligence core: faceted translucent shell with a scanning band ──────────────
export const coreShellVertex = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const coreShellFragment = /* glsl */ `
uniform vec3 uSignal;
uniform vec3 uWarm;
uniform float uIntensity;
uniform float uScan;
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - abs(dot(n, viewDir)), 2.4);
  float facet = 0.4 + 0.6 * max(dot(n, normalize(vec3(0.35, 0.85, 0.4))), 0.0);
  float sweep = fract(uTime * 0.32) * 2.4 - 1.2;
  float band = exp(-pow((vLocal.y - sweep) * 7.0, 2.0)) * uScan;
  vec3 col = vec3(0.03) * facet + uWarm * facet * 0.045;
  col += uSignal * fresnel * (0.22 + 0.78 * uIntensity);
  col += mix(uSignal, uWarm, 0.3) * band * 0.85;
  float alpha = clamp(0.5 + fresnel * 0.45 + band * 0.35, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

export const coreInnerVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const coreInnerFragment = /* glsl */ `
uniform vec3 uSignal;
uniform vec3 uWarm;
uniform float uIntensity;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vec3 v = normalize(cameraPosition - vWorldPos);
  float facing = max(dot(normalize(vNormalW), v), 0.0);
  float glow = pow(facing, 1.6);
  float pulse = 0.82 + 0.18 * sin(uTime * 2.1);
  vec3 col = mix(uSignal, uWarm, glow * 0.55) * glow * (0.3 + 0.8 * uIntensity) * pulse;
  gl_FragColor = vec4(col, glow);
  #include <colorspace_fragment>
}
`

// ── Routes: flat ribbons on the ground with information pulses flowing along them ──
export const routeVertex = /* glsl */ `
attribute float aProgress;
attribute float aTier;
attribute float aRoute;
attribute float aLength;
attribute float aSide;
varying float vProgress;
varying float vTier;
varying float vRoute;
varying float vLength;
varying float vSide;
varying vec3 vWorld;
void main() {
  vProgress = aProgress;
  vTier = aTier;
  vRoute = aRoute;
  vLength = aLength;
  vSide = aSide;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const routeFragment = /* glsl */ `
uniform vec4 uTierVis;
uniform vec4 uTierActivity;
uniform float uFocusRoute;
uniform float uFocus;
uniform float uPattern;
uniform float uTime;
uniform vec3 uMuted;
uniform vec3 uSignal;
uniform vec3 uWarm;
varying float vProgress;
varying float vTier;
varying float vRoute;
varying float vLength;
varying float vSide;
varying vec3 vWorld;
${pickTier}
void main() {
  float vis = pickTier(uTierVis, vTier);
  if (vis < 0.002) discard;
  float act = pickTier(uTierActivity, vTier);
  act = max(act, step(abs(vRoute - uFocusRoute), 0.5) * uFocus);

  float edge = 1.0 - smoothstep(0.35, 1.0, abs(vSide));
  float dash = fract(vProgress * vLength * 0.85 - uTime * (0.5 + vTier * 0.08));
  float pulse = smoothstep(0.78, 0.97, dash) * (1.0 - smoothstep(0.97, 1.0, dash));
  vec3 hot = mix(uSignal, uWarm, 0.25);
  vec3 col = mix(uMuted, uSignal, act);
  if (vTier > 2.5) col = mix(uMuted, hot, max(act * 0.8, uPattern * 0.6));
  col += hot * pulse * act * 0.6;

  float ends = smoothstep(0.0, 0.03, vProgress) * (1.0 - smoothstep(0.97, 1.0, vProgress));
  float fade = 1.0 - smoothstep(14.0, 22.0, length(vWorld.xz));
  float alpha = (mix(0.07, 0.3, act) + pulse * act * 0.7) * edge * vis * mix(0.5, 1.0, ends) * fade;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

// ── Network nodes: flat markers with an optional gray/orange/green status ring ─────
export const nodeVertex = /* glsl */ `
attribute float aTier;
attribute float aPhase;
attribute float aKind;
varying vec2 vUv;
varying float vTier;
varying float vPhase;
varying float vKind;
void main() {
  vUv = uv;
  vTier = aTier;
  vPhase = aPhase;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`

export const nodeFragment = /* glsl */ `
uniform vec4 uTierVis;
uniform float uStatus;
uniform float uActivity;
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uMuted;
uniform vec3 uSignal;
uniform vec3 uSuccess;
varying vec2 vUv;
varying float vTier;
varying float vPhase;
varying float vKind;
${pickTier}
void main() {
  float vis = pickTier(uTierVis, vTier);
  if (vis < 0.002) discard;
  float r = length(vUv - 0.5) * 2.0;
  float dotCore = 1.0 - smoothstep(0.16, 0.24, r);
  float ring = 1.0 - smoothstep(0.0, 0.07, abs(r - 0.6));
  float wave = fract(uTime * 0.35 + vPhase);
  float pulse = (1.0 - smoothstep(0.0, 0.06, abs(r - wave))) * (1.0 - wave) * uActivity;

  float s = mod(floor(uTime * 0.28 + vPhase * 9.0), 3.0);
  vec3 statusCol = s < 0.5 ? uMuted : (s < 1.5 ? uSignal : uSuccess);
  vec3 base = vKind < 1.5 ? mix(uInk, uSignal, 0.35) : uInk;
  vec3 col = mix(base, statusCol, uStatus);
  float statusRing = (1.0 - smoothstep(0.0, 0.1, abs(r - 0.82))) * uStatus;

  float alpha = (dotCore * 0.95 + ring * 0.45 + pulse * 0.55 + statusRing * 0.8) * vis;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

// ── Data particles (also used for the understanding streams) ────────────────────────
export const particleVertex = /* glsl */ `
attribute float aAlpha;
attribute float aHeat;
attribute float aSize;
uniform float uPixelRatio;
uniform float uScale;
varying float vAlpha;
varying float vHeat;
void main() {
  vAlpha = aAlpha;
  vHeat = aHeat;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uPixelRatio * uScale / max(-mv.z, 0.1), 1.3 * uPixelRatio, 12.0 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}
`

export const particleFragment = /* glsl */ `
uniform vec3 uSignal;
uniform vec3 uWarm;
varying float vAlpha;
varying float vHeat;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.1, 0.5, d);
  float alpha = a * a * vAlpha;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(mix(uWarm, uSignal, vHeat), alpha);
  #include <colorspace_fragment>
}
`

// ── Ground: faint dot grid; concentric rings + spokes emerge for the pattern beat ─────
export const groundVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const groundFragment = /* glsl */ `
uniform float uGround;
uniform float uPattern;
uniform float uTime;
uniform vec3 uMuted;
uniform vec3 uSignal;
uniform vec3 uWarm;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  float fade = 1.0 - smoothstep(6.0, 24.0, r);

  vec2 g = fract(p / 0.7) - 0.5;
  float gd = length(g);
  float w = fwidth(gd);
  float dots = (1.0 - smoothstep(0.035, 0.035 + max(w, 0.02), gd)) * (1.0 - smoothstep(0.06, 0.18, w));

  float rc = r / 1.4 - uTime * 0.04;
  float rw = fwidth(rc);
  float rings = 1.0 - smoothstep(0.0, max(rw * 1.2, 0.02), abs(fract(rc + 0.5) - 0.5));
  float ac = atan(p.y, p.x) / (6.2831853 / 24.0);
  float aw = fwidth(ac);
  float spokes = (1.0 - smoothstep(0.0, max(aw * 1.2, 0.02), abs(fract(ac + 0.5) - 0.5))) * smoothstep(1.5, 4.0, r);
  float pattern = (rings * 0.5 + spokes * 0.22) * uPattern;

  vec3 col = mix(uMuted, mix(uSignal, uWarm, 0.4), clamp(pattern * 2.0, 0.0, 1.0));
  float alpha = (dots * 0.1 * uGround + pattern * 0.35) * fade;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

// ── Documents: paper from a procedural atlas, with curl and a reading scanline ────────
export const documentVertex = /* glsl */ `
attribute float aVariant;
attribute float aOpacity;
uniform float uCurl;
varying vec2 vUv;
varying vec2 vLocalUv;
varying float vOpacity;
varying float vShade;
void main() {
  vLocalUv = uv;
  float col = mod(aVariant, 2.0);
  float row = floor(aVariant / 2.0 + 0.01);
  vUv = vec2((uv.x + col) * 0.5, (uv.y + (1.0 - row)) * 0.5);
  vec3 p = position;
  p.z += uCurl * p.x * p.x * 0.9 - uCurl * 0.05 * sin(uv.y * 3.14159);
  mat4 m = modelMatrix * instanceMatrix;
  vec3 n = normalize(mat3(m) * vec3(0.0, 0.0, 1.0));
  vShade = 0.78 + 0.22 * abs(dot(n, normalize(vec3(0.3, 0.9, 0.35))));
  vOpacity = aOpacity;
  gl_Position = projectionMatrix * viewMatrix * m * vec4(p, 1.0);
}
`

export const documentFragment = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uPaperBack;
uniform vec3 uSignal;
uniform float uScan;
uniform float uScanY;
varying vec2 vUv;
varying vec2 vLocalUv;
varying float vOpacity;
varying float vShade;
void main() {
  if (vOpacity < 0.01) discard;
  vec3 col = gl_FrontFacing ? texture2D(uAtlas, vUv).rgb : uPaperBack;
  col *= vShade;
  float line = (1.0 - smoothstep(0.0, 0.012, abs(vLocalUv.y - uScanY))) * uScan;
  float read = step(uScanY, vLocalUv.y) * uScan * 0.14;
  col = mix(col, col * vec3(1.0, 0.92, 0.86), read);
  col = mix(col, uSignal, line * 0.9);
  gl_FragColor = vec4(col, vOpacity);
  #include <colorspace_fragment>
}
`

// ── Insight columns: activity rising out of each office ───────────────────────────────
export const columnVertex = /* glsl */ `
varying float vH;
void main() {
  vH = position.y;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`

export const columnFragment = /* glsl */ `
uniform float uInsight;
uniform vec3 uSignal;
uniform vec3 uWarm;
varying float vH;
void main() {
  float body = mix(0.04, 0.5, vH) * uInsight;
  float cap = smoothstep(0.94, 1.0, vH) * 0.6 * uInsight;
  float alpha = body + cap;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(mix(uSignal, uWarm, vH * 0.35 + cap), alpha);
  #include <colorspace_fragment>
}
`
