import * as THREE from 'three';
import { Property } from '@/types/monopoly';
import { PROPERTY_SET_THEMES } from '@/lib/propertyThemes';

// Color map for board color groups
const COLOR_HEX_STR: Record<string, string> = {
  Brown: '#8B4513',
  LightBlue: '#38BDF8',
  Pink: '#EC4899',
  Orange: '#F97316',
  Red: '#EF4444',
  Yellow: '#EAB308',
  Green: '#22C55E',
  DarkBlue: '#1E40AF',
  Railroad: '#475569',
  Utility: '#0EA5E9',
};

/**
 * Creates an ornate, vintage luxury gold-foil card back design for face-down draft cards.
 */
export function createDraftCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(1, 1);

  // 1. Background Base Gradient (Deep royal midnight sapphire / twilight navy)
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1536);
  bgGrad.addColorStop(0, '#040d1a');
  bgGrad.addColorStop(0.3, '#0b1d3a');
  bgGrad.addColorStop(0.7, '#07152b');
  bgGrad.addColorStop(1, '#030a14');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 1504, 36);
  ctx.fill();

  // Subtle radial glow from center
  const radialGlow = ctx.createRadialGradient(512, 768, 80, 512, 768, 650);
  radialGlow.addColorStop(0, 'rgba(30, 64, 175, 0.45)');
  radialGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.2)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 1504, 36);
  ctx.fill();

  // 2. Repeating Gold Geometric Diamond Lattice Pattern in Background
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(48, 48, 928, 1440, 24);
  ctx.clip();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
  ctx.lineWidth = 2.5;
  const diamondSize = 64;
  for (let x = -50; x < 1100; x += diamondSize) {
    for (let y = -50; y < 1600; y += diamondSize) {
      ctx.beginPath();
      ctx.moveTo(x, y - diamondSize / 2);
      ctx.lineTo(x + diamondSize / 2, y);
      ctx.lineTo(x, y + diamondSize / 2);
      ctx.lineTo(x - diamondSize / 2, y);
      ctx.closePath();
      ctx.stroke();

      // Tiny center diamond dot
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. Ornate Double Gold Foil Borders
  // Outer Gold Border
  const goldGrad1 = ctx.createLinearGradient(0, 0, 1024, 1536);
  goldGrad1.addColorStop(0, '#fef08a');
  goldGrad1.addColorStop(0.25, '#d97706');
  goldGrad1.addColorStop(0.5, '#fef9c3');
  goldGrad1.addColorStop(0.75, '#b45309');
  goldGrad1.addColorStop(1, '#fde047');

  ctx.strokeStyle = goldGrad1;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(32, 32, 960, 1472, 28);
  ctx.stroke();

  // Inset Hairline Gold Border
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(56, 56, 912, 1424, 20);
  ctx.stroke();

  // Secondary Inner Thin Border
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(72, 72, 880, 1392, 16);
  ctx.stroke();

  // 4. Corner Ornaments & Art Deco Filigree (All 4 Corners)
  const drawCornerFlourish = (cx: number, cy: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    ctx.strokeStyle = '#fef08a';
    ctx.fillStyle = '#d97706';
    ctx.lineWidth = 3;

    // Corner bracket diamond
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, -24);
    ctx.lineTo(48, 0);
    ctx.lineTo(24, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Scroll curls
    ctx.beginPath();
    ctx.arc(36, 36, 18, Math.PI, Math.PI * 1.75);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(36, -36, 18, Math.PI * 0.25, Math.PI);
    ctx.stroke();

    ctx.restore();
  };

  drawCornerFlourish(90, 90, 0);
  drawCornerFlourish(934, 90, Math.PI / 2);
  drawCornerFlourish(934, 1446, Math.PI);
  drawCornerFlourish(90, 1446, -Math.PI / 2);

  // 5. Central Grand Medallion Emblem
  const centerX = 512;
  const centerY = 768;

  // Outer Decorative Sunburst Spikes
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)';
  ctx.lineWidth = 2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    const r1 = 265;
    const r2 = 295;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(a) * r1, centerY + Math.sin(a) * r1);
    ctx.lineTo(centerX + Math.cos(a) * r2, centerY + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Outer Gold Seal Ring
  ctx.strokeStyle = goldGrad1;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 255, 0, Math.PI * 2);
  ctx.stroke();

  // Beaded Circle
  ctx.fillStyle = '#fef08a';
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    const bx = centerX + Math.cos(a) * 238;
    const by = centerY + Math.sin(a) * 238;
    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner Medallion Background
  const innerMedallionGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 220);
  innerMedallionGrad.addColorStop(0, '#172554');
  innerMedallionGrad.addColorStop(0.8, '#091326');
  innerMedallionGrad.addColorStop(1, '#020617');
  ctx.fillStyle = innerMedallionGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 225, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 6. Central Monopoly Manor & Key Crown Icon
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;

  // Vintage Manor House Icon in Center
  ctx.beginPath();
  // Roof Triangle
  ctx.moveTo(centerX, centerY - 120);
  ctx.lineTo(centerX + 85, centerY - 55);
  ctx.lineTo(centerX - 85, centerY - 55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chimney
  ctx.beginPath();
  ctx.rect(centerX + 40, centerY - 110, 22, 45);
  ctx.fill();
  ctx.stroke();

  // House Body
  ctx.beginPath();
  ctx.rect(centerX - 75, centerY - 55, 150, 95);
  ctx.fill();
  ctx.stroke();

  // Door
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.roundRect(centerX - 22, centerY - 5, 44, 45, [12, 12, 0, 0]);
  ctx.fill();

  // Windows
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(centerX - 60, centerY - 40, 26, 26);
  ctx.fillRect(centerX + 34, centerY - 40, 26, 26);

  // 7. Gold Typography in Emblem
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Ribbon Banner for "TITLE DEED"
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.roundRect(centerX - 170, centerY + 65, 340, 52, 14);
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fef9c3';
  ctx.font = "900 32px 'Plus Jakarta Sans', 'Outfit', Georgia, serif";
  ctx.fillText('TITLE DEED', centerX, centerY + 91);

  // Subtitle "SECRET PROPERTY"
  ctx.fillStyle = '#cbd5e1';
  ctx.font = "bold 20px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('SECRET PROPERTY', centerX, centerY + 145);

  // Gold Stars
  ctx.fillStyle = '#facc15';
  ctx.font = '28px sans-serif';
  ctx.fillText('★ ★ ★ ★', centerX, centerY + 180);

  // 8. Top & Bottom Luxury Edition Ribbons
  ctx.fillStyle = '#fef08a';
  ctx.font = "bold 24px 'Plus Jakarta Sans', 'Outfit', Georgia, serif";
  ctx.fillText('MONOPOLY', centerX, 150);

  ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
  ctx.font = "600 18px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('CLASSIC OPENING DRAFT', centerX, 185);

  // Bottom prompt
  ctx.fillStyle = '#fef08a';
  ctx.font = "900 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('✦ TAP TO REVEAL ✦', centerX, 1385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high-DPI front deed card texture for properties.
 */
export function createDraftCardFrontTexture(prop: Property): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(1, 1);

  // 1. Soft Off-White Card Body with Crisp Shadow Inset
  ctx.fillStyle = '#fdfefe';
  ctx.beginPath();
  ctx.roundRect(16, 16, 992, 1504, 36);
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(32, 32, 960, 1472, 24);
  ctx.stroke();

  // 2. Colored Header Box Matching Property Group
  const headerColor = COLOR_HEX_STR[prop.colorGroup] || '#475569';
  ctx.fillStyle = headerColor;
  ctx.beginPath();
  ctx.roundRect(48, 48, 928, 220, 20);
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Header Subtitle "TITLE DEED"
  const cardTheme = (prop.colorGroup && PROPERTY_SET_THEMES[prop.colorGroup]) || null;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = "bold 26px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('TITLE DEED', 512, 95);

  // Property Name in Header Box using Location Set Thematic Font
  ctx.fillStyle = '#ffffff';
  if (cardTheme) {
    ctx.font = cardTheme.titleFont.replace(/3[0-9]px/, '44px');
  } else {
    ctx.font = "900 46px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  }
  ctx.fillText(prop.name.toUpperCase(), 512, 165);

  // Color Group Label & Location Lore below Header
  ctx.fillStyle = '#64748b';
  if (cardTheme?.lore) {
    ctx.font = "bold 24px 'Cinzel', 'Playfair Display', serif";
    ctx.fillText(`${prop.colorGroup.toUpperCase()} GROUP • ${cardTheme.lore}`, 512, 315);
  } else {
    ctx.font = "bold 28px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(`${prop.colorGroup.toUpperCase()} GROUP`, 512, 315);
  }

  // 3. Detailed Rent Rates Table
  const rents = prop.rentLevels || [
    prop.baseRent,
    prop.baseRent * 5,
    prop.baseRent * 15,
    prop.baseRent * 45,
    prop.baseRent * 80,
    prop.baseRent * 125,
  ];

  const lines = [
    ['RENT • SITE ONLY', `$${rents[0]}`],
    ['WITH 1 HOUSE', `$${rents[1]}`],
    ['WITH 2 HOUSES', `$${rents[2]}`],
    ['WITH 3 HOUSES', `$${rents[3]}`],
    ['WITH 4 HOUSES', `$${rents[4]}`],
    ['WITH HOTEL', `$${rents[5]}`],
  ];

  let y = 390;
  const xLabel = 100;
  const xVal = 924;

  lines.forEach(([label, val], idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#f1f5f9' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(80, y - 32, 864, 64, 12);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = "600 32px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(label, xLabel, y + 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = "900 36px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(val, xVal, y + 2);

    y += 76;
  });

  // 4. Bottom Info Boxes: House Cost & Mortgage Value
  // House Cost Box
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(80, 940, 410, 160, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = "bold 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('HOUSE COST', 285, 985);

  ctx.fillStyle = '#059669';
  ctx.font = "900 44px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText(`$${prop.houseCost}`, 285, 1050);

  // Mortgage Value Box
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(534, 940, 410, 160, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = "bold 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('MORTGAGE VALUE', 739, 985);

  ctx.fillStyle = '#d97706';
  ctx.font = "900 44px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText(`$${prop.basePrice / 2}`, 739, 1050);

  // 5. Grand Free Opening Draft Banner at Base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(80, 1150, 864, 180, 20);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = "900 36px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('★ FREE OPENING DRAFT PICK ★', 512, 1210);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = "500 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('ACQUIRED AT $0 STARTING COST', 512, 1270);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
