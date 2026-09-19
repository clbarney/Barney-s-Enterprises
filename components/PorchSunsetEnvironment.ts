import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GraphicQualityPreset } from '../types/monopoly';

// =============================================================
// PROCEDURAL HIGH-FIDELITY TEXTURE GENERATORS
// =============================================================

/**
 * 2048x1024 High-Dynamic Sunset Sky Canvas Texture with Alpenglow & Stratus Clouds
 */
export function createSunsetSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Master Atmospheric Sky Gradient (Zenith to Horizon)
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.00, '#0f051d'); // Deep twilight indigo at zenith
  grad.addColorStop(0.18, '#240b36'); // Royal evening purple
  grad.addColorStop(0.36, '#4e1644'); // Rich twilight plum/magenta
  grad.addColorStop(0.50, '#862248'); // Dusk crimson coral
  grad.addColorStop(0.64, '#c74037'); // Warm sunset vermilion
  grad.addColorStop(0.76, '#e86826'); // Radiant golden orange
  grad.addColorStop(0.87, '#f79a2b'); // Warm glowing amber
  grad.addColorStop(0.95, '#fde047'); // Brilliant sunset yellow horizon
  grad.addColorStop(1.00, '#fffbeb'); // Sunlit golden haze at ground line

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // 2. Horizon Sun Glow Radial Corona
  const sunX = 740;
  const sunY = 850;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 720);
  sunGlow.addColorStop(0.00, 'rgba(255, 252, 235, 0.98)');
  sunGlow.addColorStop(0.12, 'rgba(255, 215, 120, 0.85)');
  sunGlow.addColorStop(0.30, 'rgba(250, 120, 30, 0.55)');
  sunGlow.addColorStop(0.55, 'rgba(215, 60, 85, 0.30)');
  sunGlow.addColorStop(0.80, 'rgba(110, 25, 65, 0.12)');
  sunGlow.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, 2048, 1024);

  // 3. Multi-Layered Wispy Sunset Clouds with Golden Undersides
  const drawCloudLayer = (
    baseY: number,
    colorTop: string,
    colorBottom: string,
    thickness: number,
    frequency: number,
    amplitude: number
  ) => {
    ctx.save();
    for (let x = -150; x < 2200; x += 160) {
      const cy = baseY + Math.sin(x * 0.006 * frequency) * amplitude + Math.cos(x * 0.015) * (amplitude * 0.6);
      const cGrad = ctx.createLinearGradient(0, cy - thickness, 0, cy + thickness);
      cGrad.addColorStop(0.0, 'transparent');
      cGrad.addColorStop(0.25, colorTop);
      cGrad.addColorStop(0.75, colorBottom);
      cGrad.addColorStop(1.0, 'transparent');

      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.ellipse(x + 70, cy, 210, thickness, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // High altitude cirrus (plum & rose)
  drawCloudLayer(420, 'rgba(125, 40, 80, 0.32)', 'rgba(240, 110, 85, 0.45)', 26, 1.0, 22);
  drawCloudLayer(520, 'rgba(165, 50, 70, 0.38)', 'rgba(250, 135, 55, 0.58)', 22, 1.3, 18);
  // Mid and low altitude stratus (golden orange & alpenglow)
  drawCloudLayer(640, 'rgba(210, 75, 45, 0.44)', 'rgba(254, 205, 100, 0.72)', 20, 0.85, 16);
  drawCloudLayer(750, 'rgba(235, 105, 35, 0.55)', 'rgba(255, 235, 170, 0.85)', 16, 1.2, 12);
  drawCloudLayer(820, 'rgba(245, 130, 40, 0.45)', 'rgba(255, 245, 200, 0.70)', 12, 1.6, 8);

  // 4. Subtle Twilight Stars in the Deep Indigo Zenith
  ctx.save();
  for (let s = 0; s < 85; s++) {
    const sx = (s * 197 + 83) % 2048;
    const sy = (s * 53 + 19) % 220 + 10;
    const size = 0.8 + ((s * 13) % 8) * 0.18;
    const alpha = 0.35 + ((s * 37) % 10) * 0.055;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Distant Mountain Foothills & Treeline Silhouette along Horizon
  ctx.save();
  ctx.fillStyle = 'rgba(24, 8, 18, 0.52)';
  ctx.beginPath();
  ctx.moveTo(0, 955);
  for (let x = 0; x <= 2048; x += 16) {
    const ry = 948 + Math.sin(x * 0.014) * 12 + Math.cos(x * 0.038) * 7;
    ctx.lineTo(x, ry);
  }
  ctx.lineTo(2048, 1024);
  ctx.lineTo(0, 1024);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * High-Dynamic Sun Corona Texture
 */
export function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const rad = ctx.createRadialGradient(256, 256, 8, 256, 256, 252);
  rad.addColorStop(0.00, 'rgba(255, 255, 245, 1.0)');
  rad.addColorStop(0.12, 'rgba(255, 238, 165, 0.88)');
  rad.addColorStop(0.28, 'rgba(253, 150, 55, 0.60)');
  rad.addColorStop(0.50, 'rgba(240, 75, 145, 0.28)');
  rad.addColorStop(0.75, 'rgba(195, 25, 95, 0.09)');
  rad.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Rich Cedar/Teak Porch Decking Texture with wood grain & brass rivets
 */
export function createPorchWoodPlankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm rich cedar base tone
  ctx.fillStyle = '#68361E';
  ctx.fillRect(0, 0, 1024, 1024);

  // 8 horizontal architectural planks (128px each)
  const plankH = 128;
  const tones = ['#65341C', '#703B20', '#5B2E18', '#764024', '#62321A', '#6D381F', '#5D3019', '#733D22'];

  for (let i = 0; i < 8; i++) {
    const y = i * plankH;

    // Organic tone variation
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, y + 2, 1024, plankH - 4);

    // Fine organic wood grain lines
    ctx.fillStyle = 'rgba(35, 12, 5, 0.22)';
    for (let g = 0; g < 16; g++) {
      const gy = y + 8 + g * 7 + Math.sin(g * 1.8) * 3;
      ctx.fillRect(0, gy, 1024, 1.2 + (g % 2) * 0.6);
    }

    // Warm golden wood sheen highlight
    ctx.fillStyle = 'rgba(255, 205, 150, 0.09)';
    for (let g = 0; g < 10; g++) {
      const gy = y + 5 + g * 12;
      ctx.fillRect(0, gy, 1024, 1.0);
    }

    // Shadow groove between planks
    ctx.fillStyle = '#200D05';
    ctx.fillRect(0, y + plankH - 3, 1024, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, y, 1024, 2);

    // Fastener rivets at regular intervals
    for (let x = 64; x < 1024; x += 256) {
      [y + 18, y + plankH - 22].forEach((sy) => {
        ctx.fillStyle = '#180B05';
        ctx.beginPath();
        ctx.arc(x, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D4A055';
        ctx.beginPath();
        ctx.arc(x - 0.5, sy - 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Deep Polished Dark Walnut / Mahogany Table Wood Texture
 */
export function createPolishedTableWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2C160D';
  ctx.fillRect(0, 0, 1024, 1024);

  // Walnut grain flow and luster sheen
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0.0, 'rgba(78, 40, 24, 0.45)');
  grad.addColorStop(0.5, 'rgba(38, 16, 9, 0.20)');
  grad.addColorStop(1.0, 'rgba(88, 46, 28, 0.50)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.fillStyle = 'rgba(255, 185, 125, 0.06)';
  for (let y = 0; y < 1024; y += 10) {
    ctx.fillRect(0, y, 1024, 2 + (y % 3));
  }

  // Polished perimeter bevel frame
  ctx.strokeStyle = '#502816';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 1006, 1006);

  ctx.strokeStyle = '#7B4225';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 980, 980);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Lush Manicured Yard Grass & Lawn Texture with subtle stripe pattern
 */
export function createLawnGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Evening warm dusky green grass base
  ctx.fillStyle = '#1D3018';
  ctx.fillRect(0, 0, 1024, 1024);

  // Striped mowing pattern
  const stripeW = 64;
  for (let s = 0; s < 1024; s += stripeW * 2) {
    ctx.fillStyle = 'rgba(38, 62, 32, 0.35)';
    ctx.fillRect(s, 0, stripeW, 1024);
  }

  // Organic grass blade noise & tufts
  ctx.fillStyle = 'rgba(48, 80, 40, 0.18)';
  for (let i = 0; i < 6000; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    ctx.fillRect(gx, gy, 2.5, 5 + Math.random() * 4);
  }

  // Warm sunset golden highlights on tips
  ctx.fillStyle = 'rgba(180, 150, 70, 0.12)';
  for (let i = 0; i < 2500; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    ctx.fillRect(gx, gy, 2, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Natural Cobblestone / Flagstone Garden Path Texture
 */
export function createGardenPathTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Soil/sand base
  ctx.fillStyle = '#2A1B14';
  ctx.fillRect(0, 0, 512, 512);

  // Irregular flagstone pavers
  const stoneCols = ['#524036', '#48372D', '#5D493E', '#423229', '#634E43'];
  const rows = 8;
  const cols = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cellW + 4;
      const py = r * cellH + 4;
      const w = cellW - 8;
      const h = cellH - 8;

      ctx.fillStyle = stoneCols[(r * 3 + c) % stoneCols.length];
      ctx.beginPath();
      ctx.roundRect(px, py, w, h, 8);
      ctx.fill();

      // Stone texture highlight
      ctx.fillStyle = 'rgba(255, 230, 200, 0.08)';
      ctx.fillRect(px + 4, py + 4, w - 8, h / 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 6);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Sunset Lake Water Surface Normal / Ripple Texture with Glints
 */
export function createWaterRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep sunset reflection tone
  ctx.fillStyle = '#481930';
  ctx.fillRect(0, 0, 512, 512);

  // Gentle horizontal wave ripples
  for (let y = 0; y < 512; y += 6) {
    const wave = Math.sin(y * 0.12) * 0.5 + 0.5;
    const alpha = 0.12 + wave * 0.18;
    ctx.fillStyle = `rgba(255, 185, 120, ${alpha})`;
    ctx.fillRect(0, y, 512, 2.5);

    ctx.fillStyle = `rgba(24, 6, 16, ${alpha * 1.3})`;
    ctx.fillRect(0, y + 2.5, 512, 2.5);
  }

  // Golden sunset specular glints on wave crests
  for (let i = 0; i < 160; i++) {
    const gx = ((i * 137) % 512);
    const gy = ((i * 73) % 512);
    ctx.fillStyle = 'rgba(255, 240, 190, 0.42)';
    ctx.fillRect(gx, gy, 4, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Volumetric Soft Candle Lantern Glow Halo Texture
 */
export function createCandleGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const rad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  rad.addColorStop(0.00, 'rgba(255, 245, 210, 0.95)');
  rad.addColorStop(0.18, 'rgba(255, 185, 80, 0.65)');
  rad.addColorStop(0.45, 'rgba(255, 110, 30, 0.28)');
  rad.addColorStop(0.75, 'rgba(200, 50, 40, 0.08)');
  rad.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Soft Billboard Steam / Smoke Particle Texture for Hot Coffee Mug
 */
export function createSteamParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const rad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  rad.addColorStop(0.00, 'rgba(255, 255, 255, 0.35)');
  rad.addColorStop(0.35, 'rgba(255, 250, 245, 0.22)');
  rad.addColorStop(0.70, 'rgba(250, 240, 235, 0.08)');
  rad.addColorStop(1.00, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================
// CONTROLLER & OPTIONS INTERFACES
// =============================================================

export interface PorchSunsetSceneController {
  environmentGroup: THREE.Group;
  update: (now: number, dt: number) => void;
  dispose: () => void;
  setAmbientAnimations?: (enabled: boolean) => void;
  setLowEndMode?: (lowEnd: boolean) => void;
  setIdlePowerMode?: (idle: boolean) => void;
  setQualityLevel?: (quality: GraphicQualityPreset) => void;
}

export interface PorchSunsetEnvironmentOptions {
  lowEnd?: boolean;
  ambientAnimations?: boolean;
  quality?: GraphicQualityPreset;
}

// =============================================================
// PORCH SUNSET ENVIRONMENT BUILDER
// =============================================================

export function buildPorchSunsetEnvironment(
  scene: THREE.Scene,
  options?: PorchSunsetEnvironmentOptions
): PorchSunsetSceneController {
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  let isLowEndMode = options?.lowEnd ?? false;
  let ambientAnimationsEnabled = options?.ambientAnimations ?? true;
  const rawQuality = options?.quality || (isLowEndMode ? 'LOW' : 'HIGH');
  let currentQuality = rawQuality === 'AUTO' || rawQuality === 'CUSTOM' ? (isLowEndMode ? 'LOW' : 'HIGH') : rawQuality;
  let isIdlePowerMode = false;

  const isHighOrUltra = currentQuality === 'HIGH' || currentQuality === 'ULTRA';
  const isUltra = currentQuality === 'ULTRA';

  // Dynamic animation trackers
  const animatedBulbMeshes: THREE.Mesh[] = [];
  const fairyPointLights: THREE.PointLight[] = [];
  const fireflySprites: THREE.Sprite[] = [];
  const fireflyData: { x: number; y: number; z: number; speed: number; phase: number; radius: number }[] = [];
  const swayingObjects: { mesh: THREE.Object3D; baseRot: THREE.Euler; speed: number; amp: number; phase: number }[] = [];
  let candleFlameMesh: THREE.Mesh | null = null;
  let candleLight: THREE.PointLight | null = null;
  let candleHaloSprite: THREE.Sprite | null = null;
  let candleHaloTex: THREE.CanvasTexture | null = null;
  const steamParticles: { mesh: THREE.Sprite; basePos: THREE.Vector3; vy: number; vx: number; vz: number; life: number; maxLife: number }[] = [];
  let steamTex: THREE.CanvasTexture | null = null;
  let steamMat: THREE.SpriteMaterial | null = null;
  let waterMesh: THREE.Mesh | null = null;
  let waterTexture: THREE.CanvasTexture | null = null;

  // =============================================================
  // 1. SKY DOME & RADIANT SUN WITH ATMOSPHERIC CORONA
  // =============================================================
  const skySegments = isLowEndMode ? 24 : 48;
  const skyGeo = new THREE.SphereGeometry(95, skySegments, skySegments / 2);
  const skyTex = createSunsetSkyTexture();
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.rotation.y = -Math.PI / 1.75;
  rootGroup.add(skyMesh);

  // Sunset Sun Sphere placed deeply behind mountains (dist ~88m)
  const sunPos = new THREE.Vector3(-48.0, 10.5, -73.0);
  const sunGeo = new THREE.SphereGeometry(5.2, isLowEndMode ? 16 : 32, isLowEndMode ? 16 : 32);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xFFFDF2,
    fog: false,
    depthTest: true,
    depthWrite: true,
  });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.copy(sunPos);
  sunMesh.renderOrder = 0;
  rootGroup.add(sunMesh);

  // Radiant Sun Corona Glow Sprite
  const coronaTex = createSunCoronaTexture();
  const coronaMat = new THREE.SpriteMaterial({
    map: coronaTex,
    color: 0xFFA558,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    fog: false,
  });
  const coronaSprite = new THREE.Sprite(coronaMat);
  coronaSprite.position.copy(sunPos);
  coronaSprite.scale.set(62, 62, 1);
  coronaSprite.renderOrder = 0;
  rootGroup.add(coronaSprite);

  // =============================================================
  // 2. DETAILED LUSH MOUNTAIN RANGES & SERENE LAKE VISTA
  // =============================================================
  const mountainGroup = new THREE.Group();

  // A. Tier 1: Grand Majestic Alpine Peaks (Furthest ~80m - Snow-capped, sun-kissed alpenglow)
  const peakSunMat = new THREE.MeshStandardMaterial({
    color: 0x8a3854, // Sunlit rosy alpine granite
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const peakSnowMat = new THREE.MeshStandardMaterial({
    color: 0xffeef2, // Alpenglow rosy snowcap
    roughness: 0.65,
    metalness: 0.02,
    flatShading: true,
  });

  const peakCount = isLowEndMode ? 10 : 18;
  for (let i = -peakCount / 2; i <= peakCount / 2; i++) {
    const angle = (i / (peakCount / 2)) * (Math.PI * 0.62) - Math.PI * 0.45;
    const dist = 78 + (Math.abs(i) % 3) * 3;
    const height = 18 + Math.sin(i * 1.7) * 7 + Math.abs(i % 4) * 4.5;
    const width = 18 + (Math.abs(i) % 3) * 5;

    const mGroup = new THREE.Group();
    // Mountain base cone
    const mountainCone = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, isLowEndMode ? 5 : 7),
      peakSunMat
    );
    mountainCone.position.y = height / 2;
    mGroup.add(mountainCone);

    // Snowy peak cap on major summits
    if (!isLowEndMode && (i % 2 === 0 || height > 22)) {
      const capH = height * 0.32;
      const capW = width * 0.35;
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(capW, capH, 6),
        peakSnowMat
      );
      snowCap.position.y = height - capH / 2;
      mGroup.add(snowCap);
    }

    mGroup.position.set(Math.sin(angle) * dist, -5.0, Math.cos(angle) * dist);
    mountainGroup.add(mGroup);
  }

  // B. Tier 2: Mid-Range Craggy Saddle Ridges (~60m - Dusky violet & crimson rock faces)
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x36162d,
    roughness: 0.90,
    metalness: 0.05,
    flatShading: true,
  });

  const ridgeCount = isLowEndMode ? 12 : 22;
  for (let i = -ridgeCount / 2; i <= ridgeCount / 2; i++) {
    const angle = (i / (ridgeCount / 2)) * (Math.PI * 0.70) - Math.PI * 0.45;
    const dist = 59 + (i % 2) * 2.5;
    const height = 10 + Math.cos(i * 1.2) * 4.5 + (Math.abs(i) % 3) * 2.5;
    const width = 15 + (Math.abs(i) % 4) * 3.5;

    const coneGeo = new THREE.ConeGeometry(width, height, isLowEndMode ? 5 : 7);
    const coneMesh = new THREE.Mesh(coneGeo, ridgeMat);
    coneMesh.position.set(Math.sin(angle) * dist, height / 2 - 5.2, Math.cos(angle) * dist);
    mountainGroup.add(coneMesh);
  }

  // C. Tier 3: Lush Forested Rolling Foothills (~44m - Deep evening pine & evergreen slopes)
  const foothillMat = new THREE.MeshStandardMaterial({
    color: 0x1f2618, // Rich evening evergreen forest mantle
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });

  const foothillCount = isLowEndMode ? 8 : 16;
  for (let i = -foothillCount / 2; i <= foothillCount / 2; i++) {
    const angle = (i / (foothillCount / 2)) * (Math.PI * 0.78) - Math.PI * 0.45;
    const dist = 44 + (Math.abs(i) % 3) * 3;
    const height = 6.5 + Math.sin(i * 1.5) * 2.8 + (Math.abs(i) % 2) * 2.0;
    const radius = 14 + (Math.abs(i) % 3) * 4;

    const hillMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, isLowEndMode ? 6 : 8, isLowEndMode ? 4 : 6),
      foothillMat
    );
    hillMesh.scale.set(1.4, 0.45, 1.0);
    hillMesh.position.set(Math.sin(angle) * dist, -5.2 + height * 0.3, Math.cos(angle) * dist);
    mountainGroup.add(hillMesh);
  }

  // D. Sunset Lake Surface with Reflective Water Texture
  waterTexture = createWaterRippleTexture();
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x481b2e, // Warm sunset reflection tone
    map: waterTexture,
    roughness: 0.22,
    metalness: 0.82,
  });
  const waterGeo = new THREE.PlaneGeometry(130, 65);
  waterGeo.rotateX(-Math.PI / 2);
  waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, -4.6, -46);
  mountainGroup.add(waterMesh);

  // E. Charming Wooden Lake Dock & Tied Rowboat (Medium / High / Ultra)
  if (!isLowEndMode) {
    const dockGroup = new THREE.Group();
    dockGroup.position.set(-6.5, -4.4, -36.0);
    dockGroup.rotation.y = 0.25;

    const woodPlankMat = new THREE.MeshStandardMaterial({ color: 0x422616, roughness: 0.75 });
    const woodPostMat = new THREE.MeshStandardMaterial({ color: 0x28160c, roughness: 0.9 });

    // Dock walkway planks
    const dockWalkway = new THREE.Mesh(
      new RoundedBoxGeometry(2.4, 0.16, 7.5, 2, 0.02),
      woodPlankMat
    );
    dockWalkway.position.set(0, 0, -3.75);
    dockGroup.add(dockWalkway);

    // Dock vertical support pilings into water
    const pilings = [[-1.1, -1.2], [1.1, -1.2], [-1.1, -4.5], [1.1, -4.5], [-1.1, -7.2], [1.1, -7.2]];
    pilings.forEach(([px, pz]) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8), woodPostMat);
      piling.position.set(px, -0.6, pz);
      dockGroup.add(piling);
    });

    // Small Wooden Rowboat gently tied to dock edge (High / Ultra)
    if (isHighOrUltra) {
      const boatGroup = new THREE.Group();
      boatGroup.position.set(2.4, -0.22, -5.8);
      boatGroup.rotation.y = -0.32;

      const boatHullMat = new THREE.MeshStandardMaterial({ color: 0x6e3518, roughness: 0.65 });
      const boatInteriorMat = new THREE.MeshStandardMaterial({ color: 0x3d1c0b, roughness: 0.8 });

      // Boat hull
      const boatHull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.65, 3.4, 8),
        boatHullMat
      );
      boatHull.rotation.x = Math.PI / 2;
      boatHull.scale.set(1.0, 0.45, 1.0);
      boatGroup.add(boatHull);

      // Boat bench seats
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), boatInteriorMat);
      bench.position.set(0, 0.12, 0);
      boatGroup.add(bench);

      // Oars resting across bench
      const oarMat = new THREE.MeshStandardMaterial({ color: 0xc49258, roughness: 0.6 });
      const oar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), oarMat);
      oar1.rotation.z = 0.85;
      oar1.rotation.x = 0.3;
      oar1.position.set(0.2, 0.22, 0.1);
      boatGroup.add(oar1);

      dockGroup.add(boatGroup);
      swayingObjects.push({ mesh: boatGroup, baseRot: boatGroup.rotation.clone(), speed: 0.8, amp: 0.03, phase: 1.2 });
    }

    mountainGroup.add(dockGroup);
  }

  rootGroup.add(mountainGroup);

  // =============================================================
  // 3. EXPANSIVE MANICURED YARD, COBBLESTONE PATH & LUSH TREES
  // =============================================================
  const lawnGroup = new THREE.Group();

  // A. Lush Evening Lawn Ground Plane
  const lawnTex = createLawnGrassTexture();
  const lawnGeo = new THREE.PlaneGeometry(110, 110);
  lawnGeo.rotateX(-Math.PI / 2);
  const lawnMat = new THREE.MeshStandardMaterial({
    map: lawnTex,
    color: 0x1f3618,
    roughness: 0.86,
    metalness: 0.04,
  });
  const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
  lawnMesh.position.y = -1.82;
  lawnMesh.receiveShadow = true;
  lawnGroup.add(lawnMesh);

  // B. Winding Natural Flagstone Garden Path (Extending from porch steps and curving gently)
  const pathTex = createGardenPathTexture();
  const pathMat = new THREE.MeshStandardMaterial({
    map: pathTex,
    roughness: 0.82,
    metalness: 0.06,
  });

  // Main straight path from steps
  const pathGeo1 = new THREE.PlaneGeometry(4.4, 20);
  pathGeo1.rotateX(-Math.PI / 2);
  const pathMesh1 = new THREE.Mesh(pathGeo1, pathMat);
  pathMesh1.position.set(0, -1.80, -25.5);
  pathMesh1.receiveShadow = true;
  lawnGroup.add(pathMesh1);

  // Curved path fork towards the lakeside garden bench
  if (!isLowEndMode) {
    const pathGeo2 = new THREE.PlaneGeometry(3.6, 18);
    pathGeo2.rotateX(-Math.PI / 2);
    const pathMesh2 = new THREE.Mesh(pathGeo2, pathMat);
    pathMesh2.position.set(-6.5, -1.80, -32.0);
    pathMesh2.rotation.y = 0.42;
    pathMesh2.receiveShadow = true;
    lawnGroup.add(pathMesh2);
  }

  // C. Classical Stone Birdbath on Lawn (Medium / High / Ultra)
  if (!isLowEndMode) {
    const birdbathGroup = new THREE.Group();
    birdbathGroup.position.set(7.8, -1.82, -21.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a544e, roughness: 0.88 });
    const bathWaterMat = new THREE.MeshStandardMaterial({ color: 0x3b1828, roughness: 0.15, metalness: 0.8 });

    // Base pedestal & fluted shaft
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.70, 0.25, 12), stoneMat);
    pedestal.position.y = 0.125;
    birdbathGroup.add(pedestal);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.28, 1.1, 12), stoneMat);
    shaft.position.y = 0.75;
    birdbathGroup.add(shaft);

    // Basin bowl
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.45, 0.35, 16), stoneMat);
    basin.position.y = 1.42;
    birdbathGroup.add(basin);

    // Reflective water pool inside basin
    const waterCircle = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), bathWaterMat);
    waterCircle.rotation.x = -Math.PI / 2;
    waterCircle.position.y = 1.54;
    birdbathGroup.add(waterCircle);

    lawnGroup.add(birdbathGroup);
  }

  // D. Carved Wooden Garden Bench in Lawn Foreground (High / Ultra)
  if (isHighOrUltra) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-11.5, -1.82, -22.5);
    benchGroup.rotation.y = 0.55;

    const teakMat = new THREE.MeshStandardMaterial({ color: 0x5e331e, roughness: 0.65 });
    // Seat
    const benchSeat = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.08, 0.75, 2, 0.02), teakMat);
    benchSeat.position.y = 0.65;
    benchGroup.add(benchSeat);

    // Backrest
    const benchBack = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.65, 0.08, 2, 0.02), teakMat);
    benchBack.position.set(0, 1.05, 0.34);
    benchGroup.add(benchBack);

    // Legs
    [[-1.05, -0.28], [1.05, -0.28], [-1.05, 0.28], [1.05, 0.28]].forEach(([bx, bz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.65, 8), teakMat);
      leg.position.set(bx, 0.325, bz);
      benchGroup.add(leg);
    });

    lawnGroup.add(benchGroup);
  }

  // =============================================================
  // 4. DIVERSE, HIGH-DETAIL ARBORETUM & BOTANICAL GARDEN TREES
  // =============================================================
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x22120b, roughness: 0.92 });
  const birchTrunkMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc7, roughness: 0.85 });
  const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x142816, roughness: 0.88, flatShading: true });
  const deciduousMat = new THREE.MeshStandardMaterial({ color: 0x24421e, roughness: 0.85, flatShading: true });
  const autumnMapleMat = new THREE.MeshStandardMaterial({ color: 0xc44522, roughness: 0.78, flatShading: true });
  const dogwoodMat = new THREE.MeshStandardMaterial({ color: 0xdb5858, roughness: 0.75, flatShading: true });

  // 1. Feature Botanical Tree: Japanese Autumn Maple / Flowering Dogwood (Flanking yard to left)
  const buildAutumnMaple = (px: number, pz: number, scale = 1.0) => {
    const mapleGroup = new THREE.Group();
    mapleGroup.position.set(px, -1.82, pz);

    // Sculpted organic trunk with branching limbs
    const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 3.8, 8), trunkMat);
    mainTrunk.position.y = 1.9;
    mapleGroup.add(mainTrunk);

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.4, 6), trunkMat);
    b1.position.set(0.6, 3.4, 0.4);
    b1.rotation.z = -0.55;
    mapleGroup.add(b1);

    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 6), trunkMat);
    b2.position.set(-0.65, 3.3, -0.3);
    b2.rotation.z = 0.50;
    mapleGroup.add(b2);

    // Layered, billowing cloud foliage canopies
    const leafClouds = [
      { x: 0, y: 4.8, z: 0, r: 2.2, mat: autumnMapleMat },
      { x: 1.4, y: 4.2, z: 0.8, r: 1.6, mat: autumnMapleMat },
      { x: -1.3, y: 4.0, z: -0.6, r: 1.7, mat: dogwoodMat },
      { x: 0.4, y: 5.6, z: -0.4, r: 1.4, mat: autumnMapleMat },
    ];

    leafClouds.forEach(({ x, y, z, r, mat }) => {
      const leafMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, isLowEndMode ? 0 : 1),
        mat
      );
      leafMesh.position.set(x, y, z);
      leafMesh.castShadow = !isLowEndMode;
      leafMesh.receiveShadow = true;
      mapleGroup.add(leafMesh);
    });

    mapleGroup.scale.set(scale, scale, scale);
    lawnGroup.add(mapleGroup);
    swayingObjects.push({ mesh: mapleGroup, baseRot: mapleGroup.rotation.clone(), speed: 0.65, amp: 0.015, phase: px });
  };

  buildAutumnMaple(-17.5, -18.5, 1.25);
  if (isHighOrUltra) {
    buildAutumnMaple(19.0, -17.0, 1.1);
  }

  // 2. High-Fidelity Ponderosa / Douglas Fir Pines (Surrounding the yard and lake border)
  const buildPineTree = (px: number, pz: number, heightScale = 1.0) => {
    const pineGroup = new THREE.Group();
    pineGroup.position.set(px, -1.82, pz);

    const trunkH = 3.2 * heightScale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.38, trunkH, 6),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    pineGroup.add(trunk);

    // 4 Drooping, overlapping needle cone tiers
    const tiers = [
      { y: 2.2, r: 2.4, h: 3.2 },
      { y: 4.0, r: 1.9, h: 2.8 },
      { y: 5.6, r: 1.4, h: 2.4 },
      { y: 7.0, r: 0.9, h: 2.0 },
    ];

    tiers.forEach(({ y, r, h }) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r * heightScale, h * heightScale, isLowEndMode ? 5 : 7),
        pineNeedleMat
      );
      cone.position.y = y * heightScale;
      cone.castShadow = !isLowEndMode;
      cone.receiveShadow = true;
      pineGroup.add(cone);
    });

    lawnGroup.add(pineGroup);
    swayingObjects.push({ mesh: pineGroup, baseRot: pineGroup.rotation.clone(), speed: 0.5, amp: 0.012, phase: px + pz });
  };

  // 3. Lush Broadleaf Oak / Shade Trees
  const buildOakTree = (px: number, pz: number, scale = 1.0) => {
    const oakGroup = new THREE.Group();
    oakGroup.position.set(px, -1.82, pz);

    const trunkH = 4.2 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40 * scale, 0.65 * scale, trunkH, 8),
      birchTrunkMat
    );
    trunk.position.y = trunkH / 2;
    oakGroup.add(trunk);

    // Volumetric crown clumps
    const canopyClumps = [
      { x: 0, y: 5.2 * scale, z: 0, r: 2.8 * scale },
      { x: 1.6 * scale, y: 4.8 * scale, z: 0.8 * scale, r: 2.1 * scale },
      { x: -1.5 * scale, y: 4.6 * scale, z: -0.6 * scale, r: 2.2 * scale },
      { x: 0.2 * scale, y: 6.2 * scale, z: -0.8 * scale, r: 2.0 * scale },
    ];

    canopyClumps.forEach(({ x, y, z, r }) => {
      const crownMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, isLowEndMode ? 0 : 1),
        deciduousMat
      );
      crownMesh.position.set(x, y, z);
      crownMesh.castShadow = !isLowEndMode;
      crownMesh.receiveShadow = true;
      oakGroup.add(crownMesh);
    });

    lawnGroup.add(oakGroup);
    swayingObjects.push({ mesh: oakGroup, baseRot: oakGroup.rotation.clone(), speed: 0.45, amp: 0.01, phase: px * 1.5 });
  };

  // Natural Tree Grove Placements
  const treeSpecs = [
    // Pines along left garden border
    { type: 'pine', x: -22.0, z: -10.0, s: 1.3 },
    { type: 'pine', x: -25.0, z: -4.0, s: 1.5 },
    { type: 'pine', x: -23.5, z: 5.0, s: 1.2 },
    { type: 'pine', x: -21.0, z: 12.0, s: 1.4 },
    // Pines along right garden border
    { type: 'pine', x: 22.0, z: -10.0, s: 1.3 },
    { type: 'pine', x: 24.5, z: -3.0, s: 1.6 },
    { type: 'pine', x: 23.0, z: 6.0, s: 1.25 },
    { type: 'pine', x: 21.5, z: 13.0, s: 1.45 },
    // Background canopy trees
    { type: 'oak', x: -18.0, z: -30.0, s: 1.3 },
    { type: 'oak', x: 18.0, z: -28.0, s: 1.25 },
    { type: 'pine', x: -12.0, z: -38.0, s: 1.6 },
    { type: 'pine', x: 13.0, z: -37.0, s: 1.55 },
    { type: 'pine', x: 0.0, z: -42.0, s: 1.4 },
  ];

  treeSpecs.forEach((spec) => {
    if (spec.type === 'pine') {
      buildPineTree(spec.x, spec.z, spec.s);
    } else {
      buildOakTree(spec.x, spec.z, spec.s);
    }
  });

  // E. Mulch Garden Flowerbeds & Flowering Shrubs along Porch Perimeter
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x24150d, roughness: 0.95 });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x1d361b, roughness: 0.85, flatShading: true });
  const flowerCoralMat = new THREE.MeshStandardMaterial({ color: 0xdf5363, roughness: 0.5 });
  const flowerPurpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 });
  const flowerAmberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
  const stoneEdgerMat = new THREE.MeshStandardMaterial({ color: 0x483e38, roughness: 0.8 });

  const plantPositions = [
    // Front Garden Beds (Flanking porch steps cleanly at Z = -14.2)
    [-10.5, -14.2], [-7.2, -14.2], [-4.6, -14.2],
    [4.6, -14.2], [7.2, -14.2], [10.5, -14.2],
    // Left Garden Border (Flush with deck edge at X = -13.5)
    [-13.5, -9.0], [-13.5, -4.5], [-13.5, 0.5], [-13.5, 5.5], [-13.5, 10.0],
    // Right Garden Border (Flush with deck edge at X = +13.5)
    [13.5, -9.0], [13.5, -4.5], [13.5, 0.5], [13.5, 5.5], [13.5, 10.0],
    // Rear Garden Border
    [-9.0, 13.5], [-3.5, 13.5], [3.5, 13.5], [9.0, 13.5],
  ];

  plantPositions.forEach(([px, pz], idx) => {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(px, -1.82, pz);

    // Mulch Bed on lawn
    const mulchBed = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.12, 12), soilMat);
    mulchBed.position.y = 0.06;
    mulchBed.receiveShadow = true;
    bedGroup.add(mulchBed);

    // Curved Stone Edger Border (Medium / High / Ultra)
    if (!isLowEndMode) {
      for (let s = 0; s < 8; s++) {
        const angle = (s / 8) * Math.PI * 2;
        const edger = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), stoneEdgerMat);
        edger.position.set(Math.cos(angle) * 1.45, 0.12, Math.sin(angle) * 1.45);
        bedGroup.add(edger);
      }
    }

    // Multi-Lobed Natural Flowering Bush
    const baseRadius = 0.88 + (idx % 3) * 0.12;
    const centerFoliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(baseRadius, isLowEndMode ? 0 : 1),
      shrubMat
    );
    centerFoliage.position.y = baseRadius * 0.78;
    centerFoliage.receiveShadow = true;
    bedGroup.add(centerFoliage);

    // Blossoms
    const flowerMat = idx % 3 === 0 ? flowerCoralMat : idx % 3 === 1 ? flowerPurpleMat : flowerAmberMat;
    const blossomCount = isLowEndMode ? 3 : 6;
    for (let f = 0; f < blossomCount; f++) {
      const flAngle = (f / blossomCount) * Math.PI * 2 + 0.35;
      const flDist = baseRadius * 0.68;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), flowerMat);
      fl.position.set(Math.cos(flAngle) * flDist, baseRadius * 1.05 + (f % 2) * 0.1, Math.sin(flAngle) * flDist);
      bedGroup.add(fl);
    }

    lawnGroup.add(bedGroup);
  });

  rootGroup.add(lawnGroup);

  // =============================================================
  // 5. ARCHITECTURAL CRAFTSMAN PORCH STRUCTURE & FURNISHINGS
  // =============================================================
  const porchGroup = new THREE.Group();

  // A. Elevated Wooden Porch Deck Platform
  const deckWidth = 24.0;
  const deckDepth = 24.0;
  const deckThickness = 0.5;
  const deckElevation = -0.42;

  const deckPlankTex = createPorchWoodPlankTexture();
  const deckMat = new THREE.MeshStandardMaterial({
    map: deckPlankTex,
    roughness: 0.62,
    metalness: 0.08,
  });

  const deckGeo = new RoundedBoxGeometry(deckWidth, deckThickness, deckDepth, 3, 0.06);
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.y = deckElevation - deckThickness / 2;
  deckMesh.receiveShadow = true;
  porchGroup.add(deckMesh);

  // Stone Foundation Skirting down to lawn level (-1.82)
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d3532, roughness: 0.9 });
  const skirtH = (deckElevation - deckThickness) - (-1.82);
  const stoneSkirting = new THREE.Mesh(new THREE.BoxGeometry(deckWidth - 0.2, skirtH, deckDepth - 0.2), stoneMat);
  stoneSkirting.position.y = -1.82 + skirtH / 2;
  stoneSkirting.receiveShadow = true;
  porchGroup.add(stoneSkirting);

  // Porch Steps leading out towards the sunset vista
  const numSteps = 5;
  const stepH = 0.24;
  const stepD = 0.85;
  const stepW = 6.4;
  for (let step = 0; step < numSteps; step++) {
    const stepMesh = new THREE.Mesh(new RoundedBoxGeometry(stepW, stepH, stepD, 2, 0.02), deckMat);
    const stepY = deckElevation - 0.12 - step * stepH;
    const stepZ = -deckDepth / 2 - 0.45 - step * 0.75;
    stepMesh.position.set(0, stepY, stepZ);
    stepMesh.receiveShadow = true;
    porchGroup.add(stepMesh);
  }

  // B. Handcrafted Patio Table (Holding the 3D Monopoly Board)
  const tableGroup = new THREE.Group();
  const tableWoodTex = createPolishedTableWoodTexture();
  const tableWoodMat = new THREE.MeshStandardMaterial({
    map: tableWoodTex,
    roughness: 0.38,
    metalness: 0.10,
  });

  const tableTopW = 12.6;
  const tableTopH = 0.35;
  const tableTopGeo = new RoundedBoxGeometry(tableTopW, tableTopH, tableTopW, 3, 0.12);
  const tableTopMesh = new THREE.Mesh(tableTopGeo, tableWoodMat);
  tableTopMesh.position.y = -0.38;
  tableTopMesh.receiveShadow = true;
  tableTopMesh.castShadow = true;
  tableGroup.add(tableTopMesh);

  // Table Apron
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x221008, roughness: 0.6 });
  const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.35, 11.8), apronMat);
  apronMesh.position.y = -0.65;
  apronMesh.receiveShadow = true;
  tableGroup.add(apronMesh);

  // 4 Carved Wooden Table Legs
  const legPositions = [[-5.4, -5.4], [5.4, -5.4], [-5.4, 5.4], [5.4, 5.4]];
  legPositions.forEach(([lx, lz]) => {
    const legGeo = new THREE.CylinderGeometry(0.35, 0.28, 2.8, 12);
    const legMesh = new THREE.Mesh(legGeo, tableWoodMat);
    legMesh.position.set(lx, -1.8, lz);
    legMesh.castShadow = true;
    legMesh.receiveShadow = true;
    tableGroup.add(legMesh);
  });

  // Table Decor: Ceramic Mug & Citronella Glass Candle
  // 1. Ceramic Coffee Mug
  const mugGroup = new THREE.Group();
  mugGroup.position.set(5.1, -0.18, 5.1);

  const mugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.1 });
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.42, 16), mugMat);
  mugBody.position.y = 0.21;
  mugBody.castShadow = true;
  mugGroup.add(mugBody);

  const coffeeLiquidMat = new THREE.MeshStandardMaterial({ color: 0x3d1a08, roughness: 0.1 });
  const coffeeMesh = new THREE.Mesh(new THREE.CircleGeometry(0.20, 16), coffeeLiquidMat);
  coffeeMesh.rotation.x = -Math.PI / 2;
  coffeeMesh.position.y = 0.38;
  mugGroup.add(coffeeMesh);

  const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25 });
  const handleMesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI), handleMat);
  handleMesh.position.set(0.24, 0.21, 0);
  handleMesh.rotation.z = -Math.PI / 2;
  mugGroup.add(handleMesh);

  // Steam particle billows rising from the hot coffee mug
  if (!isLowEndMode) {
    steamTex = createSteamParticleTexture();
    steamMat = new THREE.SpriteMaterial({
      map: steamTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const steamCount = 8;
    const mugBasePos = new THREE.Vector3(5.1, 0.24, 5.1);
    for (let s = 0; s < steamCount; s++) {
      const sp = new THREE.Sprite(steamMat);
      const life = Math.random();
      const maxLife = 2.2 + Math.random() * 1.0;
      sp.position.set(
        (Math.random() - 0.5) * 0.08,
        0.42 + life * 0.5,
        (Math.random() - 0.5) * 0.08
      );
      sp.scale.set(0.14, 0.14, 1);
      mugGroup.add(sp);
      steamParticles.push({
        mesh: sp,
        basePos: mugBasePos.clone(),
        vy: 0.22 + Math.random() * 0.12,
        vx: (Math.random() - 0.5) * 0.03,
        vz: (Math.random() - 0.5) * 0.03,
        life: life * maxLife,
        maxLife,
      });
    }
  }

  tableGroup.add(mugGroup);

  // 2. Glass Jar Candle with Flickering Flame Light & Volumetric Halo
  const candleGroup = new THREE.Group();
  candleGroup.position.set(-5.1, -0.18, 5.1);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.48,
  });
  const glassJar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.38, 16), glassMat);
  glassJar.position.y = 0.19;
  candleGroup.add(glassJar);

  const waxMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
  const waxMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.24, 16), waxMat);
  waxMesh.position.y = 0.12;
  candleGroup.add(waxMesh);

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 8), flameMat);
  flameMesh.position.y = 0.32;
  candleGroup.add(flameMesh);
  candleFlameMesh = flameMesh;

  // Atmospheric Volumetric Candle Glow Halo Sprite
  candleHaloTex = createCandleGlowTexture();
  const candleHaloMat = new THREE.SpriteMaterial({
    map: candleHaloTex,
    color: 0xffa436,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  candleHaloSprite = new THREE.Sprite(candleHaloMat);
  candleHaloSprite.position.set(0, 0.34, 0);
  candleHaloSprite.scale.set(1.4, 1.4, 1);
  candleGroup.add(candleHaloSprite);

  const candleLightSource = new THREE.PointLight(0xffa83e, 0.65, 6, 2);
  candleLightSource.position.set(0, 0.36, 0);
  candleGroup.add(candleLightSource);
  candleLight = candleLightSource;
  tableGroup.add(candleGroup);

  // 3. Vintage Leather Banker's Ledger & Turned Brass Fountain Pen
  if (!isLowEndMode) {
    const ledgerGroup = new THREE.Group();
    ledgerGroup.position.set(5.1, -0.18, -4.8);
    ledgerGroup.rotation.y = -0.32;

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x42160e, // Rich antique oxblood/burgundy leather
      roughness: 0.58,
      metalness: 0.08,
    });
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xfdf7e2, // Deckle-edge antique cream paper
      roughness: 0.88,
    });
    const brassPenMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.18,
    });

    // Book cover
    const bookCover = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.055, 1.18, 2, 0.015), leatherMat);
    bookCover.position.y = 0.028;
    bookCover.castShadow = true;
    ledgerGroup.add(bookCover);

    // Book pages block
    const bookPages = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.045, 1.10), pageMat);
    bookPages.position.set(0.02, 0.032, 0);
    ledgerGroup.add(bookPages);

    // Turned Solid Brass Fountain Pen resting diagonally across ledger
    const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 8), brassPenMat);
    penBody.rotation.z = Math.PI / 2;
    penBody.rotation.y = 0.38;
    penBody.position.set(0.06, 0.068, 0.08);
    ledgerGroup.add(penBody);

    const penNib = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 6), brassPenMat);
    penNib.rotation.z = -Math.PI / 2;
    penNib.rotation.y = 0.38;
    penNib.position.set(0.35, 0.068, 0.19);
    ledgerGroup.add(penNib);

    tableGroup.add(ledgerGroup);
  }

  // 4. Solid Polished Brass Corner Protectors on Table
  const tableCornerBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.92,
    roughness: 0.20,
  });
  const cornerDist = tableTopW / 2 - 0.04;
  [
    [-cornerDist, -cornerDist],
    [cornerDist, -cornerDist],
    [-cornerDist, cornerDist],
    [cornerDist, cornerDist],
  ].forEach(([cx, cz]) => {
    const cornerBracket = new THREE.Mesh(
      new RoundedBoxGeometry(0.55, tableTopH + 0.02, 0.55, 2, 0.02),
      tableCornerBrassMat
    );
    cornerBracket.position.set(cx, -0.38, cz);
    tableGroup.add(cornerBracket);
  });

  porchGroup.add(tableGroup);

  // C. Open-Air Craftsman Patio (Fences and railings removed for unobstructed views)

  // H. Premium Ceramic Corner Planter Pots & Lush Boston Ferns (Fully intact, realistic geometry)
  const potMat = new THREE.MeshStandardMaterial({
    color: 0xc2623a, // Warm classic terracotta
    roughness: 0.68,
    metalness: 0.04,
  });
  const potRimMat = new THREE.MeshStandardMaterial({
    color: 0xaa502e,
    roughness: 0.65,
    metalness: 0.04,
  });
  const potSoilMat = new THREE.MeshStandardMaterial({
    color: 0x221711, // Rich dark potting soil
    roughness: 0.95,
  });
  const fernDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1d4e28, // Deep rich emerald
    roughness: 0.6,
  });
  const fernMidMat = new THREE.MeshStandardMaterial({
    color: 0x2e6b36, // Vibrant foliage green
    roughness: 0.55,
  });
  const fernLightMat = new THREE.MeshStandardMaterial({
    color: 0x43864c, // Fresh leafy green
    roughness: 0.5,
  });

  const colHalfW = deckWidth / 2 - 0.6;
  const colHalfD = deckDepth / 2 - 0.6;

  const potLocations = [
    [-colHalfW + 1.2, -colHalfD + 1.2],
    [colHalfW - 1.2, -colHalfD + 1.2],
    [-colHalfW + 1.2, colHalfD - 1.2],
    [colHalfW - 1.2, colHalfD - 1.2],
  ];

  potLocations.forEach(([px, pz]) => {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(px, deckElevation, pz);

    // 1. Tapered Terracotta Pot Body
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.32, 0.74, 28), potMat);
    potBody.position.y = 0.37;
    potBody.castShadow = true;
    potBody.receiveShadow = true;
    plantGroup.add(potBody);

    // 2. Beveled Top Rim Collar
    const potRim = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.46, 0.12, 28), potRimMat);
    potRim.position.y = 0.74;
    potRim.castShadow = true;
    potRim.receiveShadow = true;
    plantGroup.add(potRim);

    // 3. Molded Base Ring
    const potBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.06, 28), potRimMat);
    potBase.position.y = 0.03;
    potBase.receiveShadow = true;
    plantGroup.add(potBase);

    // 4. Moist Potting Soil Bed
    const soilMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 24), potSoilMat);
    soilMesh.position.y = 0.71;
    soilMesh.receiveShadow = true;
    plantGroup.add(soilMesh);

    // 5. Lush Central Foliage Core
    const coreFoliage = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), fernDarkMat);
    coreFoliage.position.y = 0.86;
    coreFoliage.scale.set(1.2, 0.7, 1.2);
    coreFoliage.castShadow = true;
    plantGroup.add(coreFoliage);

    // 6. Gracefully Cascading Fern Fronds (Base-anchored pivots prevent clipping or detached spikes)
    const frondCounts = isLowEndMode ? [8, 6] : [12, 8, 6];
    const frondConfigs = [
      { count: frondCounts[0], radius: 0.28, y: 0.72, tilt: 0.85, length: 0.68, width: 0.11, mat: fernDarkMat },
      { count: frondCounts[1], radius: 0.18, y: 0.75, tilt: 0.52, length: 0.60, width: 0.10, mat: fernMidMat },
      ...(frondCounts[2] ? [{ count: frondCounts[2], radius: 0.08, y: 0.78, tilt: 0.25, length: 0.52, width: 0.09, mat: fernLightMat }] : []),
    ];

    frondConfigs.forEach((tier, tIdx) => {
      for (let i = 0; i < tier.count; i++) {
        const angle = (i / tier.count) * Math.PI * 2 + (tIdx * 0.35);
        const pivot = new THREE.Group();
        pivot.position.set(Math.cos(angle) * tier.radius, tier.y, Math.sin(angle) * tier.radius);
        pivot.rotation.y = -angle + Math.PI / 2;
        pivot.rotation.x = tier.tilt;

        // Cone with base translated to origin so it rotates cleanly from stem
        const leafGeo = new THREE.ConeGeometry(tier.width, tier.length, 6);
        leafGeo.translate(0, tier.length / 2, 0);
        const frondMesh = new THREE.Mesh(leafGeo, tier.mat);
        frondMesh.castShadow = true;
        pivot.add(frondMesh);

        plantGroup.add(pivot);
      }
    });

    porchGroup.add(plantGroup);
  });

  // I. Pair of Cozy Wooden Porch Rocking Chairs & Side Patio Refreshments Table
  const buildRockingChair = (px: number, pz: number, rotY: number, hasBlanket = false) => {
    const chairGroup = new THREE.Group();
    chairGroup.position.set(px, deckElevation, pz);
    chairGroup.rotation.y = rotY;

    const chairWoodMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.45, metalness: 0.05 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xb44b28, roughness: 0.85 });
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.9 });

    const runnerW = 0.055;
    const runnerH = 0.07;
    const runnerL = 1.45;
    const runnerSpacing = 0.38;

    [-runnerSpacing, runnerSpacing].forEach((rx) => {
      const runner = new THREE.Mesh(new RoundedBoxGeometry(runnerW, runnerH, runnerL, 2, 0.012), chairWoodMat);
      runner.position.set(rx, runnerH / 2, 0);
      chairGroup.add(runner);

      const tipF = new THREE.Mesh(new RoundedBoxGeometry(runnerW, runnerH, 0.20, 2, 0.012), chairWoodMat);
      tipF.position.set(rx, runnerH / 2 + 0.035, -runnerL / 2 + 0.08);
      tipF.rotation.x = -0.28;
      chairGroup.add(tipF);

      const tipR = new THREE.Mesh(new RoundedBoxGeometry(runnerW, runnerH, 0.20, 2, 0.012), chairWoodMat);
      tipR.position.set(rx, runnerH / 2 + 0.035, runnerL / 2 - 0.08);
      tipR.rotation.x = 0.28;
      chairGroup.add(tipR);
    });

    const legW = 0.055;
    const legZFront = -0.28;
    const legZRear = 0.28;
    const seatH = 0.48;
    const armH = 0.78;

    const frontLegH = armH - runnerH;
    [-runnerSpacing, runnerSpacing].forEach((lx) => {
      const frontLeg = new THREE.Mesh(new RoundedBoxGeometry(legW, frontLegH, legW, 2, 0.01), chairWoodMat);
      frontLeg.position.set(lx, runnerH + frontLegH / 2, legZFront);
      chairGroup.add(frontLeg);

      const rearLegH = seatH - runnerH;
      const rearLeg = new THREE.Mesh(new RoundedBoxGeometry(legW, rearLegH, legW, 2, 0.01), chairWoodMat);
      rearLeg.position.set(lx, runnerH + rearLegH / 2, legZRear);
      chairGroup.add(rearLeg);
    });

    // Seat frame & cushion
    const seatWidth = runnerSpacing * 2 + 0.08;
    const seatDepth = legZRear - legZFront + 0.12;

    const cushion = new THREE.Mesh(new RoundedBoxGeometry(seatWidth - 0.06, 0.055, seatDepth - 0.06, 2, 0.02), cushionMat);
    cushion.position.set(0, seatH + 0.035, (legZFront + legZRear) / 2);
    chairGroup.add(cushion);

    // Backrest stiles & crest rail
    const backrestTilt = 0.16;
    const stileH = 0.86;
    [-runnerSpacing + 0.015, runnerSpacing - 0.015].forEach((bx) => {
      const stile = new THREE.Mesh(new RoundedBoxGeometry(0.045, stileH, 0.045, 2, 0.008), chairWoodMat);
      stile.position.set(bx, seatH + (stileH / 2) * Math.cos(backrestTilt), legZRear + (stileH / 2) * Math.sin(backrestTilt));
      stile.rotation.x = backrestTilt;
      chairGroup.add(stile);
    });

    const crestRail = new THREE.Mesh(new RoundedBoxGeometry(seatWidth + 0.04, 0.07, 0.045, 2, 0.012), chairWoodMat);
    crestRail.position.set(0, seatH + stileH * Math.cos(backrestTilt), legZRear + stileH * Math.sin(backrestTilt));
    crestRail.rotation.x = backrestTilt;
    chairGroup.add(crestRail);

    // Slats
    const slatH = stileH - 0.10;
    for (let bSlat = -2; bSlat <= 2; bSlat++) {
      const bSlatMesh = new THREE.Mesh(new RoundedBoxGeometry(0.055, slatH, 0.018, 1, 0.005), chairWoodMat);
      bSlatMesh.position.set(bSlat * 0.11, seatH + 0.03 + (slatH / 2) * Math.cos(backrestTilt), legZRear + (0.03 + slatH / 2) * Math.sin(backrestTilt));
      bSlatMesh.rotation.x = backrestTilt;
      chairGroup.add(bSlatMesh);
    }

    // Armrests
    const stileZAtArm = legZRear + (armH - seatH) * Math.tan(backrestTilt);
    const armrestL = (stileZAtArm - legZFront) + 0.06;
    [-runnerSpacing - 0.02, runnerSpacing + 0.02].forEach((ax) => {
      const armrest = new THREE.Mesh(new RoundedBoxGeometry(0.10, 0.028, armrestL, 2, 0.008), chairWoodMat);
      armrest.position.set(ax, armH + 0.014, (legZFront + stileZAtArm) / 2);
      chairGroup.add(armrest);
    });

    // Cozy Throw Blanket draped over armrest
    if (hasBlanket && !isLowEndMode) {
      const blanket = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.42, 0.32, 2, 0.04), blanketMat);
      blanket.position.set(-runnerSpacing - 0.02, armH - 0.08, (legZFront + stileZAtArm) / 2);
      chairGroup.add(blanket);
    }

    porchGroup.add(chairGroup);
  };

  buildRockingChair(-colHalfW + 3.2, colHalfD - 3.2, Math.PI * 0.28, true);
  if (!isLowEndMode) {
    buildRockingChair(-colHalfW + 5.6, colHalfD - 2.8, Math.PI * 0.18, false);

    // Side Patio Refreshments Table with Iced Tea Pitcher & Tumblers
    const patioTableGroup = new THREE.Group();
    patioTableGroup.position.set(-colHalfW + 4.4, deckElevation, colHalfD - 4.4);

    const sideTableMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.5 });
    const sideTableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), sideTableMat);
    sideTableTop.position.y = 0.55;
    patioTableGroup.add(sideTableTop);

    const sideTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.55, 8), sideTableMat);
    sideTableLeg.position.y = 0.275;
    patioTableGroup.add(sideTableLeg);

    // Glass Pitcher of Iced Tea with Lemon
    if (isHighOrUltra) {
      const pitcherMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.45 });
      const teaMat = new THREE.MeshStandardMaterial({ color: 0x8b3a0f, roughness: 0.2, transparent: true, opacity: 0.85 });
      const lemonMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

      const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 12), pitcherMat);
      pitcher.position.set(0, 0.77, 0);
      patioTableGroup.add(pitcher);

      const teaLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 12), teaMat);
      teaLiquid.position.set(0, 0.74, 0);
      patioTableGroup.add(teaLiquid);

      const lemon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), lemonMat);
      lemon.rotation.x = Math.PI / 3;
      lemon.position.set(0.05, 0.88, 0);
      patioTableGroup.add(lemon);
    }

    porchGroup.add(patioTableGroup);
  }

  rootGroup.add(porchGroup);

  // =============================================================
  // 6. GLOWING EVENING FIREFLIES & AMBIENT SUNSET PARTICLES
  // =============================================================
  const fireflyTex = createSunCoronaTexture();
  const fireflyMat = new THREE.SpriteMaterial({
    map: fireflyTex,
    color: 0xffe285,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleCount = isLowEndMode ? 8 : (isHighOrUltra ? 42 : 24);
  for (let p = 0; p < particleCount; p++) {
    const sprite = new THREE.Sprite(fireflyMat);
    const fx = (Math.random() - 0.5) * 26;
    const fy = deckElevation + 0.4 + Math.random() * 4.2;
    const fz = (Math.random() - 0.5) * 26;

    sprite.position.set(fx, fy, fz);
    const size = 0.18 + Math.random() * 0.24;
    sprite.scale.set(size, size, 1);
    rootGroup.add(sprite);

    fireflySprites.push(sprite);
    fireflyData.push({
      x: fx,
      y: fy,
      z: fz,
      speed: 0.35 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      radius: 0.6 + Math.random() * 1.0,
    });
  }

  // =============================================================
  // 7. ANIMATION & RENDER TICK HANDLER
  // =============================================================
  const update = (now: number, dt: number) => {
    if (!ambientAnimationsEnabled || isIdlePowerMode || isLowEndMode) return;

    const timeSec = now * 0.001;

    // A. Fireflies organic floating
    for (let i = 0; i < fireflySprites.length; i++) {
      const sprite = fireflySprites[i];
      const data = fireflyData[i];
      const t = timeSec * data.speed + data.phase;
      sprite.position.x = data.x + Math.sin(t * 0.8) * data.radius;
      sprite.position.y = data.y + Math.sin(t * 1.5) * (data.radius * 0.5);
      sprite.position.z = data.z + Math.cos(t * 0.7) * data.radius;
      sprite.material.opacity = 0.55 + Math.sin(t * 3.0) * 0.45;
    }

    // B. Candle Flame Subtle Flicker & Volumetric Halo
    if (candleFlameMesh && candleLight && !isLowEndMode) {
      const flicker = Math.sin(now * 0.02) * 0.08 + Math.cos(now * 0.035) * 0.05;
      candleFlameMesh.scale.set(1 + flicker * 0.5, 1 + flicker, 1 + flicker * 0.5);
      candleLight.intensity = 0.65 + flicker * 0.3;

      if (candleHaloSprite) {
        const haloScale = 1.35 + flicker * 0.35;
        candleHaloSprite.scale.set(haloScale, haloScale, 1);
        candleHaloSprite.material.opacity = 0.58 + flicker * 0.22;
      }
    }

    // Hot Coffee Mug Gentle Rising Steam Particles
    if (steamParticles.length > 0 && !isLowEndMode) {
      for (let i = 0; i < steamParticles.length; i++) {
        const p = steamParticles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.life = 0;
          p.mesh.position.set(
            (Math.random() - 0.5) * 0.08,
            0.42,
            (Math.random() - 0.5) * 0.08
          );
        }
        const progress = p.life / p.maxLife;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.x += p.vx * dt + Math.sin(now * 0.003 + i) * 0.001;
        p.mesh.position.z += p.vz * dt;
        const currentScale = 0.12 + progress * 0.28;
        p.mesh.scale.set(currentScale, currentScale, 1);
        p.mesh.material.opacity = Math.sin(progress * Math.PI) * 0.22;
      }
    }

    // C. Fairy Lights Gentle Shimmer
    if (fairyPointLights.length > 0) {
      for (let i = 0; i < fairyPointLights.length; i++) {
        fairyPointLights[i].intensity = 0.75 + Math.sin(now * 0.004 + i) * 0.15;
      }
    }

    // D. Soft breeze sway on botanical trees, hanging chimes, and flower baskets (High / Ultra)
    if (isHighOrUltra && swayingObjects.length > 0) {
      for (let i = 0; i < swayingObjects.length; i++) {
        const item = swayingObjects[i];
        const sway = Math.sin(timeSec * item.speed + item.phase) * item.amp;
        item.mesh.rotation.z = item.baseRot.z + sway;
        item.mesh.rotation.x = item.baseRot.x + sway * 0.5;
      }
    }

    // E. Lake water subtle surface shimmer offset
    if (waterTexture && !isLowEndMode) {
      waterTexture.offset.x = (timeSec * 0.015) % 1;
    }
  };

  const setAmbientAnimations = (enabled: boolean) => {
    ambientAnimationsEnabled = enabled;
    fireflySprites.forEach((sprite) => {
      sprite.visible = enabled;
    });
  };

  const setLowEndMode = (lowEnd: boolean) => {
    isLowEndMode = lowEnd;
    fairyPointLights.forEach((light) => {
      light.visible = !lowEnd;
    });
    if (candleLight) {
      candleLight.visible = !lowEnd;
    }
  };

  const setQualityLevel = (quality: GraphicQualityPreset) => {
    currentQuality = quality === 'AUTO' || quality === 'CUSTOM' ? (isLowEndMode ? 'LOW' : 'HIGH') : quality;
    setLowEndMode(currentQuality === 'BATTERY_SAVER' || currentQuality === 'LOW');
  };

  const setIdlePowerMode = (idle: boolean) => {
    isIdlePowerMode = idle;
  };

  const dispose = () => {
    rootGroup.clear();
    scene.remove(rootGroup);
    skyGeo.dispose();
    skyMat.dispose();
    skyTex.dispose();
    coronaTex.dispose();
    deckPlankTex.dispose();
    tableWoodTex.dispose();
    lawnTex.dispose();
    pathTex.dispose();
    fireflyTex.dispose();
    if (waterTexture) waterTexture.dispose();
    if (candleHaloTex) candleHaloTex.dispose();
    if (steamTex) steamTex.dispose();
    if (steamMat) steamMat.dispose();
  };

  return {
    environmentGroup: rootGroup,
    update,
    dispose,
    setAmbientAnimations,
    setLowEndMode,
    setIdlePowerMode,
    setQualityLevel,
  };
}
