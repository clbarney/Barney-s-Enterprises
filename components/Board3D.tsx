'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  Player,
  Property,
  BoardSpace,
  GameEventLog,
  GamePhase,
  TurnPhase,
  Wildcard,
  TokenShape,
  DEFAULT_SETTINGS,
  GameSettingsOptions,
  GameRulesOptions,
  resolveEffectiveSettings,
  detectDeviceCapabilities,
  CardTargetingState,
} from '@/types/monopoly';
import { getPremiumToken } from '@/lib/tokens';
import { ChanceCard } from '@/lib/chanceCards';
import { CommunityChestCard } from '@/lib/communityChestCards';
import { createDraftCardBackTexture, createDraftCardFrontTexture } from '@/lib/draftTextures';
import { soundFx } from '@/lib/sound';
import { TurnTimer } from './TurnTimer';
import { DebtCrisisModal } from './DebtCrisisModal';
import { buildPorchSunsetEnvironment, PorchSunsetSceneController } from './PorchSunsetEnvironment';
import {
  FastForward,
  User,
  Shield,
  Scroll,
  DollarSign,
  TrendingUp,
  Info,
  Camera,
  Sparkles,
  Video,
  Clock,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  EyeOff,
  Menu,
  ArrowRightLeft,
  Zap,
  BatteryCharging,
  Sliders,
  X,
  Target,
  Landmark,
} from 'lucide-react';

// Soft radial particle texture generator for kinetic dice motion blur & particle trail
const createDiceMotionTrailTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');     // White-hot energy core
  gradient.addColorStop(0.2, 'rgba(251, 191, 36, 0.95)');   // Glowing gold
  gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.65)');   // Vibrant amber halo
  gradient.addColorStop(0.8, 'rgba(217, 119, 6, 0.20)');    // Soft outer trail
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');            // Transparent boundary

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

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

import { type PropertyStyleTheme, PROPERTY_SET_THEMES } from '@/lib/propertyThemes';
export { type PropertyStyleTheme, PROPERTY_SET_THEMES };

export interface CardHandData {
  id: string;
  type: 'ACTION' | 'PROPERTY' | 'WILDCARD' | 'DRAFT' | 'TRADE';
  title: string;
  subType: string;
  headerColor: string;
  bodyLines: string[];
  footerText: string;
  actionPayload?: {
    actionType: 'ROLL_DICE' | 'END_TURN' | 'CHALLENGE' | 'PLAY_WILDCARD' | 'DRAFT_PICK' | 'INSPECT_PROPERTY' | 'TRADE';
    propertyId?: string;
    wildcardId?: string;
  };
}

// -------------------------------------------------------------
// HELPER: Canvas 2D Word Wrap Logic for 3D High-DPI Textures
// -------------------------------------------------------------
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'center'
) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const words = text.split(' ');
  let line = '';
  let currY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currY);
      line = words[n] + ' ';
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currY);
  ctx.restore();
}

// -------------------------------------------------------------
// HELPER: Centered Title Word Wrap with Dynamic Line Stacking & Guard
// Ensures long multi-word titles wrap cleanly one word under the other
// and never run off the card boundaries, always perfectly centered.
// -------------------------------------------------------------
function drawWrappedCardTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  fontSpec: string,
  baseFontSize: number,
  color: string = '#FFFFFF'
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontSpec;

  const words = title.trim().split(/\s+/);
  const singleLineWidth = ctx.measureText(title).width;

  if (singleLineWidth <= maxWidth || words.length === 1) {
    if (singleLineWidth > maxWidth) {
      const scale = maxWidth / singleLineWidth;
      const safeSize = Math.max(16, Math.floor(baseFontSize * scale));
      ctx.font = fontSpec.replace(/\b\d+px\b/, `${safeSize}px`);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, centerX, centerY);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    return;
  }

  // Multi-word title exceeds width: wrap one word under the other!
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const lineHeight = Math.min(36, Math.round(baseFontSize * 1.08));
  const totalBlockH = (lines.length - 1) * lineHeight;
  const startY = centerY - totalBlockH / 2;

  lines.forEach((lineText, idx) => {
    const lineWidth = ctx.measureText(lineText).width;
    if (lineWidth > maxWidth) {
      ctx.save();
      const scale = maxWidth / lineWidth;
      const safeSize = Math.max(14, Math.floor(baseFontSize * scale));
      ctx.font = fontSpec.replace(/\b\d+px\b/, `${safeSize}px`);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lineText, centerX, startY + idx * lineHeight);
      ctx.restore();
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lineText, centerX, startY + idx * lineHeight);
    }
  });

  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

// -------------------------------------------------------------
// HELPER: High-DPI Board Tile Texture with Luxury Typography & Color Bands
// -------------------------------------------------------------
function createTileTextTexture(
  space: BoardSpace,
  price?: number,
  isCorner?: boolean,
  colorGroup?: string,
  isLowPower: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  // High-DPI supersampling: 768x1536 for regular tiles, 1536x1536 for corners (2x native supersample)
  // Drop supersampling from 2x down to 1x under low-power modes (downscale dimensions from 768×1536 / 1536×1536 to 384×768 / 768×768)
  const baseW = isCorner ? 768 : 384;
  const baseH = 768;
  const scaleFactor = isLowPower ? 1 : 2;
  const width = baseW;
  const height = baseH;
  canvas.width = baseW * scaleFactor;
  canvas.height = baseH * scaleFactor;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = isLowPower ? 'medium' : 'high';
  ctx.scale(scaleFactor, scaleFactor);

  // Warm luxury cardstock background
  ctx.fillStyle = isCorner ? '#F8FAFC' : '#FDFBF7';
  ctx.fillRect(0, 0, width, height);

  // Outer ebony frame
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, width - 14, height - 14);

  // Inner delicate hairline frame
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  if (isCorner) {
    if (space.type === 'GO') {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(16, 16, width - 32, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 48px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('COLLECT $200', width / 2, 72);

      ctx.fillStyle = '#0F172A';
      ctx.font = "600 30px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('SALARY AS YOU PASS', width / 2, 180);

      ctx.fillStyle = '#DC2626';
      ctx.font = "900 160px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('GO', width / 2 - 50, 420);

      ctx.beginPath();
      ctx.moveTo(width / 2 + 80, 340);
      ctx.lineTo(width / 2 + 200, 420);
      ctx.lineTo(width / 2 + 80, 500);
      ctx.lineTo(width / 2 + 80, 460);
      ctx.lineTo(width / 2 + 10, 460);
      ctx.lineTo(width / 2 + 10, 380);
      ctx.lineTo(width / 2 + 80, 380);
      ctx.closePath();
      ctx.fillStyle = '#DC2626';
      ctx.fill();
    } else if (space.type === 'JAIL') {
      // 1. Distinct Outer Section: L-shaped "JUST VISITING" Walkway
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(14, 14, width - 28, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 44px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('JUST VISITING', width / 2, 70);

      // Left outer walkway bar for L-shape alignment
      ctx.fillStyle = '#C2410C';
      ctx.fillRect(14, 124, 110, height - 138);
      ctx.save();
      ctx.translate(68, height / 2 + 60);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "bold 36px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('VISITING →', 0, 0);
      ctx.restore();

      // 2. Inner Designated Cell: "IN JAIL" Prison Cell
      const cellX = 140;
      const cellY = 140;
      const cellW = width - 156;
      const cellH = height - 156;

      ctx.fillStyle = '#090D16';
      ctx.fillRect(cellX, cellY, cellW, cellH);

      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 10;
      ctx.strokeRect(cellX, cellY, cellW, cellH);

      // Iron Prison Bars
      ctx.fillStyle = '#64748B';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(cellX + 60 + i * 90, cellY, 20, cellH);
      }

      // In Jail Badge Plate
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(cellX + 35, cellY + cellH / 2 - 60, cellW - 70, 120, 16);
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = "900 62px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IN JAIL', cellX + cellW / 2, cellY + cellH / 2);
    } else if (space.type === 'FREE_PARKING') {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(16, 16, width - 32, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 52px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('FREE', width / 2, 68);

      ctx.fillStyle = '#0F172A';
      ctx.font = "900 76px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('PARKING', width / 2, 320);

      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 160, 430, 320, 140, 24);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "bold 64px sans-serif";
      ctx.fillText('🚗', width / 2, 500);
    } else if (space.type === 'GO_TO_JAIL') {
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(16, 16, width - 32, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 52px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('GO TO', width / 2, 68);

      ctx.fillStyle = '#0F172A';
      ctx.font = "900 90px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('JAIL!', width / 2, 310);

      ctx.font = "bold 90px sans-serif";
      ctx.fillText('👮‍♂️', width / 2, 490);
    }
  } else {
    if (colorGroup && COLOR_HEX_STR[colorGroup] && colorGroup !== 'Railroad' && colorGroup !== 'Utility') {
      const bandColor = COLOR_HEX_STR[colorGroup];
      const theme = PROPERTY_SET_THEMES[colorGroup] || {
        titleFont: "bold 36px 'Cinzel', 'Playfair Display', serif",
        priceFont: "bold 44px sans-serif",
        titleColor: '#0F172A',
        priceColor: '#0F172A',
        motif: '',
        lore: '',
        badgeType: 'vintage-stamp' as const,
      };

      // Luxury Property Color Band
      ctx.fillStyle = bandColor;
      ctx.fillRect(16, 16, width - 32, 160);

      // Subtle top glass highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(16, 16, width - 32, 6);

      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, width - 32, 160);

      // Creative Location-Themed Property Title
      ctx.fillStyle = theme.titleColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = theme.titleFont;
      wrapText(ctx, space.name.toUpperCase(), width / 2, 310, width - 48, 46);

      // Location Character & Lore Motif
      if (theme.motif) {
        ctx.fillStyle = theme.priceColor;
        ctx.font = "600 20px 'Cinzel', 'Playfair Display', 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(theme.motif, width / 2, 455);
      }

      // Creative Price Badge tailored to location atmosphere & investment tier
      if (price && price > 0) {
        const badgeW = width - 64;
        const badgeH = 76;
        const badgeX = (width - badgeW) / 2;
        const badgeY = 620;

        ctx.save();
        if (theme.badgeType === 'vintage-stamp') {
          // Weathered coastal working-class dockland stamp ($60)
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(71, 85, 105, 0.08)';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        } else if (theme.badgeType === 'coastal-pill') {
          // Breezy maritime harbor pill badge ($100-$120)
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
          ctx.fillStyle = 'rgba(2, 132, 199, 0.10)';
          ctx.fill();
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 3.5;
          ctx.stroke();
        } else if (theme.badgeType === 'victorian-cartouche') {
          // Elegant Southern Victorian garden district cartouche ($140-$160)
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
          ctx.fillStyle = 'rgba(157, 23, 77, 0.08)';
          ctx.fill();
          ctx.strokeStyle = '#9D174D';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(157, 23, 77, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(badgeX + 6, badgeY + 6, badgeW - 12, badgeH - 12);
        } else if (theme.badgeType === 'marquee-box') {
          // Broadway marquee headline box ($180-$200)
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = '#F97316';
          ctx.lineWidth = 5;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
        } else if (theme.badgeType === 'industrial-plate') {
          // Heavy industrial American steel/brick plate ($220-$240)
          ctx.fillStyle = '#FEF2F2';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = '#B91C1C';
          ctx.lineWidth = 4;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          // Rivets in corners
          ctx.fillStyle = '#B91C1C';
          ctx.beginPath();
          ctx.arc(badgeX + 10, badgeY + 10, 4, 0, Math.PI * 2);
          ctx.arc(badgeX + badgeW - 10, badgeY + 10, 4, 0, Math.PI * 2);
          ctx.arc(badgeX + 10, badgeY + badgeH - 10, 4, 0, Math.PI * 2);
          ctx.arc(badgeX + badgeW - 10, badgeY + badgeH - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.badgeType === 'resort-plaque') {
          // Gilded Atlantic seaside grand resort plaque ($260-$280)
          ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
          ctx.fill();
          ctx.strokeStyle = '#A16207';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.strokeStyle = '#EAB308';
          ctx.lineWidth = 2;
          ctx.strokeRect(badgeX + 5, badgeY + 5, badgeW - 10, badgeH - 10);
        } else if (theme.badgeType === 'treasury-frame') {
          // Classical sovereign treasury frame ($300-$320)
          ctx.fillStyle = 'rgba(6, 95, 70, 0.09)';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = '#065F46';
          ctx.lineWidth = 4.5;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = 'rgba(6, 95, 70, 0.3)';
          ctx.lineWidth = 2;
          ctx.strokeRect(badgeX + 6, badgeY + 6, badgeW - 12, badgeH - 12);
        } else if (theme.badgeType === 'luxury-gem') {
          // Diamond / Sapphire billionaire's row crest ($350-$400)
          ctx.fillStyle = 'rgba(30, 58, 138, 0.10)';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 18);
          ctx.fill();
          ctx.strokeStyle = '#1D4ED8';
          ctx.lineWidth = 5;
          ctx.stroke();
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(badgeX + 6, badgeY + 6, badgeW - 12, badgeH - 12, 12);
          ctx.stroke();
        }

        ctx.fillStyle = theme.badgeType === 'marquee-box' ? '#FFFFFF' : theme.priceColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = theme.priceFont;
        ctx.fillText(`$${price}`, width / 2, badgeY + badgeH / 2);
        ctx.restore();
      }
    } else if (space.type === 'PROPERTY' && colorGroup === 'Railroad') {
      const theme = PROPERTY_SET_THEMES['Railroad'];
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(16, 16, width - 32, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 38px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('RAILROAD', width / 2, 72);

      ctx.font = "bold 60px sans-serif";
      ctx.fillText('🚂', width / 2, 230);

      ctx.fillStyle = theme.titleColor;
      ctx.font = theme.titleFont;
      wrapText(ctx, space.name.toUpperCase(), width / 2, 380, width - 48, 44);

      ctx.fillStyle = '#64748B';
      ctx.font = "600 20px 'Copperplate', 'Rockwell', sans-serif";
      ctx.fillText(theme.motif, width / 2, 485);

      // Railroad Ticket Punch Badge ($200)
      const badgeW = width - 64;
      const badgeH = 76;
      const badgeX = (width - badgeW) / 2;
      const badgeY = 620;
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 4;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.font = theme.priceFont;
      ctx.fillStyle = theme.priceColor;
      ctx.fillText(`$${price || 200}`, width / 2, badgeY + badgeH / 2);
    } else if (space.type === 'PROPERTY' && colorGroup === 'Utility') {
      const theme = PROPERTY_SET_THEMES['Utility'];
      ctx.fillStyle = '#0D9488';
      ctx.fillRect(16, 16, width - 32, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 38px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('UTILITY', width / 2, 72);

      ctx.font = "bold 60px sans-serif";
      ctx.fillText(space.name.includes('Water') ? '💧' : '💡', width / 2, 230);

      ctx.fillStyle = theme.titleColor;
      ctx.font = theme.titleFont;
      wrapText(ctx, space.name.toUpperCase(), width / 2, 380, width - 48, 42);

      ctx.fillStyle = '#0E7490';
      ctx.font = "600 20px 'Space Mono', 'Courier New', monospace";
      ctx.fillText(theme.motif, width / 2, 485);

      // Technical Dial Gauge Badge ($150)
      const badgeW = width - 64;
      const badgeH = 76;
      const badgeX = (width - badgeW) / 2;
      const badgeY = 620;
      ctx.fillStyle = 'rgba(8, 145, 178, 0.08)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = '#0891B2';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.font = theme.priceFont;
      ctx.fillStyle = theme.priceColor;
      ctx.fillText(`$${price || 150}`, width / 2, badgeY + badgeH / 2);
    } else if (space.type === 'CHANCE') {
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(16, 16, width - 32, 120);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "900 44px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('CHANCE', width / 2, 78);

      ctx.fillStyle = '#EA580C';
      ctx.font = "900 180px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('?', width / 2, 400);
    } else if (space.type === 'COMMUNITY_CHEST') {
      ctx.fillStyle = '#D97706';
      ctx.fillRect(16, 16, width - 32, 120);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 34px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText('COMMUNITY', width / 2, 58);
      ctx.fillText('CHEST', width / 2, 98);

      ctx.font = "bold 90px sans-serif";
      ctx.fillText('🎁', width / 2, 380);
    } else if (space.type === 'TAX') {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(16, 16, width - 32, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 42px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillText('TAX', width / 2, 72);

      ctx.fillStyle = '#0F172A';
      ctx.font = "bold 38px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      wrapText(ctx, space.name.toUpperCase(), width / 2, 340, width - 48, 46);

      ctx.font = "bold 44px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
      ctx.fillStyle = '#DC2626';
      ctx.fillText(`PAY $${space.taxAmount || 100}`, width / 2, 660);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // Clamp texture.anisotropy to 2 on low-power profiles instead of 16
  texture.anisotropy = isLowPower ? 2 : 16;
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// HELPER: High-DPI Diegetic Card Textures & High-Speed Cache with Eviction Policy
// -------------------------------------------------------------
const MAX_CARD_CACHE_SIZE = 64;
const cardTextureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreate3DCardTexture(cData: CardHandData, propObj?: Property): THREE.CanvasTexture {
  const cacheKey = `${cData.id}_${propObj?.houses ?? 0}_${propObj?.hotel ? 'h1' : 'h0'}_${propObj?.isMortgaged ? 'm1' : 'm0'}_${propObj?.ownerId ?? 'none'}`;
  const existing = cardTextureCache.get(cacheKey);
  if (existing) {
    // LRU refresh
    cardTextureCache.delete(cacheKey);
    cardTextureCache.set(cacheKey, existing);
    return existing;
  }
  // Enforce eviction cap to prevent WebGL texture memory leaks
  if (cardTextureCache.size >= MAX_CARD_CACHE_SIZE) {
    const oldestKey = cardTextureCache.keys().next().value;
    if (oldestKey) {
      const oldTex = cardTextureCache.get(oldestKey);
      oldTex?.dispose();
      cardTextureCache.delete(oldestKey);
    }
  }
  const tex = create3DCardTexture(cData, propObj);
  cardTextureCache.set(cacheKey, tex);
  return tex;
}

function create3DCardTexture(cData: CardHandData, propObj?: Property): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  // High-DPI 1024x1536 canvas paired with LinearFilter eliminates mipmap downsampling blur
  // while using 75% less VRAM and generating 4x faster than 2048x3072!
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleUpper = cData.title.toUpperCase();
  const subTypeUpper = cData.subType.toUpperCase();

  if (cData.type === 'PROPERTY') {
    // Soft off-white body
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 752, 24);
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Colored Title Box at top matching property group color
    ctx.fillStyle = cData.headerColor || '#475569';
    ctx.beginPath();
    ctx.roundRect(24, 24, 464, 110, 16);
    ctx.fill();

    // Title inside Title Box CAPITALIZED - crisp font with clean word wrapping
    const cardTheme = (propObj?.colorGroup && PROPERTY_SET_THEMES[propObj.colorGroup]) || null;
    const fontSpec = cardTheme
      ? cardTheme.titleFont.replace(/3[0-9]px/, '33px')
      : "800 34px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    drawWrappedCardTitle(ctx, titleUpper, 256, 79, 430, fontSpec, 34, '#FFFFFF');

    // Subtitle / Color Group & Location Lore
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748B';
    const buildingStatus = propObj?.hotel
      ? 'HOTEL BUILT'
      : (propObj?.houses && propObj.houses > 0
        ? `${propObj.houses} ${propObj.houses === 1 ? 'HOUSE' : 'HOUSES'}`
        : '0 HOUSES');
    if (cardTheme?.lore) {
      ctx.font = "bold 18px 'Cinzel', 'Playfair Display', serif";
      ctx.fillText(`${subTypeUpper} • ${cardTheme.lore} • ${buildingStatus}`, 256, 165);
    } else {
      ctx.font = "700 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
      ctx.fillText(`${subTypeUpper} • ${buildingStatus}`, 256, 165);
    }

    // Full Rent Breakdown Display
    if (propObj) {
      const rents = propObj.rentLevels || [
        propObj.baseRent,
        propObj.baseRent * 5,
        propObj.baseRent * 15,
        propObj.baseRent * 45,
        propObj.baseRent * 80,
        propObj.baseRent * 125,
      ];
      ctx.textAlign = 'left';

      let y = 215;
      const xLabel = 50;
      const xVal = 462;

      const lines = [
        ['BASE RENT', `$${rents[0]}`],
        ['WITH 1 HOUSE', `$${rents[1]}`],
        ['WITH 2 HOUSES', `$${rents[2]}`],
        ['WITH 3 HOUSES', `$${rents[3]}`],
        ['WITH 4 HOUSES', `$${rents[4]}`],
        ['WITH HOTEL', `$${rents[5]}`],
      ];

      // Determine active rent line based on current buildings / status
      let activeRentIdx = -1;
      if (propObj.hotel) {
        activeRentIdx = 5;
      } else if (propObj.houses !== undefined && propObj.houses > 0) {
        activeRentIdx = Math.min(4, propObj.houses);
      } else if (propObj.ownerId !== null && !propObj.isMortgaged) {
        activeRentIdx = 0;
      }

      lines.forEach(([label, val], idx) => {
        const isActive = idx === activeRentIdx;

        if (isActive) {
          // Highlighted active rent row showing current houses and rent
          ctx.fillStyle = idx === 5 ? '#B91C1C' : '#047857';
          ctx.beginPath();
          ctx.roundRect(xLabel - 10, y - 18, 422, 34, 8);
          ctx.fill();

          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = "800 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
          ctx.textAlign = 'left';
          const iconPrefix = idx === 5 ? '🏨 ' : (idx > 0 ? '🏠 ' : '● ');
          ctx.fillText(`${iconPrefix}${label}  [CURRENT]`, xLabel - 4, y);

          ctx.textAlign = 'right';
          ctx.fillText(val, xVal, y);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
          ctx.fillRect(xLabel - 10, y - 18, 422, 34);

          ctx.fillStyle = '#334155';
          ctx.font = "600 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
          ctx.textAlign = 'left';
          ctx.fillText(label, xLabel, y);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#0F172A';
          ctx.font = "800 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
          ctx.fillText(val, xVal, y);
          ctx.textAlign = 'left';
        }

        y += 38;
      });

      // House Cost Footer
      ctx.fillStyle = '#F1F5F9';
      ctx.beginPath();
      ctx.roundRect(40, 640, 432, 80, 16);
      ctx.fill();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0F172A';
      ctx.font = "800 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
      ctx.fillText(`HOUSE COST: $${propObj.houseCost}`, 256, 680);

      if (propObj.isMortgaged) {
        // Dark translucent overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.beginPath();
        ctx.roundRect(8, 8, 496, 752, 24);
        ctx.fill();

        // Stamped MORTGAGED Banner
        ctx.save();
        ctx.translate(256, 384);
        ctx.rotate(-Math.PI / 7);

        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.roundRect(-220, -45, 440, 90, 16);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "900 42px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
        ctx.fillText('MORTGAGED', 0, 0);

        ctx.restore();
      }
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0F172A';
      ctx.font = "600 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
      let y = 240;
      cData.bodyLines.forEach((line) => {
        wrapText(ctx, line.toUpperCase(), 256, y, 420, 36);
        y += 40;
      });
    }
  } else if (cData.type === 'ACTION' || cData.type === 'DRAFT' || cData.type === 'TRADE') {
    // Solid background color with vibrant personality hues
    const bgColor = cData.headerColor || '#2563EB';
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 752, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Subtle header block
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(24, 24, 464, 110, 16);
    ctx.fill();

    // Title CAPITALIZED - crisp font with clean word wrapping
    drawWrappedCardTitle(
      ctx,
      titleUpper,
      256,
      79,
      430,
      "800 40px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif",
      40,
      '#FFFFFF'
    );

    // Subtitle
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = "700 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(subTypeUpper, 256, 175);

    // Body Lines CAPITALIZED
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "600 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    let y = 260;
    cData.bodyLines.forEach((line) => {
      wrapText(ctx, line.toUpperCase(), 256, y, 420, 36);
      y += 46;
    });

    // Footer Box
    if (cData.footerText) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(40, 640, 432, 80, 16);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "800 26px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
      ctx.fillText(cData.footerText.toUpperCase(), 256, 680);
    }
  } else if (cData.type === 'WILDCARD') {
    // Dark gray inner fill
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 752, 24);
    ctx.fill();

    // Rainbow Gradient Border Outline
    const grad = ctx.createLinearGradient(0, 0, 512, 768);
    grad.addColorStop(0, '#EC4899');
    grad.addColorStop(0.2, '#8B5CF6');
    grad.addColorStop(0.4, '#3B82F6');
    grad.addColorStop(0.6, '#10B981');
    grad.addColorStop(0.8, '#F59E0B');
    grad.addColorStop(1, '#EF4444');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.stroke();

    // White Title Box
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(28, 28, 456, 110, 16);
    ctx.fill();

    // Title CAPITALIZED - crisp font with clean word wrapping
    drawWrappedCardTitle(
      ctx,
      titleUpper,
      256,
      83,
      420,
      "800 36px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif",
      36,
      '#0F172A'
    );

    // Subtitle
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A7F3D0';
    ctx.font = "700 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(subTypeUpper, 256, 178);

    // Body Lines
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = "600 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    let y = 260;
    cData.bodyLines.forEach((line) => {
      wrapText(ctx, line.toUpperCase(), 256, y, 420, 36);
      y += 46;
    });

    if (cData.footerText) {
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(40, 640, 432, 80, 16);
      ctx.fill();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#38BDF8';
      ctx.font = "800 26px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
      ctx.fillText(cData.footerText.toUpperCase(), 256, 680);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // LinearFilter with generateMipmaps=false ensures crystal-clear card text and borders in camera space
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// HELPER: Canvas 2D Spatial Button Texture & High-Speed Cache with Eviction Policy
// -------------------------------------------------------------
const MAX_BUTTON_CACHE_SIZE = 32;
const buttonTextureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateSpatialButtonTexture(label: string, bgColor: string, textColor: string = '#FFFFFF'): THREE.CanvasTexture {
  const cacheKey = `${label}_${bgColor}_${textColor}`;
  const existing = buttonTextureCache.get(cacheKey);
  if (existing) {
    // LRU refresh
    buttonTextureCache.delete(cacheKey);
    buttonTextureCache.set(cacheKey, existing);
    return existing;
  }
  // Enforce eviction cap to prevent WebGL texture memory leaks
  if (buttonTextureCache.size >= MAX_BUTTON_CACHE_SIZE) {
    const oldestKey = buttonTextureCache.keys().next().value;
    if (oldestKey) {
      const oldTex = buttonTextureCache.get(oldestKey);
      oldTex?.dispose();
      buttonTextureCache.delete(oldestKey);
    }
  }
  const tex = createSpatialButtonTexture(label, bgColor, textColor);
  buttonTextureCache.set(cacheKey, tex);
  return tex;
}

function createSpatialButtonTexture(label: string, bgColor: string, textColor: string = '#FFFFFF'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(12, 12, 488, 136, 28);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "800 38px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText(label.toUpperCase(), 256, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// HELPER: Canvas 2D Close ("X") Spatial Button Texture & Cache
// -------------------------------------------------------------
let cachedCloseButtonTexture: THREE.CanvasTexture | null = null;

function getOrCreateCloseButtonTexture(): THREE.CanvasTexture {
  if (cachedCloseButtonTexture) return cachedCloseButtonTexture;
  cachedCloseButtonTexture = createCloseButtonTexture();
  return cachedCloseButtonTexture;
}

function createCloseButtonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(42, 42);
  ctx.lineTo(86, 86);
  ctx.moveTo(86, 42);
  ctx.lineTo(42, 86);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// PRE-ALLOCATED SCRATCH VECTORS FOR 120HZ RIGID-BODY DICE PHYSICS
// (Completely eliminates 250+ per-frame GC heap allocations during rolls)
// -------------------------------------------------------------
const DIE_PHYS_HALF = 0.13;
const DIE_CUBE_VERTS = [
  new THREE.Vector3(-DIE_PHYS_HALF, -DIE_PHYS_HALF, -DIE_PHYS_HALF),
  new THREE.Vector3( DIE_PHYS_HALF, -DIE_PHYS_HALF, -DIE_PHYS_HALF),
  new THREE.Vector3(-DIE_PHYS_HALF,  DIE_PHYS_HALF, -DIE_PHYS_HALF),
  new THREE.Vector3( DIE_PHYS_HALF,  DIE_PHYS_HALF, -DIE_PHYS_HALF),
  new THREE.Vector3(-DIE_PHYS_HALF, -DIE_PHYS_HALF,  DIE_PHYS_HALF),
  new THREE.Vector3( DIE_PHYS_HALF, -DIE_PHYS_HALF,  DIE_PHYS_HALF),
  new THREE.Vector3(-DIE_PHYS_HALF,  DIE_PHYS_HALF,  DIE_PHYS_HALF),
  new THREE.Vector3( DIE_PHYS_HALF,  DIE_PHYS_HALF,  DIE_PHYS_HALF),
];
const _tmpPhysV1 = new THREE.Vector3();
const _tmpPhysV2 = new THREE.Vector3();
const _tmpPhysV3 = new THREE.Vector3();
const _tmpPhysV4 = new THREE.Vector3();
const _tmpPhysV5 = new THREE.Vector3();
const _tmpPhysV6 = new THREE.Vector3();
const _tmpPhysRotAxis = new THREE.Vector3();
const _tmpPhysQ1 = new THREE.Quaternion();
const _tmpPhysAng1 = new THREE.Vector3();
const _tmpPhysAng2 = new THREE.Vector3();
const _tmpWorldVerts: THREE.Vector3[] = Array.from({ length: 8 }, () => new THREE.Vector3());
const _tmpPenetratingVerts: THREE.Vector3[] = [];

// Camera & animation scratch objects (Zero-allocation animate loop)
const _tmpCamLookAt = new THREE.Vector3();
const _tmpCamPos = new THREE.Vector3();
const _tmpMidpoint = new THREE.Vector3();
const _tmpCurPos = new THREE.Vector3();
const _tmpPromptPos = new THREE.Vector3();
const _tmpPromptScale = new THREE.Vector3();
const _tmpPromptMinScale = new THREE.Vector3(0.1, 0.1, 0.1);
const _tmpModalPos = new THREE.Vector3();
const _tmpModalScale = new THREE.Vector3();

// Zero-allocation scratch vectors for showcase dice
const _tmpShowcaseLocal1 = new THREE.Vector3();
const _tmpShowcaseLocal2 = new THREE.Vector3();
const _tmpShowcaseLocal3 = new THREE.Vector3();
const _tmpShowcaseLocalLerp1 = new THREE.Vector3();
const _tmpShowcaseLocalLerp2 = new THREE.Vector3();
const _tmpShowcaseLocalLerp3 = new THREE.Vector3();
const _tmpShowcaseWorld1 = new THREE.Vector3();
const _tmpShowcaseWorld2 = new THREE.Vector3();
const _tmpShowcaseWorld3 = new THREE.Vector3();

// Reusable static structures for getAlignedFlatQuaternion (eliminates ~25 allocations per call)
const STATIC_DIE_FACE_DATA = [
  { face: 1, normal: new THREE.Vector3(0, 0, 1), tangent: new THREE.Vector3(1, 0, 0) },   // +Z face (1)
  { face: 6, normal: new THREE.Vector3(0, 0, -1), tangent: new THREE.Vector3(1, 0, 0) },  // -Z face (6)
  { face: 2, normal: new THREE.Vector3(0, 1, 0), tangent: new THREE.Vector3(0, 0, 1) },   // +Y face (2)
  { face: 5, normal: new THREE.Vector3(0, -1, 0), tangent: new THREE.Vector3(0, 0, 1) },  // -Y face (5)
  { face: 3, normal: new THREE.Vector3(1, 0, 0), tangent: new THREE.Vector3(0, 0, 1) },   // +X face (3)
  { face: 4, normal: new THREE.Vector3(-1, 0, 0), tangent: new THREE.Vector3(0, 0, 1) },  // -X face (4)
];
const _alignUp = new THREE.Vector3(0, 1, 0);
const _alignWorldNormal = new THREE.Vector3();
const _alignWorldTangent = new THREE.Vector3();
const _alignFlatTangent = new THREE.Vector3();
const _alignFlatBitangent = new THREE.Vector3();
const _alignLocalBitangent = new THREE.Vector3();
const _alignMLocal = new THREE.Matrix4();
const _alignMWorld = new THREE.Matrix4();
const _alignMLocalInv = new THREE.Matrix4();
const _alignMFinal = new THREE.Matrix4();
const _tmpDieAlignQ = new THREE.Quaternion();

// Additional zero-allocation scratch variables for animate()
const _tmpPathColor = new THREE.Color();
const _tmpTilePos = new THREE.Vector3();
const _tmpDraftFlyPos = new THREE.Vector3();
const _tmpPurchaseWorldPos = new THREE.Vector3();
const _COLOR_DRAFT_ORANGE = new THREE.Color(0xf97316);
const _COLOR_DRAFT_GOLD = new THREE.Color(0xd4af37);
const _COLOR_DRAFT_EMISSIVE_ORANGE = new THREE.Color(0xea580c);
const _COLOR_DRAFT_BLACK = new THREE.Color(0x000000);

const _smoothSideResult = {
  normal: { x: 0, z: 0 },
  forward: { x: 0, z: 0 },
};

const _impactWrap1 = { time: 0 };
const _impactWrap2 = { time: 0 };
const _impactWrap3 = { time: 0 };

// Helper function to calculate continuous board angle (theta) around corners for buttery-smooth camera transitions
function getContinuousBoardTheta(t: number): number {
  const pos = ((t % 40) + 40) % 40;
  const halfSpan = 1.35; // Smooth 2.7-tile arc transition band centered at each 90-degree corner

  if (pos >= 10 - halfSpan && pos <= 10 + halfSpan) {
    const p = (pos - (10 - halfSpan)) / (2 * halfSpan);
    const ease = p * p * (3 - 2 * p);
    return ease * (Math.PI / 2);
  }
  if (pos > 10 + halfSpan && pos < 20 - halfSpan) {
    return Math.PI / 2;
  }
  if (pos >= 20 - halfSpan && pos <= 20 + halfSpan) {
    const p = (pos - (20 - halfSpan)) / (2 * halfSpan);
    const ease = p * p * (3 - 2 * p);
    return Math.PI / 2 + ease * (Math.PI / 2);
  }
  if (pos > 20 + halfSpan && pos < 30 - halfSpan) {
    return Math.PI;
  }
  if (pos >= 30 - halfSpan && pos <= 30 + halfSpan) {
    const p = (pos - (30 - halfSpan)) / (2 * halfSpan);
    const ease = p * p * (3 - 2 * p);
    return Math.PI + ease * (Math.PI / 2);
  }
  if (pos > 30 + halfSpan && pos < 40 - halfSpan) {
    return (3 * Math.PI) / 2;
  }
  // Corner 0 / 40 wrapping
  if (pos >= 40 - halfSpan) {
    const p = (pos - (40 - halfSpan)) / (2 * halfSpan);
    const ease = p * p * (3 - 2 * p);
    return (3 * Math.PI) / 2 + ease * (Math.PI / 2);
  }
  if (pos <= halfSpan) {
    const p = (pos + halfSpan) / (2 * halfSpan);
    const ease = p * p * (3 - 2 * p);
    return (3 * Math.PI) / 2 + ease * (Math.PI / 2);
  }
  return 0;
}

// Zero-allocation continuous outward side normal and forward movement vector for dynamic cinematic tracking
function getSmoothSideVectors(continuousIndex: number): { normal: { x: number; z: number }; forward: { x: number; z: number } } {
  const theta = getContinuousBoardTheta(continuousIndex);
  _smoothSideResult.normal.x = -Math.sin(theta);
  _smoothSideResult.normal.z = Math.cos(theta);
  _smoothSideResult.forward.x = -Math.cos(theta);
  _smoothSideResult.forward.z = -Math.sin(theta);
  return _smoothSideResult;
}

// -------------------------------------------------------------
// HELPER: Standard 2D Face Texture for Dice (Flat/Inset Dots)
// -------------------------------------------------------------
function createDieFaceTexture(dotValue: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Smooth white glossy surface
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  // Flat black 2D dots
  ctx.fillStyle = '#0F172A';

  const drawDot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const center = 128;
  const low = 64;
  const high = 192;

  if (dotValue === 1) {
    drawDot(center, center);
  } else if (dotValue === 2) {
    drawDot(low, low);
    drawDot(high, high);
  } else if (dotValue === 3) {
    drawDot(low, low);
    drawDot(center, center);
    drawDot(high, high);
  } else if (dotValue === 4) {
    drawDot(low, low);
    drawDot(high, low);
    drawDot(low, high);
    drawDot(high, high);
  } else if (dotValue === 5) {
    drawDot(low, low);
    drawDot(high, low);
    drawDot(center, center);
    drawDot(low, high);
    drawDot(high, high);
  } else if (dotValue === 6) {
    drawDot(low, low);
    drawDot(high, low);
    drawDot(low, center);
    drawDot(high, center);
    drawDot(low, high);
    drawDot(high, high);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Cache materials for 6 faces: +X(3), -X(4), +Y(2), -Y(5), +Z(1), -Z(6)
let dieFaceMaterialsCache: THREE.MeshStandardMaterial[] | null = null;

function get2DDieMaterials(): THREE.MeshStandardMaterial[] {
  if (!dieFaceMaterialsCache) {
    const faceValues = [3, 4, 2, 5, 1, 6];
    dieFaceMaterialsCache = faceValues.map((val) => {
      const tex = createDieFaceTexture(val);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.38,
        metalness: 0.05,
      });
    });
  }
  return dieFaceMaterialsCache;
}

function create2DDieMesh(): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const mats = get2DDieMaterials();
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  return mesh;
}

// Target rotations to display face value facing upright/front (+Z or top)
function getFaceTargetRotation(val: number): THREE.Euler {
  switch (val) {
    case 1:
      return new THREE.Euler(0, 0, 0); // +Z face (1)
    case 6:
      return new THREE.Euler(0, Math.PI, 0); // -Z face (6)
    case 2:
      return new THREE.Euler(Math.PI / 2, 0, 0); // +Y face (2)
    case 5:
      return new THREE.Euler(-Math.PI / 2, 0, 0); // -Y face (5)
    case 3:
      return new THREE.Euler(0, -Math.PI / 2, 0); // +X face (3)
    case 4:
      return new THREE.Euler(0, Math.PI / 2, 0); // -X face (4)
    default:
      return new THREE.Euler(0, 0, 0);
  }
}

// Helper: Calculate which die face value (1-6) is pointing upward (+Y in world space)
// and compute the nearest clean 90-degree horizon-level quaternion with anti-cocking leveling (Zero-allocation)
function getAlignedFlatQuaternion(currentQ: THREE.Quaternion, outQ?: THREE.Quaternion): { face: number; targetQ: THREE.Quaternion } {
  let bestDot = -Infinity;
  let bestData = STATIC_DIE_FACE_DATA[0];

  for (let i = 0; i < 6; i++) {
    const data = STATIC_DIE_FACE_DATA[i];
    _alignWorldNormal.copy(data.normal).applyQuaternion(currentQ);
    const dot = _alignWorldNormal.y; // dot with (0, 1, 0)
    if (dot > bestDot) {
      bestDot = dot;
      bestData = data;
    }
  }

  // Preserve the die's natural landing yaw heading on the XZ table plane
  _alignWorldTangent.copy(bestData.tangent).applyQuaternion(currentQ);
  _alignFlatTangent.set(_alignWorldTangent.x, 0, _alignWorldTangent.z);
  if (_alignFlatTangent.lengthSq() < 0.0001) {
    _alignFlatTangent.set(1, 0, 0);
  } else {
    _alignFlatTangent.normalize();
  }

  _alignFlatBitangent.crossVectors(_alignUp, _alignFlatTangent).normalize();
  _alignLocalBitangent.crossVectors(bestData.normal, bestData.tangent).normalize();

  _alignMLocal.makeBasis(bestData.tangent, bestData.normal, _alignLocalBitangent);
  _alignMWorld.makeBasis(_alignFlatTangent, _alignUp, _alignFlatBitangent);

  _alignMLocalInv.copy(_alignMLocal).invert();
  _alignMFinal.multiplyMatrices(_alignMWorld, _alignMLocalInv);

  const targetQ = outQ || new THREE.Quaternion();
  targetQ.setFromRotationMatrix(_alignMFinal);
  return { face: bestData.face, targetQ };
}

// Target quaternion for dice lying flat on felt board floor (+Y facing up)
function getBoardFlatTargetQuaternion(val: number, yaw = 0): THREE.Quaternion {
  const euler = new THREE.Euler();
  switch (val) {
    case 1: euler.set(-Math.PI / 2, 0, 0, 'YXZ'); break;
    case 6: euler.set(Math.PI / 2, 0, 0, 'YXZ'); break;
    case 2: euler.set(0, 0, 0, 'YXZ'); break;
    case 5: euler.set(Math.PI, 0, 0, 'YXZ'); break;
    case 3: euler.set(0, 0, -Math.PI / 2, 'YXZ'); break;
    case 4: euler.set(0, 0, Math.PI / 2, 'YXZ'); break;
    default: euler.set(0, 0, 0, 'YXZ'); break;
  }
  const baseQ = new THREE.Quaternion().setFromEuler(euler);
  if (yaw !== 0) {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    yawQ.multiply(baseQ);
    return yawQ;
  }
  return baseQ;
}

// Target quaternion so that the face showing `val` directly faces the camera eye upright
function getCameraShowcaseQuaternion(val: number, camera: THREE.Camera): THREE.Quaternion {
  // Pure right-handed orthonormal basis for each die face:
  // right x up = normal (det = +1)
  // When rotated to camera space:
  // right -> +X (screen right)
  // up -> +Y (screen up)
  // normal -> +Z (out of screen towards viewer's eyes)
  const faceBasis: Record<number, { right: THREE.Vector3; up: THREE.Vector3; normal: THREE.Vector3 }> = {
    1: { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(0, 0, 1) },
    6: { right: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(0, 0, -1) },
    2: { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, -1), normal: new THREE.Vector3(0, 1, 0) },
    5: { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(0, -1, 0) },
    3: { right: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(1, 0, 0) },
    4: { right: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3(-1, 0, 0) },
  };

  const b = faceBasis[val] || faceBasis[1];
  const mLocal = new THREE.Matrix4().makeBasis(b.right, b.up, b.normal);
  // Invert local basis to map face features onto (+X, +Y, +Z)
  const qLocalInv = new THREE.Quaternion().setFromRotationMatrix(mLocal.clone().invert());
  // Multiply by camera world orientation so the face points directly at the camera
  return camera.quaternion.clone().multiply(qLocalInv);
}

// -------------------------------------------------------------
// HELPER: Create Distinct 3D Player Token/Pawn Meshes with Floating 3D Avatar
// -------------------------------------------------------------
function createDistinctPlayerTokenMesh(
  shape: TokenShape,
  colorHex: string,
  avatarColor?: string,
  avatarShape?: 'cube' | 'sphere' | 'pyramid' | 'torus' | 'octahedron'
): THREE.Group {
  const tokenGroup = new THREE.Group();
  tokenGroup.userData = { currentShape: shape, isPlayerToken: true };
  tokenGroup.scale.set(0.49, 0.49, 0.49); // Tokens sized down by 30% for ideal board proportion and realism

  const tokenInfo = getPremiumToken(shape);

  // High-end metallic PBR Materials for luxury board game piece feel
  const primaryMetalMat = new THREE.MeshStandardMaterial({
    color: tokenInfo.baseMaterialColor,
    metalness: 0.88,
    roughness: 0.22,
  });

  const playerAccentMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.76,
    roughness: 0.28,
    emissive: colorHex,
    emissiveIntensity: 0.08,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.16,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.96,
    roughness: 0.1,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.35,
  });

  const rubyGemMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.2,
    roughness: 0.12,
    emissive: 0xef4444,
    emissiveIntensity: 0.3,
  });

  // Collector's Weighted Heirloom Pedestal Base
  const plinthBaseGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.035, 32);
  const plinthBase = new THREE.Mesh(plinthBaseGeo, primaryMetalMat);
  plinthBase.position.y = 0.0175;
  tokenGroup.add(plinthBase);

  const plinthRimGeo = new THREE.TorusGeometry(0.24, 0.014, 12, 32);
  plinthRimGeo.rotateX(Math.PI / 2);
  const plinthRim = new THREE.Mesh(plinthRimGeo, goldTrimMat);
  plinthRim.position.y = 0.035;
  tokenGroup.add(plinthRim);

  // Sculpted Token Geometry
  if (shape === 'hat') {
    // --- 1. THE GILDED TOP HAT ---
    const brimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 32);
    const brim = new THREE.Mesh(brimGeo, primaryMetalMat);
    brim.position.y = 0.045;
    tokenGroup.add(brim);

    const brimRollGeo = new THREE.TorusGeometry(0.235, 0.012, 10, 32);
    brimRollGeo.rotateX(Math.PI / 2);
    const brimRoll = new THREE.Mesh(brimRollGeo, primaryMetalMat);
    brimRoll.position.y = 0.055;
    tokenGroup.add(brimRoll);

    const crownGeo = new THREE.CylinderGeometry(0.165, 0.145, 0.26, 32);
    const crown = new THREE.Mesh(crownGeo, primaryMetalMat);
    crown.position.y = 0.175;
    tokenGroup.add(crown);

    const ribbonGeo = new THREE.CylinderGeometry(0.148, 0.146, 0.045, 32);
    const ribbon = new THREE.Mesh(ribbonGeo, playerAccentMat);
    ribbon.position.y = 0.075;
    tokenGroup.add(ribbon);

    const buckleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.015);
    const buckle = new THREE.Mesh(buckleGeo, goldTrimMat);
    buckle.position.set(0.145, 0.075, 0);
    tokenGroup.add(buckle);

    const crownRimGeo = new THREE.TorusGeometry(0.16, 0.01, 10, 32);
    crownRimGeo.rotateX(Math.PI / 2);
    const crownRim = new THREE.Mesh(crownRimGeo, goldTrimMat);
    crownRim.position.y = 0.305;
    tokenGroup.add(crownRim);
  } else if (shape === 'car') {
    // --- 2. THE 1930s LUXURY ROADSTER ---
    const chassisGeo = new THREE.BoxGeometry(0.44, 0.065, 0.18);
    const chassis = new THREE.Mesh(chassisGeo, darkMetalMat);
    chassis.position.y = 0.065;
    tokenGroup.add(chassis);

    const hoodGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.22, 16);
    hoodGeo.rotateX(Math.PI / 2);
    const hood = new THREE.Mesh(hoodGeo, primaryMetalMat);
    hood.position.set(0, 0.115, 0.05);
    tokenGroup.add(hood);

    const grilleGeo = new THREE.BoxGeometry(0.13, 0.11, 0.015);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(0, 0.115, 0.165);
    tokenGroup.add(grille);

    const mascotGeo = new THREE.ConeGeometry(0.015, 0.035, 4);
    mascotGeo.rotateX(Math.PI / 4);
    const mascot = new THREE.Mesh(mascotGeo, goldTrimMat);
    mascot.position.set(0, 0.18, 0.16);
    tokenGroup.add(mascot);

    [-0.075, 0.075].forEach((x) => {
      const lampGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12);
      lampGeo.rotateX(Math.PI / 2);
      const lamp = new THREE.Mesh(lampGeo, chromeMat);
      lamp.position.set(x, 0.125, 0.155);
      tokenGroup.add(lamp);
    });

    const cockpitGeo = new THREE.BoxGeometry(0.13, 0.06, 0.12);
    const cockpit = new THREE.Mesh(cockpitGeo, playerAccentMat);
    cockpit.position.set(0, 0.11, -0.06);
    tokenGroup.add(cockpit);

    const windshieldGeo = new THREE.BoxGeometry(0.14, 0.06, 0.012);
    windshieldGeo.rotateX(Math.PI / 10);
    const windshield = new THREE.Mesh(windshieldGeo, chromeMat);
    windshield.position.set(0, 0.165, 0.01);
    tokenGroup.add(windshield);

    const rearDeckGeo = new THREE.ConeGeometry(0.085, 0.16, 16);
    rearDeckGeo.rotateX(-Math.PI / 2);
    const rearDeck = new THREE.Mesh(rearDeckGeo, primaryMetalMat);
    rearDeck.position.set(0, 0.105, -0.15);
    tokenGroup.add(rearDeck);

    const wheelPositions = [
      [-0.105, 0.06, 0.10],
      [0.105, 0.06, 0.10],
      [-0.105, 0.06, -0.10],
      [0.105, 0.06, -0.10],
    ];
    const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
      wheel.position.set(x, y, z);
      tokenGroup.add(wheel);

      const hubGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.032, 12);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, chromeMat);
      hub.position.set(x, y, z);
      tokenGroup.add(hub);
    });
  } else if (shape === 'ship') {
    // --- 3. THE ROYAL BATTLESHIP ---
    const hullGeo = new THREE.BoxGeometry(0.14, 0.09, 0.44);
    const hull = new THREE.Mesh(hullGeo, primaryMetalMat);
    hull.position.set(0, 0.075, 0);
    tokenGroup.add(hull);

    const prowGeo = new THREE.ConeGeometry(0.07, 0.12, 4);
    prowGeo.rotateY(Math.PI / 4);
    prowGeo.rotateX(-Math.PI / 2);
    const prow = new THREE.Mesh(prowGeo, primaryMetalMat);
    prow.position.set(0, 0.075, 0.24);
    tokenGroup.add(prow);

    const sternGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.09, 16);
    const stern = new THREE.Mesh(sternGeo, primaryMetalMat);
    stern.position.set(0, 0.075, -0.19);
    tokenGroup.add(stern);

    const waterLineGeo = new THREE.BoxGeometry(0.145, 0.02, 0.44);
    const waterLine = new THREE.Mesh(waterLineGeo, playerAccentMat);
    waterLine.position.set(0, 0.045, 0);
    tokenGroup.add(waterLine);

    const bridgeGeo = new THREE.BoxGeometry(0.10, 0.09, 0.16);
    const bridge = new THREE.Mesh(bridgeGeo, primaryMetalMat);
    bridge.position.set(0, 0.155, 0.02);
    tokenGroup.add(bridge);

    const obsDeckGeo = new THREE.BoxGeometry(0.07, 0.05, 0.09);
    const obsDeck = new THREE.Mesh(obsDeckGeo, chromeMat);
    obsDeck.position.set(0, 0.215, 0.02);
    tokenGroup.add(obsDeck);

    const mastGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.12, 8);
    const mast = new THREE.Mesh(mastGeo, goldTrimMat);
    mast.position.set(0, 0.28, 0.05);
    tokenGroup.add(mast);

    [-0.04, -0.09].forEach((z) => {
      const funnelGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.07, 12);
      funnelGeo.rotateX(-Math.PI / 16);
      const funnel = new THREE.Mesh(funnelGeo, goldTrimMat);
      funnel.position.set(0, 0.18, z);
      tokenGroup.add(funnel);

      const capGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.015, 12);
      const cap = new THREE.Mesh(capGeo, darkMetalMat);
      cap.position.set(0, 0.215, z - 0.005);
      tokenGroup.add(cap);
    });

    [0.14, -0.14].forEach((z, idx) => {
      const turretGeo = new THREE.CylinderGeometry(0.045, 0.048, 0.03, 16);
      const turret = new THREE.Mesh(turretGeo, primaryMetalMat);
      turret.position.set(0, 0.125, z);
      tokenGroup.add(turret);

      const barrelGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.10, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrelDir = idx === 0 ? 1 : -1;

      [-0.015, 0.015].forEach((x) => {
        const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
        barrel.position.set(x, 0.13, z + barrelDir * 0.05);
        tokenGroup.add(barrel);
      });
    });
  } else if (shape === 'thimble') {
    // --- 4. THE JEWELED THIMBLE ---
    const bodyGeo = new THREE.CylinderGeometry(0.13, 0.18, 0.28, 28);
    const body = new THREE.Mesh(bodyGeo, primaryMetalMat);
    body.position.y = 0.17;
    tokenGroup.add(body);

    const flaredRimGeo = new THREE.TorusGeometry(0.185, 0.018, 12, 28);
    flaredRimGeo.rotateX(Math.PI / 2);
    const flaredRim = new THREE.Mesh(flaredRimGeo, goldTrimMat);
    flaredRim.position.y = 0.04;
    tokenGroup.add(flaredRim);

    [0.10, 0.15, 0.20, 0.25].forEach((y, i) => {
      const radius = 0.165 - i * 0.012;
      const bandGeo = new THREE.TorusGeometry(radius, 0.008, 8, 28);
      bandGeo.rotateX(Math.PI / 2);
      const band = new THREE.Mesh(bandGeo, i % 2 === 0 ? playerAccentMat : goldTrimMat);
      band.position.y = y;
      tokenGroup.add(band);
    });

    const domeGeo = new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, primaryMetalMat);
    dome.position.y = 0.31;
    tokenGroup.add(dome);

    const crestGeo = new THREE.OctahedronGeometry(0.035);
    const crest = new THREE.Mesh(crestGeo, rubyGemMat);
    crest.position.y = 0.355;
    tokenGroup.add(crest);
  } else if (shape === 'dog') {
    // --- 5. THE SCOTTISH TERRIER ---
    const torsoGeo = new THREE.BoxGeometry(0.13, 0.12, 0.24);
    const torso = new THREE.Mesh(torsoGeo, primaryMetalMat);
    torso.position.set(0, 0.13, 0);
    tokenGroup.add(torso);

    const skirtGeo = new THREE.BoxGeometry(0.15, 0.05, 0.26);
    const skirt = new THREE.Mesh(skirtGeo, primaryMetalMat);
    skirt.position.set(0, 0.065, 0);
    tokenGroup.add(skirt);

    const headGeo = new THREE.BoxGeometry(0.11, 0.10, 0.15);
    const head = new THREE.Mesh(headGeo, primaryMetalMat);
    head.position.set(0, 0.20, 0.12);
    tokenGroup.add(head);

    const snoutGeo = new THREE.BoxGeometry(0.09, 0.07, 0.11);
    const snout = new THREE.Mesh(snoutGeo, primaryMetalMat);
    snout.position.set(0, 0.17, 0.21);
    tokenGroup.add(snout);

    const noseGeo = new THREE.SphereGeometry(0.02, 10, 10);
    const nose = new THREE.Mesh(noseGeo, darkMetalMat);
    nose.position.set(0, 0.185, 0.265);
    tokenGroup.add(nose);

    [-0.04, 0.04].forEach((x) => {
      const earGeo = new THREE.ConeGeometry(0.03, 0.08, 3);
      earGeo.rotateZ(x > 0 ? -Math.PI / 14 : Math.PI / 14);
      const ear = new THREE.Mesh(earGeo, primaryMetalMat);
      ear.position.set(x, 0.28, 0.10);
      tokenGroup.add(ear);
    });

    const collarGeo = new THREE.TorusGeometry(0.07, 0.015, 8, 20);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, playerAccentMat);
    collar.position.set(0, 0.17, 0.06);
    tokenGroup.add(collar);

    const tagGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12);
    tagGeo.rotateX(Math.PI / 2);
    const tag = new THREE.Mesh(tagGeo, goldTrimMat);
    tag.position.set(0, 0.135, 0.13);
    tokenGroup.add(tag);

    const tailGeo = new THREE.ConeGeometry(0.02, 0.12, 8);
    tailGeo.rotateX(Math.PI / 5);
    const tail = new THREE.Mesh(tailGeo, primaryMetalMat);
    tail.position.set(0, 0.21, -0.12);
    tokenGroup.add(tail);

    [[-0.05, 0.08], [0.05, 0.08], [-0.05, -0.08], [0.05, -0.08]].forEach(([x, z]) => {
      const pawGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.05, 10);
      const paw = new THREE.Mesh(pawGeo, primaryMetalMat);
      paw.position.set(x, 0.05, z);
      tokenGroup.add(paw);
    });
  } else if (shape === 'boot') {
    // --- 6. THE DAPPER OXFORD BOOT ---
    const soleGeo = new THREE.BoxGeometry(0.13, 0.03, 0.32);
    const sole = new THREE.Mesh(soleGeo, darkMetalMat);
    sole.position.set(0, 0.045, 0.02);
    tokenGroup.add(sole);

    const heelGeo = new THREE.BoxGeometry(0.13, 0.04, 0.10);
    const heel = new THREE.Mesh(heelGeo, primaryMetalMat);
    heel.position.set(0, 0.07, -0.09);
    tokenGroup.add(heel);

    const toeGeo = new THREE.BoxGeometry(0.125, 0.07, 0.16);
    const toe = new THREE.Mesh(toeGeo, primaryMetalMat);
    toe.position.set(0, 0.08, 0.08);
    tokenGroup.add(toe);

    const toeCapGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.12, 16);
    toeCapGeo.rotateZ(Math.PI / 2);
    const toeCap = new THREE.Mesh(toeCapGeo, goldTrimMat);
    toeCap.position.set(0, 0.08, 0.15);
    tokenGroup.add(toeCap);

    const shaftGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.20, 16);
    const shaft = new THREE.Mesh(shaftGeo, primaryMetalMat);
    shaft.position.set(0, 0.18, -0.04);
    tokenGroup.add(shaft);

    const collarTrimGeo = new THREE.TorusGeometry(0.072, 0.012, 8, 16);
    collarTrimGeo.rotateX(Math.PI / 2);
    const collarTrim = new THREE.Mesh(collarTrimGeo, playerAccentMat);
    collarTrim.position.set(0, 0.28, -0.04);
    tokenGroup.add(collarTrim);

    [0.14, 0.18, 0.22, 0.26].forEach((y) => {
      const laceGeo = new THREE.BoxGeometry(0.08, 0.012, 0.02);
      const lace = new THREE.Mesh(laceGeo, goldTrimMat);
      lace.position.set(0, y, 0.03);
      tokenGroup.add(lace);
    });

    const pullTabGeo = new THREE.BoxGeometry(0.02, 0.06, 0.015);
    const pullTab = new THREE.Mesh(pullTabGeo, playerAccentMat);
    pullTab.position.set(0, 0.29, -0.11);
    tokenGroup.add(pullTab);
  } else if (shape === 'train') {
    // --- 7. THE IRON HORSE LOCOMOTIVE ---
    const boilerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.28, 20);
    boilerGeo.rotateX(Math.PI / 2);
    const boiler = new THREE.Mesh(boilerGeo, primaryMetalMat);
    boiler.position.set(0, 0.13, 0.04);
    tokenGroup.add(boiler);

    const stackGeo = new THREE.CylinderGeometry(0.045, 0.025, 0.13, 16);
    const stack = new THREE.Mesh(stackGeo, primaryMetalMat);
    stack.position.set(0, 0.24, 0.13);
    tokenGroup.add(stack);

    const stackRingGeo = new THREE.TorusGeometry(0.045, 0.008, 8, 16);
    stackRingGeo.rotateX(Math.PI / 2);
    const stackRing = new THREE.Mesh(stackRingGeo, goldTrimMat);
    stackRing.position.set(0, 0.30, 0.13);
    tokenGroup.add(stackRing);

    [0.05, -0.02].forEach((z) => {
      const domeGeo = new THREE.SphereGeometry(0.035, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, goldTrimMat);
      dome.position.set(0, 0.21, z);
      tokenGroup.add(dome);
    });

    const cabGeo = new THREE.BoxGeometry(0.14, 0.16, 0.13);
    const cab = new THREE.Mesh(cabGeo, primaryMetalMat);
    cab.position.set(0, 0.17, -0.10);
    tokenGroup.add(cab);

    const cabRoofGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16, 1, false, 0, Math.PI);
    cabRoofGeo.rotateZ(Math.PI / 2);
    cabRoofGeo.rotateX(Math.PI / 2);
    const cabRoof = new THREE.Mesh(cabRoofGeo, playerAccentMat);
    cabRoof.position.set(0, 0.25, -0.10);
    tokenGroup.add(cabRoof);

    const cowcatcherGeo = new THREE.ConeGeometry(0.08, 0.10, 4);
    cowcatcherGeo.rotateX(-Math.PI / 2);
    cowcatcherGeo.rotateY(Math.PI / 4);
    const cowcatcher = new THREE.Mesh(cowcatcherGeo, goldTrimMat);
    cowcatcher.position.set(0, 0.07, 0.21);
    tokenGroup.add(cowcatcher);

    const lampGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12);
    lampGeo.rotateX(Math.PI / 2);
    const lamp = new THREE.Mesh(lampGeo, goldTrimMat);
    lamp.position.set(0, 0.16, 0.18);
    tokenGroup.add(lamp);

    [-0.08, 0.08].forEach((x) => {
      [0.08, 0.0, -0.08].forEach((z) => {
        const wheelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
        wheel.position.set(x, 0.065, z);
        tokenGroup.add(wheel);

        const rimGeo = new THREE.TorusGeometry(0.05, 0.005, 8, 16);
        rimGeo.rotateY(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, goldTrimMat);
        rim.position.set(x, 0.065, z);
        tokenGroup.add(rim);
      });
    });
  } else {
    // --- 8. THE SOVEREIGN CROWN ---
    const bandGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 32);
    const band = new THREE.Mesh(bandGeo, primaryMetalMat);
    band.position.y = 0.065;
    tokenGroup.add(band);

    const lowerRimGeo = new THREE.TorusGeometry(0.182, 0.012, 10, 32);
    lowerRimGeo.rotateX(Math.PI / 2);
    const lowerRim = new THREE.Mesh(lowerRimGeo, goldTrimMat);
    lowerRim.position.y = 0.035;
    tokenGroup.add(lowerRim);

    const upperRimGeo = new THREE.TorusGeometry(0.182, 0.012, 10, 32);
    upperRimGeo.rotateX(Math.PI / 2);
    const upperRim = new THREE.Mesh(upperRimGeo, goldTrimMat);
    upperRim.position.y = 0.095;
    tokenGroup.add(upperRim);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const jx = Math.cos(angle) * 0.185;
      const jz = Math.sin(angle) * 0.185;
      const gemGeo = new THREE.SphereGeometry(0.022, 10, 10);
      const gemMat = i % 2 === 0 ? rubyGemMat : playerAccentMat;
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(jx, 0.065, jz);
      tokenGroup.add(gem);
    }

    const velvetCapGeo = new THREE.SphereGeometry(0.155, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const velvetCap = new THREE.Mesh(velvetCapGeo, playerAccentMat);
    velvetCap.position.y = 0.07;
    tokenGroup.add(velvetCap);

    for (let i = 0; i < 4; i++) {
      const archAngle = (i * Math.PI) / 2;
      const archGeo = new THREE.TorusGeometry(0.15, 0.014, 8, 20, Math.PI);
      const arch = new THREE.Mesh(archGeo, goldTrimMat);
      arch.position.y = 0.08;
      arch.rotation.y = archAngle;
      tokenGroup.add(arch);
    }

    const orbGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const orb = new THREE.Mesh(orbGeo, goldTrimMat);
    orb.position.y = 0.245;
    tokenGroup.add(orb);

    const crossVGeo = new THREE.BoxGeometry(0.014, 0.06, 0.014);
    const crossV = new THREE.Mesh(crossVGeo, goldTrimMat);
    crossV.position.y = 0.285;
    tokenGroup.add(crossV);

    const crossHGeo = new THREE.BoxGeometry(0.045, 0.014, 0.014);
    const crossH = new THREE.Mesh(crossHGeo, rubyGemMat);
    crossH.position.y = 0.295;
    tokenGroup.add(crossH);
  }

  // Floating 3D Colorful Avatar Identifier Object (Elevated gracefully above all pieces)
  const avatarGroup = new THREE.Group();
  avatarGroup.position.y = 0.44;

  const effAvatarColor = avatarColor || colorHex;
  const avatarMat = new THREE.MeshStandardMaterial({
    color: effAvatarColor,
    metalness: 0.15,
    roughness: 0.35,
    emissive: effAvatarColor,
    emissiveIntensity: 0.15,
  });

  const effShape = avatarShape || 'sphere';
  let avatarMesh: THREE.Mesh;

  if (effShape === 'cube') {
    avatarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), avatarMat);
  } else if (effShape === 'pyramid') {
    avatarMesh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.15, 4), avatarMat);
  } else if (effShape === 'torus') {
    avatarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 12, 24), avatarMat);
  } else if (effShape === 'octahedron') {
    avatarMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), avatarMat);
  } else {
    avatarMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), avatarMat);
  }

  avatarGroup.add(avatarMesh);

  // Outer accent metallic ring
  const ringGeo = new THREE.TorusGeometry(0.115, 0.014, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.4,
    roughness: 0.3,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  avatarGroup.add(ringMesh);

  avatarGroup.userData = { isAvatarIdentifier: true };
  tokenGroup.add(avatarGroup);

  tokenGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Turn off runtime shadow casting on meshes to eliminate shadow depth pass overhead
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });

  return tokenGroup;
}

// -------------------------------------------------------------
// PRE-ALLOCATED OBJECT POOLS FOR 3D FLOATING TEXT & DEED SPRITES
// Eliminates fresh <canvas> allocations, context churn & GC spikes
// -------------------------------------------------------------
interface PooledFloatingTextItem {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  inUse: boolean;
}

const FLOATING_TEXT_POOL_SIZE = 12;
let floatingTextPool: PooledFloatingTextItem[] | null = null;

function initFloatingTextPool(): PooledFloatingTextItem[] {
  if (floatingTextPool) return floatingTextPool;
  floatingTextPool = [];
  for (let i = 0; i < FLOATING_TEXT_POOL_SIZE; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.85, 0.42, 1.0);
    sprite.visible = false;
    floatingTextPool.push({ sprite, canvas, ctx, texture, inUse: false });
  }
  return floatingTextPool;
}

function create3DFloatingTextSprite(text: string, color: string): THREE.Sprite {
  const pool = initFloatingTextPool();
  let item = pool.find((p) => !p.inUse);
  if (!item) {
    item = pool[0]; // Recycle oldest active item if pool is saturated
  }
  item.inUse = true;
  const { ctx, texture, sprite } = item;
  ctx.clearRect(0, 0, 512, 256);
  ctx.font = "900 72px 'Google Sans', 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 14;
  ctx.strokeText(text, 256, 128);
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 128);
  texture.needsUpdate = true;
  sprite.visible = true;
  (sprite.material as THREE.SpriteMaterial).opacity = 1.0;
  return sprite;
}

function release3DFloatingTextSprite(sprite: THREE.Sprite) {
  if (!floatingTextPool) return;
  const item = floatingTextPool.find((p) => p.sprite === sprite);
  if (item) {
    item.inUse = false;
    item.sprite.visible = false;
  }
}

interface PooledDeedCardItem {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  inUse: boolean;
}

const DEED_CARD_POOL_SIZE = 8;
let deedCardPool: PooledDeedCardItem[] | null = null;

function initDeedCardPool(): PooledDeedCardItem[] {
  if (deedCardPool) return deedCardPool;
  deedCardPool = [];
  for (let i = 0; i < DEED_CARD_POOL_SIZE; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 680;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.48, 0.64, 1.0);
    sprite.visible = false;
    deedCardPool.push({ sprite, canvas, ctx, texture, inUse: false });
  }
  return deedCardPool;
}

function create3DDeedCardSprite(colorGroup?: string): THREE.Sprite {
  const pool = initDeedCardPool();
  let item = pool.find((p) => !p.inUse);
  if (!item) {
    item = pool[0];
  }
  item.inUse = true;
  const { ctx, texture, sprite } = item;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, 512, 680);
  ctx.save();
  ctx.scale(2, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 324, 16);
  ctx.fill();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 6;
  ctx.stroke();

  const bandColor = colorGroup && COLOR_HEX_STR[colorGroup] ? COLOR_HEX_STR[colorGroup] : '#2563EB';
  ctx.fillStyle = bandColor;
  ctx.beginPath();
  ctx.roundRect(16, 16, 224, 80, 10);
  ctx.fill();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "bold 32px 'Google Sans', 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText('TITLE', 128, 150);
  ctx.fillText('DEED', 128, 195);

  ctx.fillStyle = '#10B981';
  ctx.font = "bold 44px sans-serif";
  ctx.fillText('✓', 128, 260);
  ctx.restore();

  texture.needsUpdate = true;
  sprite.visible = true;
  (sprite.material as THREE.SpriteMaterial).opacity = 1.0;
  return sprite;
}

function release3DDeedCardSprite(sprite: THREE.Sprite) {
  if (!deedCardPool) return;
  const item = deedCardPool.find((p) => p.sprite === sprite);
  if (item) {
    item.inUse = false;
    item.sprite.visible = false;
  }
}

// -------------------------------------------------------------
// HELPER: Standard Monopoly 3D Physical House Mesh
// Classic forest green rectangular house with pitched/gabled roof & chimney
// -------------------------------------------------------------
function createStandardMonopolyHouseMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'monopoly_house';

  const houseGreenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Classic vibrant Monopoly forest green
    roughness: 0.35,
    metalness: 0.08,
  });

  const houseW = 0.115;
  const houseD = 0.12;
  const wallH = 0.065;
  const roofH = 0.045;

  // Base Walls
  const wallGeo = new THREE.BoxGeometry(houseW, wallH, houseD);
  const wallMesh = new THREE.Mesh(wallGeo, houseGreenMat);
  wallMesh.position.y = wallH / 2;
  wallMesh.castShadow = false;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // Pitched Roof: Triangular prism running along X axis
  const roofShape = new THREE.Shape();
  const halfD = (houseD + 0.015) / 2;
  roofShape.moveTo(-halfD, 0);
  roofShape.lineTo(0, roofH);
  roofShape.lineTo(halfD, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: houseW + 0.015,
    bevelEnabled: false,
  });
  roofGeo.center();

  const roofMesh = new THREE.Mesh(roofGeo, houseGreenMat);
  roofMesh.rotation.y = Math.PI / 2;
  roofMesh.position.y = wallH + roofH / 2;
  roofMesh.castShadow = false;
  group.add(roofMesh);

  // Classic Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.018, 0.032, 0.018);
  const chimneyMesh = new THREE.Mesh(chimneyGeo, houseGreenMat);
  chimneyMesh.position.set(0.025, wallH + roofH * 0.72, 0.025);
  chimneyMesh.castShadow = false;
  group.add(chimneyMesh);

  return group;
}

// -------------------------------------------------------------
// HELPER: Standard Monopoly 3D Physical Hotel Mesh
// Classic scarlet red hotel with pitched/gabled roof & dual chimneys
// -------------------------------------------------------------
function createStandardMonopolyHotelMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'monopoly_hotel';

  const hotelRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Classic Monopoly scarlet red
    roughness: 0.35,
    metalness: 0.08,
  });

  const hotelW = 0.28;
  const hotelD = 0.14;
  const wallH = 0.08;
  const roofH = 0.055;

  // Base Walls
  const wallGeo = new THREE.BoxGeometry(hotelW, wallH, hotelD);
  const wallMesh = new THREE.Mesh(wallGeo, hotelRedMat);
  wallMesh.position.y = wallH / 2;
  wallMesh.castShadow = false;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // Pitched Roof
  const roofShape = new THREE.Shape();
  const halfD = (hotelD + 0.02) / 2;
  roofShape.moveTo(-halfD, 0);
  roofShape.lineTo(0, roofH);
  roofShape.lineTo(halfD, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: hotelW + 0.02,
    bevelEnabled: false,
  });
  roofGeo.center();

  const roofMesh = new THREE.Mesh(roofGeo, hotelRedMat);
  roofMesh.rotation.y = Math.PI / 2;
  roofMesh.position.y = wallH + roofH / 2;
  roofMesh.castShadow = false;
  group.add(roofMesh);

  // Classic Chimneys
  const chimGeo = new THREE.BoxGeometry(0.024, 0.04, 0.024);
  const chim1 = new THREE.Mesh(chimGeo, hotelRedMat);
  chim1.position.set(-0.065, wallH + roofH * 0.75, 0.03);
  chim1.castShadow = false;
  group.add(chim1);

  const chim2 = new THREE.Mesh(chimGeo, hotelRedMat);
  chim2.position.set(0.065, wallH + roofH * 0.75, 0.03);
  chim2.castShadow = false;
  group.add(chim2);

  return group;
}

// -------------------------------------------------------------
// HELPER: Sync Physical Buildings (Houses / Hotel) on Tile Color Band
// -------------------------------------------------------------
function updateTilePhysicalBuildings(tileMesh: THREE.Mesh, prop: Property | undefined) {
  let buildingsGroup = tileMesh.children.find(
    (c) => c.userData && c.userData.isBuildingsGroup
  ) as THREE.Group | undefined;

  if (!buildingsGroup) {
    buildingsGroup = new THREE.Group();
    buildingsGroup.userData = { isBuildingsGroup: true };
    tileMesh.add(buildingsGroup);
  }

  // Clear existing children
  while (buildingsGroup.children.length > 0) {
    const child = buildingsGroup.children[0];
    buildingsGroup.remove(child);
  }

  if (!prop || (!prop.houses && !prop.hotel)) {
    return;
  }

  // Placed right on the tile color band (y = 0.042, z = 0.62)
  const zPos = 0.62;
  const yPos = 0.042;

  if (prop.hotel) {
    const hotelMesh = createStandardMonopolyHotelMesh();
    hotelMesh.position.set(0, yPos, zPos);
    buildingsGroup.add(hotelMesh);
  } else if (prop.houses && prop.houses > 0) {
    const count = Math.min(4, prop.houses);
    let xOffsets: number[] = [];
    if (count === 1) xOffsets = [0];
    else if (count === 2) xOffsets = [-0.13, 0.13];
    else if (count === 3) xOffsets = [-0.20, 0, 0.20];
    else if (count === 4) xOffsets = [-0.255, -0.085, 0.085, 0.255];

    xOffsets.forEach((xOff) => {
      const houseMesh = createStandardMonopolyHouseMesh();
      houseMesh.position.set(xOff, yPos, zPos);
      buildingsGroup!.add(houseMesh);
    });
  }
}

// -------------------------------------------------------------
// HELPER: Localized 3D Particle Burst (Coin Disintegration)
// -------------------------------------------------------------
interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
}

function spawnParticleBurstMeshGroup(
  scene: THREE.Scene,
  pos: THREE.Vector3,
  colorHex: number
): { id: string; particles: BurstParticle[]; startTime: number } {
  const count = 24;
  const particles: BurstParticle[] = [];
  const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8); // Coin disc geometry

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.0,
    roughness: 0.95,
    transparent: true,
    opacity: 1.0,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Gold coins mixed in
    metalness: 0.0,
    roughness: 0.95,
    transparent: true,
    opacity: 1.0,
  });

  for (let i = 0; i < count; i++) {
    const isGold = i % 2 === 0;
    const mesh = new THREE.Mesh(geo, isGold ? goldMat.clone() : mat.clone());
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.3,
      pos.y + 0.1 + Math.random() * 0.2,
      pos.z + (Math.random() - 0.5) * 0.3
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.2;
    const vy = 2.8 + Math.random() * 2.2; // Upward initial velocity
    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;

    particles.push({
      mesh,
      velocity: new THREE.Vector3(vx, vy, vz),
      rotVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      ),
    });
  }

  return {
    id: `burst_${Date.now()}_${Math.random()}`,
    particles,
    startTime: performance.now(),
  };
}

// -------------------------------------------------------------
// HELPER: Diegetic Horizontal Chance Card Textures
// -------------------------------------------------------------
function createChanceCardFrontTexture(cCard: ChanceCard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024; // High-DPI 3:2 landscape
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  // Background: Soft ivory/off-white canvas
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.roundRect(8, 8, 752, 496, 20);
  ctx.fill();

  // Double border in vibrant Chance orange
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(20, 20, 728, 472, 14);
  ctx.stroke();

  // Header Banner "★ CHANCE ★"
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.roundRect(32, 28, 704, 72, 14);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "900 34px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('★ CHANCE ★', 384, 64);

  // Subtitle / Category
  if (cCard.subTitle) {
    ctx.fillStyle = '#78350F';
    ctx.font = "700 20px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(cCard.subTitle.toUpperCase(), 384, 122);
  }

  // Center Question Mark Badge
  ctx.fillStyle = '#FFEDD5';
  ctx.beginPath();
  ctx.arc(384, 185, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#EA580C';
  ctx.font = "900 48px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('?', 384, 187);

  // Main Card Title - crisp font with clean word wrapping
  drawWrappedCardTitle(
    ctx,
    cCard.title.toUpperCase(),
    384,
    256,
    680,
    "800 32px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif",
    32,
    '#451A03'
  );

  // Description Card Box
  ctx.fillStyle = '#FFF7ED';
  ctx.beginPath();
  ctx.roundRect(40, 290, 688, 170, 16);
  ctx.fill();
  ctx.strokeStyle = '#FED7AA';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Wrapped Description Text
  ctx.fillStyle = '#1C1917';
  ctx.font = "600 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  wrapText(ctx, cCard.description, 384, 375, 640, 32, 'center');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createChanceCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  // Vibrant Orange Background
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.roundRect(8, 8, 752, 496, 20);
  ctx.fill();

  // Subtle repeating diamond grid pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let x = 20; x < 740; x += 32) {
    for (let y = 20; y < 480; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Double white border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(18, 18, 732, 476, 16);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(28, 28, 712, 456, 12);
  ctx.stroke();

  // Center Oval Badge
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(384, 248, 180, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Large "?" Icon in center
  ctx.fillStyle = '#EA580C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "900 110px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('?', 384, 240);

  // "CHANCE" text ribbon inside oval
  ctx.font = "800 24px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('C H A N C E', 384, 318);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// HELPER: Diegetic Horizontal Community Chest Card Textures
// -------------------------------------------------------------
function createChestCardFrontTexture(chestCard: CommunityChestCard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024; // Horizontal 3:2 landscape
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  // Background: Soft golden ivory canvas
  ctx.fillStyle = '#FFFBEE';
  ctx.beginPath();
  ctx.roundRect(8, 8, 752, 496, 20);
  ctx.fill();

  // Double border in rich Community Chest Amber / Gold
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(20, 20, 728, 472, 14);
  ctx.stroke();

  // Header Banner "★ COMMUNITY CHEST ★"
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.roundRect(32, 28, 704, 72, 14);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "900 30px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('★ COMMUNITY CHEST ★', 384, 64);

  // Subtitle / Category
  if (chestCard.subTitle) {
    ctx.fillStyle = '#78350F';
    ctx.font = "700 20px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
    ctx.fillText(chestCard.subTitle.toUpperCase(), 384, 122);
  }

  // Center Treasure Chest Badge
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.arc(384, 185, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.font = "bold 42px 'Plus Jakarta Sans', 'Outfit', sans-serif";
  ctx.fillText('🧰', 384, 185);

  // Main Card Title - crisp font with clean word wrapping
  drawWrappedCardTitle(
    ctx,
    chestCard.title.toUpperCase(),
    384,
    256,
    680,
    "800 30px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif",
    30,
    '#451A03'
  );

  // Description Card Box
  ctx.fillStyle = '#FFFBEB';
  ctx.beginPath();
  ctx.roundRect(40, 290, 688, 170, 16);
  ctx.fill();
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Wrapped Description Text
  ctx.fillStyle = '#1C1917';
  ctx.font = "600 22px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  wrapText(ctx, chestCard.description, 384, 375, 640, 32, 'center');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createChestCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(2, 2);

  // Rich Gold / Amber Background
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.roundRect(8, 8, 752, 496, 20);
  ctx.fill();

  // Subtle repeating star pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let x = 24; x < 740; x += 32) {
    for (let y = 24; y < 480; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Double white border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(18, 18, 732, 476, 16);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(28, 28, 712, 456, 12);
  ctx.stroke();

  // Center Oval Badge
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(384, 248, 210, 115, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Treasure Chest Icon in center
  ctx.fillStyle = '#D97706';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "80px 'Plus Jakarta Sans', 'Outfit', sans-serif";
  ctx.fillText('🧰', 384, 230);

  // "COMMUNITY CHEST" text ribbon inside oval
  ctx.font = "800 20px 'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif";
  ctx.fillText('C O M M U N I T Y   C H E S T', 384, 318);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createDeckSlotTexture(label: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 488, 360);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "bold 34px 'Google Sans', sans-serif";
  ctx.fillText(label, 256, 192);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Luxury Green Wool Felt Texture with Gold Leaf Inlay & Heritage Crest
 */
function createBoardCenterFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich Emerald Wool Felt with Radial Vignette
  const radGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 680);
  radGrad.addColorStop(0.00, '#06533f');
  radGrad.addColorStop(0.65, '#044232');
  radGrad.addColorStop(1.00, '#02241b');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Fine Wool Felt Micro-Weave Pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let y = 0; y < 1024; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < 1024; x += 4) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // 3. Subtle Outer Dark Felt Shadow Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 1010);

  // 4. Double Gold Leaf Inlaid Perimeter Filigree
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(30, 30, 964, 964);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(44, 44, 936, 936);

  // Corner Fleurons in Gold Foil
  const drawFleuron = (cx: number, cy: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(14, 14, 12, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(22, 22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawFleuron(44, 44, 0);
  drawFleuron(980, 44, Math.PI / 2);
  drawFleuron(980, 980, Math.PI);
  drawFleuron(44, 980, -Math.PI / 2);

  // 5. Center Dice Rolling Arena Ring
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(512, 512, 225, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 6. Central Arena Space (Center "Monopoly" emblem removed per user request)

  // 7. Designated Deck Zones with Delicate Gold Outline
  // Top-Right: CHANCE
  ctx.save();
  ctx.translate(680, 344);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-80, -56, 160, 112);
  ctx.fillStyle = 'rgba(234, 88, 12, 0.55)';
  ctx.font = "bold 18px 'Google Sans', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHANCE', 0, 0);
  ctx.restore();

  // Bottom-Left: COMMUNITY CHEST
  ctx.save();
  ctx.translate(344, 680);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-100, -56, 200, 112);
  ctx.fillStyle = 'rgba(217, 119, 6, 0.55)';
  ctx.font = "bold 16px 'Google Sans', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMMUNITY CHEST', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// MAIN 3D COMPONENT: Board3D
// -------------------------------------------------------------
interface Board3DProps {
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  activePlayerId: number;
  lastDiceRoll: [number, number] | null;
  lotteryPool: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  draftPool: Property[];
  logs: GameEventLog[];
  hasTaxOccurred: boolean;
  turnCount?: number;
  activeChanceCard?: ChanceCard | null;
  onResolveChanceCard?: (card: ChanceCard) => void;
  activeCommunityChestCard?: CommunityChestCard | null;
  onResolveCommunityChestCard?: (card: CommunityChestCard) => void;
  botSpeed: 1 | 3;
  onToggleBotSpeed: () => void;
  rollTrigger?: number;
  onRollDice?: () => void;
  onRollComplete?: (d1: number, d2: number, d3?: number) => void;
  onEndTurn: () => void;
  onPlayWildcard: (cardId: string) => void;
  onInitiateTrade: (targetPlayerId?: number) => void;
  onBuildHouse: (propId: string) => void;
  onMortgageProperty: (propId: string) => void;
  onUnmortgageProperty: (propId: string) => void;
  onDeclareBankruptcy?: (playerId: number) => void;
  onBuyProperty: (propId: string, withDiscount?: boolean) => void;
  onPassProperty?: (propId: string) => void;
  onChallenge: () => void;
  onDraftProperty: (propId: string, targetPlayerId?: number) => void;
  onPayJailFee?: () => void;
  onGoOption: (idx: number) => void;
  onRailTransit: (targetIdx: number, cost: number) => void;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  onOpenMenu?: () => void;
  settings?: GameSettingsOptions;
  onUpdateSettings?: (newSettings: GameSettingsOptions) => void;
  diceCount?: number;
  hasSecondChanceCard?: boolean;
  onPromptSecondChance?: (d1: number, d2: number, total: number) => void;
  secondChanceAction?: { id: number; action: 'REROLL' | 'KEEP' } | null;
  isTimerDisabled?: boolean;
  rules?: GameRulesOptions;
  onSellHouse?: (propId: string) => void;
  targetSelection?: CardTargetingState | null;
  onSelectTargetProperty?: (propId: string) => void;
  onSelectTargetPlayer?: (playerId: number) => void;
  onCancelTargeting?: () => void;
  bankerLapCounter?: number;
  isLandOnGoActive?: boolean;
  onTakeDoubleCash?: () => void;
  onWarpToSpace?: (targetSpaceIndex: number, spaceName: string) => void;
  onOpenTaxBreakdown?: () => void;
  isAnyModalOpen?: boolean;
}

export const Board3D: React.FC<Board3DProps> = ({
  players,
  properties,
  boardSpaces,
  activePlayerId,
  lastDiceRoll,
  lotteryPool = 0,
  gamePhase,
  turnPhase,
  draftPool,
  logs,
  hasTaxOccurred,
  turnCount = 1,
  activeChanceCard,
  onResolveChanceCard,
  activeCommunityChestCard,
  onResolveCommunityChestCard,
  botSpeed,
  onToggleBotSpeed,
  rollTrigger = 0,
  onRollDice,
  onRollComplete,
  onEndTurn,
  onPlayWildcard,
  onInitiateTrade,
  onBuildHouse,
  onMortgageProperty,
  onUnmortgageProperty,
  onDeclareBankruptcy,
  onBuyProperty,
  onPassProperty,
  onChallenge,
  onDraftProperty,
  onPayJailFee,
  onGoOption,
  onRailTransit,
  onAnimationStateChange,
  onOpenMenu,
  settings,
  onUpdateSettings,
  diceCount = 2,
  hasSecondChanceCard = false,
  isTimerDisabled = false,
  onPromptSecondChance,
  secondChanceAction,
  rules,
  onSellHouse,
  targetSelection,
  onSelectTargetProperty,
  onSelectTargetPlayer,
  onCancelTargeting,
  bankerLapCounter = 0,
  isLandOnGoActive = false,
  onTakeDoubleCash,
  onWarpToSpace,
  onOpenTaxBreakdown,
  isAnyModalOpen = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  // Settings & Low-End Optimization Refs
  const settingsRef = useRef<GameSettingsOptions>(settings || DEFAULT_SETTINGS);
  const effectiveSettingsRef = useRef(resolveEffectiveSettings(settings || DEFAULT_SETTINGS));
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Scene & Three Ref Holds
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const porchSunsetEnvRef = useRef<PorchSunsetSceneController | null>(null);

  const cameraHandGroupRef = useRef<THREE.Group | null>(null);
  const playerTokensMapRef = useRef<Map<number, THREE.Group>>(new Map());
  const tileMeshesMapRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const cardMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const floatingDiceGroupRef = useRef<THREE.Group | null>(null);
  const physicalDice1Ref = useRef<THREE.Mesh | null>(null);
  const physicalDice2Ref = useRef<THREE.Mesh | null>(null);
  const physicalDice3Ref = useRef<THREE.Mesh | null>(null);
  const diceCountRef = useRef(diceCount);
  useEffect(() => {
    diceCountRef.current = diceCount;
  }, [diceCount]);
  
  const purchasePromptGroupRef = useRef<THREE.Group | null>(null);
  const purchasePromptMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const purchasePromptActivePropId = useRef<string | null>(null);
  const passedPropertyIdsRef = useRef<Set<string>>(new Set());
  const purchasePromptAnimStartTime = useRef<number>(0);
  const purchasePromptStartPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Chance Card System 3D Refs
  const chanceGroupRef = useRef<THREE.Group | null>(null);
  const chanceInnerGroupRef = useRef<THREE.Group | null>(null);
  const chanceFrontMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const chanceBackMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const chanceContinueMeshRef = useRef<THREE.Mesh | null>(null);
  const activeChanceCardRef = useRef<ChanceCard | null>(null);
  const chanceCardDisplayedRef = useRef<boolean>(false);
  const chanceCardIsFlippedRef = useRef<boolean>(false);
  const chanceCardAnimStartTimeRef = useRef<number>(0);
  const chanceCardFlipStartTimeRef = useRef<number>(0);
  const lastChanceCountdownSecRef = useRef<number>(-1);

  // Community Chest Card System 3D Refs
  const chestGroupRef = useRef<THREE.Group | null>(null);
  const chestInnerGroupRef = useRef<THREE.Group | null>(null);
  const chestFrontMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const chestBackMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const chestContinueMeshRef = useRef<THREE.Mesh | null>(null);
  const activeCommunityChestCardRef = useRef<CommunityChestCard | null>(null);
  const chestCardDisplayedRef = useRef<boolean>(false);
  const chestCardIsFlippedRef = useRef<boolean>(false);
  const chestCardAnimStartTimeRef = useRef<number>(0);
  const chestCardFlipStartTimeRef = useRef<number>(0);
  const lastChestCountdownSecRef = useRef<number>(-1);

  const inspectedCardIdRef = useRef<string | null>(null);
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const hoveredCardIdRef = useRef<string | null>(null);

  // On-Demand Dirty-Flag Render Loop (0 FPS Static Idle)
  const isDirtyRef = useRef<boolean>(true);
  const dirtyFramesRef = useRef<number>(10);
  const markDirty = useCallback((frames: number = 5) => {
    isDirtyRef.current = true;
    dirtyFramesRef.current = Math.max(dirtyFramesRef.current, frames);
  }, []);

  // Adaptive Battery Saver & Low-Power Constraints
  const [isSystemLowPower, setIsSystemLowPower] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. matchMedia prefers-reduced-motion check
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsSystemLowPower(true);
        markDirty(5);
      }
    };
    mql?.addEventListener?.('change', handleMediaChange);

    // 2. navigator.getBattery() check
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery?.()
        .then((battery: any) => {
          const checkBattery = () => {
            const isLowBattery = !battery.charging && battery.level <= 0.20;
            if (isLowBattery) {
              setIsSystemLowPower(true);
              markDirty(5);
            }
          };
          checkBattery();
          battery.addEventListener?.('levelchange', checkBattery);
          battery.addEventListener?.('chargingchange', checkBattery);
        })
        .catch(() => {});
    }

    return () => {
      mql?.removeEventListener?.('change', handleMediaChange);
    };
  }, [markDirty]);

  // Combined battery saver mode active check
  const isBatterySaverActive = Boolean(
    settings?.isBatterySaver ||
    settings?.batterySaverMode ||
    settings?.graphicQuality === 'BATTERY_SAVER' ||
    settings?.graphicPreset === 'BATTERY_SAVER' ||
    isSystemLowPower
  );

  // Set isDirty = true on all state mutations, settings changes, and modal open/close actions
  useEffect(() => {
    lastUserInputTimeRef.current = performance.now();
    markDirty(8);
  }, [
    players,
    properties,
    boardSpaces,
    activePlayerId,
    lastDiceRoll,
    lotteryPool,
    gamePhase,
    turnPhase,
    draftPool,
    logs,
    hasTaxOccurred,
    turnCount,
    activeChanceCard,
    activeCommunityChestCard,
    rollTrigger,
    diceCount,
    targetSelection,
    bankerLapCounter,
    isLandOnGoActive,
    settings,
    rules,
    isAnyModalOpen,
    isSystemLowPower,
    markDirty,
  ]);

  // User input activity tracking: idle power throttle only activates after 5 full minutes (300,000 ms) of zero activity
  const lastUserInputTimeRef = useRef<number>(0);
  const markUserActivity = useCallback(() => {
    lastUserInputTimeRef.current = performance.now();
    markDirty(5);
  }, [markDirty]);

  // Hand layout data cache to prevent allocating Maps, Arrays, and Strings on every render frame
  interface HandCardLayoutItem {
    card: CardHandData;
    colIndex: number;
    totalCols: number;
    stackIndex: number;
    stackSize: number;
  }
  interface HandLayoutCacheData {
    cardsRef: CardHandData[];
    cardIdsKey: string;
    aspectRounded: number;
    layoutMap: Map<string, HandCardLayoutItem>;
    totalColumns: number;
    vFovRad: number;
    frustumH: number;
    frustumW: number;
    bottomY: number;
    responsiveScale: number;
    baseFewCardsScale: number;
    cardW: number;
    stepX: number;
    baseFanAngleSpan: number;
    unscaledCardW: number;
    unscaledCardH: number;
  }
  const handLayoutCacheRef = useRef<HandLayoutCacheData | null>(null);

  // Close inspected card on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      markUserActivity();
      if (e.key === 'Escape' && inspectedCardIdRef.current) {
        soundFx.playCardDraw();
        inspectedCardIdRef.current = null;
        setInspectedCardId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markUserActivity]);

  // Live Game Log Dropdown State
  const [isLogDropdownOpen, setIsLogDropdownOpen] = useState(false);
  useEffect(() => {
    markDirty(8);
  }, [isLogDropdownOpen, inspectedCardId, markDirty]);

  // 3D Motion Blur & Particle Trail Pre-allocated Object Pool Refs
  const diceTrailPoolRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      active: boolean;
      startTime: number;
      maxAge: number;
      initialScale: number;
    }>
  >([]);
  const trailPoolIndexRef = useRef<number>(0);
  const diceTrailTexRef = useRef<THREE.Texture | null>(null);
  const lastTrailSpawnTimeRef = useRef<number>(0);

  // 3D Draft Board System Refs & State
  const draftBoardGroupRef = useRef<THREE.Group | null>(null);
  const draftCardsMapRef = useRef<
    Map<
      string,
      {
        group: THREE.Group;
        property: Property;
        index: number;
        basePos: THREE.Vector3;
        shadowMesh: THREE.Mesh;
        glowMesh?: THREE.Mesh;
        rimMat?: THREE.MeshStandardMaterial;
        state: 'FACE_DOWN' | 'REVEALING' | 'FLYING' | 'DONE';
        assignedPlayerId: number | null;
        animStartTime: number;
      }
    >
  >(new Map());

  const draftSeqStateRef = useRef<{
    active: boolean;
    queue: { cardId: string; playerId: number }[];
    queueIndex: number;
    stepStartTime: number;
    phase: 'REVEAL' | 'FLY' | 'DONE';
    revealedProperty: Property | null;
    draftingPlayer: Player | null;
  }>({
    active: false,
    queue: [],
    queueIndex: 0,
    stepStartTime: 0,
    phase: 'DONE',
    revealedProperty: null,
    draftingPlayer: null,
  });

  const hoveredDraftCardIdRef = useRef<string | null>(null);
  const [draftAnnouncement, setDraftAnnouncement] = useState<{
    visible: boolean;
    text: string;
    subText: string;
    color: string;
  }>({
    visible: false,
    text: '',
    subText: '',
    color: '#F59E0B',
  });

  const [isBoardAnimatingState, setIsBoardAnimatingState] = useState(false);

  // Animation state tracking for tokens (pacing 3 tiles per second)
  const tokenAnimMapRef = useRef<
    Map<
      number,
      {
        startPosIdx: number;
        endPosIdx: number;
        currentStepProgress: number;
        currentStepIdx: number;
        isMoving: boolean;
        moveDirection?: 1 | -1;
        jailFlight?: {
          active: boolean;
          progress: number;
          duration: number;
          fromPos: THREE.Vector3;
          toPos: THREE.Vector3;
          peakY: number;
        } | null;
      }
    >
  >(new Map());

  // 3D Rigid-Body Dice Physics State: continuous physical simulation, settling, & showcase
  const dicePhysicsRef = useRef<{
    active: boolean;
    state: 'IDLE' | 'ROLLING' | 'SNAPPING' | 'SHOWCASE';
    startTime: number;
    accumulator: number;
    diceCount: number;
    d1Val: number;
    d2Val: number;
    d3Val: number;
    // Die 1 rigid body
    pos1: THREE.Vector3;
    vel1: THREE.Vector3;
    quat1: THREE.Quaternion;
    angVel1: THREE.Vector3;
    restTicks1: number;
    lastImpactTime1: number;
    // Die 2 rigid body
    pos2: THREE.Vector3;
    vel2: THREE.Vector3;
    quat2: THREE.Quaternion;
    angVel2: THREE.Vector3;
    restTicks2: number;
    lastImpactTime2: number;
    // Die 3 rigid body
    pos3: THREE.Vector3;
    vel3: THREE.Vector3;
    quat3: THREE.Quaternion;
    angVel3: THREE.Vector3;
    restTicks3: number;
    lastImpactTime3: number;
    // Snapping state
    snapStartQ1: THREE.Quaternion;
    snapStartQ2: THREE.Quaternion;
    snapStartQ3: THREE.Quaternion;
    snapTargetQ1: THREE.Quaternion;
    snapTargetQ2: THREE.Quaternion;
    snapTargetQ3: THREE.Quaternion;
    snapStartTime: number;
    // Screen Center Showcase state
    showcaseStartTime: number;
    showcaseStartPos1: THREE.Vector3;
    showcaseStartPos2: THREE.Vector3;
    showcaseStartPos3: THREE.Vector3;
    showcaseStartLocalPos1: THREE.Vector3;
    showcaseStartLocalPos2: THREE.Vector3;
    showcaseStartLocalPos3: THREE.Vector3;
    showcaseStartQ1: THREE.Quaternion;
    showcaseStartQ2: THREE.Quaternion;
    showcaseStartQ3: THREE.Quaternion;
    showcaseTargetPos1: THREE.Vector3;
    showcaseTargetPos2: THREE.Vector3;
    showcaseTargetPos3: THREE.Vector3;
    showcaseTargetQ1: THREE.Quaternion;
    showcaseTargetQ2: THREE.Quaternion;
    showcaseTargetQ3: THREE.Quaternion;
    hasTriggeredIllumination: boolean;
    hasPromptedSecondChance: boolean;
    isSecondChanceWaiting: boolean;
  }>({
    active: false,
    state: 'IDLE',
    startTime: 0,
    accumulator: 0,
    diceCount: 2,
    d1Val: 3,
    d2Val: 4,
    d3Val: 5,
    pos1: new THREE.Vector3(-0.32, 0.14, 0),
    vel1: new THREE.Vector3(),
    quat1: new THREE.Quaternion(),
    angVel1: new THREE.Vector3(),
    restTicks1: 0,
    lastImpactTime1: 0,
    pos2: new THREE.Vector3(0.32, 0.14, 0),
    vel2: new THREE.Vector3(),
    quat2: new THREE.Quaternion(),
    angVel2: new THREE.Vector3(),
    restTicks2: 0,
    lastImpactTime2: 0,
    pos3: new THREE.Vector3(0, 0.14, 0),
    vel3: new THREE.Vector3(),
    quat3: new THREE.Quaternion(),
    angVel3: new THREE.Vector3(),
    restTicks3: 0,
    lastImpactTime3: 0,
    snapStartQ1: new THREE.Quaternion(),
    snapStartQ2: new THREE.Quaternion(),
    snapStartQ3: new THREE.Quaternion(),
    snapTargetQ1: new THREE.Quaternion(),
    snapTargetQ2: new THREE.Quaternion(),
    snapTargetQ3: new THREE.Quaternion(),
    snapStartTime: 0,
    showcaseStartTime: 0,
    showcaseStartPos1: new THREE.Vector3(),
    showcaseStartPos2: new THREE.Vector3(),
    showcaseStartPos3: new THREE.Vector3(),
    showcaseStartLocalPos1: new THREE.Vector3(),
    showcaseStartLocalPos2: new THREE.Vector3(),
    showcaseStartLocalPos3: new THREE.Vector3(),
    showcaseStartQ1: new THREE.Quaternion(),
    showcaseStartQ2: new THREE.Quaternion(),
    showcaseStartQ3: new THREE.Quaternion(),
    showcaseTargetPos1: new THREE.Vector3(),
    showcaseTargetPos2: new THREE.Vector3(),
    showcaseTargetPos3: new THREE.Vector3(),
    showcaseTargetQ1: new THREE.Quaternion(),
    showcaseTargetQ2: new THREE.Quaternion(),
    showcaseTargetQ3: new THREE.Quaternion(),
    hasTriggeredIllumination: false,
    hasPromptedSecondChance: false,
    isSecondChanceWaiting: false,
  });

  // Map of 3D tile overlay meshes for illuminating the movement path
  const tileIlluminationMeshesMapRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const tileOutlineMeshesMapRef = useRef<Map<number, THREE.LineSegments>>(new Map());
  const targetSelectionRef = useRef<CardTargetingState | null>(targetSelection || null);
  const eligiblePropSetRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    targetSelectionRef.current = targetSelection || null;
    if (targetSelection?.targetType === 'PROPERTY' && targetSelection.eligiblePropertyIds) {
      eligiblePropSetRef.current = new Set(targetSelection.eligiblePropertyIds);
    } else {
      eligiblePropSetRef.current = null;
    }
  }, [targetSelection]);

  const pathIlluminationStateRef = useRef<{
    active: boolean;
    startTime: number;
    tokenColor: string;
    pathIndices: number[];
    targetPos: number;
  }>({
    active: false,
    startTime: 0,
    tokenColor: '#3B82F6',
    pathIndices: [],
    targetPos: -1,
  });

  // Callbacks ref wrapper
  const callbacksRef = useRef<{
    onRollDice?: () => void;
    onRollComplete?: (d1: number, d2: number, d3?: number) => void;
    onEndTurn: () => void;
    onPlayWildcard: (cardId: string) => void;
    onInitiateTrade: (targetPlayerId?: number) => void;
    onBuildHouse: (propId: string) => void;
    onSellHouse?: (propId: string) => void;
    onMortgageProperty: (propId: string) => void;
    onUnmortgageProperty: (propId: string) => void;
    onBuyProperty: (propId: string, withDiscount?: boolean) => void;
    onPassProperty?: (propId: string) => void;
    onChallenge: () => void;
    onDraftProperty: (propId: string, customPlayerId?: number) => void;
    onAnimationStateChange?: (animating: boolean) => void;
    onResolveChanceCard?: (card: ChanceCard) => void;
    onResolveCommunityChestCard?: (card: CommunityChestCard) => void;
    onPromptSecondChance?: (d1: number, d2: number, total: number) => void;
    hasSecondChanceCard?: boolean;
    onSelectTargetProperty?: (propId: string) => void;
    onSelectTargetPlayer?: (playerId: number) => void;
    onCancelTargeting?: () => void;
    onTakeDoubleCash?: () => void;
    onWarpToSpace?: (targetSpaceIndex: number, spaceName: string) => void;
  }>({
    onRollDice,
    onRollComplete,
    onEndTurn,
    onPlayWildcard,
    onInitiateTrade,
    onBuildHouse,
    onSellHouse,
    onMortgageProperty,
    onUnmortgageProperty,
    onBuyProperty,
    onPassProperty,
    onChallenge,
    onDraftProperty,
    onAnimationStateChange,
    onResolveChanceCard,
    onResolveCommunityChestCard,
    onPromptSecondChance,
    hasSecondChanceCard,
    onSelectTargetProperty,
    onSelectTargetPlayer,
    onCancelTargeting,
    onTakeDoubleCash,
    onWarpToSpace,
  });

  useEffect(() => {
    callbacksRef.current = {
      onRollDice,
      onRollComplete,
      onEndTurn,
      onPlayWildcard,
      onInitiateTrade,
      onBuildHouse,
      onSellHouse,
      onMortgageProperty,
      onUnmortgageProperty,
      onBuyProperty,
      onPassProperty,
      onChallenge,
      onDraftProperty,
      onAnimationStateChange,
      onResolveChanceCard,
      onResolveCommunityChestCard,
      onPromptSecondChance,
      hasSecondChanceCard,
      onSelectTargetProperty,
      onSelectTargetPlayer,
      onCancelTargeting,
      onTakeDoubleCash,
      onWarpToSpace,
    };
  }, [
    onRollDice,
    onRollComplete,
    onEndTurn,
    onPlayWildcard,
    onInitiateTrade,
    onBuildHouse,
    onSellHouse,
    onMortgageProperty,
    onUnmortgageProperty,
    onBuyProperty,
    onPassProperty,
    onChallenge,
    onDraftProperty,
    onAnimationStateChange,
    onResolveChanceCard,
    onResolveCommunityChestCard,
    onPromptSecondChance,
    hasSecondChanceCard,
    onSelectTargetProperty,
    onSelectTargetPlayer,
    onCancelTargeting,
    onTakeDoubleCash,
    onWarpToSpace,
  ]);

  const botSpeedRef = useRef(botSpeed);
  useEffect(() => {
    botSpeedRef.current = botSpeed;
  }, [botSpeed]);

  const isBoardAnimatingRef = useRef(false);

  const activePlayerIdRef = useRef(activePlayerId);
  useEffect(() => {
    activePlayerIdRef.current = activePlayerId;
  }, [activePlayerId]);

  const turnPhaseRef = useRef(turnPhase);
  useEffect(() => {
    turnPhaseRef.current = turnPhase;
  }, [turnPhase]);

  // Build Board Coordinates for 40 Spaces with exact corner & track alignment
  const getSpaceCoordinates = useCallback((index: number): { x: number; z: number; rotation: number } => {
    const space = boardSpaces[index] || { side: 1, index: 0 };
    const side = space.side;
    const offset = space.index % 10;
    const cornerCoord = 4.40;
    const normalWidth = 0.80;

    if (side === 1) {
      if (offset === 0) return { x: cornerCoord, z: cornerCoord, rotation: Math.PI };
      return { x: 3.20 - (offset - 1) * normalWidth, z: cornerCoord, rotation: Math.PI };
    } else if (side === 2) {
      if (offset === 0) return { x: -cornerCoord, z: cornerCoord, rotation: Math.PI / 2 };
      return { x: -cornerCoord, z: 3.20 - (offset - 1) * normalWidth, rotation: Math.PI / 2 };
    } else if (side === 3) {
      if (offset === 0) return { x: -cornerCoord, z: -cornerCoord, rotation: 0 };
      return { x: -3.20 + (offset - 1) * normalWidth, z: -cornerCoord, rotation: 0 };
    } else {
      if (offset === 0) return { x: cornerCoord, z: -cornerCoord, rotation: -Math.PI / 2 };
      return { x: cornerCoord, z: -3.20 + (offset - 1) * normalWidth, rotation: -Math.PI / 2 };
    }
  }, [boardSpaces]);

  // Specific target coordinate helper mapping in-jail tokens to the designated inner cell vs outer visiting walkway
  const getPlayerTargetCoords = useCallback((spaceIdx: number, inJail: boolean, tokenIdx: number, totalSame: number): { x: number; y: number; z: number } => {
    if (spaceIdx === 10 && inJail) {
      // Inner designated "IN JAIL" Cell on space 10 (Cell is 1.04 x 1.04 centered at baseX = -4.18, baseZ = 4.18)
      // Supports multiple tokens comfortably without clipping or touching bars
      const baseX = -4.18;
      const baseZ = 4.18;
      let offX = 0;
      let offZ = 0;
      if (totalSame === 2) {
        offX = tokenIdx === 0 ? -0.20 : 0.20;
        offZ = tokenIdx === 0 ? -0.20 : 0.20;
      } else if (totalSame > 2) {
        const col = tokenIdx % 2;
        const row = Math.floor(tokenIdx / 2);
        offX = (col - 0.5) * 0.38;
        offZ = (row - 0.5) * 0.38;
      }
      return { x: baseX + offX, y: 0.08, z: baseZ + offZ };
    }

    if (spaceIdx === 10 && !inJail) {
      // Outer L-shaped "JUST VISITING" walkway on space 10 (strictly outside the jail cell)
      // Bottom strip is at Z = 4.95 (X between -4.50 and -3.75)
      // Left strip is at X = -4.95 (Z between 4.50 and 3.75)
      // Tokens NEVER sit in the middle of the square
      const visitingSpots = [
        { x: -4.15, z: 4.95 }, // Center of bottom visiting strip
        { x: -3.75, z: 4.95 }, // Right of bottom visiting strip
        { x: -4.95, z: 4.15 }, // Center of left visiting strip
        { x: -4.95, z: 3.75 }, // Top of left visiting strip
        { x: -4.92, z: 4.92 }, // Outer corner elbow
        { x: -4.55, z: 4.95 }, // Left of bottom visiting strip
      ];
      const spot = visitingSpots[tokenIdx % visitingSpots.length];
      return { x: spot.x, y: 0.08, z: spot.z };
    }

    const coords = getSpaceCoordinates(spaceIdx);
    let offX = 0;
    let offZ = 0;
    if (totalSame > 1) {
      offX = ((tokenIdx % 2) - 0.5) * 0.20;
      offZ = (Math.floor(tokenIdx / 2) - 0.5) * 0.20;
    }
    return { x: coords.x + offX, y: 0.08, z: coords.z + offZ };
  }, [getSpaceCoordinates]);

  // --- DYNAMIC CINEMATIC CAMERA & FX STATE ---
  type BoardCameraMode = 'CINEMATIC' | 'OVERHEAD' | 'FREE';
  const [boardCameraMode, setBoardCameraMode] = useState<BoardCameraMode>('CINEMATIC');
  const boardCameraModeRef = useRef<BoardCameraMode>('CINEMATIC');
  useEffect(() => {
    boardCameraModeRef.current = boardCameraMode;
    markDirty(15);
  }, [boardCameraMode, markDirty]);

  const [isCinematicCamActive, setIsCinematicCamActive] = useState(true);
  const isCinematicCamActiveRef = useRef(true);
  useEffect(() => {
    isCinematicCamActiveRef.current = isCinematicCamActive;
    markDirty(15);
  }, [isCinematicCamActive, markDirty]);

  const isLandOnGoActiveRef = useRef(isLandOnGoActive);
  useEffect(() => {
    isLandOnGoActiveRef.current = isLandOnGoActive;
  }, [isLandOnGoActive]);

  // 3D Free Parking Vault dynamic LCD screen refs
  const vaultDisplayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vaultDisplayTextureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = vaultDisplayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOTTERY VAULT', 256, 70);
    ctx.fillStyle = '#FBBF24';
    ctx.font = '900 88px sans-serif';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText(`$${lotteryPool}`, 256, 175);
    ctx.shadowBlur = 0;
    if (vaultDisplayTextureRef.current) {
      vaultDisplayTextureRef.current.needsUpdate = true;
    }
  }, [lotteryPool]);

  const vignetteDivRef = useRef<HTMLDivElement>(null);
  const triggerVignettePulse = useCallback((color: 'crimson' | 'emerald') => {
    const el = vignetteDivRef.current;
    if (!el) return;
    el.style.boxShadow =
      color === 'crimson'
        ? 'inset 0 0 90px 35px rgba(239, 68, 68, 0.70)'
        : 'inset 0 0 90px 35px rgba(16, 185, 129, 0.70)';
    el.style.transition = 'none';
    el.style.opacity = '0.75';
    requestAnimationFrame(() => {
      if (!el) return;
      el.style.transition = 'opacity 0.6s ease-out';
      el.style.opacity = '0';
    });
  }, []);

  const prevActivePlayerIdRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);
  const cameraHandoffRef = useRef<{
    startTime: number;
    startPos: THREE.Vector3;
    startLookAt: THREE.Vector3;
    endPos: THREE.Vector3;
    endLookAt: THREE.Vector3;
    duration: number;
  } | null>(null);

  const pendingCashFxRef = useRef<
    Map<
      number,
      {
        amount: number;
        diff: number;
        isPurchase?: boolean;
        propertyId?: string;
        colorGroup?: string;
      }
    >
  >(new Map());
  const prevCashMapRef = useRef<Map<number, number>>(new Map());
  const prevPropertyOwnerMapRef = useRef<Map<string, number | null>>(new Map());

  const floatingTextsRef = useRef<
    Array<{ id: string; sprite: THREE.Sprite; deedSprite?: THREE.Sprite; tileX?: number; tileZ?: number; startY: number; startTime: number }>
  >([]);
  const particleBurstsRef = useRef<
    Array<{ id: string; particles: BurstParticle[]; startTime: number }>
  >([]);

  // Cash change and property purchase detection effect for FX triggers
  useEffect(() => {
    // Detect newly acquired properties by player
    const newlyBoughtPropertyByPlayer = new Map<number, { propertyId: string; colorGroup?: string }>();
    properties.forEach((prop) => {
      const prevOwner = prevPropertyOwnerMapRef.current.get(prop.id);
      if (prevOwner === undefined) {
        prevPropertyOwnerMapRef.current.set(prop.id, prop.ownerId);
      } else if (prevOwner !== prop.ownerId && prop.ownerId !== null) {
        newlyBoughtPropertyByPlayer.set(prop.ownerId, { propertyId: prop.id, colorGroup: prop.colorGroup });
        prevPropertyOwnerMapRef.current.set(prop.id, prop.ownerId);
      }
    });

    players.forEach((p) => {
      const prevCash = prevCashMapRef.current.get(p.id);
      if (prevCash !== undefined && p.cash !== prevCash) {
        const diff = p.cash - prevCash;
        const purchaseInfo = newlyBoughtPropertyByPlayer.get(p.id);
        const isPurchase = !!purchaseInfo;

        pendingCashFxRef.current.set(p.id, {
          amount: Math.abs(diff),
          diff,
          isPurchase,
          propertyId: purchaseInfo?.propertyId,
          colorGroup: purchaseInfo?.colorGroup,
        });
      }
      prevCashMapRef.current.set(p.id, p.cash);
    });
  }, [players, properties]);

  const gamePhaseRef = useRef(gamePhase);
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
    const scene = sceneRef.current;
    if (!scene) return;

    players.forEach((p) => {
      const existingMesh = playerTokensMapRef.current.get(p.id);
      if (existingMesh && existingMesh.userData && existingMesh.userData.currentShape !== p.tokenShape) {
        const oldPos = existingMesh.position.clone();
        const oldRot = existingMesh.rotation.clone();
        scene.remove(existingMesh);
        existingMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });

        const newMesh = createDistinctPlayerTokenMesh(p.tokenShape, p.color, p.avatarColor, p.avatarShape);
        newMesh.position.copy(oldPos);
        newMesh.rotation.copy(oldRot);
        scene.add(newMesh);
        playerTokensMapRef.current.set(p.id, newMesh);
      }
    });
  }, [players]);

  const propertiesRef = useRef(properties);
  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  const boardSpacesRef = useRef(boardSpaces);
  useEffect(() => {
    boardSpacesRef.current = boardSpaces;
  }, [boardSpaces]);

  const draftPoolRef = useRef(draftPool);
  useEffect(() => {
    draftPoolRef.current = draftPool;
  }, [draftPool]);

  const hasTaxOccurredRef = useRef(hasTaxOccurred);
  useEffect(() => {
    hasTaxOccurredRef.current = hasTaxOccurred;
  }, [hasTaxOccurred]);

  // Trigger illumination of tiles leading to the target space in the token's color
  const triggerTilePathIllumination = useCallback((totalRoll: number) => {
    const activeP = playersRef.current.find((p) => p.id === activePlayerIdRef.current) || playersRef.current[0];
    if (!activeP) return;

    const startPos = activeP.position;
    const pathIndices: number[] = [];
    for (let step = 1; step <= totalRoll; step++) {
      pathIndices.push((startPos + step) % 40);
    }
    const targetPos = (startPos + totalRoll) % 40;

    pathIlluminationStateRef.current = {
      active: true,
      startTime: performance.now(),
      tokenColor: activeP.color || '#3B82F6',
      pathIndices,
      targetPos,
    };
  }, []);

  // Physical 3D Rigid-Body Dice Throw & Rolling Physics Initializer
  const startPhysicalDiceRoll = useCallback(() => {
    if (dicePhysicsRef.current.active) return;
    if (!physicalDice1Ref.current || !physicalDice2Ref.current) return;

    // Reset tile illumination at the start of a roll
    pathIlluminationStateRef.current.active = false;
    tileIlluminationMeshesMapRef.current.forEach((mesh) => {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      mesh.visible = false;
    });

    // Clear previous motion trail particles
    diceTrailPoolRef.current.forEach((item) => {
      item.active = false;
      item.mesh.visible = false;
    });

    // Show physical dice on the board
    physicalDice1Ref.current.visible = true;
    physicalDice2Ref.current.visible = true;

    // Hide floating prompt dice during roll
    if (floatingDiceGroupRef.current) {
      floatingDiceGroupRef.current.visible = false;
    }

    // Get current active player and their token position on the board
    const currActiveId = activePlayerIdRef.current ?? activePlayerId;
    const pList = playersRef.current.length > 0 ? playersRef.current : players;
    const activePlayer = pList.find((p) => p.id === currActiveId) || pList[0];
    let tokenWorldPos = new THREE.Vector3(0, 0.08, 4.4);
    let hasTokenPos = false;
    if (activePlayer) {
      const tokenMesh = playerTokensMapRef.current.get(activePlayer.id);
      if (tokenMesh) {
        tokenMesh.getWorldPosition(tokenWorldPos);
        hasTokenPos = true;
      }
      if (!hasTokenPos || (tokenWorldPos.x === 0 && tokenWorldPos.z === 0)) {
        const sameTilePlayers = pList.filter((pl) => pl.position === activePlayer.position && pl.inJail === activePlayer.inJail);
        const tokenIdx = sameTilePlayers.findIndex((pl) => pl.id === activePlayer.id);
        const coords = getPlayerTargetCoords(activePlayer.position, activePlayer.inJail, Math.max(0, tokenIdx), Math.max(1, sameTilePlayers.length));
        tokenWorldPos.set(coords.x, coords.y, coords.z);
      }
    }
    if (tokenWorldPos.y < 0.08) {
      tokenWorldPos.y = 0.08;
    }

    // Throw direction: from player token towards the center felt
    const dirToCenter = new THREE.Vector3(-tokenWorldPos.x, 0, -tokenWorldPos.z).normalize();
    if (dirToCenter.lengthSq() < 0.01) {
      dirToCenter.set(0, 0, -1);
    }
    // Spawn directly at the player token's location, slightly higher like tossed from player's hand
    const throwHeight = 1.45;
    const spawnBase = new THREE.Vector3(
      tokenWorldPos.x + dirToCenter.x * 0.15,
      tokenWorldPos.y + throwHeight,
      tokenWorldPos.z + dirToCenter.z * 0.15
    );

    const count = diceCountRef.current || 2;

    // Perpendicular lateral vector to ensure natural spacing between dice
    const perpDir = new THREE.Vector3(-dirToCenter.z, 0, dirToCenter.x).normalize();

    // Spawn positions adapted for 1, 2, or 3 dice
    let spawn1: THREE.Vector3;
    let spawn2: THREE.Vector3;
    let spawn3: THREE.Vector3;

    if (count === 1) {
      spawn1 = spawnBase.clone().add(new THREE.Vector3(0, 0.02, 0));
      spawn2 = new THREE.Vector3(0, -10, 0);
      spawn3 = new THREE.Vector3(0, -10, 0);
    } else if (count === 3) {
      spawn1 = spawnBase.clone().addScaledVector(perpDir, -0.20).add(new THREE.Vector3(0, 0.02, 0));
      spawn2 = spawnBase.clone().add(new THREE.Vector3(0, -0.01, 0));
      spawn3 = spawnBase.clone().addScaledVector(perpDir, 0.20).add(new THREE.Vector3(0, 0.01, 0));
    } else {
      spawn1 = spawnBase.clone().addScaledVector(perpDir, -0.14).add(new THREE.Vector3(0, 0.02, 0));
      spawn2 = spawnBase.clone().addScaledVector(perpDir, 0.14).add(new THREE.Vector3(0, -0.01, 0));
      spawn3 = new THREE.Vector3(0, -10, 0);
    }

    // Landing target: softly in the inner felt area on this player's side of the board
    const feltTargetBase = new THREE.Vector3(tokenWorldPos.x * 0.32, 0.01, tokenWorldPos.z * 0.32);
    const target1 = new THREE.Vector3(
      feltTargetBase.x + (count === 1 ? 0 : perpDir.x * -0.22) + (Math.random() - 0.5) * 0.10,
      0.01,
      feltTargetBase.z + (count === 1 ? 0 : perpDir.z * -0.22) + (Math.random() - 0.5) * 0.10
    );
    const target2 = new THREE.Vector3(
      feltTargetBase.x + perpDir.x * 0.22 + (Math.random() - 0.5) * 0.10,
      0.01,
      feltTargetBase.z + perpDir.z * 0.22 + (Math.random() - 0.5) * 0.10
    );
    const target3 = new THREE.Vector3(
      feltTargetBase.x + (Math.random() - 0.5) * 0.10,
      0.01,
      feltTargetBase.z + (Math.random() - 0.5) * 0.10
    );

    // Forward throw trajectory calculation - arcing toss with natural height
    const calcThrowVel = (sp: THREE.Vector3, tg: THREE.Vector3, flightTime: number) => {
      const toCenter = tg.clone().sub(sp);
      const horizDist = Math.sqrt(toCenter.x * toCenter.x + toCenter.z * toCenter.z);
      const dirH = horizDist > 0.001
        ? new THREE.Vector3(toCenter.x / horizDist, 0, toCenter.z / horizDist)
        : new THREE.Vector3(0, 0, -1);
      const horizSpeed = horizDist / flightTime;
      const deltaY = tg.y - sp.y;
      const vy0 = (deltaY + 0.5 * 14.5 * (flightTime * flightTime)) / flightTime;
      return new THREE.Vector3(
        dirH.x * horizSpeed + (Math.random() - 0.5) * 0.08,
        vy0 + 0.85 + Math.random() * 0.12,
        dirH.z * horizSpeed + (Math.random() - 0.5) * 0.08
      );
    };

    const vel1 = calcThrowVel(spawn1, target1, 0.60);
    const vel2 = calcThrowVel(spawn2, target2, 0.62);
    const vel3 = calcThrowVel(spawn3, target3, 0.61);

    // Initial realistic angular tumbling velocity (14 - 22 rad/s)
    const angVel1 = new THREE.Vector3(
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8)
    );
    const angVel2 = new THREE.Vector3(
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8)
    );
    const angVel3 = new THREE.Vector3(
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8)
    );

    // Completely randomized 3D orientation
    const quat1 = new THREE.Quaternion(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const quat2 = new THREE.Quaternion(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const quat3 = new THREE.Quaternion(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    physicalDice1Ref.current.visible = true;
    physicalDice1Ref.current.position.copy(spawn1);
    physicalDice1Ref.current.quaternion.copy(quat1);

    if (physicalDice2Ref.current) {
      physicalDice2Ref.current.visible = count >= 2;
      physicalDice2Ref.current.position.copy(spawn2);
      physicalDice2Ref.current.quaternion.copy(quat2);
    }

    if (physicalDice3Ref.current) {
      physicalDice3Ref.current.visible = count >= 3;
      physicalDice3Ref.current.position.copy(spawn3);
      physicalDice3Ref.current.quaternion.copy(quat3);
    }

    const now = performance.now();

    dicePhysicsRef.current = {
      active: true,
      state: 'ROLLING',
      startTime: now,
      accumulator: 0,
      diceCount: count,
      d1Val: 0,
      d2Val: 0,
      d3Val: 0,
      pos1: spawn1.clone(),
      vel1: vel1,
      quat1: quat1.clone(),
      angVel1: angVel1,
      restTicks1: 0,
      lastImpactTime1: 0,
      pos2: spawn2.clone(),
      vel2: count >= 2 ? vel2 : new THREE.Vector3(),
      quat2: quat2.clone(),
      angVel2: angVel2,
      restTicks2: count >= 2 ? 0 : 999,
      lastImpactTime2: 0,
      pos3: spawn3.clone(),
      vel3: count >= 3 ? vel3 : new THREE.Vector3(),
      quat3: quat3.clone(),
      angVel3: angVel3,
      restTicks3: count >= 3 ? 0 : 999,
      lastImpactTime3: 0,
      snapStartQ1: quat1.clone(),
      snapStartQ2: quat2.clone(),
      snapStartQ3: quat3.clone(),
      snapTargetQ1: quat1.clone(),
      snapTargetQ2: quat2.clone(),
      snapTargetQ3: quat3.clone(),
      snapStartTime: 0,
      showcaseStartTime: 0,
      showcaseStartPos1: new THREE.Vector3(),
      showcaseStartPos2: new THREE.Vector3(),
      showcaseStartPos3: new THREE.Vector3(),
      showcaseStartLocalPos1: new THREE.Vector3(),
      showcaseStartLocalPos2: new THREE.Vector3(),
      showcaseStartLocalPos3: new THREE.Vector3(),
      showcaseStartQ1: new THREE.Quaternion(),
      showcaseStartQ2: new THREE.Quaternion(),
      showcaseStartQ3: new THREE.Quaternion(),
      showcaseTargetPos1: new THREE.Vector3(),
      showcaseTargetPos2: new THREE.Vector3(),
      showcaseTargetPos3: new THREE.Vector3(),
      showcaseTargetQ1: new THREE.Quaternion(),
      showcaseTargetQ2: new THREE.Quaternion(),
      showcaseTargetQ3: new THREE.Quaternion(),
      hasTriggeredIllumination: false,
      hasPromptedSecondChance: false,
      isSecondChanceWaiting: false,
    };

    soundFx.playDiceRoll();
    callbacksRef.current.onAnimationStateChange?.(true);
    markDirty(15);
  }, [players, activePlayerId, getPlayerTargetCoords, markDirty]);

  // Handle external rollTrigger prop updates
  const prevRollTriggerRef = useRef(rollTrigger);
  useEffect(() => {
    if (rollTrigger && rollTrigger !== prevRollTriggerRef.current) {
      prevRollTriggerRef.current = rollTrigger;
      startPhysicalDiceRoll();
    }
  }, [rollTrigger, startPhysicalDiceRoll]);

  // Handle Second Chance Reroll / Keep actions
  const prevSecondChanceActionId = useRef<number | null>(null);
  useEffect(() => {
    if (!secondChanceAction || secondChanceAction.id === prevSecondChanceActionId.current) return;
    prevSecondChanceActionId.current = secondChanceAction.id;
    if (secondChanceAction.action === 'REROLL') {
      dicePhysicsRef.current.isSecondChanceWaiting = false;
      dicePhysicsRef.current.active = false;
      startPhysicalDiceRoll();
    } else if (secondChanceAction.action === 'KEEP') {
      dicePhysicsRef.current.isSecondChanceWaiting = false;
      dicePhysicsRef.current.showcaseStartTime = performance.now() - 1150;
    }
  }, [secondChanceAction, startPhysicalDiceRoll]);

  // Ensure dice remain hidden once done rolling (do NOT reappear on the center of the board)
  useEffect(() => {
    if (!dicePhysicsRef.current.active) {
      if (physicalDice1Ref.current) physicalDice1Ref.current.visible = false;
      if (physicalDice2Ref.current) physicalDice2Ref.current.visible = false;
      if (physicalDice3Ref.current) physicalDice3Ref.current.visible = false;
    }
  }, [lastDiceRoll]);

  // Build current contiguous 3D Card Hand data (Memoized to avoid expensive texture/mesh thrashing)
  const currentHandCards = useMemo((): CardHandData[] => {
    const cards: CardHandData[] = [];
    const localPlayer = players.find((p) => p.id === 0) || players[0];
    const isMyTurn = activePlayerId === 0;

    if (gamePhase === 'DRAFT') {
      return [];
    }

    // 1. Core Turn Action Cards
    cards.push({
      id: 'act_trade',
      type: 'TRADE',
      title: 'TRADE PLAYER',
      subType: 'EXCHANGE CENTER',
      headerColor: '#D97706',
      bodyLines: ['OPEN EXCHANGE CENTER', 'TRADE ASSETS & WILDCARDS', 'PREDICT AI RESPONSES'],
      footerText: isMyTurn ? 'OPEN EXCHANGE' : 'WAIT FOR YOUR TURN',
      actionPayload: { actionType: 'TRADE' },
    });

    if (hasTaxOccurred) {
      cards.push({
        id: 'act_challenge',
        type: 'ACTION',
        title: 'MONOPOLY DUEL',
        subType: 'HIGH-STAKES CHALLENGE',
        headerColor: '#DC2626',
        bodyLines: ['INITIATE HIGH-STAKES', 'PROPERTY DUEL AGAINST', 'OPPONENT PLAYER'],
        footerText: isMyTurn ? 'DUEL OPPONENT' : 'WAIT FOR YOUR TURN',
        actionPayload: { actionType: 'CHALLENGE' },
      });
    }

    // 2. Local Player Property Cards
    const COLOR_ORDER: Record<string, number> = {
      Brown: 1,
      LightBlue: 2,
      Pink: 3,
      Orange: 4,
      Red: 5,
      Yellow: 6,
      Green: 7,
      DarkBlue: 8,
      Railroad: 9,
      Utility: 10,
    };
    const localProps = properties
      .filter((p) => p.ownerId === localPlayer.id)
      .sort((a, b) => (COLOR_ORDER[a.colorGroup] || 99) - (COLOR_ORDER[b.colorGroup] || 99));

    localProps.forEach((p) => {
      cards.push({
        id: `prop_${p.id}`,
        type: 'PROPERTY',
        title: p.name,
        subType: p.colorGroup,
        headerColor: COLOR_HEX_STR[p.colorGroup] || '#475569',
        bodyLines: [
          `BASE RENT: $${p.baseRent}`,
          `HOUSES: ${p.houses}${p.hotel ? ' (HOTEL)' : ''}`,
          `MORTGAGED: ${p.isMortgaged ? 'YES' : 'NO'}`,
        ],
        footerText: `HOUSE COST: $${p.houseCost}`,
        actionPayload: { actionType: 'INSPECT_PROPERTY', propertyId: p.id },
      });
    });

    // 3. Local Player Wildcards
    localPlayer.wildcardsHand.forEach((wc) => {
      cards.push({
        id: `wc_${wc.id}`,
        type: 'WILDCARD',
        title: wc.name,
        subType: `${wc.type} CARD`,
        headerColor: isMyTurn ? '#7C3AED' : '#475569',
        bodyLines: [wc.description],
        footerText: isMyTurn ? 'PLAY WILDCARD' : 'WAIT FOR YOUR TURN',
        actionPayload: { actionType: 'PLAY_WILDCARD', wildcardId: wc.id },
      });
    });

    return cards;
  }, [gamePhase, activePlayerId, hasTaxOccurred, properties, players]);
  const currentHandCardsRef = useRef(currentHandCards);
  useEffect(() => {
    currentHandCardsRef.current = currentHandCards;
  }, [currentHandCards]);

  // Update last user activity whenever active game state or hand changes
  useEffect(() => {
    markUserActivity();
  }, [lastDiceRoll, rollTrigger, currentHandCards, turnPhase, activePlayerId, gamePhase, markUserActivity]);

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE, OrbitControls & PORCH SUNSET ENVIRONMENT
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x280e22);
    scene.fog = new THREE.FogExp2(0x3d172e, 0.009);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(0, 3.4, 4.8); // Immersive lower angle and closer framing for 30% smaller tokens
    camera.lookAt(0, 0.16, 0.20);
    cameraRef.current = camera;
    scene.add(camera);

    // Pre-allocated object pool for 3D dice motion trail particles (0 runtime allocations during rolls)
    const diceTrailGroup = new THREE.Group();
    scene.add(diceTrailGroup);
    const trailSharedGeo = new THREE.PlaneGeometry(0.32, 0.32);
    if (!diceTrailTexRef.current) {
      diceTrailTexRef.current = createDiceMotionTrailTexture();
    }
    const preAllocatedTrailPool: Array<{
      mesh: THREE.Mesh;
      active: boolean;
      startTime: number;
      maxAge: number;
      initialScale: number;
    }> = [];
    for (let tp = 0; tp < 36; tp++) {
      const pMat = new THREE.MeshBasicMaterial({
        map: diceTrailTexRef.current,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const pMesh = new THREE.Mesh(trailSharedGeo, pMat);
      pMesh.visible = false;
      diceTrailGroup.add(pMesh);
      preAllocatedTrailPool.push({
        mesh: pMesh,
        active: false,
        startTime: 0,
        maxAge: 320,
        initialScale: 1.0,
      });
    }
    diceTrailPoolRef.current = preAllocatedTrailPool;

    // Camera Hand Group (Pinned cleanly in Camera Space at bottom of viewport, always in front of scene)
    const cameraHandGroup = new THREE.Group();
    cameraHandGroup.position.set(0, -0.68, -1.8);
    cameraHandGroup.renderOrder = 2000;
    camera.add(cameraHandGroup);
    cameraHandGroupRef.current = cameraHandGroup;

    // Dark Overlay for Card Inspection (placed behind inspected cards at Z=-1.25 and in front of floating dice at Z=-1.60)
    const darkOverlayMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const darkOverlayMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), darkOverlayMat);
    darkOverlayMesh.position.set(0, 0, -1.55);
    darkOverlayMesh.renderOrder = 1800;
    camera.add(darkOverlayMesh);

    // Purchase Prompt Group (Floating 3D Card for Unowned Properties - rendered in front of scene)
    const purchasePromptGroup = new THREE.Group();
    purchasePromptGroup.visible = false;
    purchasePromptGroup.renderOrder = 2200;
    
    const pGeo = new THREE.PlaneGeometry(0.55, 0.82);
    const pMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.set(0, 0.12, 0);
    pMesh.renderOrder = 2200;
    purchasePromptMatRef.current = pMat;
    purchasePromptGroup.add(pMesh);

    const buyTex = createSpatialButtonTexture('BUY', '#16A34A');
    const buyGeo = new THREE.PlaneGeometry(0.48, 0.13);
    const buyMat = new THREE.MeshBasicMaterial({
      map: buyTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const buyMesh = new THREE.Mesh(buyGeo, buyMat);
    buyMesh.position.set(0, -0.42, 0.05);
    buyMesh.renderOrder = 2210;
    buyMesh.userData = { buttonAction: 'BUY_PROMPT' };
    purchasePromptGroup.add(buyMesh);

    const passTex = createSpatialButtonTexture('PASS', '#475569');
    const passGeo = new THREE.PlaneGeometry(0.48, 0.13);
    const passMat = new THREE.MeshBasicMaterial({
      map: passTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const passMesh = new THREE.Mesh(passGeo, passMat);
    passMesh.position.set(0, -0.58, 0.05);
    passMesh.renderOrder = 2210;
    passMesh.userData = { buttonAction: 'PASS_PROMPT' };
    purchasePromptGroup.add(passMesh);

    const discountTex = createSpatialButtonTexture('BUY 50% OFF', '#7C3AED');
    const discountGeo = new THREE.PlaneGeometry(0.48, 0.13);
    const discountMat = new THREE.MeshBasicMaterial({
      map: discountTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const discountMesh = new THREE.Mesh(discountGeo, discountMat);
    discountMesh.position.set(0, -0.56, 0.05);
    discountMesh.renderOrder = 2210;
    discountMesh.userData = { buttonAction: 'DISCOUNT_BUY_PROMPT' };
    discountMesh.visible = false;
    purchasePromptGroup.add(discountMesh);

    camera.add(purchasePromptGroup);
    purchasePromptGroupRef.current = purchasePromptGroup;

    // --- 3D CHANCE CARD FLOATING INTERACTION SYSTEM ---
    const chanceGroup = new THREE.Group();
    chanceGroup.position.set(0, 0.06, -1.45);
    chanceGroup.visible = false;
    chanceGroup.renderOrder = 2200;

    // Inner sub-group for 180-degree flip rotation around Y axis
    const chanceInnerGroup = new THREE.Group();
    chanceGroup.add(chanceInnerGroup);
    chanceInnerGroupRef.current = chanceInnerGroup;

    // Horizontal Card Geometry (Width = 0.82, Height = 0.55)
    const cCardGeo = new THREE.PlaneGeometry(0.82, 0.55);

    // Front Mesh (Facing +Z)
    const cFrontMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
    });
    const cFrontMesh = new THREE.Mesh(cCardGeo, cFrontMat);
    cFrontMesh.position.z = 0.001;
    cFrontMesh.renderOrder = 2201;
    cFrontMesh.userData = { isChanceCard: true };
    chanceInnerGroup.add(cFrontMesh);
    chanceFrontMatRef.current = cFrontMat;

    // Back Mesh (Facing -Z, rotated Y=PI)
    const cBackMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
    });
    const cBackMesh = new THREE.Mesh(cCardGeo, cBackMat);
    cBackMesh.rotation.y = Math.PI;
    cBackMesh.position.z = -0.001;
    cBackMesh.renderOrder = 2201;
    cBackMesh.userData = { isChanceCard: true };
    chanceInnerGroup.add(cBackMesh);
    chanceBackMatRef.current = cBackMat;

    // "CONTINUE" Button Mesh below the card
    const continueTex = createSpatialButtonTexture('CONTINUE →', '#16A34A');
    const continueGeo = new THREE.PlaneGeometry(0.48, 0.13);
    const continueMat = new THREE.MeshBasicMaterial({
      map: continueTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const continueMesh = new THREE.Mesh(continueGeo, continueMat);
    continueMesh.position.set(0, -0.42, 0.05);
    continueMesh.renderOrder = 2210;
    continueMesh.userData = { buttonAction: 'RESOLVE_CHANCE' };
    continueMesh.visible = false;
    chanceGroup.add(continueMesh);
    chanceContinueMeshRef.current = continueMesh;

    camera.add(chanceGroup);
    chanceGroupRef.current = chanceGroup;

    // --- 3D COMMUNITY CHEST CARD FLOATING INTERACTION SYSTEM ---
    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, 0.06, -1.45);
    chestGroup.visible = false;
    chestGroup.renderOrder = 2200;

    const chestInnerGroup = new THREE.Group();
    chestGroup.add(chestInnerGroup);
    chestInnerGroupRef.current = chestInnerGroup;

    const chCardGeo = new THREE.PlaneGeometry(0.82, 0.55);

    const chFrontMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
    });
    const chFrontMesh = new THREE.Mesh(chCardGeo, chFrontMat);
    chFrontMesh.position.z = 0.001;
    chFrontMesh.renderOrder = 2201;
    chFrontMesh.userData = { isChestCard: true };
    chestInnerGroup.add(chFrontMesh);
    chestFrontMatRef.current = chFrontMat;

    const chBackMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
    });
    const chBackMesh = new THREE.Mesh(chCardGeo, chBackMat);
    chBackMesh.rotation.y = Math.PI;
    chBackMesh.position.z = -0.001;
    chBackMesh.renderOrder = 2201;
    chBackMesh.userData = { isChestCard: true };
    chestInnerGroup.add(chBackMesh);
    chestBackMatRef.current = chBackMat;

    const chContinueTex = createSpatialButtonTexture('CONTINUE →', '#16A34A');
    const chContinueGeo = new THREE.PlaneGeometry(0.48, 0.13);
    const chContinueMat = new THREE.MeshBasicMaterial({
      map: chContinueTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const chContinueMesh = new THREE.Mesh(chContinueGeo, chContinueMat);
    chContinueMesh.position.set(0, -0.42, 0.05);
    chContinueMesh.renderOrder = 2210;
    chContinueMesh.userData = { buttonAction: 'RESOLVE_CHEST' };
    chContinueMesh.visible = false;
    chestGroup.add(chContinueMesh);
    chestContinueMeshRef.current = chContinueMesh;

    camera.add(chestGroup);
    chestGroupRef.current = chestGroup;

    // Floating 3D Dice System (Floats in middle of screen on player turn)
    const floatingDiceGroup = new THREE.Group();
    floatingDiceGroup.position.set(0, -0.05, -1.6);
    floatingDiceGroup.userData = { isFloatingDice: true };

    const fDice1 = create2DDieMesh();
    fDice1.position.set(-0.16, 0, 0);
    fDice1.userData = { isFloatingDice: true };
    fDice1.castShadow = false;

    const fDice2 = create2DDieMesh();
    fDice2.position.set(0.16, 0, 0);
    fDice2.userData = { isFloatingDice: true };
    fDice2.castShadow = false;

    const fDice3 = create2DDieMesh();
    fDice3.position.set(0.32, 0, 0);
    fDice3.userData = { isFloatingDice: true };
    fDice3.castShadow = false;
    fDice3.visible = false;

    floatingDiceGroup.add(fDice1);
    floatingDiceGroup.add(fDice2);
    floatingDiceGroup.add(fDice3);
    
    camera.add(floatingDiceGroup);
    floatingDiceGroupRef.current = floatingDiceGroup;

    // Physical Dice with 2D dots for Board Physics Rolling
    const pDice1 = create2DDieMesh();
    pDice1.visible = false;
    scene.add(pDice1);
    physicalDice1Ref.current = pDice1;

    const pDice2 = create2DDieMesh();
    pDice2.visible = false;
    scene.add(pDice2);
    physicalDice2Ref.current = pDice2;

    const pDice3 = create2DDieMesh();
    pDice3.visible = false;
    scene.add(pDice3);
    physicalDice3Ref.current = pDice3;

    // Renderer setup with hardware-adapted performance constraints
    const initialEffective = effectiveSettingsRef.current;
    const isBatteryInitial = Boolean(
      isBatterySaverActive ||
      initialEffective.isBatterySaver
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: !isBatteryInitial && initialEffective.targetQuality !== 'BATTERY_SAVER', // Hardware MSAA anti-aliasing on all non-battery settings
      powerPreference: isBatteryInitial ? 'low-power' : 'high-performance',
      precision: isBatteryInitial ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);

    // In low-power/battery mode: Force renderer.setPixelRatio(1.0)
    // Clamp standard/high mode to a maximum of 1.5 instead of uncapped Retina scales
    const baseDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const effectiveDpr = isBatteryInitial ? 1.0 : Math.min(Math.min(baseDpr, 1.5), initialEffective.effectivePixelRatio || 1.0);
    renderer.setPixelRatio(effectiveDpr);

    renderer.shadowMap.enabled = !isBatteryInitial && initialEffective.shadowsEnabled;
    renderer.shadowMap.type = initialEffective.shadowMapSize <= 1024 ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.80;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Adaptive Battery Saver & Low-Power Constraints:
    // In low-power/battery mode, bypass EffectComposer and UnrealBloomPass entirely to render straight via renderer.render(scene, camera)
    if (!isBatteryInitial && initialEffective.bloomEnabled) {
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
      bloomPass.threshold = 0.99;
      bloomPass.strength = 0.005;
      bloomPass.radius = 0.05;
      bloomPass.enabled = true;
      bloomPassRef.current = bloomPass;

      const composerRenderTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        samples: initialEffective.targetQuality === 'HIGH' || initialEffective.targetQuality === 'ULTRA' ? 4 : 0,
      });
      const composer = new EffectComposer(renderer, composerRenderTarget);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);
      composerRef.current = composer;
    } else {
      composerRef.current = null;
      bloomPassRef.current = null;
    }

    // OrbitControls for Free Camera Movement around Board
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Lower angle freedom closer to tabletop
    controls.minDistance = 1.8; // Allows closer inspection of tokens and board tiles
    controls.maxDistance = 35;
    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
      lastUserInputTimeRef.current = performance.now();
      markDirty(5);
    });
    controls.addEventListener('change', () => {
      lastUserInputTimeRef.current = performance.now();
      markDirty(3);
    });
    controls.addEventListener('end', () => {
      lastUserInputTimeRef.current = performance.now();
      markDirty(5);
      setTimeout(() => {
        isUserInteractingRef.current = false;
        markDirty(5);
      }, 200);
    });
    controlsRef.current = controls;

    // Environment Map with light, soft ambient reflection (Skipped in battery saver to conserve texture memory)
    if (!initialEffective.isBatterySaver && initialEffective.targetQuality !== 'LOW') {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.25;
      pmremGenerator.dispose();
    }

    // Warm Sunset Porch Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x783552, 0.65); // Soft twilight rose sky ambient
    scene.add(ambientLight);

    // Warm Sun Directional Light (Runtime shadow casting turned off for maximum performance)
    const dirLight = new THREE.DirectionalLight(0xffa04a, 1.55);
    dirLight.position.set(-32, 12, -48);
    dirLight.castShadow = false;
    dirLight.shadow.mapSize.width = initialEffective.shadowMapSize;
    dirLight.shadow.mapSize.height = initialEffective.shadowMapSize;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Soft sky-to-ground hemisphere bounce light
    const hemiLight = new THREE.HemisphereLight(0xfca5a5, 0x3d1f16, 0.75);
    scene.add(hemiLight);

    // Warm Tabletop Accent Light
    const tableLight = new THREE.PointLight(0xffbe6b, 0.45, 14);
    tableLight.position.set(0, 4.5, 0);
    scene.add(tableLight);

    // Initialize 3D Porch Sunset Environment with dynamic quality parameters
    const porchEnv = buildPorchSunsetEnvironment(scene, {
      lowEnd: !initialEffective.shadowsEnabled || initialEffective.isBatterySaver,
      ambientAnimations: initialEffective.ambientAnimations,
      quality: initialEffective.targetQuality,
    });
    porchSunsetEnvRef.current = porchEnv;

    // -------------------------------------------------------------
    // BUILD 3D BOARD BASE & TILE MESHES WITH COLOR BANDS
    // -------------------------------------------------------------
    const boardBaseGeo = new RoundedBoxGeometry(11.2, 0.4, 11.2, 4, 0.1);
    const boardBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1f120c, // Rich dark mahogany/walnut wood base
      roughness: 0.38,
      metalness: 0.10,
    });
    const boardBase = new THREE.Mesh(boardBaseGeo, boardBaseMat);
    boardBase.position.y = -0.2;
    boardBase.receiveShadow = true;
    boardBase.castShadow = false;
    scene.add(boardBase);

    // Inner Green Felt Center with Luxury Gold Leaf Filigree
    const feltTex = createBoardCenterFeltTexture();
    const feltGeo = new THREE.PlaneGeometry(7.6, 7.6);
    feltGeo.rotateX(-Math.PI / 2);
    const feltMat = new THREE.MeshStandardMaterial({
      map: feltTex,
      roughness: 0.82,
      metalness: 0.05,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.position.y = 0.01;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Inlaid Brass Trim Bevel Frame separating property spaces from center felt
    const innerTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished gold brass
      metalness: 0.92,
      roughness: 0.18,
    });
    const feltInnerSize = 7.6;
    const trimWidth = 0.045;
    const trimH = 0.02;

    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(feltInnerSize + trimWidth * 2, trimH, trimWidth), innerTrimMat);
    topTrim.position.set(0, 0.012, -feltInnerSize / 2 - trimWidth / 2);
    scene.add(topTrim);

    const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(feltInnerSize + trimWidth * 2, trimH, trimWidth), innerTrimMat);
    bottomTrim.position.set(0, 0.012, feltInnerSize / 2 + trimWidth / 2);
    scene.add(bottomTrim);

    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(trimWidth, trimH, feltInnerSize), innerTrimMat);
    leftTrim.position.set(-feltInnerSize / 2 - trimWidth / 2, 0.012, 0);
    scene.add(leftTrim);

    const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(trimWidth, trimH, feltInnerSize), innerTrimMat);
    rightTrim.position.set(feltInnerSize / 2 + trimWidth / 2, 0.012, 0);
    scene.add(rightTrim);

    // 4 Solid Antique Brass Corner Brackets on the Wooden Board Corners
    const boardCornerBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.18,
    });
    const boardCornerOffset = 5.58;
    [
      [-boardCornerOffset, -boardCornerOffset],
      [boardCornerOffset, -boardCornerOffset],
      [-boardCornerOffset, boardCornerOffset],
      [boardCornerOffset, boardCornerOffset],
    ].forEach(([cx, cz]) => {
      const cornerBracket = new THREE.Mesh(
        new RoundedBoxGeometry(0.50, 0.42, 0.50, 2, 0.04),
        boardCornerBrassMat
      );
      cornerBracket.position.set(cx, -0.2, cz);
      cornerBracket.castShadow = false;
      cornerBracket.receiveShadow = true;
      scene.add(cornerBracket);
    });

    // -------------------------------------------------------------
    // BUILD PHYSICAL 3D CHANCE DECK ON THE BOARD GREEN FELT
    // -------------------------------------------------------------
    const chanceDeckGroup = new THREE.Group();
    chanceDeckGroup.position.set(2.1, 0.041, -2.1);
    chanceDeckGroup.rotation.y = -Math.PI / 4; // Diagonally aligned on felt

    const deckTex = createChanceCardBackTexture();
    const deckCardMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.3, metalness: 0.05 });
    const deckEdgeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

    const stackHeight = 0.08;
    const deckBlockGeo = new THREE.BoxGeometry(0.70, stackHeight, 0.46);
    const deckBlockMesh = new THREE.Mesh(deckBlockGeo, [
      deckEdgeMat, deckEdgeMat, deckCardMat, deckEdgeMat, deckEdgeMat, deckEdgeMat
    ]);
    deckBlockMesh.position.y = stackHeight / 2;
    deckBlockMesh.receiveShadow = true;
    chanceDeckGroup.add(deckBlockMesh);

    // Board Slot Designation Outline
    const slotGeo = new THREE.PlaneGeometry(0.78, 0.54);
    slotGeo.rotateX(-Math.PI / 2);
    const slotTex = createDeckSlotTexture('CHANCE', '#EA580C');
    const slotMat = new THREE.MeshBasicMaterial({ map: slotTex, transparent: true });
    const slotMesh = new THREE.Mesh(slotGeo, slotMat);
    slotMesh.position.y = -0.005;
    chanceDeckGroup.add(slotMesh);

    scene.add(chanceDeckGroup);

    // -------------------------------------------------------------
    // BUILD PHYSICAL 3D COMMUNITY CHEST DECK ON THE BOARD GREEN FELT
    // -------------------------------------------------------------
    const chestDeckGroup = new THREE.Group();
    chestDeckGroup.position.set(-2.1, 0.041, 2.1);
    chestDeckGroup.rotation.y = -Math.PI / 4; // Diagonally aligned on felt

    const chestDeckTex = createChestCardBackTexture();
    const chestDeckCardMat = new THREE.MeshStandardMaterial({ map: chestDeckTex, roughness: 0.3, metalness: 0.05 });
    const chestDeckEdgeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

    const chestDeckBlockGeo = new THREE.BoxGeometry(0.70, stackHeight, 0.46);
    const chestDeckBlockMesh = new THREE.Mesh(chestDeckBlockGeo, [
      chestDeckEdgeMat, chestDeckEdgeMat, chestDeckCardMat, chestDeckEdgeMat, chestDeckEdgeMat, chestDeckEdgeMat
    ]);
    chestDeckBlockMesh.position.y = stackHeight / 2;
    chestDeckBlockMesh.receiveShadow = true;
    chestDeckGroup.add(chestDeckBlockMesh);

    // Board Slot Designation Outline for Community Chest
    const chestSlotGeo = new THREE.PlaneGeometry(0.78, 0.54);
    chestSlotGeo.rotateX(-Math.PI / 2);
    const chestSlotTex = createDeckSlotTexture('COMMUNITY CHEST', '#D97706');
    const chestSlotMat = new THREE.MeshBasicMaterial({ map: chestSlotTex, transparent: true });
    const chestSlotMesh = new THREE.Mesh(chestSlotGeo, chestSlotMat);
    chestSlotMesh.position.y = -0.005;
    chestDeckGroup.add(chestSlotMesh);

    scene.add(chestDeckGroup);

    // -------------------------------------------------------------
    // BUILD PHYSICAL 3D DRAFT CARDS GROUP ON BOARD CENTER
    // -------------------------------------------------------------
    const draftBoardGroup = new THREE.Group();
    draftBoardGroup.position.set(0, 0, 0);
    scene.add(draftBoardGroup);
    draftBoardGroupRef.current = draftBoardGroup;

    // Contact Shadows below tokens
    const contactShadowGeo = new THREE.PlaneGeometry(12, 12);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.ShadowMaterial({ opacity: 0.5 });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.position.y = 0.045;
    contactShadowMesh.receiveShadow = true;
    scene.add(contactShadowMesh);

    // Instantiate 40 Board Tiles
    boardSpaces.forEach((space, idx) => {
      const coords = getSpaceCoordinates(idx);
      const isCorner = idx % 10 === 0;
      const tileW = isCorner ? 1.60 : 0.80;
      const tileH = isCorner ? 1.60 : 1.60;

      const tileGeo = new RoundedBoxGeometry(tileW, 0.08, tileH, 2, 0.02);

      const prop = properties.find((p) => p.id === space.propertyId);
      const colorGroup = prop?.colorGroup || space.colorGroup;

      // Materials for Top Face Texture including Property Color Bands
      const isLowPowerProfile = Boolean(
        isBatteryInitial ||
        initialEffective.isBatterySaver ||
        initialEffective.isLowEndMode ||
        initialEffective.targetQuality === 'BATTERY_SAVER' ||
        initialEffective.targetQuality === 'LOW'
      );
      const topTex = createTileTextTexture(
        space,
        prop?.basePrice,
        isCorner,
        colorGroup,
        isLowPowerProfile
      );
      const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
      const tileMesh = new THREE.Mesh(tileGeo, tileMat);
      
      tileMesh.position.set(coords.x, 0.04, coords.z);
      tileMesh.rotation.y = coords.rotation;
      tileMesh.receiveShadow = true;

      // Cardboard print: Top face oriented with color band and name facing outward away from board center
      const topGeo = new THREE.PlaneGeometry(tileW - 0.01, tileH - 0.01);
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.65, metalness: 0.0 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
      topMesh.position.y = 0.041;
      topMesh.receiveShadow = true;
      tileMesh.add(topMesh);

      // Tile Illumination: Edge perimeter frame illumination for roll path preview
      const halfW = (tileW - 0.01) / 2;
      const halfH = (tileH - 0.01) / 2;
      const borderW = isCorner ? 0.13 : 0.095;

      const edgeShape = new THREE.Shape();
      edgeShape.moveTo(-halfW, -halfH);
      edgeShape.lineTo(halfW, -halfH);
      edgeShape.lineTo(halfW, halfH);
      edgeShape.lineTo(-halfW, halfH);
      edgeShape.closePath();

      const edgeHole = new THREE.Path();
      edgeHole.moveTo(-halfW + borderW, -halfH + borderW);
      edgeHole.lineTo(halfW - borderW, -halfH + borderW);
      edgeHole.lineTo(halfW - borderW, halfH - borderW);
      edgeHole.lineTo(-halfW + borderW, halfH - borderW);
      edgeHole.closePath();

      edgeShape.holes.push(edgeHole);
      const illumGeo = new THREE.ShapeGeometry(edgeShape);
      const illumMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const illumMesh = new THREE.Mesh(illumGeo, illumMat);
      illumMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
      illumMesh.position.y = 0.043;
      illumMesh.visible = false;
      illumMesh.userData = { isIlluminationOverlay: true, spaceIndex: idx };
      tileMesh.add(illumMesh);
      tileIlluminationMeshesMapRef.current.set(idx, illumMesh);

      // Red outline border for wildcard targeting highlight
      const outlineGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(tileW, tileH));
      const outlineMat = new THREE.LineBasicMaterial({
        color: 0xef4444,
        linewidth: 3,
        transparent: true,
        opacity: 0,
      });
      const outlineMesh = new THREE.LineSegments(outlineGeo, outlineMat);
      outlineMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
      outlineMesh.position.y = 0.046;
      outlineMesh.visible = false;
      outlineMesh.userData = { isPropertyTargetOutline: true, spaceIndex: idx };
      tileMesh.add(outlineMesh);
      tileOutlineMeshesMapRef.current.set(idx, outlineMesh);

      // Ownership Indicator: A sleek colored stripe across the bottom of the tile
      if (space.type === 'PROPERTY') {
        const stripeGeo = new THREE.BoxGeometry(tileW - 0.04, 0.016, 0.08);
        const ownerPlayer = prop?.ownerId !== null && prop?.ownerId !== undefined ? players.find((p) => p.id === prop.ownerId) : null;
        const stripeMat = new THREE.MeshStandardMaterial({
          color: ownerPlayer ? ownerPlayer.color : 0x475569,
          metalness: 0.25,
          roughness: 0.35,
        });
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(0, 0.045, -tileH * 0.5 + 0.05);
        stripeMesh.visible = prop?.ownerId !== null && prop?.ownerId !== undefined;
        stripeMesh.userData = { isOwnershipTab: true, propertyId: prop?.id };
        tileMesh.add(stripeMesh);

        // Sync 3D physical houses / hotel on tile color band
        updateTilePhysicalBuildings(tileMesh, prop);
      }

      scene.add(tileMesh);
      tileMeshesMapRef.current.set(idx, tileMesh);
    });

    // -------------------------------------------------------------
    // BUILD PHYSICAL 3D IN-JAIL CELL STRUCTURE (SPACE 10)
    // Covers exactly the "In Jail" inner square (1.04 x 1.04) without intruding on the "Just Visiting" walkway
    // -------------------------------------------------------------
    const jailYardGroup = new THREE.Group();
    jailYardGroup.position.set(-4.18, 0.081, 4.18);

    // Dark reinforced steel floor plate for inner jail cell
    const cellDim = 1.04;
    const halfDim = cellDim / 2;
    const yardFloorGeo = new THREE.PlaneGeometry(cellDim, cellDim);
    yardFloorGeo.rotateX(-Math.PI / 2);
    const yardFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.45,
    });
    const yardFloor = new THREE.Mesh(yardFloorGeo, yardFloorMat);
    yardFloor.receiveShadow = true;
    jailYardGroup.add(yardFloor);

    // Hazard boundary trim around inner cell
    const hazardGeo = new THREE.RingGeometry(halfDim - 0.02, halfDim, 4);
    hazardGeo.rotateX(-Math.PI / 2);
    hazardGeo.rotateY(Math.PI / 4);
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const hazardMesh = new THREE.Mesh(hazardGeo, hazardMat);
    hazardMesh.position.y = 0.002;
    jailYardGroup.add(hazardMesh);

    // Heavy Iron Bars & Corner Posts
    const barMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const cornerPostGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.52, 12);
    const cornerOffsets = [
      [-halfDim, -halfDim],
      [halfDim, -halfDim],
      [-halfDim, halfDim],
      [halfDim, halfDim],
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const post = new THREE.Mesh(cornerPostGeo, barMat);
      post.position.set(cx, 0.26, cz);
      jailYardGroup.add(post);
    });

    // Vertical Iron Bars along all 4 perimeter faces
    const barGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.50, 8);
    const barCount = 5;
    for (let i = 1; i < barCount; i++) {
      const offset = -halfDim + (i * cellDim) / barCount;
      // North & South walls
      const barN = new THREE.Mesh(barGeo, barMat);
      barN.position.set(offset, 0.25, -halfDim);
      jailYardGroup.add(barN);

      const barS = new THREE.Mesh(barGeo, barMat);
      barS.position.set(offset, 0.25, halfDim);
      jailYardGroup.add(barS);

      // East & West walls
      const barW = new THREE.Mesh(barGeo, barMat);
      barW.position.set(-halfDim, 0.25, offset);
      jailYardGroup.add(barW);

      const barE = new THREE.Mesh(barGeo, barMat);
      barE.position.set(halfDim, 0.25, offset);
      jailYardGroup.add(barE);
    }

    // Top Perimeter Frame Beams
    const beamGeoX = new THREE.BoxGeometry(cellDim + 0.02, 0.02, 0.02);
    const beamGeoZ = new THREE.BoxGeometry(0.02, 0.02, cellDim + 0.02);

    const beamN = new THREE.Mesh(beamGeoX, barMat);
    beamN.position.set(0, 0.52, -halfDim);
    jailYardGroup.add(beamN);

    const beamS = new THREE.Mesh(beamGeoX, barMat);
    beamS.position.set(0, 0.52, halfDim);
    jailYardGroup.add(beamS);

    const beamW = new THREE.Mesh(beamGeoZ, barMat);
    beamW.position.set(-halfDim, 0.52, 0);
    jailYardGroup.add(beamW);

    const beamE = new THREE.Mesh(beamGeoZ, barMat);
    beamE.position.set(halfDim, 0.52, 0);
    jailYardGroup.add(beamE);

    // Open roof crossbars
    for (let i = 1; i < 3; i++) {
      const roofBarGeo = new THREE.CylinderGeometry(0.007, 0.007, cellDim, 8);
      roofBarGeo.rotateZ(Math.PI / 2);
      const roofBar = new THREE.Mesh(roofBarGeo, barMat);
      roofBar.position.set(0, 0.525, -halfDim + (i * cellDim) / 3);
      jailYardGroup.add(roofBar);
    }

    scene.add(jailYardGroup);

    // -------------------------------------------------------------
    // BUILD PHYSICAL 3D FREE PARKING VAULT (SPACE 20 INNER ANGLE)
    // Positioned right next to Free Parking, just on the inside part of the board
    // -------------------------------------------------------------
    const vaultGroup = new THREE.Group();
    // Space 20 corner is at (-4.40, -4.40). Inside border corner is at (-3.35, -3.35).
    vaultGroup.position.set(-3.35, 0.081, -3.35);
    vaultGroup.rotation.y = Math.PI / 4; // Angle diagonally towards the center of the board

    // Heavy reinforced steel vault plinth
    const plinthGeo = new THREE.BoxGeometry(0.70, 0.04, 0.65);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.5,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.02;
    plinthMesh.receiveShadow = true;
    vaultGroup.add(plinthMesh);

    // Armored Safe Body (gunmetal steel with gold corner trims)
    const safeBodyGeo = new THREE.BoxGeometry(0.55, 0.42, 0.48);
    const safeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const safeBody = new THREE.Mesh(safeBodyGeo, safeBodyMat);
    safeBody.position.y = 0.25;
    safeBody.castShadow = false;
    safeBody.receiveShadow = true;
    vaultGroup.add(safeBody);

    // Gold Corner Reinforcement Rivets
    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const cornerRivetGeo = new THREE.BoxGeometry(0.04, 0.44, 0.04);
    [[-0.27, -0.23], [0.27, -0.23], [-0.27, 0.23], [0.27, 0.23]].forEach(([rx, rz]) => {
      const rivet = new THREE.Mesh(cornerRivetGeo, rivetMat);
      rivet.position.set(rx, 0.25, rz);
      vaultGroup.add(rivet);
    });

    // Circular Vault Door on Front Face (Z = 0.245)
    const doorGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24);
    doorGeo.rotateX(Math.PI / 2);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.15,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(0, 0.24, 0.245);
    vaultGroup.add(doorMesh);

    // Chrome Dial & Spoke Wheel Handle
    const dialGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
    dialGeo.rotateX(Math.PI / 2);
    const dialMesh = new THREE.Mesh(dialGeo, rivetMat);
    dialMesh.position.set(0, 0.24, 0.265);
    vaultGroup.add(dialMesh);

    const spokeGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8);
    const spoke1 = new THREE.Mesh(spokeGeo, rivetMat);
    spoke1.position.set(0, 0.24, 0.275);
    vaultGroup.add(spoke1);
    const spoke2 = new THREE.Mesh(spokeGeo, rivetMat);
    spoke2.rotation.z = Math.PI / 2;
    spoke2.position.set(0, 0.24, 0.275);
    vaultGroup.add(spoke2);

    // Dynamic Jackpot Display Screen on the Angled Roof (Angled toward center/camera)
    const screenGeo = new THREE.PlaneGeometry(0.46, 0.23);
    screenGeo.rotateX(-Math.PI / 4); // tilted 45 degrees towards the center

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    vaultDisplayCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, 492, 236);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOTTERY VAULT', 256, 70);
      ctx.fillStyle = '#FBBF24';
      ctx.font = '900 88px sans-serif';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
      ctx.shadowBlur = 16;
      ctx.fillText(`$${lotteryPool}`, 256, 175);
      ctx.shadowBlur = 0;
    }

    const screenTexture = new THREE.CanvasTexture(canvas);
    screenTexture.generateMipmaps = false;
    screenTexture.minFilter = THREE.LinearFilter;
    vaultDisplayTextureRef.current = screenTexture;

    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      side: THREE.DoubleSide,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.49, 0.12);
    vaultGroup.add(screenMesh);

    // Small Gold Bar Stacks Beside the Safe
    const goldBarGeo = new THREE.BoxGeometry(0.08, 0.025, 0.04);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.95,
      roughness: 0.15,
    });
    const barPositions = [
      [0.22, 0.05, 0.14],
      [0.22, 0.075, 0.14],
      [0.22, 0.05, 0.20],
      [-0.22, 0.05, 0.16],
    ];
    barPositions.forEach(([bx, by, bz]) => {
      const bar = new THREE.Mesh(goldBarGeo, goldMat);
      bar.position.set(bx, by, bz);
      bar.castShadow = false;
      vaultGroup.add(bar);
    });

    scene.add(vaultGroup);

    // -------------------------------------------------------------
    // BUILD DISTINCT 3D PLAYER TOKENS WITH 3D AVATAR IDENTIFIERS
    // -------------------------------------------------------------
    players.forEach((p) => {
      const tokenMesh = createDistinctPlayerTokenMesh(p.tokenShape, p.color, p.avatarColor, p.avatarShape);
      const sameTilePlayers = players.filter((pl) => pl.position === p.position && pl.inJail === p.inJail);
      const tokenIdx = sameTilePlayers.findIndex((pl) => pl.id === p.id);
      const coords = getPlayerTargetCoords(p.position, p.inJail, tokenIdx, sameTilePlayers.length);
      tokenMesh.position.set(coords.x, 0.08, coords.z);
      scene.add(tokenMesh);
      playerTokensMapRef.current.set(p.id, tokenMesh);

      tokenAnimMapRef.current.set(p.id, {
        startPosIdx: p.position,
        endPosIdx: p.position,
        currentStepProgress: 1,
        currentStepIdx: p.position,
        isMoving: false,
      });
    });

    // -------------------------------------------------------------
    // RAYCASTER CLICK & HOVER HANDLER
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastPointerRaycastTime = 0;

    const handlePointerMove = (e: MouseEvent) => {
      lastUserInputTimeRef.current = performance.now();
      if (!rendererRef.current || !cameraRef.current || !cameraHandGroupRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Throttle heavy 3D raycasting to at most once every 14ms (~70Hz), preventing
      // high-polling gaming mice (500Hz-1000Hz) from saturating the CPU thread
      const now = performance.now();
      if (now - lastPointerRaycastTime < 14) {
        return;
      }
      lastPointerRaycastTime = now;

      raycaster.setFromCamera(mouse, cameraRef.current);

      let foundHoverCardId: string | null = null;
      let isOverInteractive = false;

      // 0. Check Draft Cards Raycast (During DRAFT phase)
      if (gamePhaseRef.current === 'DRAFT' && draftBoardGroupRef.current?.visible && !draftSeqStateRef.current.active) {
        const hitsDraft = raycaster.intersectObjects(draftBoardGroupRef.current.children, true);
        let hoveredDraftId: string | null = null;
        for (const hit of hitsDraft) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== draftBoardGroupRef.current) {
            if (obj.userData && obj.userData.isDraftCard) {
              const cardItem = draftCardsMapRef.current.get(obj.userData.propertyId);
              if (cardItem && cardItem.state === 'FACE_DOWN') {
                hoveredDraftId = obj.userData.propertyId;
                isOverInteractive = true;
                break;
              }
            }
            obj = obj.parent;
          }
          if (hoveredDraftId) break;
        }
        hoveredDraftCardIdRef.current = hoveredDraftId;
        if (rendererRef.current?.domElement) {
          rendererRef.current.domElement.style.cursor = isOverInteractive ? 'pointer' : 'default';
        }
        if (hoveredDraftId) return;
      }

      // 1. Check Floating Dice (Ignored if currently inspecting a card in the center)
      if (inspectedCardIdRef.current === null && floatingDiceGroupRef.current && floatingDiceGroupRef.current.visible) {
        const floatingHits = raycaster.intersectObjects(floatingDiceGroupRef.current.children, true);
        for (const hit of floatingHits) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== cameraRef.current) {
            if (obj.userData && obj.userData.isFloatingDice) {
              isOverInteractive = true;
              break;
            }
            obj = obj.parent;
          }
          if (isOverInteractive) break;
        }
      }

      // 1.3 Check Property Target Selection hover when Wildcard targeting is active
      if (targetSelectionRef.current?.targetType === 'PROPERTY' && sceneRef.current) {
        const hitsTarget = raycaster.intersectObjects(sceneRef.current.children, true);
        const eligibleSet = new Set(targetSelectionRef.current.eligiblePropertyIds);
        for (const hit of hitsTarget) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== sceneRef.current) {
            if (obj.userData && obj.userData.spaceIndex !== undefined) {
              const space = boardSpacesRef.current[obj.userData.spaceIndex];
              if (space && space.propertyId && eligibleSet.has(space.propertyId)) {
                isOverInteractive = true;
                break;
              }
            }
            obj = obj.parent;
          }
          if (isOverInteractive) break;
        }
      }

      // 1.4 Check Land on GO Board Hover
      if (isLandOnGoActiveRef.current && sceneRef.current) {
        const hitsGo = raycaster.intersectObjects(sceneRef.current.children, true);
        for (const hit of hitsGo) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== sceneRef.current) {
            if (obj.userData && obj.userData.spaceIndex !== undefined) {
              isOverInteractive = true;
              break;
            }
            obj = obj.parent;
          }
          if (isOverInteractive) break;
        }
      }

      // 1.5 Check Purchase Prompt Raycast
      if (purchasePromptGroupRef.current && purchasePromptGroupRef.current.visible) {
        const hitsPrompt = raycaster.intersectObjects(purchasePromptGroupRef.current.children, true);
        for (const hit of hitsPrompt) {
          if (hit.object && hit.object.userData && hit.object.userData.buttonAction) {
            isOverInteractive = true;
            break;
          }
        }
        hoveredCardIdRef.current = null;
        if (rendererRef.current.domElement) {
          rendererRef.current.domElement.style.cursor = isOverInteractive ? 'pointer' : 'default';
        }
        return; // Prevent hovering any deck card while purchase prompt is displayed
      }

      // 1.8 Check Chance Card Raycast
      if (chanceGroupRef.current && chanceGroupRef.current.visible) {
        const hitsChance = raycaster.intersectObjects(chanceGroupRef.current.children, true);
        for (const hit of hitsChance) {
          if (hit.object && hit.object.userData) {
            if (hit.object.userData.buttonAction === 'RESOLVE_CHANCE' && chanceContinueMeshRef.current?.visible) {
              isOverInteractive = true;
              break;
            }
            if (hit.object.userData.isChanceCard && !chanceCardIsFlippedRef.current) {
              isOverInteractive = true;
              break;
            }
          }
        }
        hoveredCardIdRef.current = null;
        if (rendererRef.current.domElement) {
          rendererRef.current.domElement.style.cursor = isOverInteractive ? 'pointer' : 'default';
        }
        return;
      }

      // 1.9 Check Community Chest Card Raycast
      if (chestGroupRef.current && chestGroupRef.current.visible) {
        const hitsChest = raycaster.intersectObjects(chestGroupRef.current.children, true);
        for (const hit of hitsChest) {
          if (hit.object && hit.object.userData) {
            if (hit.object.userData.buttonAction === 'RESOLVE_CHEST' && chestContinueMeshRef.current?.visible) {
              isOverInteractive = true;
              break;
            }
            if (hit.object.userData.isChestCard && !chestCardIsFlippedRef.current) {
              isOverInteractive = true;
              break;
            }
          }
        }
        hoveredCardIdRef.current = null;
        if (rendererRef.current.domElement) {
          rendererRef.current.domElement.style.cursor = isOverInteractive ? 'pointer' : 'default';
        }
        return;
      }

      // 2. Check Card Hand Raycast
      const hitsHand = raycaster.intersectObjects(cameraHandGroupRef.current.children, true);
      
      if (inspectedCardIdRef.current !== null) {
        // While inspecting a card, disable hover over all hand cards (cursor only for buttons on the inspected card)
        foundHoverCardId = null;
        for (const hit of hitsHand) {
          let obj: THREE.Object3D | null = hit.object;
          if (obj && obj.userData && obj.userData.buttonAction) {
            isOverInteractive = true;
            break;
          }
        }
      } else {
        for (const hit of hitsHand) {
          let obj: THREE.Object3D | null = hit.object;
          if (obj && obj.userData && obj.userData.buttonAction) {
            isOverInteractive = true;
          }
          while (obj && obj !== cameraHandGroupRef.current) {
            if (obj.userData && obj.userData.cardId) {
              foundHoverCardId = obj.userData.cardId;
              isOverInteractive = true;
              break;
            }
            obj = obj.parent;
          }
          if (foundHoverCardId) break;
        }
      }

      hoveredCardIdRef.current = foundHoverCardId;

      if (rendererRef.current.domElement) {
        rendererRef.current.domElement.style.cursor = isOverInteractive ? 'pointer' : 'default';
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      lastUserInputTimeRef.current = performance.now();
      if (!rendererRef.current || !cameraRef.current || !cameraHandGroupRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const isLocalPlayerTurn = activePlayerIdRef.current === 0;

      // Check Property Target Selection Clicks when Wildcard requires property selection
      if (targetSelectionRef.current?.targetType === 'PROPERTY' && sceneRef.current) {
        const hitsTarget = raycaster.intersectObjects(sceneRef.current.children, true);
        const eligibleSet = new Set(targetSelectionRef.current.eligiblePropertyIds);
        for (const hit of hitsTarget) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== sceneRef.current) {
            if (obj.userData && obj.userData.spaceIndex !== undefined) {
              const space = boardSpacesRef.current[obj.userData.spaceIndex];
              if (space && space.propertyId && eligibleSet.has(space.propertyId)) {
                soundFx.playCardDraw();
                callbacksRef.current.onSelectTargetProperty?.(space.propertyId);
                return;
              }
            }
            obj = obj.parent;
          }
        }
      }

      // Check Land on GO Clicks when Land on GO is active
      if (isLandOnGoActiveRef.current && sceneRef.current) {
        const hitsGo = raycaster.intersectObjects(sceneRef.current.children, true);
        for (const hit of hitsGo) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== sceneRef.current) {
            if (obj.userData && obj.userData.spaceIndex !== undefined) {
              const spaceIdx = obj.userData.spaceIndex;
              const space = boardSpacesRef.current[spaceIdx];
              if (spaceIdx === 0) {
                soundFx.playCash();
                callbacksRef.current.onTakeDoubleCash?.();
                return;
              } else if (space) {
                soundFx.playCardDraw();
                callbacksRef.current.onWarpToSpace?.(spaceIdx, space.name);
                return;
              }
            }
            obj = obj.parent;
          }
        }
      }

      // 0. Check Draft Cards Click (During DRAFT phase)
      if (gamePhaseRef.current === 'DRAFT' && draftBoardGroupRef.current?.visible && !draftSeqStateRef.current.active) {
        const hitsDraft = raycaster.intersectObjects(draftBoardGroupRef.current.children, true);
        for (const hit of hitsDraft) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== draftBoardGroupRef.current) {
            if (obj.userData && obj.userData.isDraftCard) {
              const chosenPropId = obj.userData.propertyId;
              const chosenCardItem = draftCardsMapRef.current.get(chosenPropId);
              if (chosenCardItem && chosenCardItem.state === 'FACE_DOWN') {
                soundFx.playCardDraw();

                // Build sequential queue: Human player (0) gets chosen card, remaining players get the other cards
                const unchosenCards = Array.from(draftCardsMapRef.current.values()).filter(
                  (c) => c.property.id !== chosenPropId
                );

                const queue: { cardId: string; playerId: number }[] = [
                  { cardId: chosenPropId, playerId: 0 },
                ];

                playersRef.current.forEach((p, pIdx) => {
                  if (p.id !== 0 && unchosenCards[pIdx - 1]) {
                    queue.push({
                      cardId: unchosenCards[pIdx - 1].property.id,
                      playerId: p.id,
                    });
                  }
                });

                chosenCardItem.state = 'REVEALING';
                chosenCardItem.assignedPlayerId = 0;
                chosenCardItem.animStartTime = performance.now();

                draftSeqStateRef.current = {
                  active: true,
                  queue,
                  queueIndex: 0,
                  stepStartTime: performance.now(),
                  phase: 'REVEAL',
                  revealedProperty: chosenCardItem.property,
                  draftingPlayer: playersRef.current[0] || null,
                };

                setDraftAnnouncement({
                  visible: true,
                  text: `YOU CHOSE A MYSTERY PROPERTY!`,
                  subText: 'Revealing title deed...',
                  color: '#38BDF8',
                });

                return;
              }
            }
            obj = obj.parent;
          }
        }
      }

      // 1. Check Floating 3D Dice First (Only if NOT inspecting a card in the center)
      if (inspectedCardIdRef.current === null && isLocalPlayerTurn && turnPhaseRef.current === 'PRE_ROLL' && gamePhaseRef.current === 'IN_GAME' && !dicePhysicsRef.current.active && floatingDiceGroupRef.current && floatingDiceGroupRef.current.visible) {
        const floatingHits = raycaster.intersectObjects(floatingDiceGroupRef.current.children, true);
        for (const hit of floatingHits) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== cameraRef.current) {
            if (obj.userData && obj.userData.isFloatingDice) {
              if (floatingDiceGroupRef.current) {
                floatingDiceGroupRef.current.visible = false;
              }
              startPhysicalDiceRoll();
              return;
            }
            obj = obj.parent;
          }
        }
      }

      // 1.5 Check Purchase Prompt Clicks
      if (purchasePromptGroupRef.current && purchasePromptGroupRef.current.visible) {
        const hitsPrompt = raycaster.intersectObjects(purchasePromptGroupRef.current.children, true);
        for (const hit of hitsPrompt) {
          if (hit.object && hit.object.userData && hit.object.userData.buttonAction) {
            const action = hit.object.userData.buttonAction;
            if (action === 'BUY_PROMPT' && purchasePromptActivePropId.current) {
              soundFx.playBuyProperty();
              const boughtPropId = purchasePromptActivePropId.current;
              purchasePromptActivePropId.current = null;
              if (purchasePromptGroupRef.current) {
                purchasePromptGroupRef.current.visible = false;
              }
              callbacksRef.current.onBuyProperty(boughtPropId, false);
            } else if (action === 'DISCOUNT_BUY_PROMPT' && purchasePromptActivePropId.current) {
              soundFx.playBuyProperty();
              const boughtPropId = purchasePromptActivePropId.current;
              purchasePromptActivePropId.current = null;
              if (purchasePromptGroupRef.current) {
                purchasePromptGroupRef.current.visible = false;
              }
              callbacksRef.current.onBuyProperty(boughtPropId, true);
            } else if (action === 'PASS_PROMPT' || action === 'AUCTION_PROMPT') {
              soundFx.playCardDraw();
              const passedPropId = purchasePromptActivePropId.current;
              if (passedPropId) {
                passedPropertyIdsRef.current.add(passedPropId);
                if (callbacksRef.current.onPassProperty) {
                  callbacksRef.current.onPassProperty(passedPropId);
                }
              }
              purchasePromptActivePropId.current = null;
              if (purchasePromptGroupRef.current) {
                purchasePromptGroupRef.current.visible = false;
              }
            }
            return; // consume click on prompt buttons
          }
        }
        return; // Consume click anywhere else so deck cards cannot be selected while purchase prompt is shown
      }

      // 1.8 Check Chance Card Clicks
      if (chanceGroupRef.current && chanceGroupRef.current.visible) {
        const hitsChance = raycaster.intersectObjects(chanceGroupRef.current.children, true);
        for (const hit of hitsChance) {
          if (hit.object && hit.object.userData) {
            if (hit.object.userData.buttonAction === 'RESOLVE_CHANCE' && chanceContinueMeshRef.current?.visible) {
              soundFx.playCash();
              if (activeChanceCardRef.current && callbacksRef.current.onResolveChanceCard) {
                callbacksRef.current.onResolveChanceCard(activeChanceCardRef.current);
              }
              return;
            }
            if (hit.object.userData.isChanceCard) {
              if (!chanceCardIsFlippedRef.current) {
                soundFx.playCardDraw();
                chanceCardIsFlippedRef.current = true;
                chanceCardFlipStartTimeRef.current = performance.now();
              }
              return;
            }
          }
        }
        return; // Consume click anywhere else while chance card is displayed
      }

      // 1.9 Check Community Chest Card Clicks
      if (chestGroupRef.current && chestGroupRef.current.visible) {
        const hitsChest = raycaster.intersectObjects(chestGroupRef.current.children, true);
        for (const hit of hitsChest) {
          if (hit.object && hit.object.userData) {
            if (hit.object.userData.buttonAction === 'RESOLVE_CHEST' && chestContinueMeshRef.current?.visible) {
              soundFx.playCash();
              if (activeCommunityChestCardRef.current && callbacksRef.current.onResolveCommunityChestCard) {
                callbacksRef.current.onResolveCommunityChestCard(activeCommunityChestCardRef.current);
              }
              return;
            }
            if (hit.object.userData.isChestCard) {
              if (!chestCardIsFlippedRef.current) {
                soundFx.playCardDraw();
                chestCardIsFlippedRef.current = true;
                chestCardFlipStartTimeRef.current = performance.now();
              }
              return;
            }
          }
        }
        return; // Consume click anywhere else while community chest card is displayed
      }

      // 2. If currently inspecting a card, process actions/close or exit inspection without selecting other cards
      if (inspectedCardIdRef.current !== null) {
        const hitsHand = raycaster.intersectObjects(cameraHandGroupRef.current.children, true);

        // Check for action button clicks first
        for (const hit of hitsHand) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && obj !== cameraHandGroupRef.current) {
            if (obj.userData && obj.userData.buttonAction) {
              const btnAction = obj.userData.buttonAction;
              if (btnAction === 'CLOSE_INSPECT') {
                soundFx.playCardDraw();
                inspectedCardIdRef.current = null;
                setInspectedCardId(null);
                return;
              }
              if (!isLocalPlayerTurn) return;

              const cardData = obj.userData.cardData as CardHandData;
              if (btnAction === 'BUILD_HOUSE' && cardData.actionPayload?.propertyId) {
                callbacksRef.current.onBuildHouse(cardData.actionPayload.propertyId);
                // Keep the card inspected so player can see updated status or continue building
                return;
              } else if (btnAction === 'SELL_HOUSE' && cardData.actionPayload?.propertyId) {
                soundFx.playCash();
                callbacksRef.current.onSellHouse?.(cardData.actionPayload.propertyId);
                return;
              } else if (btnAction === 'MORTGAGE' && cardData.actionPayload?.propertyId) {
                const propId = cardData.actionPayload.propertyId;
                const prop = propertiesRef.current.find((p) => p.id === propId);
                soundFx.playCardDraw();
                if (prop?.isMortgaged) {
                  callbacksRef.current.onUnmortgageProperty(propId);
                } else {
                  callbacksRef.current.onMortgageProperty(propId);
                }
                return;
              }
              return;
            }
            obj = obj.parent;
          }
        }

        // Check if the inspected card face or body itself was clicked (prevent accidental closing)
        const clickedInspectedCard = hitsHand.some((hit) => {
          let o: THREE.Object3D | null = hit.object;
          while (o && o !== cameraHandGroupRef.current) {
            if (o.userData && o.userData.cardId === inspectedCardIdRef.current) return true;
            o = o.parent;
          }
          return false;
        });

        if (clickedInspectedCard) {
          // Clicked on card body, keep inspected
          return;
        }

        // Clicking anywhere outside exits inspection
        soundFx.playCardDraw();
        inspectedCardIdRef.current = null;
        setInspectedCardId(null);
        return;
      }

      // 3. Normal Card Hand Clicks (When NOT inspecting)
      const hitsHand = raycaster.intersectObjects(cameraHandGroupRef.current.children, true);
      let selectedCardId: string | null = null;
      for (const hit of hitsHand) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== cameraHandGroupRef.current) {
          if (obj.userData && obj.userData.cardId) {
            selectedCardId = obj.userData.cardId;
            break;
          }
          obj = obj.parent;
        }
        if (selectedCardId) break;
      }

      if (selectedCardId) {
        const cardMeshObj = cardMeshesRef.current.get(selectedCardId);
        const cardData = cardMeshObj?.userData.cardData as CardHandData | undefined;

        if (cardData && (cardData.type === 'ACTION' || cardData.type === 'WILDCARD' || cardData.type === 'DRAFT' || cardData.type === 'TRADE')) {
          // STRICT TURN GUARD: Prevent playing action cards on other players' turns
          if (!isLocalPlayerTurn) {
            return;
          }

          soundFx.playBuyProperty();
          inspectedCardIdRef.current = null;
          setInspectedCardId(null);
          if (cardData.actionPayload?.actionType === 'END_TURN') {
            if (turnPhaseRef.current !== 'PRE_ROLL') {
              callbacksRef.current.onEndTurn();
            }
          } else if (cardData.actionPayload?.actionType === 'CHALLENGE') {
            callbacksRef.current.onChallenge();
          } else if (cardData.actionPayload?.actionType === 'TRADE') {
            callbacksRef.current.onInitiateTrade();
          } else if (cardData.actionPayload?.actionType === 'PLAY_WILDCARD' && cardData.actionPayload.wildcardId) {
            callbacksRef.current.onPlayWildcard(cardData.actionPayload.wildcardId);
          } else if (cardData.actionPayload?.actionType === 'DRAFT_PICK' && cardData.actionPayload.propertyId) {
            callbacksRef.current.onDraftProperty(cardData.actionPayload.propertyId);
          }
          return;
        }

        // Card Inspection: Allowed anytime so player can inspect their cards/properties
        soundFx.playCardDraw();
        inspectedCardIdRef.current = selectedCardId;
        setInspectedCardId(selectedCardId);
      }
    };

    const onUserActivity = () => {
      lastUserInputTimeRef.current = performance.now();
      markDirty(5);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove, { passive: true });
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', onUserActivity, { passive: true });
    domElem.addEventListener('wheel', onUserActivity, { passive: true });
    domElem.addEventListener('touchstart', onUserActivity, { passive: true });
    domElem.addEventListener('touchmove', onUserActivity, { passive: true });

    // -------------------------------------------------------------
    // MAIN RENDER & ANIMATION LOOP (With FPS Pacing & Battery Optimization)
    // -------------------------------------------------------------
    let animId: number;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      if (lastUserInputTimeRef.current === 0) {
        lastUserInputTimeRef.current = now;
      }
      const currentEff = effectiveSettingsRef.current;
      const targetFps = currentEff.targetFpsNumber;

      // Detect if any visual animation is active on the board (zero-allocation loop)
      let isAnyTokenMoving = false;
      for (const t of tokenAnimMapRef.current.values()) {
        if (t.isMoving || t.jailFlight?.active || t.currentStepIdx !== t.endPosIdx) {
          isAnyTokenMoving = true;
          break;
        }
      }

      // Check if camera is actively in a cinematic handoff transition
      const isCameraTransitioning = cameraHandoffRef.current !== null;

      // Check if floating prompt dice are visible for player roll
      const isPlayerTurnToRoll =
        activePlayerIdRef.current === 0 &&
        turnPhaseRef.current === 'PRE_ROLL' &&
        gamePhaseRef.current === 'IN_GAME' &&
        !dicePhysicsRef.current.active;

      const isMotionActive =
        dicePhysicsRef.current.active ||
        isAnyTokenMoving ||
        isCameraTransitioning ||
        isPlayerTurnToRoll ||
        isBoardAnimatingRef.current ||
        isUserInteractingRef.current ||
        particleBurstsRef.current.length > 0 ||
        draftSeqStateRef.current.active ||
        (chanceGroupRef.current && chanceGroupRef.current.visible) ||
        (chestGroupRef.current && chestGroupRef.current.visible);

      // Keep dirty flag active during active visual motion
      if (isMotionActive) {
        isDirtyRef.current = true;
        dirtyFramesRef.current = Math.max(dirtyFramesRef.current, 10);
      }

      // Multi-tier intelligent CPU/GPU throttling:
      // Wait for framerate to change until NO ACTIVITY FOR 5 MINUTES (300,000 ms)
      // 1. Background tab / minimized: 1 FPS only after 5 minutes of inactivity (conserves CPU/battery when abandoned)
      // 2. Full 5-minute inactivity: 20 FPS smart idle
      // 3. Active gameplay & idle turns (< 5 min): Full native target FPS!
      const userInactiveMs = now - lastUserInputTimeRef.current;
      const IDLE_INACTIVITY_THRESHOLD_MS = 300000; // 5 full minutes of inactivity
      const isInputInactive5Min = userInactiveMs >= IDLE_INACTIVITY_THRESHOLD_MS;
      const isIdlePowerActive = isInputInactive5Min && !isMotionActive && currentEff.smartIdleThrottle;

      let dynamicTargetFps = targetFps;
      if (typeof document !== 'undefined' && document.hidden && isInputInactive5Min) {
        dynamicTargetFps = 1;
      } else if (typeof document !== 'undefined' && document.hidden) {
        dynamicTargetFps = 15;
      } else if (isIdlePowerActive) {
        dynamicTargetFps = 20;
      }

      const effectiveInterval = 1000 / dynamicTargetFps;
      const elapsed = now - lastFrameTime;
      if (elapsed < effectiveInterval - 1) {
        return; // Frame throttled for battery & GPU saving
      }

      // ON-DEMAND DIRTY-FLAG RENDER LOOP:
      // Only skip WebGL rendering if motionless AND inactive for 5 full minutes
      if (!isDirtyRef.current && dirtyFramesRef.current <= 0 && !isMotionActive && isInputInactive5Min) {
        return;
      }

      lastFrameTime = now - (elapsed % effectiveInterval);
      frameCount++;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Disable shadow map auto-updates
      renderer.shadowMap.autoUpdate = false;

      if (controlsRef.current) {
        const controlsChanged = controlsRef.current.update();
        if (controlsChanged) {
          isDirtyRef.current = true;
          dirtyFramesRef.current = Math.max(dirtyFramesRef.current, 2);
        }
      }

      // Animate Porch Sunset Environment: Pause ambient porch environment animations under low-power or idle modes
      if (porchSunsetEnvRef.current) {
        if (isBatterySaverActive || currentEff.isLowEndMode || !currentEff.ambientAnimations) {
          porchSunsetEnvRef.current.setAmbientAnimations?.(false);
          porchSunsetEnvRef.current.setIdlePowerMode?.(true);
        } else {
          porchSunsetEnvRef.current.setIdlePowerMode?.(isIdlePowerActive || (!isMotionActive && !isDirtyRef.current));
          if (!isIdlePowerActive && (isMotionActive || isDirtyRef.current)) {
            porchSunsetEnvRef.current.update(now, dt);
          }
        }
      }

      // 1. Animate Floating Dice Visibility & Bobbing
      if (floatingDiceGroupRef.current) {
        const isPlayerTurnToRoll =
          activePlayerIdRef.current === 0 &&
          turnPhaseRef.current === 'PRE_ROLL' &&
          gamePhaseRef.current === 'IN_GAME' &&
          !dicePhysicsRef.current.active;
        floatingDiceGroupRef.current.visible = isPlayerTurnToRoll;
        if (isPlayerTurnToRoll) {
          floatingDiceGroupRef.current.position.y = -0.05 + Math.sin(now * 0.004) * 0.025;
          floatingDiceGroupRef.current.rotation.y += 0.01;
        }
      }

      // 2. Production-Ready 3D Rigid-Body Dice Physics Engine & Continuous Fixed-Timestep Simulation
      if (dicePhysicsRef.current.active && physicalDice1Ref.current) {
        const dState = dicePhysicsRef.current;
        physicalDice1Ref.current.visible = true;
        if (physicalDice2Ref.current) physicalDice2Ref.current.visible = dState.diceCount >= 2;
        if (physicalDice3Ref.current) physicalDice3Ref.current.visible = dState.diceCount >= 3;

        if (dState.state === 'ROLLING') {
          // Glowing Motion Trail Particle Emission (Deactivated under low-power / battery saver profiles)
          const isDiceTrailDeactivated = isBatterySaverActive || currentEff.isLowEndMode || !currentEff.ambientAnimations;
          if (!isDiceTrailDeactivated && now - lastTrailSpawnTimeRef.current > 16) {
            lastTrailSpawnTimeRef.current = now;
            const pool = diceTrailPoolRef.current;
            const poolLen = pool.length;

            const spawnTrail = (pos: THREE.Vector3, vel: THREE.Vector3) => {
              const speed = vel.length();
              if (speed < 0.22 || poolLen === 0) return;

              const item = pool[trailPoolIndexRef.current];
              trailPoolIndexRef.current = (trailPoolIndexRef.current + 1) % poolLen;

              item.active = true;
              item.startTime = now;
              item.maxAge = 320;
              item.initialScale = 0.85 + Math.random() * 0.35;
              item.mesh.position.copy(pos);
              if (cameraRef.current) {
                item.mesh.quaternion.copy(cameraRef.current.quaternion);
              }
              item.mesh.scale.set(item.initialScale, item.initialScale, item.initialScale);
              (item.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.70, speed * 0.22);
              item.mesh.visible = true;
            };

            spawnTrail(dState.pos1, dState.vel1);
            if (dState.diceCount >= 2) spawnTrail(dState.pos2, dState.vel2);
            if (dState.diceCount >= 3) spawnTrail(dState.pos3, dState.vel3);
          }

          // Realistic Tabletop Gravity, Momentum Dissipation & Calibrated Rigid-Body Physics
          const FIXED_STEP = 1 / 120; // 120Hz fixed timestep
          const GRAVITY_ACCEL = 15.0; // Realistic tabletop gravity for natural parabolic throw
          const FLOOR_Y = 0.01; // Felt surface plane height
          const TRAY_BOUND = 3.20; // Roomy inner felt tray boundary
          const RESTITUTION_FLOOR = 0.44; // Felt/wood dice bounce restitution
          const RESTITUTION_WALL = 0.35; // Cushioned tray wall bounce
          const RESTITUTION_DIE = 0.45; // Acrylic die-to-die bounce
          const FRICTION_FLOOR = 0.35; // Calibrated felt rolling friction (converts translation to tumbling)
          const LINEAR_DAMPING = 0.15; // Low air drag linear damping per second
          const ANGULAR_DAMPING = 0.15; // Low rotational air drag damping per second
          const DIE_INV_MASS = 1.0; // Normalized mass
          const DIE_INV_INERTIA = 88.75; // Moment of inertia (1 / (1/6 * 1.0 * 0.26^2))
          const REST_VEL_EPS = 0.08; // Rest linear velocity threshold (m/s)
          const REST_ANG_EPS = 0.25; // Rest angular velocity threshold (rad/s)
          const REQUIRED_REST_TICKS = 16; // ~0.13s consecutive rest ticks for natural stop
          const SAFETY_WATCHDOG_MS = 3200; // 3.2-second safety watchdog ensures dice never get stuck bouncing

          // Fixed-timestep accumulator
          dState.accumulator += Math.min(0.06, dt);

          const stepSingleDie = (
            pos: THREE.Vector3,
            vel: THREE.Vector3,
            quat: THREE.Quaternion,
            angVel: THREE.Vector3,
            lastImpactObj: { time: number },
            hStep: number
          ): number => {
            // Apply gravity
            vel.y -= GRAVITY_ACCEL * hStep;

            // Apply linear and angular air damping
            vel.multiplyScalar(Math.max(0, 1.0 - LINEAR_DAMPING * hStep));
            angVel.multiplyScalar(Math.max(0, 1.0 - ANGULAR_DAMPING * hStep));

            // Linear position integration
            pos.addScaledVector(vel, hStep);

            // Angular orientation integration
            const angSpeed = angVel.length();
            if (angSpeed > 0.0001) {
              _tmpPhysRotAxis.copy(angVel).multiplyScalar(1 / angSpeed);
              _tmpPhysQ1.setFromAxisAngle(_tmpPhysRotAxis, angSpeed * hStep);
              quat.premultiply(_tmpPhysQ1).normalize();
            }

            // Compute transformed world coordinates for all 8 vertices using pre-allocated pool
            _tmpPenetratingVerts.length = 0;
            let yMin = Infinity;
            let deepestPen = 0;

            for (let k = 0; k < 8; k++) {
              const p = _tmpWorldVerts[k].copy(DIE_CUBE_VERTS[k]).applyQuaternion(quat).add(pos);
              if (p.y < yMin) {
                yMin = p.y;
              }
              if (p.y < FLOOR_Y) {
                _tmpPenetratingVerts.push(p);
                const pen = FLOOR_Y - p.y;
                if (pen > deepestPen) deepestPen = pen;
              }
            }

            // Floor Contact Manifold Resolution (Rigid-body impulse resolution without heap allocation)
            if (_tmpPenetratingVerts.length > 0) {
              _tmpPhysV1.set(0, 0, 0);
              for (const pv of _tmpPenetratingVerts) {
                _tmpPhysV1.add(pv);
              }
              _tmpPhysV1.multiplyScalar(1 / _tmpPenetratingVerts.length);

              const r = _tmpPhysV2.copy(_tmpPhysV1).sub(pos);
              const pointVel = _tmpPhysV3.crossVectors(angVel, r).add(vel);
              const vn = pointVel.y; // Floor normal is (0, 1, 0)

              // Normal rxn = r x (0, 1, 0) = (-r.z, 0, r.x)
              const rxn = _tmpPhysV4.set(-r.z, 0, r.x);

              if (vn < 0) {
                // Acrylic on felt: rebound only on firm impacts, eliminate micro-bounces at low speed
                const e = Math.abs(vn) > 0.12 ? RESTITUTION_FLOOR : 0.0;

                const kNorm = DIE_INV_MASS + DIE_INV_INERTIA * rxn.lengthSq();
                const J = -(1 + e) * vn / kNorm;

                vel.y += J * DIE_INV_MASS;
                angVel.addScaledVector(rxn, J * DIE_INV_INERTIA);

                // Tangential Coulomb friction on felt
                const vt = _tmpPhysV5.set(pointVel.x, 0, pointVel.z);
                const vtLen = vt.length();
                if (vtLen > 0.0001) {
                  const t = vt.multiplyScalar(1 / vtLen);
                  const rxt = _tmpPhysV6.crossVectors(r, t);
                  const kTan = DIE_INV_MASS + DIE_INV_INERTIA * rxt.lengthSq();
                  let Jt = -vtLen / kTan;
                  const maxFriction = FRICTION_FLOOR * J;
                  Jt = THREE.MathUtils.clamp(Jt, -maxFriction, maxFriction);

                  vel.addScaledVector(t, Jt * DIE_INV_MASS);
                  angVel.addScaledVector(rxt, Jt * DIE_INV_INERTIA);
                }

                // Play realistic acrylic impact sound
                if (Math.abs(vn) > 0.24 && now - lastImpactObj.time > 45) {
                  soundFx.playDiceImpact(Math.abs(vn), false);
                  lastImpactObj.time = now;
                }
              }

              // Positional separation: push die out of felt so corners never penetrate table
              pos.y += deepestPen;
              yMin = FLOOR_Y;
            }

            // Natural felt rolling & tumbling dynamics
            if (yMin <= FLOOR_Y + 0.03) {
              // Gentle rolling resistance: decelerates smoothly over 1.2 - 1.8 seconds of rolling
              const rollFriction = Math.pow(0.985, hStep * 120);
              vel.x *= rollFriction;
              vel.z *= rollFriction;
              angVel.multiplyScalar(Math.pow(0.983, hStep * 120));

              // Cleanly eliminate micro-hops only when nearly still vertically
              if (Math.abs(vel.y) < 0.10) {
                vel.y = 0;
              }

              // As the die rolls across the table, impart rolling torque from forward velocity
              const horizSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
              const curAngSpeed = angVel.length();

              if (horizSpeed > 0.16) {
                // Table friction rolling torque: rolling axis is perpendicular to forward travel (-vel.z, 0, vel.x)
                const rollAxis = _tmpPhysV1.set(-vel.z, 0, vel.x).normalize();
                const targetOmega = horizSpeed / DIE_PHYS_HALF;
                const rollTorqueFactor = Math.min(0.12, 5.0 * hStep);
                angVel.lerp(rollAxis.multiplyScalar(targetOmega * 0.85), rollTorqueFactor);
              } else {
                // Die has slowed down: aggressively damp residual spin so it never spins after settling!
                angVel.multiplyScalar(Math.pow(0.35, hStep * 60));
                if (curAngSpeed < 0.15) {
                  angVel.set(0, 0, 0);
                }
                const align = getAlignedFlatQuaternion(quat, _tmpDieAlignQ);
                quat.slerp(align.targetQ, Math.min(0.24, 10.0 * hStep));
                vel.x *= 0.88;
                vel.z *= 0.88;
              }
            }

            // Boundary Tray Walls (Only active near table height so mid-air throws from token pass cleanly)
            if (pos.y < 0.40) {
              if (pos.x < -TRAY_BOUND) {
                pos.x = -TRAY_BOUND;
                vel.x = Math.abs(vel.x) * RESTITUTION_WALL;
                vel.z *= 0.85;
                angVel.multiplyScalar(0.85);
                if (Math.abs(vel.x) > 0.25 && now - lastImpactObj.time > 55) {
                  soundFx.playDiceImpact(Math.abs(vel.x), true);
                  lastImpactObj.time = now;
                }
              } else if (pos.x > TRAY_BOUND) {
                pos.x = TRAY_BOUND;
                vel.x = -Math.abs(vel.x) * RESTITUTION_WALL;
                vel.z *= 0.85;
                angVel.multiplyScalar(0.85);
                if (Math.abs(vel.x) > 0.25 && now - lastImpactObj.time > 55) {
                  soundFx.playDiceImpact(Math.abs(vel.x), true);
                  lastImpactObj.time = now;
                }
              }

              if (pos.z < -TRAY_BOUND) {
                pos.z = -TRAY_BOUND;
                vel.z = Math.abs(vel.z) * RESTITUTION_WALL;
                vel.x *= 0.85;
                angVel.multiplyScalar(0.85);
                if (Math.abs(vel.z) > 0.25 && now - lastImpactObj.time > 55) {
                  soundFx.playDiceImpact(Math.abs(vel.z), true);
                  lastImpactObj.time = now;
                }
              } else if (pos.z > TRAY_BOUND) {
                pos.z = TRAY_BOUND;
                vel.z = -Math.abs(vel.z) * RESTITUTION_WALL;
                vel.x *= 0.85;
                angVel.multiplyScalar(0.85);
                if (Math.abs(vel.z) > 0.25 && now - lastImpactObj.time > 55) {
                  soundFx.playDiceImpact(Math.abs(vel.z), true);
                  lastImpactObj.time = now;
                }
              }
            }

            return yMin;
          };

          _impactWrap1.time = dState.lastImpactTime1;
          _impactWrap2.time = dState.lastImpactTime2;
          _impactWrap3.time = dState.lastImpactTime3;

          const resolveDieCollision = (
            pA: THREE.Vector3,
            vA: THREE.Vector3,
            wA: THREE.Vector3,
            pB: THREE.Vector3,
            vB: THREE.Vector3,
            wB: THREE.Vector3,
            impWrapA: { time: number },
            impWrapB: { time: number }
          ) => {
            const delta = _tmpPhysV1.subVectors(pB, pA);
            const dieDist = delta.length();
            const collisionDiam = 0.36; // Bounding collision box buffer

            if (dieDist < collisionDiam && dieDist > 0.0001) {
              const norm = _tmpPhysV2.copy(delta).multiplyScalar(1 / dieDist);
              const vRel = _tmpPhysV3.subVectors(vB, vA);
              const vn = vRel.dot(norm);

              if (vn < 0) {
                const J = -(1 + RESTITUTION_DIE) * vn / (2 * DIE_INV_MASS);
                vA.addScaledVector(norm, -J * DIE_INV_MASS);
                vB.addScaledVector(norm, J * DIE_INV_MASS);

                _tmpPhysAng1.set(norm.z, 0, -norm.x);
                _tmpPhysAng2.set(-norm.z, 0, norm.x);
                wA.addScaledVector(_tmpPhysAng1, 2.5);
                wB.addScaledVector(_tmpPhysAng2, 2.5);

                if (Math.abs(vn) > 0.22 && now - impWrapA.time > 45) {
                  soundFx.playDiceImpact(Math.abs(vn), false);
                  impWrapA.time = now;
                  impWrapB.time = now;
                }
              }

              const overlap = collisionDiam - dieDist;
              pA.addScaledVector(norm, -overlap * 0.52);
              pB.addScaledVector(norm, overlap * 0.52);
            }
          };

          let maxPhysicsSteps = 4;
          while (dState.accumulator >= FIXED_STEP && maxPhysicsSteps-- > 0) {
            const yMin1 = stepSingleDie(dState.pos1, dState.vel1, dState.quat1, dState.angVel1, _impactWrap1, FIXED_STEP);
            const yMin2 = dState.diceCount >= 2
              ? stepSingleDie(dState.pos2, dState.vel2, dState.quat2, dState.angVel2, _impactWrap2, FIXED_STEP)
              : FLOOR_Y;
            const yMin3 = dState.diceCount >= 3
              ? stepSingleDie(dState.pos3, dState.vel3, dState.quat3, dState.angVel3, _impactWrap3, FIXED_STEP)
              : FLOOR_Y;

            // Dynamic Die-to-Die Elastic Momentum Exchange & Bounding Box Separation
            if (dState.diceCount >= 2) {
              resolveDieCollision(dState.pos1, dState.vel1, dState.angVel1, dState.pos2, dState.vel2, dState.angVel2, _impactWrap1, _impactWrap2);
            }
            if (dState.diceCount >= 3) {
              resolveDieCollision(dState.pos1, dState.vel1, dState.angVel1, dState.pos3, dState.vel3, dState.angVel3, _impactWrap1, _impactWrap3);
              resolveDieCollision(dState.pos2, dState.vel2, dState.angVel2, dState.pos3, dState.vel3, dState.angVel3, _impactWrap2, _impactWrap3);
            }

            // High-Precision Continuous Rest State Detection
            const isResting1 =
              dState.vel1.length() < REST_VEL_EPS &&
              dState.angVel1.length() < REST_ANG_EPS &&
              yMin1 <= FLOOR_Y + 0.02;
            const isResting2 =
              dState.diceCount < 2 ||
              (dState.vel2.length() < REST_VEL_EPS &&
              dState.angVel2.length() < REST_ANG_EPS &&
              yMin2 <= FLOOR_Y + 0.02);
            const isResting3 =
              dState.diceCount < 3 ||
              (dState.vel3.length() < REST_VEL_EPS &&
              dState.angVel3.length() < REST_ANG_EPS &&
              yMin3 <= FLOOR_Y + 0.02);

            dState.restTicks1 = isResting1 ? dState.restTicks1 + 1 : 0;
            dState.restTicks2 = isResting2 ? dState.restTicks2 + 1 : 0;
            dState.restTicks3 = isResting3 ? dState.restTicks3 + 1 : 0;

            dState.accumulator -= FIXED_STEP;
          }
          if (dState.accumulator > FIXED_STEP * 2) {
            dState.accumulator = 0;
          }

          dState.lastImpactTime1 = _impactWrap1.time;
          dState.lastImpactTime2 = _impactWrap2.time;
          dState.lastImpactTime3 = _impactWrap3.time;

          // Apply physics transform to Three.js meshes
          physicalDice1Ref.current.position.copy(dState.pos1);
          physicalDice1Ref.current.quaternion.copy(dState.quat1);

          if (physicalDice2Ref.current) {
            if (dState.diceCount >= 2) {
              physicalDice2Ref.current.visible = true;
              physicalDice2Ref.current.position.copy(dState.pos2);
              physicalDice2Ref.current.quaternion.copy(dState.quat2);
            } else {
              physicalDice2Ref.current.visible = false;
            }
          }

          if (physicalDice3Ref.current) {
            if (dState.diceCount >= 3) {
              physicalDice3Ref.current.visible = true;
              physicalDice3Ref.current.position.copy(dState.pos3);
              physicalDice3Ref.current.quaternion.copy(dState.quat3);
            } else {
              physicalDice3Ref.current.visible = false;
            }
          }

          // Check if dice have naturally come to rest or if the safety watchdog has triggered
          const totalElapsedMs = now - dState.startTime;
          const isFullySettled =
            dState.restTicks1 >= REQUIRED_REST_TICKS &&
            dState.restTicks2 >= REQUIRED_REST_TICKS &&
            dState.restTicks3 >= REQUIRED_REST_TICKS;
          const isWatchdogTriggered = totalElapsedMs >= SAFETY_WATCHDOG_MS;

          if (isFullySettled || isWatchdogTriggered) {
            // Lock velocities
            dState.vel1.set(0, 0, 0);
            dState.vel2.set(0, 0, 0);
            dState.vel3.set(0, 0, 0);
            dState.angVel1.set(0, 0, 0);
            dState.angVel2.set(0, 0, 0);
            dState.angVel3.set(0, 0, 0);

            // Calculate upward face via normal vector dot products & clean horizon-level quaternion
            const align1 = getAlignedFlatQuaternion(dState.quat1, dState.snapTargetQ1);
            dState.d1Val = align1.face;
            dState.snapStartQ1.copy(dState.quat1);

            if (dState.diceCount >= 2) {
              const align2 = getAlignedFlatQuaternion(dState.quat2, dState.snapTargetQ2);
              dState.d2Val = align2.face;
              dState.snapStartQ2.copy(dState.quat2);
            } else {
              dState.d2Val = 0;
            }

            if (dState.diceCount >= 3) {
              const align3 = getAlignedFlatQuaternion(dState.quat3, dState.snapTargetQ3);
              dState.d3Val = align3.face;
              dState.snapStartQ3.copy(dState.quat3);
            } else {
              dState.d3Val = 0;
            }

            dState.snapStartTime = now;
            dState.state = 'SNAPPING';
          }
        } else if (dState.state === 'SNAPPING') {
          // Smooth 120ms anti-cocking horizon leveling & subtle elevation settling
          const SNAP_DURATION_MS = 120;
          const RESTING_CENTER_Y = 0.14; // FLOOR_Y + DIE_HALF
          const snapElapsedMs = now - dState.snapStartTime;
          const progress = Math.min(1.0, snapElapsedMs / SNAP_DURATION_MS);
          const ease = progress * progress * (3 - 2 * progress); // Smooth cubic ease

          dState.quat1.copy(dState.snapStartQ1).slerp(dState.snapTargetQ1, ease);
          dState.pos1.y = THREE.MathUtils.lerp(dState.pos1.y, RESTING_CENTER_Y, ease);
          physicalDice1Ref.current.position.copy(dState.pos1);
          physicalDice1Ref.current.quaternion.copy(dState.quat1);

          if (dState.diceCount >= 2 && physicalDice2Ref.current) {
            dState.quat2.copy(dState.snapStartQ2).slerp(dState.snapTargetQ2, ease);
            dState.pos2.y = THREE.MathUtils.lerp(dState.pos2.y, RESTING_CENTER_Y, ease);
            physicalDice2Ref.current.position.copy(dState.pos2);
            physicalDice2Ref.current.quaternion.copy(dState.quat2);
          }

          if (dState.diceCount >= 3 && physicalDice3Ref.current) {
            dState.quat3.copy(dState.snapStartQ3).slerp(dState.snapTargetQ3, ease);
            dState.pos3.y = THREE.MathUtils.lerp(dState.pos3.y, RESTING_CENTER_Y, ease);
            physicalDice3Ref.current.position.copy(dState.pos3);
            physicalDice3Ref.current.quaternion.copy(dState.quat3);
          }

          if (progress >= 1.0) {
            // Transition directly into center-of-screen Showcase presentation
            dState.state = 'SHOWCASE';
            dState.showcaseStartTime = now;
            dState.showcaseStartPos1.copy(physicalDice1Ref.current.position);
            dState.showcaseStartQ1.copy(physicalDice1Ref.current.quaternion);

            if (dState.diceCount >= 2 && physicalDice2Ref.current) {
              dState.showcaseStartPos2.copy(physicalDice2Ref.current.position);
              dState.showcaseStartQ2.copy(physicalDice2Ref.current.quaternion);
            }
            if (dState.diceCount >= 3 && physicalDice3Ref.current) {
              dState.showcaseStartPos3.copy(physicalDice3Ref.current.position);
              dState.showcaseStartQ3.copy(physicalDice3Ref.current.quaternion);
            }
            dState.hasTriggeredIllumination = false;

            if (cameraRef.current) {
              const cam = cameraRef.current;
              cam.updateMatrixWorld(true);
              dState.showcaseStartLocalPos1.copy(physicalDice1Ref.current.position).applyMatrix4(cam.matrixWorldInverse);
              if (physicalDice2Ref.current) {
                dState.showcaseStartLocalPos2.copy(physicalDice2Ref.current.position).applyMatrix4(cam.matrixWorldInverse);
              }
              if (physicalDice3Ref.current) {
                dState.showcaseStartLocalPos3.copy(physicalDice3Ref.current.position).applyMatrix4(cam.matrixWorldInverse);
              }
            }
          }
        } else if (dState.state === 'SHOWCASE') {
          const SHOWCASE_DURATION_MS = 1400;
          const showcaseElapsed = now - dState.showcaseStartTime;
          const progress = Math.min(1.0, showcaseElapsed / SHOWCASE_DURATION_MS);
          const enterT = Math.min(1.0, showcaseElapsed / 320);

          // Once dice reach the center of the screen, trigger tile path illumination
          if (enterT >= 0.75 && !dState.hasTriggeredIllumination) {
            dState.hasTriggeredIllumination = true;
            soundFx.playCardDraw();
            const totalRoll = dState.diceCount === 1 ? dState.d1Val : (dState.diceCount >= 3 ? dState.d1Val + dState.d2Val + dState.d3Val : dState.d1Val + dState.d2Val);
            triggerTilePathIllumination(totalRoll);
          }

          if (progress >= 1.0) {
            const finalD1 = dState.d1Val;
            const finalD2 = dState.diceCount >= 2 ? dState.d2Val : 0;
            const finalD3 = dState.diceCount >= 3 ? dState.d3Val : undefined;

            dState.active = false;
            dState.state = 'IDLE';

            // Cleanly hide dice once showcase completes
            physicalDice1Ref.current.visible = false;
            if (physicalDice2Ref.current) physicalDice2Ref.current.visible = false;
            if (physicalDice3Ref.current) physicalDice3Ref.current.visible = false;
            physicalDice1Ref.current.scale.set(1, 1, 1);
            if (physicalDice2Ref.current) physicalDice2Ref.current.scale.set(1, 1, 1);
            if (physicalDice3Ref.current) physicalDice3Ref.current.scale.set(1, 1, 1);

            callbacksRef.current.onRollComplete?.(finalD1, finalD2, finalD3);
          }
        }
      }

      // Update & fade active dice motion trail particles from pre-allocated pool (0 allocations / 0 GC)
      const isDiceTrailDeactivated = isBatterySaverActive || currentEff.isLowEndMode || !currentEff.ambientAnimations;
      const trailPool = diceTrailPoolRef.current;
      for (let i = 0; i < trailPool.length; i++) {
        const pItem = trailPool[i];
        if (isDiceTrailDeactivated) {
          pItem.active = false;
          pItem.mesh.visible = false;
          continue;
        }
        if (!pItem.active) continue;
        const age = now - pItem.startTime;
        if (age >= pItem.maxAge) {
          pItem.active = false;
          pItem.mesh.visible = false;
        } else {
          const progress = age / pItem.maxAge;
          const alpha = (1 - progress) * 0.42;
          (pItem.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
          const s = pItem.initialScale * (1 - progress * 0.3);
          pItem.mesh.scale.set(s, s, s);
        }
      }

      // 3. Animate Smooth Token Movement & Multi-token offsets
      let anyTokenMoving = false;

      playersRef.current.forEach((p) => {
        const tokenMesh = playerTokensMapRef.current.get(p.id);
        const animState = tokenAnimMapRef.current.get(p.id);

        if (tokenMesh && animState) {
          if (animState.endPosIdx !== p.position) {
            animState.endPosIdx = p.position;
          }

          // Token movement starts ONLY AFTER dice have fully stopped rolling
          if (!animState.isMoving && animState.currentStepIdx !== animState.endPosIdx && !dicePhysicsRef.current.active) {
            animState.isMoving = true;
            animState.currentStepProgress = 0;
            const forwardDist = (animState.endPosIdx - animState.currentStepIdx + 40) % 40;
            const backwardDist = (animState.currentStepIdx - animState.endPosIdx + 40) % 40;
            animState.moveDirection = backwardDist < forwardDist ? -1 : 1;
          }

          // Multi-token layout per space so they sit side-by-side cleanly without clipping (zero-allocation)
          let totalSame = 0;
          let tokenIdx = 0;
          const allPlayers = playersRef.current;
          for (let plIdx = 0; plIdx < allPlayers.length; plIdx++) {
            const pl = allPlayers[plIdx];
            if (pl.position === p.position && pl.inJail === p.inJail) {
              if (pl.id === p.id) {
                tokenIdx = totalSame;
              }
              totalSame++;
            }
          }
          if (totalSame === 0) totalSame = 1;

          // CHECK FOR JAIL FLIGHT TRIGGER (When token is sent to jail, shoot up into the air and fall down into jail)
          if (p.inJail && p.position === 10 && animState.currentStepIdx !== 10 && !animState.jailFlight?.active) {
            animState.isMoving = false;
            animState.currentStepProgress = 0;
            animState.endPosIdx = 10;
            const targetCoords = getPlayerTargetCoords(10, true, tokenIdx >= 0 ? tokenIdx : 0, totalSame);
            animState.jailFlight = {
              active: true,
              progress: 0,
              duration: 1.2, // 1.2s flight
              fromPos: tokenMesh.position.clone(),
              toPos: new THREE.Vector3(targetCoords.x, targetCoords.y, targetCoords.z),
              peakY: 5.0, // Launch high into the air
            };
            soundFx.playJail();
          }

          if (animState.jailFlight?.active) {
            anyTokenMoving = true;
            const jf = animState.jailFlight;
            jf.progress += dt / jf.duration;

            if (jf.progress >= 1.0) {
              jf.progress = 1.0;
              jf.active = false;
              animState.currentStepIdx = 10;
              animState.endPosIdx = 10;
              animState.isMoving = false;
              tokenMesh.position.copy(jf.toPos);
              tokenMesh.rotation.set(0, 0, 0);
              soundFx.playDiceImpact(0.8, false);

              if (sceneRef.current) {
                const burst = spawnParticleBurstMeshGroup(sceneRef.current, jf.toPos.clone().add(new THREE.Vector3(0, 0.1, 0)), 0xf59e0b);
                particleBurstsRef.current.push(burst);
              }
            } else {
              const t = jf.progress;
              // Smooth easing
              const easeH = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              const curX = THREE.MathUtils.lerp(jf.fromPos.x, jf.toPos.x, easeH);
              const curZ = THREE.MathUtils.lerp(jf.fromPos.z, jf.toPos.z, easeH);

              // Shoot up into the air and fall down into the jail
              const sinArc = Math.sin(t * Math.PI);
              const curY = THREE.MathUtils.lerp(jf.fromPos.y, jf.toPos.y, t) + sinArc * (jf.peakY - jf.fromPos.y);

              tokenMesh.position.set(curX, curY, curZ);

              // Tumbling rotation while airborne
              tokenMesh.rotation.x = Math.sin(t * Math.PI * 2) * 0.8;
              tokenMesh.rotation.y += dt * 8.0;
              tokenMesh.rotation.z = Math.cos(t * Math.PI * 2) * 0.6;
            }
          } else if (animState.isMoving) {
            anyTokenMoving = true;
            // Tile movement duration set to 0.32s per tile (scaled by botSpeed for AI players)
            const speedMult = p.isAi ? (botSpeedRef.current || 1) : 1;
            const stepsPerSec = (1.0 / 0.32) * speedMult;
            const dir = animState.moveDirection || 1;
            animState.currentStepProgress += dt * stepsPerSec;

            if (animState.currentStepProgress >= 1.0) {
              animState.currentStepProgress = 0;
              animState.currentStepIdx = (animState.currentStepIdx + dir + 40) % 40;

              if (animState.currentStepIdx === animState.endPosIdx) {
                animState.isMoving = false;
              }
            }

            if (animState.isMoving) {
              const nextIdx = (animState.currentStepIdx + dir + 40) % 40;
              const fromCoords = getPlayerTargetCoords(animState.currentStepIdx, false, tokenIdx, totalSame);
              const toCoords = getPlayerTargetCoords(nextIdx, p.inJail && nextIdx === 10, tokenIdx, totalSame);

              const lerpX = THREE.MathUtils.lerp(fromCoords.x, toCoords.x, animState.currentStepProgress);
              const lerpZ = THREE.MathUtils.lerp(fromCoords.z, toCoords.z, animState.currentStepProgress);
              const arcY = 0.08 + Math.sin(animState.currentStepProgress * Math.PI) * 0.38;

              tokenMesh.position.set(lerpX, arcY, lerpZ);
            } else {
              const coords = getPlayerTargetCoords(animState.currentStepIdx, p.inJail, tokenIdx, totalSame);
              tokenMesh.position.set(coords.x, coords.y, coords.z);
            }
          } else {
            // Keep token precisely on its target position (including dedicated Jail Yard if in jail)
            const coords = getPlayerTargetCoords(animState.currentStepIdx, p.inJail, tokenIdx, totalSame);
            const dx = coords.x - tokenMesh.position.x;
            const dz = coords.z - tokenMesh.position.z;
            if (Math.abs(dx) < 0.0005 && Math.abs(dz) < 0.0005) {
              tokenMesh.position.x = coords.x;
              tokenMesh.position.z = coords.z;
            } else {
              const moveLerp = 1.0 - Math.exp(-10.0 * dt);
              tokenMesh.position.x = THREE.MathUtils.lerp(tokenMesh.position.x, coords.x, moveLerp);
              tokenMesh.position.z = THREE.MathUtils.lerp(tokenMesh.position.z, coords.z, moveLerp);
            }
            tokenMesh.position.y = coords.y;
          }

          // Trigger pending landing FX (floating text sprite, deed card icon, coin particle burst, screen vignette)
          if (animState.currentStepIdx === animState.endPosIdx && !animState.isMoving) {
            const pendingFx = pendingCashFxRef.current.get(p.id);
            if (pendingFx) {
              pendingCashFxRef.current.delete(p.id);
              const coords = getSpaceCoordinates(p.position);
              const baseY = 0.18; // Just barely high above the tile and token
              _tmpTilePos.set(coords.x, baseY, coords.z);
              const tilePos = _tmpTilePos;

              if (pendingFx.diff < 0) {
                if (pendingFx.isPurchase) {
                  // PROPERTY PURCHASE FLOW: Positive money transaction audio, -$figure in RED below deed, sized down deed card icon
                  soundFx.playBuyProperty();

                  if (sceneRef.current) {
                    // Sized down deed card icon placed on top, just barely high
                    const deedSprite = create3DDeedCardSprite(pendingFx.colorGroup);
                    deedSprite.position.set(tilePos.x, baseY + 0.14, tilePos.z);
                    sceneRef.current.add(deedSprite);

                    // Sized down purchase amount in RED (#EF4444) positioned below the deed at all times
                    const sprite = create3DFloatingTextSprite(`-$${pendingFx.amount}`, '#EF4444');
                    sprite.position.set(tilePos.x, baseY - 0.10, tilePos.z);
                    sceneRef.current.add(sprite);

                    floatingTextsRef.current.push({
                      id: `txt_${Date.now()}_${Math.random()}`,
                      sprite,
                      deedSprite,
                      tileX: tilePos.x,
                      tileZ: tilePos.z,
                      startY: baseY,
                      startTime: performance.now(),
                    });

                    const burst = spawnParticleBurstMeshGroup(sceneRef.current, tilePos, 0xef4444);
                    particleBurstsRef.current.push(burst);
                  }
                } else {
                  // NON-PURCHASE LOSS (Taxes, Rent, Penalties): Standard negative SFX, -$figure, crimson vignette pulse
                  soundFx.playOwnedLanding();

                  if (sceneRef.current) {
                    const sprite = create3DFloatingTextSprite(`-$${pendingFx.amount}`, '#FF2D2D');
                    sprite.position.set(tilePos.x, baseY, tilePos.z);
                    sceneRef.current.add(sprite);
                    floatingTextsRef.current.push({
                      id: `txt_${Date.now()}_${Math.random()}`,
                      sprite,
                      startY: baseY,
                      startTime: performance.now(),
                    });

                    const burst = spawnParticleBurstMeshGroup(sceneRef.current, tilePos, 0xef4444);
                    particleBurstsRef.current.push(burst);
                  }
                  triggerVignettePulse('crimson');
                }
              } else if (pendingFx.diff > 0) {
                soundFx.playChaChing();

                if (sceneRef.current) {
                  const sprite = create3DFloatingTextSprite(`+$${pendingFx.diff}`, '#10B981');
                  sprite.position.set(tilePos.x, baseY, tilePos.z);
                  sceneRef.current.add(sprite);
                  floatingTextsRef.current.push({
                    id: `txt_${Date.now()}_${Math.random()}`,
                    sprite,
                    startY: baseY,
                    startTime: performance.now(),
                  });

                  const burst = spawnParticleBurstMeshGroup(sceneRef.current, tilePos, 0x10b981);
                  particleBurstsRef.current.push(burst);
                }
                triggerVignettePulse('emerald');
              }
            }
          }
        }
      });

      // Animate Tile Path Illumination
      const pathIllum = pathIlluminationStateRef.current;
      if (pathIllum.active && pathIllum.pathIndices.length > 0) {
        const elapsed = (now - pathIllum.startTime) / 1000;
        _tmpPathColor.set(pathIllum.tokenColor);

        pathIllum.pathIndices.forEach((tileIdx, stepOrder) => {
          const illumMesh = tileIlluminationMeshesMapRef.current.get(tileIdx);
          if (illumMesh) {
            illumMesh.visible = true;
            const mat = illumMesh.material as THREE.MeshBasicMaterial;
            mat.color.copy(_tmpPathColor);

            // Staggered ripple glow along the path leading to the target
            const wave = Math.sin(elapsed * 6.0 - stepOrder * 0.45);
            const isTarget = tileIdx === pathIllum.targetPos;
            const baseGlow = isTarget ? 0.65 : 0.40;
            const pulse = isTarget ? 0.25 : 0.18;
            mat.opacity = THREE.MathUtils.clamp(baseGlow + wave * pulse, 0.18, 0.92);
          }
        });

        // Turn off illumination once token reaches the target position and settles (or fallback timeout)
        const activeP = playersRef.current.find((p) => p.id === activePlayerIdRef.current);
        if (activeP) {
          const animState = tokenAnimMapRef.current.get(activeP.id);
          const hasReachedTarget = animState && !animState.isMoving && animState.currentStepIdx === pathIllum.targetPos;
          if ((hasReachedTarget && elapsed > 2.0) || elapsed > 7.0) {
            pathIllum.active = false;
            tileIlluminationMeshesMapRef.current.forEach((mesh) => {
              (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
              mesh.visible = false;
            });
          }
        }
      }

      // Update red outline on eligible properties when wildcard targeting is active (zero-allocation)
      const eligiblePropSet = eligiblePropSetRef.current;
      const isPropTargeting = Boolean(eligiblePropSet);

      tileOutlineMeshesMapRef.current.forEach((outlineMesh, spaceIdx) => {
        const space = boardSpacesRef.current[spaceIdx];
        const isEligible = isPropTargeting && space?.propertyId && eligiblePropSet?.has(space.propertyId);
        if (isEligible) {
          outlineMesh.visible = true;
          const pulse = 0.75 + Math.sin(now * 0.008) * 0.25;
          (outlineMesh.material as THREE.LineBasicMaterial).opacity = pulse;
        } else {
          if (outlineMesh.visible) {
            outlineMesh.visible = false;
            (outlineMesh.material as THREE.LineBasicMaterial).opacity = 0;
          }
        }
      });

      // Cinematic camera geometry constants (zoomed out a decent bit from prior close framing)
      const trailingDist = 2.55; // Zoomed out decent bit to provide generous board overview and breathing room
      const camElevation = 0.20 + Math.sin((Math.PI * 22) / 180) * trailingDist; // Lower angle (~22 degrees, height ~1.15m)
      const rightOffset = 0.65; // Offset coming from the right of the path to look down the runway
      const lookAhead = 0.50; // Look ahead down the board runway towards upcoming spaces

      // Notify parent if board is currently executing dice, token movement, or card reveal animations
      const isCurrentlyAnimating =
        dicePhysicsRef.current.active ||
        anyTokenMoving ||
        Boolean(activeChanceCardRef.current && chanceGroupRef.current?.visible) ||
        Boolean(activeCommunityChestCardRef.current && chestGroupRef.current?.visible);
      if (isCurrentlyAnimating !== isBoardAnimatingRef.current) {
        isBoardAnimatingRef.current = isCurrentlyAnimating;
        setIsBoardAnimatingState(isCurrentlyAnimating);
        callbacksRef.current.onAnimationStateChange?.(isCurrentlyAnimating);
      }

      // -------------------------------------------------------------
      // 4. DYNAMIC CINEMATIC CAMERA CONTROLLER PIPELINE
      // -------------------------------------------------------------
      if (cameraRef.current && controlsRef.current) {
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        // TOP-DOWN OVERHEAD VIEW: For Land on Go, Wildcard Targeting, or user-selected Overhead camera mode
        if (
          targetSelectionRef.current?.targetType === 'PROPERTY' ||
          isLandOnGoActiveRef.current ||
          boardCameraModeRef.current === 'OVERHEAD'
        ) {
          cameraHandoffRef.current = null;
          isUserInteractingRef.current = false;
          _tmpCamLookAt.set(0, 0, 0);
          _tmpCamPos.set(0, 11.8, 0.01);
          const lerpFactor = 1.0 - Math.exp(-6.0 * dt);
          camera.position.lerp(_tmpCamPos, lerpFactor);
          controls.target.lerp(_tmpCamLookAt, lerpFactor);
          controls.update();
        } else if (boardCameraModeRef.current === 'FREE') {
          controls.update();
        } else if (!isCinematicCamActiveRef.current) {
          controls.update();
        } else if (gamePhaseRef.current === 'DRAFT') {
          cameraHandoffRef.current = null;
          isUserInteractingRef.current = false;
          _tmpCamLookAt.set(0, 0.16, 0.20);
          _tmpCamPos.set(0, 3.4, 4.8);
          const lerpFactor = 1.0 - Math.exp(-6.0 * dt);
          camera.position.lerp(_tmpCamPos, lerpFactor);
          controls.target.lerp(_tmpCamLookAt, lerpFactor);
          controls.update();
        } else {
          // Turn Hand-Off Trigger Check (Only in IN_GAME phase)
          if (prevActivePlayerIdRef.current !== null && prevActivePlayerIdRef.current !== activePlayerIdRef.current) {
            isUserInteractingRef.current = false; // Reset manual override on turn change
            passedPropertyIdsRef.current.clear(); // Clear passed properties for new turn
            const activeP = playersRef.current.find((p) => p.id === activePlayerIdRef.current) || playersRef.current[0];
            if (activeP) {
              const coords = getSpaceCoordinates(activeP.position);
              const sideVec = getSmoothSideVectors(activeP.position);
              const endLookAt = new THREE.Vector3(
                coords.x + sideVec.forward.x * lookAhead,
                0.16,
                coords.z + sideVec.forward.z * lookAhead
              );

              const endPos = new THREE.Vector3(
                coords.x + sideVec.normal.x * trailingDist - sideVec.forward.x * rightOffset,
                camElevation,
                coords.z + sideVec.normal.z * trailingDist - sideVec.forward.z * rightOffset
              );

              cameraHandoffRef.current = {
                startTime: now,
                startPos: camera.position.clone(),
                startLookAt: controls.target.clone(),
                endPos,
                endLookAt,
                duration: 1.6, // Smooth, cinematic 1.6s inter-turn camera transition
              };
            }
          }
          prevActivePlayerIdRef.current = activePlayerIdRef.current;

          // Check for moving token or airborne jail flight across all players
          let activeMovingMesh: THREE.Object3D | null = null;
          let activeMovingTileIdx = 0;
          let activeMovingProgress = 0;
          let activeJailFlight = false;

          playersRef.current.forEach((p) => {
            const animState = tokenAnimMapRef.current.get(p.id);
            if (animState?.jailFlight?.active) {
              activeMovingMesh = playerTokensMapRef.current.get(p.id) || null;
              activeMovingTileIdx = 10;
              activeMovingProgress = 0;
              activeJailFlight = true;
            } else if (animState?.isMoving) {
              activeMovingMesh = playerTokensMapRef.current.get(p.id) || null;
              activeMovingTileIdx = animState.currentStepIdx;
              activeMovingProgress = animState.currentStepProgress || 0;
            }
          });

          // Automatically unlock cinematic tracking when game actions (token movement or dice roll) occur
          if (activeMovingMesh || dicePhysicsRef.current.active) {
            isUserInteractingRef.current = false;
          }

          if (!isUserInteractingRef.current) {
            if (cameraHandoffRef.current) {
              // TURN HAND-OFF ARC SWEEP (Smooth 1.6s duration with gentle easing)
              const h = cameraHandoffRef.current;
              const elapsed = (now - h.startTime) / 1000;
              const progress = Math.min(1.0, elapsed / h.duration);
              // Perfectly smooth cosine S-curve without abrupt acceleration or stops
              const ease = (1 - Math.cos(progress * Math.PI)) / 2;

              _tmpCurPos.lerpVectors(h.startPos, h.endPos, ease);
              _tmpCurPos.y += Math.sin(progress * Math.PI) * 0.45; // Gentle cinematic arc elevation

              camera.position.copy(_tmpCurPos);
              controls.target.lerpVectors(h.startLookAt, h.endLookAt, ease);
              controls.update();

              if (progress >= 1.0) {
                cameraHandoffRef.current = null;
              }
            } else if (dicePhysicsRef.current.active) {
              // PAN CAMERA SLOWLY AND SMOOTHLY TO LOOK AT THE CENTER BOARD
              const dState = dicePhysicsRef.current;
              // Stable lookAt at center board - no jitter from bouncing dice
              _tmpCamLookAt.set(0, 0.14, 0);

              // Maintain current horizontal camera direction relative to board center
              const curX = camera.position.x;
              const curZ = camera.position.z;
              const horizLen = Math.sqrt(curX * curX + curZ * curZ);
              const dirX = horizLen > 0.05 ? curX / horizLen : 0;
              const dirZ = horizLen > 0.05 ? curZ / horizLen : 1;

              // Smoothly and slowly move up and look at the center board
              const panRadius = 5.3;
              _tmpCamPos.set(
                dirX * panRadius,
                4.5,
                dirZ * panRadius
              );

              // Smooth and slow camera turn and upward movement to look at center board
              const camLerp = 1.0 - Math.exp(-0.85 * dt);
              camera.position.lerp(_tmpCamPos, camLerp);
              controls.target.lerp(_tmpCamLookAt, camLerp);
              controls.update();
            } else if (activeMovingMesh) {
              const movingMesh = activeMovingMesh as THREE.Object3D;
              if (activeJailFlight) {
                // High-angle perspective framing the airborne launch and descent into jail
                _tmpCamLookAt.set(movingMesh.position.x, Math.max(0.5, movingMesh.position.y * 0.5), movingMesh.position.z);
                _tmpCamPos.set(-4.18 - 3.0, 5.5, 4.18 + 3.0);
                const lerpFactor = 1.0 - Math.exp(-6.0 * dt);
                camera.position.lerp(_tmpCamPos, lerpFactor);
                controls.target.lerp(_tmpCamLookAt, lerpFactor);
                controls.update();
              } else {
                // TOKEN MOVEMENT TRACKING (Dynamic Path Following smoothly curving around corners of the board)
                const continuousTilePos = activeMovingTileIdx + activeMovingProgress;
                const sideVec = getSmoothSideVectors(continuousTilePos);
                _tmpCamLookAt.set(
                  movingMesh.position.x + sideVec.forward.x * lookAhead,
                  0.16,
                  movingMesh.position.z + sideVec.forward.z * lookAhead
                );

                _tmpCamPos.set(
                  movingMesh.position.x + sideVec.normal.x * trailingDist - sideVec.forward.x * rightOffset,
                  camElevation,
                  movingMesh.position.z + sideVec.normal.z * trailingDist - sideVec.forward.z * rightOffset
                );

                // Smooth critically damped spring tracking with gentle corner easing
                const lerpFactor = 1.0 - Math.exp(-5.2 * dt);
                camera.position.lerp(_tmpCamPos, lerpFactor);
                controls.target.lerp(_tmpCamLookAt, lerpFactor);
                controls.update();
              }
            } else {
              // STATIC IDLE FOCUS ON ACTIVE PLAYER (Framed down the board towards upcoming spaces)
              const activeP = playersRef.current.find((p) => p.id === activePlayerIdRef.current) || playersRef.current[0];
              if (activeP) {
                const coords = getSpaceCoordinates(activeP.position);
                const sideVec = getSmoothSideVectors(activeP.position);
                _tmpCamLookAt.set(
                  coords.x + sideVec.forward.x * lookAhead,
                  0.16,
                  coords.z + sideVec.forward.z * lookAhead
                );

                _tmpCamPos.set(
                  coords.x + sideVec.normal.x * trailingDist - sideVec.forward.x * rightOffset,
                  camElevation,
                  coords.z + sideVec.normal.z * trailingDist - sideVec.forward.z * rightOffset
                );

                const camDistSq = camera.position.distanceToSquared(_tmpCamPos);
                const targetDistSq = controls.target.distanceToSquared(_tmpCamLookAt);
                if (camDistSq > 0.00001 || targetDistSq > 0.00001) {
                  const lerpFactor = 1.0 - Math.exp(-5.0 * dt * 0.85);
                  camera.position.lerp(_tmpCamPos, lerpFactor);
                  controls.target.lerp(_tmpCamLookAt, lerpFactor);
                  controls.update();
                }
              }
            }
          }
        }
      }

      // Frame-Synchronized Showcase Dice Lock (eliminates stutter/jitter on lower frame rates as camera moves)
      if (dicePhysicsRef.current.active && dicePhysicsRef.current.state === 'SHOWCASE' && cameraRef.current) {
        const cam = cameraRef.current;
        cam.updateMatrixWorld(true);
        const dState = dicePhysicsRef.current;
        const showcaseElapsed = now - dState.showcaseStartTime;
        const enterT = Math.min(1.0, showcaseElapsed / 320);
        const enterEase = 1 - Math.pow(1 - enterT, 3);

        if (dState.diceCount === 1) {
          _tmpShowcaseLocal1.set(0.0, 0.0, -1.60);
        } else if (dState.diceCount === 3) {
          _tmpShowcaseLocal1.set(-0.36, 0.0, -1.60);
          _tmpShowcaseLocal2.set(0.0, 0.0, -1.60);
          _tmpShowcaseLocal3.set(0.36, 0.0, -1.60);
        } else {
          _tmpShowcaseLocal1.set(-0.19, 0.0, -1.60);
          _tmpShowcaseLocal2.set(0.19, 0.0, -1.60);
        }

        const tgtQ1 = getCameraShowcaseQuaternion(dState.d1Val, cam);
        if (enterEase >= 0.999) {
          _tmpShowcaseWorld1.copy(_tmpShowcaseLocal1).applyMatrix4(cam.matrixWorld);
          physicalDice1Ref.current?.position.copy(_tmpShowcaseWorld1);
          physicalDice1Ref.current?.quaternion.copy(tgtQ1);
        } else {
          _tmpShowcaseLocalLerp1.lerpVectors(dState.showcaseStartLocalPos1, _tmpShowcaseLocal1, enterEase);
          _tmpShowcaseWorld1.copy(_tmpShowcaseLocalLerp1).applyMatrix4(cam.matrixWorld);
          physicalDice1Ref.current?.position.copy(_tmpShowcaseWorld1);
          _tmpPhysQ1.copy(dState.showcaseStartQ1).slerp(tgtQ1, enterEase);
          physicalDice1Ref.current?.quaternion.copy(_tmpPhysQ1);
        }

        if (dState.diceCount >= 2 && physicalDice2Ref.current) {
          const tgtQ2 = getCameraShowcaseQuaternion(dState.d2Val, cam);
          if (enterEase >= 0.999) {
            _tmpShowcaseWorld2.copy(_tmpShowcaseLocal2).applyMatrix4(cam.matrixWorld);
            physicalDice2Ref.current.position.copy(_tmpShowcaseWorld2);
            physicalDice2Ref.current.quaternion.copy(tgtQ2);
          } else {
            _tmpShowcaseLocalLerp2.lerpVectors(dState.showcaseStartLocalPos2, _tmpShowcaseLocal2, enterEase);
            _tmpShowcaseWorld2.copy(_tmpShowcaseLocalLerp2).applyMatrix4(cam.matrixWorld);
            physicalDice2Ref.current.position.copy(_tmpShowcaseWorld2);
            _tmpPhysQ1.copy(dState.showcaseStartQ2).slerp(tgtQ2, enterEase);
            physicalDice2Ref.current.quaternion.copy(_tmpPhysQ1);
          }
        }

        if (dState.diceCount >= 3 && physicalDice3Ref.current) {
          const tgtQ3 = getCameraShowcaseQuaternion(dState.d3Val, cam);
          if (enterEase >= 0.999) {
            _tmpShowcaseWorld3.copy(_tmpShowcaseLocal3).applyMatrix4(cam.matrixWorld);
            physicalDice3Ref.current.position.copy(_tmpShowcaseWorld3);
            physicalDice3Ref.current.quaternion.copy(tgtQ3);
          } else {
            _tmpShowcaseLocalLerp3.lerpVectors(dState.showcaseStartLocalPos3, _tmpShowcaseLocal3, enterEase);
            _tmpShowcaseWorld3.copy(_tmpShowcaseLocalLerp3).applyMatrix4(cam.matrixWorld);
            physicalDice3Ref.current.position.copy(_tmpShowcaseWorld3);
            _tmpPhysQ1.copy(dState.showcaseStartQ3).slerp(tgtQ3, enterEase);
            physicalDice3Ref.current.quaternion.copy(_tmpPhysQ1);
          }
        }
      }

      // -------------------------------------------------------------
      // 5. ANIMATE 3D FLOATING WORLD-SPACE TEXT (+/- MONEY FIGURES)
      // -------------------------------------------------------------
      if (sceneRef.current) {
        const scene = sceneRef.current;
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
          const item = floatingTextsRef.current[i];
          const elapsed = (now - item.startTime) / 1000;

          if (elapsed >= 1.5) {
            scene.remove(item.sprite);
            release3DFloatingTextSprite(item.sprite);

            if (item.deedSprite) {
              scene.remove(item.deedSprite);
              release3DDeedCardSprite(item.deedSprite);
            }
            floatingTextsRef.current.splice(i, 1);
          } else {
            const progress = elapsed / 1.5;
            // Upward float distance: just barely high (~0.05m max gentle rise)
            const floatY = item.startY + Math.pow(progress, 0.75) * 0.05;

            // Scale pop (0 -> 1.15 over 0.15s, settling to 1.0)
            let s = 1.0;
            if (elapsed < 0.15) {
              s = (elapsed / 0.15) * 1.15;
            } else if (elapsed < 0.35) {
              s = 1.15 - ((elapsed - 0.15) / 0.2) * 0.15;
            } else {
              s = 1.0;
            }

            if (item.deedSprite) {
              // Ensure deed and number stay directly aligned over the space
              if (item.tileX !== undefined) {
                item.deedSprite.position.x = item.tileX;
                item.sprite.position.x = item.tileX;
              }
              if (item.tileZ !== undefined) {
                item.deedSprite.position.z = item.tileZ;
                item.sprite.position.z = item.tileZ;
              }
              // Sized down deed card positioned above, just barely high
              item.deedSprite.position.y = floatY + 0.08;
              item.deedSprite.scale.set(0.36 * s, 0.48 * s, 1.0);

              // Sized down number showing amount spent in red: BELOW the deed card at all times!
              item.sprite.position.y = floatY - 0.05;
              item.sprite.scale.set(0.64 * s, 0.32 * s, 1.0);
            } else {
              item.sprite.position.y = floatY;
              item.sprite.scale.set(0.95 * s, 0.48 * s, 1.0);
            }

            // Alpha fade out over final 0.5s
            if (elapsed > 1.0) {
              const alpha = Math.max(0, 1.0 - (elapsed - 1.0) / 0.5);
              item.sprite.material.opacity = alpha;
              if (item.deedSprite) {
                item.deedSprite.material.opacity = alpha;
              }
            } else {
              item.sprite.material.opacity = 1.0;
              if (item.deedSprite) {
                item.deedSprite.material.opacity = 1.0;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 6. ANIMATE LOCALIZED 3D PARTICLE BURSTS (COIN DISINTEGRATION)
        // -------------------------------------------------------------
        for (let i = particleBurstsRef.current.length - 1; i >= 0; i--) {
          const burst = particleBurstsRef.current[i];
          const elapsed = (now - burst.startTime) / 1000;

          if (elapsed >= 1.0) {
            burst.particles.forEach((p) => {
              scene.remove(p.mesh);
              p.mesh.geometry.dispose();
              (p.mesh.material as THREE.Material).dispose();
            });
            particleBurstsRef.current.splice(i, 1);
          } else {
            const fade = Math.max(0, 1.0 - elapsed / 1.0);
            burst.particles.forEach((p) => {
              p.velocity.y -= 9.8 * dt; // Gravity
              p.mesh.position.addScaledVector(p.velocity, dt);
              p.mesh.rotation.x += p.rotVelocity.x * dt;
              p.mesh.rotation.y += p.rotVelocity.y * dt;
              p.mesh.rotation.z += p.rotVelocity.z * dt;

              if (p.mesh.material instanceof THREE.MeshStandardMaterial) {
                p.mesh.material.opacity = fade;
              }
            });
          }
        }
      }

      // 3.5 Animate Floating 3D Avatar Identifier Rotation & Bobbing
      playerTokensMapRef.current.forEach((tMesh) => {
        tMesh.children.forEach((child) => {
          if (child.userData && child.userData.isAvatarIdentifier) {
            child.rotation.y += 0.02;
            child.position.y = 0.38 + Math.sin(now * 0.003) * 0.025;
          }
        });
      });

      // 4. Animate Card Hand Inspection, Property Stacking & Dynamic Hover Lift
      const cameraAspect = cameraRef.current ? cameraRef.current.aspect : 1.6;
      const modalScale = Math.min(0.92, Math.max(0.64, cameraAspect / 1.4));

      if (cameraHandGroupRef.current) {
        const cards = currentHandCardsRef.current;
        const activeInspectId = inspectedCardIdRef.current;
        const activeHoverId = activeInspectId !== null ? null : hoveredCardIdRef.current;

        // Check cache to avoid instantiating Maps and Arrays on every frame (60-144 times/sec)
        const aspectRounded = Math.round(cameraAspect * 100) / 100;
        let cachedLayout = handLayoutCacheRef.current;
        if (
          !cachedLayout ||
          cachedLayout.cardsRef !== cards ||
          cachedLayout.aspectRounded !== aspectRounded
        ) {
          const cardIdsKey = cards.map((c) => c.id).join(',');
          const layoutMap = new Map<string, HandCardLayoutItem>();
          const groupOrder: string[] = [];
          const groupMap = new Map<string, CardHandData[]>();

          cards.forEach((c) => {
            let gKey: string;
            if (c.type === 'PROPERTY') {
              gKey = `prop_group_${c.subType}`;
            } else {
              gKey = `item_${c.id}`;
            }

            if (!groupMap.has(gKey)) {
              groupMap.set(gKey, []);
              groupOrder.push(gKey);
            }
            groupMap.get(gKey)!.push(c);
          });

          const totalColumns = groupOrder.length;

          groupOrder.forEach((gKey, colIdx) => {
            const colCards = groupMap.get(gKey)!;
            const stackSize = colCards.length;
            colCards.forEach((card, sIdx) => {
              layoutMap.set(card.id, {
                card,
                colIndex: colIdx,
                totalCols: totalColumns,
                stackIndex: sIdx,
                stackSize,
              });
            });
          });

          // Compute exact camera frustum dimensions at hand plane (Z = -1.8)
          const vFovRad = ((cameraRef.current?.fov || 45) * Math.PI) / 180;
          const handPlaneZ = 1.8;
          const frustumH = 2 * Math.tan(vFovRad / 2) * handPlaneZ;
          const frustumW = frustumH * cameraAspect;
          const bottomY = -frustumH / 2;

          const maxHandWidth = Math.min(frustumW * 0.82, 3.4);
          const baseFewCardsScale = Math.min(0.85, Math.max(0.60, cameraAspect / 1.55));
          let responsiveScale = baseFewCardsScale;
          const unscaledCardW = 0.44;
          const unscaledCardH = 0.66;
          let cardW = unscaledCardW * responsiveScale;

          if (totalColumns > 1) {
            const estimatedTotalWidth = (totalColumns - 1) * (0.34 * responsiveScale) + cardW;
            if (estimatedTotalWidth > maxHandWidth) {
              const compressRatio = maxHandWidth / estimatedTotalWidth;
              responsiveScale = Math.max(0.44, responsiveScale * compressRatio);
              cardW = unscaledCardW * responsiveScale;
            }
          }

          const availableSpread = Math.max(0, maxHandWidth - cardW);
          const naturalStep = 0.35 * responsiveScale;
          const stepX = totalColumns > 1 ? Math.min(naturalStep, availableSpread / (totalColumns - 1)) : 0;
          const baseFanAngleSpan = Math.min(0.06, 0.36 / Math.max(1, totalColumns));

          cachedLayout = {
            cardsRef: cards,
            cardIdsKey,
            aspectRounded,
            layoutMap,
            totalColumns,
            vFovRad,
            frustumH,
            frustumW,
            bottomY,
            responsiveScale,
            baseFewCardsScale,
            cardW,
            stepX,
            baseFanAngleSpan,
            unscaledCardW,
            unscaledCardH,
          };
          handLayoutCacheRef.current = cachedLayout;
        }

        const {
          layoutMap,
          totalColumns,
          frustumH,
          frustumW,
          bottomY,
          responsiveScale,
          baseFewCardsScale,
          stepX,
          baseFanAngleSpan,
          vFovRad,
          unscaledCardW,
          unscaledCardH,
        } = cachedLayout;

        // Dynamically anchor cameraHandGroup at the bottom viewport boundary
        cameraHandGroupRef.current.position.set(0, bottomY, -1.8);

        const hoverLayout = activeHoverId ? layoutMap.get(activeHoverId) : null;
        const hoverColIndex = hoverLayout ? hoverLayout.colIndex : -1;
        const hoveredCardColor = hoverLayout && hoverLayout.card.type === 'PROPERTY' ? hoverLayout.card.subType : null;
        const hoveredGroupStackSize = hoverLayout ? hoverLayout.stackSize : 1;

        cardMeshesRef.current.forEach((cardMesh, cardId) => {
          const layout = layoutMap.get(cardId);
          if (!layout) return;

          const { colIndex, totalCols, stackIndex, stackSize, card } = layout;
          const isInspected = activeInspectId === cardId;
          const isHovered = activeHoverId === cardId;
          const isSameColorAsHovered =
            hoveredCardColor !== null &&
            card.type === 'PROPERTY' &&
            card.subType === hoveredCardColor;

          let targetX = 0;
          let targetY = 0;
          let targetZ = 0;
          let targetRotZ = 0;
          let targetScale = responsiveScale * 0.90;

          // Compute scale tailored for hovered cards/groups:
          // When the player has many cards, they shrink in the hand, but when hovered,
          // they become the SAME full size as if there were only a few cards in the hand!
          const activeGroupCount = Math.max(1, stackSize);
          const hoverCardZ = 0.45;
          const hoverDepth = 1.8 - hoverCardZ; // 1.35m from camera
          const hoverVisibleHalfW = Math.tan(vFovRad / 2) * hoverDepth * cameraAspect;
          const hoverBorderMargin = 0.08 * (hoverDepth / 1.8);
          const safeHoverBorderW = Math.max(0.2, hoverVisibleHalfW - hoverBorderMargin);
          const availableScreenSpan = safeHoverBorderW * 2;

          const stepRatio = 1.04;
          const totalWidthMultiplier = (activeGroupCount - 1) * stepRatio + 1;
          const maxFitCardW = availableScreenSpan / Math.max(1, totalWidthMultiplier);
          const maxFitScale = maxFitCardW / unscaledCardW;

          // Downsize cards a bit when hovering over them, especially when there are multiple of the same color:
          const multiColorDampen = activeGroupCount > 1 ? Math.max(0.68, 0.84 - (activeGroupCount - 1) * 0.05) : 0.94;
          const groupCardScale = Math.min(baseFewCardsScale * multiColorDampen, maxFitScale);
          const groupCardW = unscaledCardW * groupCardScale;
          const groupSpacing = groupCardW * stepRatio;
          const groupExpansionHalfWidth =
            hoveredCardColor !== null && hoveredGroupStackSize > 1
              ? ((hoveredGroupStackSize - 1) * groupSpacing) / 2 + (groupCardW / 2)
              : 0;

          if (isInspected) {
            targetX = 0;
            targetRotZ = 0;
            targetZ = 0.52;
            // Clean, comfortable inspection size: modest and controlled, never oversized
            targetScale = Math.min(0.52, Math.max(0.40, baseFewCardsScale * 0.88));
            targetY = frustumH / 2;
            cardMesh.visible = true;
            cardMesh.renderOrder = 3000;
          } else {
            cardMesh.visible = true;
            const normColIndex = totalCols > 1 ? colIndex / (totalCols - 1) - 0.5 : 0;
            const baseColCenter = (colIndex - (totalCols - 1) / 2) * stepX;
            targetX = baseColCenter;

            // Lateral parting when hovering another column, expanding extra to accommodate side-by-side cards
            if (hoverColIndex !== -1 && activeInspectId === null && colIndex !== hoverColIndex) {
              const basePush = 0.07 * responsiveScale;
              if (colIndex < hoverColIndex) {
                const dist = hoverColIndex - colIndex;
                targetX -= (groupExpansionHalfWidth + basePush / Math.pow(dist, 1.35));
              } else if (colIndex > hoverColIndex) {
                const dist = colIndex - hoverColIndex;
                targetX += (groupExpansionHalfWidth + basePush / Math.pow(dist, 1.35));
              }
            }

            if (isSameColorAsHovered || isHovered) {
              // ALL cards of the hovered group show NEXT TO EACH OTHER with the EXACT SAME FULL SIZE
              targetScale = groupCardScale;
              const scaledH = unscaledCardH * targetScale;
              const halfH = scaledH / 2;

              targetY = halfH + 0.05 * baseFewCardsScale;
              targetZ = 0.45 + stackIndex * 0.005;
              targetRotZ = 0;

              if (stackSize > 1) {
                // Ensure group center stays comfortably within border limit so ends never go off screen
                const halfGroupSpan = ((stackSize - 1) * groupSpacing + groupCardW) / 2;
                const maxSafeCenter = Math.max(0, safeHoverBorderW - halfGroupSpan);
                const safeGroupCenter = Math.max(-maxSafeCenter, Math.min(maxSafeCenter, baseColCenter));
                const offset = (stackIndex - (stackSize - 1) / 2) * groupSpacing;
                targetX = safeGroupCenter + offset;
              } else {
                // Single hovered card clamped to border limit
                const maxSafeCardX = Math.max(0, safeHoverBorderW - (groupCardW / 2));
                targetX = Math.max(-maxSafeCardX, Math.min(maxSafeCardX, baseColCenter));
              }
              cardMesh.renderOrder = 2500 + stackIndex;
            } else {
              // RESTING POSITION:
              // Multiple cards of the same color stack so the top header of each card behind is visible behind the front card!
              targetScale = responsiveScale * 0.90;
              const scaledH = unscaledCardH * targetScale;
              const halfH = scaledH / 2;

              const peekHeight = 0.125 * responsiveScale;
              const restingCenterY = activeInspectId !== null
                ? peekHeight - halfH - 0.12 * responsiveScale
                : peekHeight - halfH;

              // Front card (stackIndex 0) rests at baseline; cards behind (stackIndex > 0) step upward so their colored title header peeks out behind
              const stackYOffset = stackIndex * (0.108 * responsiveScale);
              const stackZOffset = -stackIndex * 0.012;

              targetY = restingCenterY + stackYOffset;
              targetZ = normColIndex * 0.002 + stackZOffset;
              targetRotZ = -normColIndex * baseFanAngleSpan;
              // Front card has highest renderOrder so its body masks cards behind it, leaving only their colored top headers visible
              cardMesh.renderOrder = 2100 + colIndex * 20 + (stackSize - 1 - stackIndex);
            }

            // Strict Border Limit: calculate exact screen border limit at this card's target depth
            // Guarantees cards toward the ends never go off screen when hovering or resting!
            const currentCardDepth = Math.max(0.5, 1.8 - targetZ);
            const currentCardVisibleHalfW = Math.tan(vFovRad / 2) * currentCardDepth * cameraAspect;
            const currentBorderMargin = 0.065 * (currentCardDepth / 1.8);
            const maxBorderLimitX = Math.max(0.08, currentCardVisibleHalfW - (unscaledCardW * targetScale) / 2 - currentBorderMargin);
            targetX = Math.max(-maxBorderLimitX, Math.min(maxBorderLimitX, targetX));
          }

          const cardLerpRate = 1.0 - Math.exp(-9.0 * dt);
          if (Math.abs(cardMesh.position.x - targetX) < 0.0005) {
            cardMesh.position.x = targetX;
          } else {
            cardMesh.position.x = THREE.MathUtils.lerp(cardMesh.position.x, targetX, cardLerpRate);
          }

          if (Math.abs(cardMesh.position.y - targetY) < 0.0005) {
            cardMesh.position.y = targetY;
          } else {
            cardMesh.position.y = THREE.MathUtils.lerp(cardMesh.position.y, targetY, cardLerpRate);
          }

          if (Math.abs(cardMesh.position.z - targetZ) < 0.0005) {
            cardMesh.position.z = targetZ;
          } else {
            cardMesh.position.z = THREE.MathUtils.lerp(cardMesh.position.z, targetZ, cardLerpRate);
          }

          if (Math.abs(cardMesh.rotation.z - targetRotZ) < 0.0005) {
            cardMesh.rotation.z = targetRotZ;
          } else {
            cardMesh.rotation.z = THREE.MathUtils.lerp(cardMesh.rotation.z, targetRotZ, cardLerpRate);
          }

          if (Math.abs(cardMesh.scale.x - targetScale) < 0.0005) {
            cardMesh.scale.setScalar(targetScale);
          } else {
            cardMesh.scale.setScalar(THREE.MathUtils.lerp(cardMesh.scale.x, targetScale, cardLerpRate));
          }

          // Toggle spatial action buttons visibility for inspected card
          cardMesh.children.forEach((child) => {
            if (child.userData?.isButtonGroup) {
              child.visible = isInspected;
            }
          });
        });
        
        const isInspectingHand = activeInspectId !== null;
        const targetOpacity = isInspectingHand ? 0.72 : 0.0;
        const darkLerp = 1.0 - Math.exp(-9.0 * dt);
        darkOverlayMat.opacity = THREE.MathUtils.lerp(darkOverlayMat.opacity, targetOpacity, darkLerp);
      }

      // 5. Purchase Prompt Card Animation
      const localPlayer = playersRef.current.find(p => p.id === 0) || playersRef.current[0];
      const isLocalTurn = activePlayerIdRef.current === 0;
      
      const localAnim = localPlayer ? tokenAnimMapRef.current.get(localPlayer.id) : null;
      const hasLandedOnSpace = localPlayer && localAnim ? (!localAnim.isMoving && localAnim.currentStepIdx === localPlayer.position) : true;

      let promptProp = null;
      if (isLocalTurn && gamePhaseRef.current === 'IN_GAME' && (turnPhaseRef.current === 'RESOLVING_SPACE' || turnPhaseRef.current === 'POST_ROLL') && localPlayer && hasLandedOnSpace && !dicePhysicsRef.current.active) {
         const space = boardSpacesRef.current[localPlayer.position];
         if (space?.type === 'PROPERTY' && space.propertyId) {
            const p = propertiesRef.current.find(p => p.id === space.propertyId);
            if (p && p.ownerId === null && !passedPropertyIdsRef.current.has(p.id)) promptProp = p;
         }
      }

      if (promptProp) {
        if (purchasePromptActivePropId.current !== promptProp.id) {
           purchasePromptActivePropId.current = promptProp.id;
           purchasePromptAnimStartTime.current = performance.now();
           if (purchasePromptMatRef.current) {
              const cData: CardHandData = {
                id: promptProp.id,
                type: 'PROPERTY',
                title: promptProp.name,
                subType: 'TITLE DEED',
                headerColor: promptProp.colorGroup ? COLOR_HEX_STR[promptProp.colorGroup] || '#475569' : '#475569',
                bodyLines: [],
                footerText: 'UNOWNED'
              };
              const tex = create3DCardTexture(cData, promptProp);
              if (purchasePromptMatRef.current.map) purchasePromptMatRef.current.map.dispose();
              purchasePromptMatRef.current.map = tex;
              purchasePromptMatRef.current.needsUpdate = true;
           }
           if (purchasePromptGroupRef.current) {
             const buyTex = createSpatialButtonTexture(`BUY $${promptProp.basePrice}`, '#16A34A');
             const buyMesh = purchasePromptGroupRef.current.children[1] as THREE.Mesh;
             if (buyMesh) {
                const oldMat = buyMesh.material as THREE.MeshBasicMaterial;
                if (oldMat.map) oldMat.map.dispose();
                oldMat.map = buyTex;
                oldMat.needsUpdate = true;
             }
             const passTex = createSpatialButtonTexture('PASS', '#475569');
             const passMesh = purchasePromptGroupRef.current.children[2] as THREE.Mesh;
             if (passMesh) {
                const oldMat = passMesh.material as THREE.MeshBasicMaterial;
                if (oldMat.map) oldMat.map.dispose();
                oldMat.map = passTex;
                oldMat.needsUpdate = true;
             }
             const hasDiscount = localPlayer.wildcardsHand.some((w) => w.id === 'discount' || w.id === 'x2_discount');
             const discountMesh = purchasePromptGroupRef.current.children[3] as THREE.Mesh | undefined;
             if (discountMesh) {
               if (hasDiscount) {
                 const discountedPrice = Math.floor(promptProp.basePrice / 2);
                 const discTex = createSpatialButtonTexture(`BUY 50% OFF ($${discountedPrice})`, '#7C3AED');
                 const oldMat = discountMesh.material as THREE.MeshBasicMaterial;
                 if (oldMat.map) oldMat.map.dispose();
                 oldMat.map = discTex;
                 oldMat.needsUpdate = true;
                 discountMesh.visible = true;
                 if (buyMesh) buyMesh.position.set(0, -0.34, 0.05);
                 discountMesh.position.set(0, -0.48, 0.05);
                 if (passMesh) passMesh.position.set(0, -0.62, 0.05);
               } else {
                 discountMesh.visible = false;
                 if (buyMesh) buyMesh.position.set(0, -0.42, 0.05);
                 if (passMesh) passMesh.position.set(0, -0.58, 0.05);
               }
             }
             const tileMesh = tileMeshesMapRef.current.get(localPlayer.position);
              if (tileMesh && cameraRef.current) {
                 tileMesh.getWorldPosition(_tmpPurchaseWorldPos);
                 purchasePromptGroupRef.current.parent!.worldToLocal(_tmpPurchaseWorldPos);
                 purchasePromptGroupRef.current.position.copy(_tmpPurchaseWorldPos);
                 purchasePromptGroupRef.current.scale.setScalar(0.1);
                 purchasePromptGroupRef.current.rotation.set(Math.PI/2, 0, 0);
                 purchasePromptStartPosRef.current.copy(_tmpPurchaseWorldPos);
              }
           }
        }
        
        if (purchasePromptGroupRef.current) {
           purchasePromptGroupRef.current.visible = true;
           const elapsed = (now - purchasePromptAnimStartTime.current) / 1000;
           const p = Math.min(1.0, elapsed / 0.40);
           const ease = p * p * (3 - 2 * p); // Smooth step

           const cameraAspect = cameraRef.current ? cameraRef.current.aspect : 1.6;
           const promptScale = Math.min(0.92, Math.max(0.64, cameraAspect / 1.4));
           _tmpPromptPos.set(0, 0, -1.45);
           _tmpPromptScale.set(promptScale * 0.76, promptScale * 0.76, promptScale * 0.76);
           
           purchasePromptGroupRef.current.position.lerpVectors(purchasePromptStartPosRef.current, _tmpPromptPos, ease);
           purchasePromptGroupRef.current.scale.lerpVectors(_tmpPromptMinScale, _tmpPromptScale, ease);
           purchasePromptGroupRef.current.rotation.x = THREE.MathUtils.lerp(Math.PI/2, 0, ease);
           purchasePromptGroupRef.current.rotation.y = THREE.MathUtils.lerp(0, 0, ease);
           purchasePromptGroupRef.current.rotation.z = THREE.MathUtils.lerp(0, 0, ease);
        }

        // Keep dark overlay up when prompt is showing
        darkOverlayMat.opacity = THREE.MathUtils.lerp(darkOverlayMat.opacity, 0.75, 1.0 - Math.exp(-8.0 * dt));
      } else {
        if (purchasePromptActivePropId.current) {
           purchasePromptActivePropId.current = null;
        }
        if (purchasePromptGroupRef.current && purchasePromptGroupRef.current.visible) {
           purchasePromptGroupRef.current.position.y -= 0.1;
           if (purchasePromptGroupRef.current.position.y < -3) {
              purchasePromptGroupRef.current.visible = false;
           }
        }
      }

      // Active player physical movement check (card must NOT be displayed until token physically lands on the space)
      const activeAnimState = tokenAnimMapRef.current.get(activePlayerIdRef.current);
      const isActiveTokenMoving = activeAnimState ? (activeAnimState.isMoving || activeAnimState.currentStepIdx !== activeAnimState.endPosIdx) : false;
      const isDiceRolling = dicePhysicsRef.current.active;
      const isPlayerTokenPhysicallyLanded = !isActiveTokenMoving && !isDiceRolling;

      // 6. Chance Card Floating & Flip Animation (Waits until token physically lands on space)
      if (activeChanceCardRef.current && chanceGroupRef.current && chanceInnerGroupRef.current) {
        if (!isPlayerTokenPhysicallyLanded) {
          // Token is still moving or dice are rolling - keep card hidden
          chanceGroupRef.current.visible = false;
        } else {
          // Token has physically landed on the space!
          if (!chanceCardDisplayedRef.current) {
            chanceCardDisplayedRef.current = true;
            chanceGroupRef.current.visible = true;
            chanceCardAnimStartTimeRef.current = now;
            chanceCardIsFlippedRef.current = false;
            chanceInnerGroupRef.current.rotation.y = Math.PI; // Face down initially
            soundFx.playCardDraw();
          }

          if (chanceGroupRef.current.visible) {
            const elapsed = (now - chanceCardAnimStartTimeRef.current) / 1000;

            _tmpModalPos.set(0, 0.06 + Math.sin(now * 0.003) * 0.015, -1.45);
            _tmpModalScale.set(modalScale * 0.80, modalScale * 0.80, modalScale * 0.80);
            chanceGroupRef.current.position.copy(_tmpModalPos);
            chanceGroupRef.current.scale.copy(_tmpModalScale);

            // Auto-flip card after a brief 0.4s pause to float into center
            if (!chanceCardIsFlippedRef.current && elapsed > 0.4) {
              soundFx.playCardDraw();
              chanceCardIsFlippedRef.current = true;
              chanceCardFlipStartTimeRef.current = now;
            }

            if (chanceCardIsFlippedRef.current) {
              const flipElapsed = (now - chanceCardFlipStartTimeRef.current) / 1000;
              const progress = Math.min(1.0, flipElapsed / 0.42);
              const ease = progress * progress * (3 - 2 * progress);

              chanceInnerGroupRef.current.rotation.y = THREE.MathUtils.lerp(Math.PI, 0, ease);

              if (progress > 0.75 && chanceContinueMeshRef.current) {
                chanceContinueMeshRef.current.visible = true;

                // Dynamically update countdown button: 5s -> 4s -> 3s -> 2s -> 1s
                const remainingSec = Math.max(1, Math.ceil(5.0 - flipElapsed));
                if (remainingSec !== lastChanceCountdownSecRef.current) {
                  lastChanceCountdownSecRef.current = remainingSec;
                  const continueTex = getOrCreateSpatialButtonTexture(`CONTINUE (${remainingSec}s)`, '#16A34A');
                  (chanceContinueMeshRef.current.material as THREE.MeshBasicMaterial).map = continueTex;
                  (chanceContinueMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
                }
              }

              // Show card face-up for 5 seconds, then automatically resolve and move on
              if (flipElapsed >= 5.0) {
                if (activeChanceCardRef.current && callbacksRef.current.onResolveChanceCard) {
                  const cardToResolve = activeChanceCardRef.current;
                  activeChanceCardRef.current = null;
                  callbacksRef.current.onResolveChanceCard(cardToResolve);
                }
              }
            } else {
              chanceInnerGroupRef.current.rotation.y = Math.PI;
              if (chanceContinueMeshRef.current) {
                chanceContinueMeshRef.current.visible = false;
              }
            }

            // Keep dark overlay active so Chance Card stands out in 3D
            darkOverlayMat.opacity = THREE.MathUtils.lerp(darkOverlayMat.opacity, 0.75, 1.0 - Math.exp(-8.0 * dt));
          }
        }
      }

      // 6.5 Community Chest Card Floating & Flip Animation (Waits until token physically lands on space)
      if (activeCommunityChestCardRef.current && chestGroupRef.current && chestInnerGroupRef.current) {
        if (!isPlayerTokenPhysicallyLanded) {
          chestGroupRef.current.visible = false;
        } else {
          if (!chestCardDisplayedRef.current) {
            chestCardDisplayedRef.current = true;
            chestGroupRef.current.visible = true;
            chestCardAnimStartTimeRef.current = now;
            chestCardIsFlippedRef.current = false;
            chestInnerGroupRef.current.rotation.y = Math.PI;
            soundFx.playCardDraw();
          }

          if (chestGroupRef.current.visible) {
            const elapsed = (now - chestCardAnimStartTimeRef.current) / 1000;

            _tmpModalPos.set(0, 0.06 + Math.sin(now * 0.003) * 0.015, -1.45);
            _tmpModalScale.set(modalScale * 0.80, modalScale * 0.80, modalScale * 0.80);
            chestGroupRef.current.position.copy(_tmpModalPos);
            chestGroupRef.current.scale.copy(_tmpModalScale);

            if (!chestCardIsFlippedRef.current && elapsed > 0.4) {
              soundFx.playCardDraw();
              chestCardIsFlippedRef.current = true;
              chestCardFlipStartTimeRef.current = now;
            }

            if (chestCardIsFlippedRef.current) {
              const flipElapsed = (now - chestCardFlipStartTimeRef.current) / 1000;
              const progress = Math.min(1.0, flipElapsed / 0.42);
              const ease = progress * progress * (3 - 2 * progress);

              chestInnerGroupRef.current.rotation.y = THREE.MathUtils.lerp(Math.PI, 0, ease);

              if (progress > 0.75 && chestContinueMeshRef.current) {
                chestContinueMeshRef.current.visible = true;

                const remainingSec = Math.max(1, Math.ceil(5.0 - flipElapsed));
                if (remainingSec !== lastChestCountdownSecRef.current) {
                  lastChestCountdownSecRef.current = remainingSec;
                  const continueTex = getOrCreateSpatialButtonTexture(`CONTINUE (${remainingSec}s)`, '#D97706');
                  (chestContinueMeshRef.current.material as THREE.MeshBasicMaterial).map = continueTex;
                  (chestContinueMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
                }
              }

              // Show card face-up for 5 seconds, then automatically resolve and move on
              if (flipElapsed >= 5.0) {
                if (activeCommunityChestCardRef.current && callbacksRef.current.onResolveCommunityChestCard) {
                  const cardToResolve = activeCommunityChestCardRef.current;
                  activeCommunityChestCardRef.current = null;
                  callbacksRef.current.onResolveCommunityChestCard(cardToResolve);
                }
              }
            } else {
              chestInnerGroupRef.current.rotation.y = Math.PI;
              if (chestContinueMeshRef.current) {
                chestContinueMeshRef.current.visible = false;
              }
            }

            darkOverlayMat.opacity = THREE.MathUtils.lerp(darkOverlayMat.opacity, 0.75, 1.0 - Math.exp(-8.0 * dt));
          }
        }
      }

      // -------------------------------------------------------------
      // 6.8 DRAFT 3D CARDS ANIMATION & HOVER ENGINE (CENTER OF BOARD)
      // -------------------------------------------------------------
      if (gamePhaseRef.current === 'DRAFT' && draftBoardGroupRef.current?.visible) {
        const seq = draftSeqStateRef.current;

        // 1. Idle Hover on Face-Down Cards (Stays completely flat on felt, no tilt, rich orange hue around hovered card)
        draftCardsMapRef.current.forEach((cardItem) => {
          if (cardItem.state === 'FACE_DOWN') {
            const isHovered = hoveredDraftCardIdRef.current === cardItem.property.id && !seq.active;
            const targetY = isHovered ? cardItem.basePos.y + 0.025 : cardItem.basePos.y;
            const targetScale = isHovered ? 1.04 : 1.0;

            cardItem.group.position.y = THREE.MathUtils.lerp(cardItem.group.position.y, targetY, 0.18);
            cardItem.group.position.x = THREE.MathUtils.lerp(cardItem.group.position.x, cardItem.basePos.x, 0.18);
            cardItem.group.position.z = THREE.MathUtils.lerp(cardItem.group.position.z, cardItem.basePos.z, 0.18);
            // Mystery cards remain strictly flat on hover (no tilting up)
            cardItem.group.rotation.x = THREE.MathUtils.lerp(cardItem.group.rotation.x, 0, 0.18);
            cardItem.group.rotation.y = THREE.MathUtils.lerp(cardItem.group.rotation.y, 0, 0.18);
            cardItem.group.rotation.z = THREE.MathUtils.lerp(cardItem.group.rotation.z, 0, 0.18);
            cardItem.group.scale.setScalar(THREE.MathUtils.lerp(cardItem.group.scale.x, targetScale, 0.18));

            // Orange glow aura around hovered mystery card
            if (cardItem.glowMesh) {
              const gMat = cardItem.glowMesh.material as THREE.MeshBasicMaterial;
              const targetGlow = isHovered ? 0.85 : 0.0;
              gMat.opacity = THREE.MathUtils.lerp(gMat.opacity, targetGlow, 0.20);
            }

            // Warm orange emissive highlight on rim of hovered card
            if (cardItem.rimMat) {
              const targetRimColor = isHovered ? _COLOR_DRAFT_ORANGE : _COLOR_DRAFT_GOLD;
              cardItem.rimMat.color.lerp(targetRimColor, 0.20);
              cardItem.rimMat.emissive = isHovered ? _COLOR_DRAFT_EMISSIVE_ORANGE : _COLOR_DRAFT_BLACK;
              cardItem.rimMat.emissiveIntensity = isHovered ? 0.55 : 0.0;
            }

            if (cardItem.shadowMesh) {
              const shadowMat = cardItem.shadowMesh.material as THREE.MeshBasicMaterial;
              shadowMat.opacity = THREE.MathUtils.lerp(shadowMat.opacity, isHovered ? 0.25 : 0.45, 0.18);
              cardItem.shadowMesh.scale.setScalar(isHovered ? 1.25 : 1.0);
            }
          }
        });

        // 2. Draft Sequence Progression
        if (seq.active && seq.queue.length > 0 && seq.queueIndex < seq.queue.length) {
          const currentStep = seq.queue[seq.queueIndex];
          const activeCard = draftCardsMapRef.current.get(currentStep.cardId);
          const draftingPlayer = playersRef.current.find((p) => p.id === currentStep.playerId) || playersRef.current[0];
          const elapsed = (now - seq.stepStartTime) / 1000;

          if (activeCard && activeCard.state !== 'DONE') {
            if (seq.phase === 'REVEAL') {
              // Duration: 1.75s
              const riseTime = 0.55;
              const pRise = Math.min(1.0, elapsed / riseTime);
              const easeRise = pRise * pRise * (3 - 2 * pRise);

              const targetRevealY = 2.2;
              const targetRevealZ = 0.8;
              activeCard.group.position.x = THREE.MathUtils.lerp(activeCard.basePos.x, 0, easeRise);
              activeCard.group.position.y = THREE.MathUtils.lerp(activeCard.basePos.y, targetRevealY, easeRise);
              activeCard.group.position.z = THREE.MathUtils.lerp(activeCard.basePos.z, targetRevealZ, easeRise);

              // 180° Flip around X-axis so front texture is presented to camera
              const pFlip = Math.min(1.0, elapsed / 0.65);
              const easeFlip = pFlip * pFlip * (3 - 2 * pFlip);
              activeCard.group.rotation.x = THREE.MathUtils.lerp(0, Math.PI, easeFlip);
              activeCard.group.scale.setScalar(THREE.MathUtils.lerp(1.0, 1.35, easeRise));

              if (elapsed > 0.65) {
                activeCard.group.position.y = targetRevealY + Math.sin(now * 0.005) * 0.04;
                activeCard.group.rotation.y = Math.sin(now * 0.003) * 0.05;
              }

              if (pFlip > 0.5 && (!seq.revealedProperty || seq.revealedProperty.id !== activeCard.property.id)) {
                seq.revealedProperty = activeCard.property;
                soundFx.playBuyProperty();
                const isHuman = draftingPlayer.id === 0;
                setDraftAnnouncement({
                  visible: true,
                  text: isHuman
                    ? `🎯 YOU DRAFTED: ${activeCard.property.name.toUpperCase()}!`
                    : `🤖 ${draftingPlayer.name.toUpperCase()} DRAFTED: ${activeCard.property.name.toUpperCase()}!`,
                  subText: `Added to portfolio for $0 • ${activeCard.property.colorGroup} Group`,
                  color: COLOR_HEX_STR[activeCard.property.colorGroup] || '#F59E0B',
                });
              }

              if (elapsed >= 1.75) {
                seq.phase = 'FLY';
                seq.stepStartTime = now;
                activeCard.state = 'FLYING';
              }
            } else if (seq.phase === 'FLY') {
              // Duration: 0.55s
              const flyTime = 0.55;
              const pFly = Math.min(1.0, elapsed / flyTime);
              const easeFly = pFly * pFly * (3 - 2 * pFly);

              const isHuman = draftingPlayer.id === 0;
              const targetFlyPos = _tmpDraftFlyPos.set(
                isHuman ? -3.2 : -3.0 + draftingPlayer.id * 2.0,
                isHuman ? -1.2 : 2.8,
                isHuman ? 3.5 : -3.2
              );

              activeCard.group.position.lerp(targetFlyPos, easeFly);
              activeCard.group.scale.setScalar(THREE.MathUtils.lerp(1.35, 0.15, easeFly));

              if (pFly >= 1.0) {
                soundFx.playCash();
                activeCard.state = 'DONE';
                activeCard.group.visible = false;

                callbacksRef.current.onDraftProperty(activeCard.property.id, draftingPlayer.id);

                seq.queueIndex++;
                if (seq.queueIndex < seq.queue.length) {
                  seq.phase = 'REVEAL';
                  seq.stepStartTime = now;
                  const nextItem = seq.queue[seq.queueIndex];
                  const nextCard = draftCardsMapRef.current.get(nextItem.cardId);
                  if (nextCard) {
                    nextCard.state = 'REVEALING';
                    nextCard.assignedPlayerId = nextItem.playerId;
                    nextCard.animStartTime = now;
                  }
                  const nextPl = playersRef.current.find((p) => p.id === nextItem.playerId) || playersRef.current[0];
                  setDraftAnnouncement({
                    visible: true,
                    text: `🤖 ${nextPl.name.toUpperCase()} IS REVEALING THEIR PROPERTY...`,
                    subText: 'Revealing mystery deed on the board...',
                    color: '#94A3B8',
                  });
                } else {
                  seq.active = false;
                  soundFx.playFanfare();
                  setDraftAnnouncement({
                    visible: true,
                    text: '✨ DRAFT COMPLETE! TURN 1 BEGINS!',
                    subText: 'Starting wildcards dealt to all players',
                    color: '#10B981',
                  });
                  setTimeout(() => {
                    setDraftAnnouncement((prev) => ({ ...prev, visible: false }));
                  }, 2500);
                }
              }
            }
          }
        }
      }

      // Adaptive Battery Saver & Low-Power Constraints:
      // In low-power/battery mode or when bloom is disabled:
      // Bypass EffectComposer and UnrealBloomPass entirely to render straight via renderer.render(scene, camera)
      const isBatteryMode = Boolean(
        currentEff.isBatterySaver ||
        isBatterySaverActive ||
        settingsRef.current?.isBatterySaver
      );
      if (currentEff.bloomEnabled && !isBatteryMode && composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }

      // Decrement dirty frame settle counter when motionless
      if (!isMotionActive) {
        dirtyFramesRef.current = Math.max(0, dirtyFramesRef.current - 1);
        if (dirtyFramesRef.current === 0) {
          isDirtyRef.current = false;
        }
      }
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      const currentEff = effectiveSettingsRef.current;
      const isBattery = Boolean(
        currentEff.isBatterySaver ||
        isBatterySaverActive ||
        settingsRef.current?.isBatterySaver
      );
      const baseDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const effectiveDpr = isBattery ? 1.0 : Math.min(currentEff.effectivePixelRatio || 1.0, 1.5);
      rendererRef.current.setPixelRatio(effectiveDpr);
      if (composerRef.current) {
        composerRef.current.setSize(w, h);
      }
      markDirty(5);
    };

    window.addEventListener('resize', handleResize);

    const mountNode = mountRef.current;

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointerup', onUserActivity);
      domElem.removeEventListener('wheel', onUserActivity);
      domElem.removeEventListener('touchstart', onUserActivity);
      domElem.removeEventListener('touchmove', onUserActivity);
      window.removeEventListener('resize', handleResize);
      feltTex.dispose();
      porchSunsetEnvRef.current?.dispose();
      renderer.dispose();
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------
  // SYNC SETTINGS REACTIVELY TO LIVE THREE.JS RENDERER & LIGHTS
  // -------------------------------------------------------------
  useEffect(() => {
    const currentSettings = settings || DEFAULT_SETTINGS;
    settingsRef.current = currentSettings;
    const newEff = resolveEffectiveSettings(currentSettings);
    effectiveSettingsRef.current = newEff;

    const isBattery = Boolean(
      currentSettings.isBatterySaver ||
      currentSettings.batterySaverMode ||
      currentSettings.graphicQuality === 'BATTERY_SAVER' ||
      currentSettings.graphicPreset === 'BATTERY_SAVER' ||
      isSystemLowPower
    );

    const baseDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const targetDpr = isBattery ? 1.0 : Math.min(newEff.effectivePixelRatio || 1.0, 1.5);

    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(targetDpr);
      rendererRef.current.shadowMap.enabled = !isBattery && newEff.shadowsEnabled;
      rendererRef.current.shadowMap.autoUpdate = false;
      rendererRef.current.shadowMap.needsUpdate = true;
    }
    if (dirLightRef.current) {
      dirLightRef.current.castShadow = false;
      if (dirLightRef.current.shadow) {
        dirLightRef.current.shadow.mapSize.width = newEff.shadowMapSize;
        dirLightRef.current.shadow.mapSize.height = newEff.shadowMapSize;
        if (dirLightRef.current.shadow.map) {
          dirLightRef.current.shadow.map.dispose();
          dirLightRef.current.shadow.map = null as any;
        }
      }
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = !isBattery && newEff.bloomEnabled;
    }
    if (porchSunsetEnvRef.current) {
      porchSunsetEnvRef.current.setLowEndMode?.(isBattery || !newEff.shadowsEnabled);
      porchSunsetEnvRef.current.setAmbientAnimations?.(!isBattery && newEff.ambientAnimations);
      porchSunsetEnvRef.current.setQualityLevel?.(isBattery ? 'BATTERY_SAVER' : newEff.targetQuality);
    }
    markDirty(8);
  }, [settings, isSystemLowPower, markDirty]);

  // -------------------------------------------------------------
  // UPDATE 3D CHANCE CARD TEXTURES & VISIBILITY
  // -------------------------------------------------------------
  useEffect(() => {
    activeChanceCardRef.current = activeChanceCard || null;
    chanceCardDisplayedRef.current = false;
    chanceCardIsFlippedRef.current = false;
    lastChanceCountdownSecRef.current = -1;

    if (activeChanceCard) {
      if (chanceFrontMatRef.current) {
        if (chanceFrontMatRef.current.map) chanceFrontMatRef.current.map.dispose();
        chanceFrontMatRef.current.map = createChanceCardFrontTexture(activeChanceCard);
        chanceFrontMatRef.current.needsUpdate = true;
      }
      if (chanceBackMatRef.current) {
        if (!chanceBackMatRef.current.map) {
          chanceBackMatRef.current.map = createChanceCardBackTexture();
        }
        chanceBackMatRef.current.needsUpdate = true;
      }
      if (chanceInnerGroupRef.current) {
        chanceInnerGroupRef.current.rotation.y = Math.PI; // Face down initially
      }
      if (chanceContinueMeshRef.current) {
        chanceContinueMeshRef.current.visible = false;
      }
      // Gated by render loop until token physically lands on the space
      if (chanceGroupRef.current) {
        chanceGroupRef.current.visible = false;
      }
    } else {
      if (chanceGroupRef.current) {
        chanceGroupRef.current.visible = false;
      }
    }
  }, [activeChanceCard]);

  // -------------------------------------------------------------
  // UPDATE 3D COMMUNITY CHEST CARD TEXTURES & VISIBILITY
  // -------------------------------------------------------------
  useEffect(() => {
    activeCommunityChestCardRef.current = activeCommunityChestCard || null;
    chestCardDisplayedRef.current = false;
    chestCardIsFlippedRef.current = false;
    lastChestCountdownSecRef.current = -1;

    if (activeCommunityChestCard) {
      if (chestFrontMatRef.current) {
        if (chestFrontMatRef.current.map) chestFrontMatRef.current.map.dispose();
        chestFrontMatRef.current.map = createChestCardFrontTexture(activeCommunityChestCard);
        chestFrontMatRef.current.needsUpdate = true;
      }
      if (chestBackMatRef.current) {
        if (!chestBackMatRef.current.map) {
          chestBackMatRef.current.map = createChestCardBackTexture();
        }
        chestBackMatRef.current.needsUpdate = true;
      }
      if (chestInnerGroupRef.current) {
        chestInnerGroupRef.current.rotation.y = Math.PI; // Face down initially
      }
      if (chestContinueMeshRef.current) {
        chestContinueMeshRef.current.visible = false;
      }
      // Gated by render loop until token physically lands on the space
      if (chestGroupRef.current) {
        chestGroupRef.current.visible = false;
      }
    } else {
      if (chestGroupRef.current) {
        chestGroupRef.current.visible = false;
      }
    }
  }, [activeCommunityChestCard]);

  // -------------------------------------------------------------
  // POPULATE PHYSICAL 3D DRAFT CARDS IN THE BOARD CENTER (DRAFT PHASE)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!draftBoardGroupRef.current) return;
    const draftGroup = draftBoardGroupRef.current;

    // Dispose and clear existing draft cards
    while (draftGroup.children.length > 0) {
      const child = draftGroup.children[0];
      draftGroup.remove(child);
    }
    draftCardsMapRef.current.clear();

    if (gamePhase !== 'DRAFT' || draftPool.length === 0) {
      draftGroup.visible = false;
      return;
    }

    draftGroup.visible = true;
    const cardBackTex = createDraftCardBackTexture();
    const N = draftPool.length;
    const cardWidth = 1.12;
    const cardHeight = 1.62;
    const cardDepth = 0.024;
    const spacing = Math.min(1.48, 5.2 / Math.max(1, N - 1 || 1));

    draftPool.forEach((prop, i) => {
      const cardSubGroup = new THREE.Group();
      const baseX = N > 1 ? (i - (N - 1) / 2) * spacing : 0;
      const baseY = 0.045; // Resting cleanly on green felt
      const baseZ = 0.0;
      const basePos = new THREE.Vector3(baseX, baseY, baseZ);

      cardSubGroup.position.copy(basePos);

      // Gold Foil Border Rim
      const rimGeo = new RoundedBoxGeometry(cardWidth, cardDepth, cardHeight, 2, 0.015);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.35,
        metalness: 0.85,
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.receiveShadow = true;
      cardSubGroup.add(rimMesh);

      // Back Face (Top side when flat on board, face-down)
      const backGeo = new THREE.PlaneGeometry(cardWidth - 0.02, cardHeight - 0.02);
      backGeo.rotateX(-Math.PI / 2);
      const backMat = new THREE.MeshStandardMaterial({
        map: cardBackTex,
        roughness: 0.35,
        metalness: 0.15,
      });
      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.position.y = cardDepth / 2 + 0.001;
      backMesh.receiveShadow = true;
      cardSubGroup.add(backMesh);

      // Front Face (Bottom side when flat on board, facing into felt until flipped)
      const frontTex = createDraftCardFrontTexture(prop);
      const frontGeo = new THREE.PlaneGeometry(cardWidth - 0.02, cardHeight - 0.02);
      frontGeo.rotateX(Math.PI / 2);
      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        roughness: 0.45,
        metalness: 0.05,
      });
      const frontMesh = new THREE.Mesh(frontGeo, frontMat);
      frontMesh.position.y = -(cardDepth / 2 + 0.001);
      cardSubGroup.add(frontMesh);

      // Radiant Orange Glow Aura Plane for Hovering (Hover orange hue)
      const glowGeo = new THREE.PlaneGeometry(cardWidth + 0.28, cardHeight + 0.28);
      glowGeo.rotateX(-Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        map: diceTrailTexRef.current || createDiceMotionTrailTexture(),
        color: 0xff7700,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.y = -0.005;
      cardSubGroup.add(glowMesh);

      // Soft Contact Shadow below card
      const shadowGeo = new THREE.PlaneGeometry(cardWidth * 1.25, cardHeight * 1.25);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.y = -0.02;
      cardSubGroup.add(shadowMesh);

      cardSubGroup.userData = {
        isDraftCard: true,
        propertyId: prop.id,
        index: i,
      };

      rimMesh.userData = { isDraftCard: true, propertyId: prop.id, index: i };
      backMesh.userData = { isDraftCard: true, propertyId: prop.id, index: i };
      frontMesh.userData = { isDraftCard: true, propertyId: prop.id, index: i };

      draftGroup.add(cardSubGroup);

      draftCardsMapRef.current.set(prop.id, {
        group: cardSubGroup,
        property: prop,
        index: i,
        basePos,
        shadowMesh,
        glowMesh,
        rimMat,
        state: 'FACE_DOWN',
        assignedPlayerId: null,
        animStartTime: 0,
      });
    });
  }, [gamePhase, draftPool]);

  // -------------------------------------------------------------
  // UPDATE CARD MESH POOL
  // -------------------------------------------------------------
  useEffect(() => {
    if (!cameraHandGroupRef.current) return;

    const currentCardIds = new Set(currentHandCards.map((c) => c.id));

    // Remove obsolete card meshes
    cardMeshesRef.current.forEach((mesh, id) => {
      if (!currentCardIds.has(id)) {
        cameraHandGroupRef.current?.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
        cardMeshesRef.current.delete(id);
      }
    });

    // Add or Update card meshes
    const cGeo = new THREE.PlaneGeometry(0.44, 0.66);

    // Helper to build or refresh 3D card action buttons (House / Hotel & Mortgage)
    const buildOrUpdateCardButtons = (cardMesh: THREE.Mesh, cData: CardHandData) => {
      // Find and remove existing button group if present
      const existingBtnGroup = cardMesh.children.find((ch) => ch.userData?.isButtonGroup);
      if (existingBtnGroup) {
        cardMesh.remove(existingBtnGroup);
        existingBtnGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      }

      // Remove any existing Close ("X") button from card to comply with clean selection UI
      const existingClose = cardMesh.children.find((ch) => ch.userData?.buttonAction === 'CLOSE_INSPECT');
      if (existingClose) {
        cardMesh.remove(existingClose);
        if (existingClose instanceof THREE.Mesh) {
          existingClose.geometry.dispose();
          if (Array.isArray(existingClose.material)) existingClose.material.forEach((m) => m.dispose());
          else existingClose.material.dispose();
        }
      }

      // Add 3D Spatial Action Buttons to PROPERTY card
      if (cData.type === 'PROPERTY' && cData.actionPayload?.propertyId) {
        const prop = properties.find((p) => p.id === cData.actionPayload?.propertyId);
        if (prop) {
          const btnGroup = new THREE.Group();
          btnGroup.position.set(0, -0.42, 0.05);
          btnGroup.userData = { isButtonGroup: true };

          // Color set & monopoly status
          const groupProps = properties.filter((p) => p.colorGroup === prop.colorGroup);
          const hasMonopoly = groupProps.length > 0 && groupProps.every((p) => p.ownerId === prop.ownerId);
          const allHave4Houses = hasMonopoly && groupProps.every((p) => (p.houses !== undefined && p.houses >= 4) || p.hotel);
          const anyMortgagedInGroup = groupProps.some((p) => p.isMortgaged);
          const hasHousesOrHotelInGroup = groupProps.some((p) => (p.houses !== undefined && p.houses > 0) || p.hotel);

          // 1. ADD HOUSE / HOTEL BUTTON
          let bTex1;
          let btn1Action: string | null = null;

          if (prop.isMortgaged) {
            bTex1 = getOrCreateSpatialButtonTexture('UNMORTGAGE FIRST', '#475569');
          } else if (!hasMonopoly || !prop.houseCost) {
            bTex1 = getOrCreateSpatialButtonTexture(!prop.houseCost ? 'CANNOT BUILD' : 'NEED MONOPOLY', '#475569');
          } else if (anyMortgagedInGroup) {
            bTex1 = getOrCreateSpatialButtonTexture('UNMORTGAGE SET FIRST', '#475569');
          } else if (prop.hotel) {
            bTex1 = getOrCreateSpatialButtonTexture('HOTEL BUILT ★', '#991B1B');
          } else if (prop.houses === 4) {
            if (allHave4Houses) {
              bTex1 = getOrCreateSpatialButtonTexture(`BUY HOTEL $${prop.houseCost}`, '#DC2626');
              btn1Action = 'BUILD_HOUSE';
            } else {
              bTex1 = getOrCreateSpatialButtonTexture('ALL NEED 4 HOUSES', '#64748B');
            }
          } else {
            bTex1 = getOrCreateSpatialButtonTexture(`ADD HOUSE $${prop.houseCost}`, '#16A34A');
            btn1Action = 'BUILD_HOUSE';
          }

          const bGeo1 = new THREE.PlaneGeometry(0.34, 0.10);
          const bMat1 = new THREE.MeshBasicMaterial({ map: bTex1, transparent: true, depthTest: false, depthWrite: false });
          const bMesh1 = new THREE.Mesh(bGeo1, bMat1);
          bMesh1.position.x = -0.18;
          bMesh1.renderOrder = 2700;
          bMesh1.userData = { buttonAction: btn1Action, cardData: cData };
          btnGroup.add(bMesh1);

          // Generous invisible hitbox behind house/hotel button for effortless clicking
          const hitGeo1 = new THREE.PlaneGeometry(0.38, 0.14);
          const hitMat1 = new THREE.MeshBasicMaterial({ visible: false, depthTest: false, depthWrite: false });
          const hitMesh1 = new THREE.Mesh(hitGeo1, hitMat1);
          hitMesh1.position.set(-0.18, 0, -0.01);
          hitMesh1.renderOrder = 2700;
          hitMesh1.userData = { buttonAction: btn1Action, cardData: cData };
          btnGroup.add(hitMesh1);

          // 2. MORTGAGE / BUY BACK / SELL HOUSE BUTTON
          const unmortCost = Math.round((prop.basePrice / 2) * 1.1);
          let mortLabel: string;
          let mortColor: string;
          let btn2Action: string | null = null;

          if (prop.isMortgaged) {
            mortLabel = `BUY BACK $${unmortCost}`;
            mortColor = '#2563EB';
            btn2Action = 'MORTGAGE';
          } else if (prop.hotel) {
            mortLabel = `SELL HOTEL +$${Math.round(prop.houseCost / 2)}`;
            mortColor = '#E11D48';
            btn2Action = 'SELL_HOUSE';
          } else if (prop.houses && prop.houses > 0) {
            mortLabel = `SELL HOUSE +$${Math.round(prop.houseCost / 2)}`;
            mortColor = '#E11D48';
            btn2Action = 'SELL_HOUSE';
          } else if (hasHousesOrHotelInGroup) {
            mortLabel = 'SELL SET HOUSES FIRST';
            mortColor = '#475569';
            btn2Action = null;
          } else {
            mortLabel = `MORTGAGE +$${Math.round(prop.basePrice / 2)}`;
            mortColor = '#D97706';
            btn2Action = 'MORTGAGE';
          }

          const bTex2 = getOrCreateSpatialButtonTexture(mortLabel, mortColor);
          const bGeo2 = new THREE.PlaneGeometry(0.34, 0.10);
          const bMat2 = new THREE.MeshBasicMaterial({ map: bTex2, transparent: true, depthTest: false, depthWrite: false });
          const bMesh2 = new THREE.Mesh(bGeo2, bMat2);
          bMesh2.position.x = 0.18;
          bMesh2.renderOrder = 2700;
          bMesh2.userData = { buttonAction: btn2Action, cardData: cData };
          btnGroup.add(bMesh2);

          // Invisible hitbox behind mortgage/buyback button
          const hitGeo2 = new THREE.PlaneGeometry(0.38, 0.14);
          const hitMat2 = new THREE.MeshBasicMaterial({ visible: false, depthTest: false, depthWrite: false });
          const hitMesh2 = new THREE.Mesh(hitGeo2, hitMat2);
          hitMesh2.position.set(0.18, 0, -0.01);
          hitMesh2.renderOrder = 2700;
          hitMesh2.userData = { buttonAction: btn2Action, cardData: cData };
          btnGroup.add(hitMesh2);

          // 3. CLOSE BUTTON
          const bTexClose = getOrCreateSpatialButtonTexture('CLOSE [ESC]', '#334155');
          const bGeoClose = new THREE.PlaneGeometry(0.32, 0.09);
          const bMatClose = new THREE.MeshBasicMaterial({ map: bTexClose, transparent: true, depthTest: false, depthWrite: false });
          const bMeshClose = new THREE.Mesh(bGeoClose, bMatClose);
          bMeshClose.position.set(0, -0.11, 0);
          bMeshClose.renderOrder = 2700;
          bMeshClose.userData = { buttonAction: 'CLOSE_INSPECT', cardData: cData };
          btnGroup.add(bMeshClose);

          const hitGeoClose = new THREE.PlaneGeometry(0.36, 0.12);
          const hitMatClose = new THREE.MeshBasicMaterial({ visible: false, depthTest: false, depthWrite: false });
          const hitMeshClose = new THREE.Mesh(hitGeoClose, hitMatClose);
          hitMeshClose.position.set(0, -0.11, -0.01);
          hitMeshClose.renderOrder = 2700;
          hitMeshClose.userData = { buttonAction: 'CLOSE_INSPECT', cardData: cData };
          btnGroup.add(hitMeshClose);

          btnGroup.visible = inspectedCardIdRef.current === cData.id;
          cardMesh.add(btnGroup);
        }
      } else {
        // Non-property card (e.g., Get Out of Jail Free)
        const btnGroup = new THREE.Group();
        btnGroup.position.set(0, -0.42, 0.05);
        btnGroup.userData = { isButtonGroup: true };

        const bTexClose = getOrCreateSpatialButtonTexture('CLOSE [ESC]', '#334155');
        const bGeoClose = new THREE.PlaneGeometry(0.32, 0.09);
        const bMatClose = new THREE.MeshBasicMaterial({ map: bTexClose, transparent: true, depthTest: false, depthWrite: false });
        const bMeshClose = new THREE.Mesh(bGeoClose, bMatClose);
        bMeshClose.position.set(0, 0, 0);
        bMeshClose.renderOrder = 2700;
        bMeshClose.userData = { buttonAction: 'CLOSE_INSPECT', cardData: cData };
        btnGroup.add(bMeshClose);

        const hitGeoClose = new THREE.PlaneGeometry(0.36, 0.12);
        const hitMatClose = new THREE.MeshBasicMaterial({ visible: false, depthTest: false, depthWrite: false });
        const hitMeshClose = new THREE.Mesh(hitGeoClose, hitMatClose);
        hitMeshClose.position.set(0, 0, -0.01);
        hitMeshClose.renderOrder = 2700;
        hitMeshClose.userData = { buttonAction: 'CLOSE_INSPECT', cardData: cData };
        btnGroup.add(hitMeshClose);

        btnGroup.visible = inspectedCardIdRef.current === cData.id;
        cardMesh.add(btnGroup);
      }
    };

    currentHandCards.forEach((cData) => {
      const propObj = properties.find((p) => p.id === cData.actionPayload?.propertyId);
      const texture = getOrCreate3DCardTexture(cData, propObj);

      if (cardMeshesRef.current.has(cData.id)) {
        const existingMesh = cardMeshesRef.current.get(cData.id)!;
        const oldMat = existingMesh.material as THREE.MeshBasicMaterial;
        oldMat.map = texture;
        oldMat.depthTest = false;
        oldMat.depthWrite = false;
        oldMat.needsUpdate = true;
        existingMesh.renderOrder = 2000;
        existingMesh.userData.cardData = cData;
        buildOrUpdateCardButtons(existingMesh, cData);
      } else {
        const mat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        });
        const cardMesh = new THREE.Mesh(cGeo, mat);
        cardMesh.renderOrder = 2000;
        cardMesh.userData = { cardId: cData.id, cardData: cData };
        cameraHandGroupRef.current?.add(cardMesh);
        cardMeshesRef.current.set(cData.id, cardMesh);
        buildOrUpdateCardButtons(cardMesh, cData);
      }
    });
  }, [currentHandCards, properties, inspectedCardId]);

  // Dynamically update ownership indicator tab tint and physical 3D buildings on property tile meshes
  useEffect(() => {
    tileMeshesMapRef.current.forEach((tileMesh, spaceIdx) => {
      const space = boardSpacesRef.current[spaceIdx];
      if (space && space.propertyId) {
        const prop = properties.find((p) => p.id === space.propertyId);
        tileMesh.children.forEach((child) => {
          if (child.userData && child.userData.isOwnershipTab) {
            if (prop && prop.ownerId !== null) {
              child.visible = true;
              const ownerPlayer = players.find((pl) => pl.id === prop.ownerId);
              if (ownerPlayer && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
                ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(ownerPlayer.color);
              }
            } else {
              child.visible = false;
            }
          }
        });

        // Dynamically update physical 3D houses & hotel
        updateTilePhysicalBuildings(tileMesh, prop);
      }
    });
  }, [properties, players]);

  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0];

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* -------------------------------------------------------------
          DEBT CRISIS & BANKRUPTCY MODAL OVERLAY (FOR HUMAN PLAYERS)
      ------------------------------------------------------------- */}
      {activePlayer &&
        activePlayer.cash <= 0 &&
        !activePlayer.isBankrupt &&
        !activePlayer.isAi &&
        gamePhase === 'IN_GAME' && (
          <DebtCrisisModal
            player={activePlayer}
            properties={properties}
            onMortgageProperty={onMortgageProperty}
            onUnmortgageProperty={onUnmortgageProperty}
            onDeclareBankruptcy={(pid) => onDeclareBankruptcy && onDeclareBankruptcy(pid)}
          />
        )}

      {/* -------------------------------------------------------------
          DYNAMIC SCREEN BORDER VIGNETTE PULSE FOR GAIN/LOSS FX
      ------------------------------------------------------------- */}
      <div
        ref={vignetteDivRef}
        className="pointer-events-none fixed inset-0 z-30 opacity-0"
        style={{
          boxShadow: 'inset 0 0 90px 35px rgba(239, 68, 68, 0.70)',
        }}
      />

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* -------------------------------------------------------------
          TOP HUD HEADER: FLOATING MODULES & CENTERED PLAYER PROFILES
      ------------------------------------------------------------- */}
      {/* Top Left Floating Modules: Monopoly Spree Timer & Tax Day Tracker */}
      {/* Top Left Floating Modules: Monopoly Spree Spacer & Tax Day Tracker */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto flex items-center gap-2 select-none">
        {/* Placeholder spacer for decoupled SpreeTimerHUD so sibling buttons maintain alignment */}
        {rules?.greatMonopolySpree && (
          <div className="w-[146px] h-11 shrink-0 pointer-events-none" />
        )}

        {/* Tax Day Module - Standalone, completely decoupled from player cards to eliminate scrollbar */}
        {rules?.taxDayPortfolioTax && (
          <button
            id="hud-tax-day-tracker"
            onClick={onOpenTaxBreakdown}
            className="group h-11 px-3 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-amber-500/50 hover:border-amber-400 shadow-xl backdrop-blur-xl transition flex items-center gap-2 shrink-0 cursor-pointer text-left"
            title="Click to view full municipal tax assessment breakdown"
          >
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                  Tax Day
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Lap {bankerLapCounter}/5
                </span>
              </div>
              <div className="text-xs font-black text-amber-300 mt-0.5 leading-none flex items-center gap-1">
                <span>View Tax</span>
                <span className="text-[8px] font-normal text-slate-400 group-hover:text-amber-200 ml-0.5">
                  &gt;
                </span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Land on GO Active Top Instruction Banner */}
      {isLandOnGoActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-200 w-full max-w-xl px-4">
          <div className="bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-white text-center w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                <Crown className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Land on GO Privilege Active
                </span>
                <p className="text-xs text-slate-200 mt-0.5">
                  Click <strong className="text-amber-300">any property</strong> on the 3D board to warp there, or click <strong className="text-emerald-400">GO</strong> for double cash!
                </p>
              </div>
            </div>
            <button
              id="btn-hud-double-cash"
              onClick={onTakeDoubleCash}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Double Cash &amp; Stay ($400)</span>
            </button>
          </div>
        </div>
      )}

      {/* Centered Player Info Boxes Group at Top of Screen (Clean, no scrollbar between items) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-start justify-center gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1 pointer-events-auto max-w-[calc(100vw-460px)] z-10">
        {players.map((p) => {
          const isCurrentTurn = p.id === activePlayerId;
          const ownedProps = properties.filter((prop) => prop.ownerId === p.id);

          return (
            <div
              key={p.id}
              className="flex flex-col gap-1.5 w-[180px] shrink-0 transition-all duration-300"
            >
              {/* Player Profile Card Box */}
              <div
                className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl border backdrop-blur-xl transition-all shadow-xl ${
                  p.isBankrupt
                    ? 'bg-rose-950/40 border-rose-800/50 opacity-60'
                    : isCurrentTurn
                    ? 'bg-slate-900/85 border-amber-400/90 shadow-amber-500/25 ring-2 ring-amber-400/50'
                    : 'bg-slate-950/50 border-slate-700/50 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-inner flex-shrink-0 relative border"
                    style={{
                      backgroundColor: p.avatarColor || p.color,
                      borderColor: p.color,
                    }}
                  >
                    <span className="text-xs drop-shadow">{p.name.slice(0, 1)}</span>
                    <span
                      className="absolute -bottom-1 -right-1 text-[7px] px-0.5 py-0 rounded font-extrabold uppercase bg-slate-950 text-slate-200 border border-slate-700 shadow"
                      title={`3D Avatar Shape: ${p.avatarShape || '3D'}`}
                    >
                      {p.avatarShape ? p.avatarShape.slice(0, 3) : '3D'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-100 truncate">{p.name}</span>
                      {p.isAi && (
                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded font-mono">
                          BOT
                        </span>
                      )}
                      {p.isBankrupt && (
                        <span className="text-[8px] bg-rose-600 text-white px-1 rounded font-black">
                          OUT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <div
                        className={`text-xs font-black flex items-center gap-0.5 ${
                          p.isBankrupt ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        <DollarSign className="w-3 h-3 stroke-[3]" />
                        {p.cash}
                      </div>
                      {p.id !== 0 && !p.isBankrupt && (
                        <button
                          id={`btn-trade-player-card-${p.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            soundFx.playCardDraw();
                            callbacksRef.current.onInitiateTrade(p.id);
                          }}
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                          title={`Exchange Center deal with ${p.name}`}
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          <span>TRADE</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Property Ownership: Original Colored Squares with Hover Card Preview */}
                {ownedProps.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1 pt-1.5 border-t border-slate-800/80">
                    {ownedProps.map((prop) => {
                      const colorHex = COLOR_HEX_STR[prop.colorGroup] || '#475569';
                      return (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => {
                            if (p.id === activePlayer.id) {
                              const targetCardId = `prop_${prop.id}`;
                              inspectedCardIdRef.current = targetCardId;
                              setInspectedCardId(targetCardId);
                              soundFx.playCardDraw();
                            }
                          }}
                          style={{ backgroundColor: colorHex }}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] border border-black/50 shadow-sm cursor-pointer hover:scale-125 hover:z-20 transition-transform relative ${
                            prop.isMortgaged ? 'opacity-40 ring-1 ring-amber-500' : ''
                          }`}
                          title={`${prop.name} ($${prop.basePrice})`}
                        >
                          {prop.hotel ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white leading-none">
                              ★
                            </span>
                          ) : prop.houses && prop.houses > 0 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white leading-none">
                              {prop.houses}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TURN COUNT BADGE & TURN TIMER (MATCHING CARD WIDTH & PERFECTLY ALIGNED) */}
              {isCurrentTurn && (
                <div className="flex flex-col gap-1.5 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Turn Count Badge */}
                  <div className="w-full bg-slate-900/90 border border-amber-400/80 text-amber-300 font-black text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-xl shadow-md flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>TURN COUNT</span>
                    </span>
                    <span className="font-mono text-xs font-black text-amber-300">
                      #{turnCount || 1}
                    </span>
                  </div>

                  {/* Smooth Turn Timer Countdown Box */}
                  <TurnTimer
                    key={`${activePlayer.id}_${turnPhase}_${isBoardAnimatingState}`}
                    activePlayer={activePlayer}
                    turnPhase={turnPhase}
                    gamePhase={gamePhase}
                    isAnimating={isBoardAnimatingState}
                    onEndTurn={onEndTurn}
                    onRoll={onRollDice}
                    maxSeconds={30}
                    disabled={isTimerDisabled}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-Right Control Stack: Barney's Menu (Crown), Camera Mode (Camera), Bot Speed (FastForward), Game Log (Scroll) */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-auto z-30">
        {/* Barney's DLC & Settings Menu (Crown Icon) */}
        <button
          id="btn-barneys-menu"
          onClick={() => {
            soundFx.playCardDraw();
            onOpenMenu && onOpenMenu();
          }}
          className="group relative h-11 w-11 hover:w-56 rounded-xl bg-slate-900/90 hover:bg-slate-800/95 border border-amber-500/50 hover:border-amber-400 text-amber-300 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out flex items-center justify-end px-3 overflow-hidden active:scale-95 cursor-pointer"
          title="Open Barney's DLC Expansions & Settings"
        >
          <div className="flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2.5 overflow-hidden">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
              Barney&apos;s &amp; Settings
            </span>
          </div>
          <Crown className="w-5 h-5 text-amber-400 shrink-0 drop-shadow" />
        </button>

        {/* Camera Mode (Camera Icon - Cinematic / Top-Down Overhead / Free Orbit) */}
        <button
          id="btn-cam-toggle"
          onClick={() => {
            setBoardCameraMode((prev) => {
              if (prev === 'CINEMATIC') return 'OVERHEAD';
              if (prev === 'OVERHEAD') return 'FREE';
              return 'CINEMATIC';
            });
            isUserInteractingRef.current = false;
          }}
          className={`group relative h-11 w-11 hover:w-60 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 ease-out flex items-center justify-end px-3 overflow-hidden active:scale-95 cursor-pointer ${
            boardCameraMode === 'CINEMATIC'
              ? 'bg-amber-500/90 hover:bg-amber-400 border-amber-300 text-slate-950 shadow-amber-500/30'
              : boardCameraMode === 'OVERHEAD'
              ? 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700/70 hover:border-sky-400 text-sky-400'
          }`}
          title="Cycle Camera Mode: Cinematic, Top-Down Overhead, Free Orbit"
        >
          <div className="flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2.5 overflow-hidden">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                boardCameraMode === 'CINEMATIC'
                  ? 'text-slate-950'
                  : 'text-white'
              }`}
            >
              Camera: {boardCameraMode === 'CINEMATIC' ? 'Cinematic' : boardCameraMode === 'OVERHEAD' ? 'Top-Down (Full Board)' : 'Free Orbit'}
            </span>
          </div>
          <Camera
            className={`w-5 h-5 shrink-0 drop-shadow ${
              boardCameraMode === 'CINEMATIC' ? 'text-slate-950' : boardCameraMode === 'OVERHEAD' ? 'text-white' : 'text-sky-400'
            }`}
          />
        </button>

        {/* Bot Speed (FastForward Icon) */}
        <button
          id="btn-bot-speed"
          onClick={onToggleBotSpeed}
          className={`group relative h-11 w-11 hover:w-56 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 ease-out flex items-center justify-end px-3 overflow-hidden active:scale-95 cursor-pointer ${
            botSpeed === 3
              ? 'bg-amber-500/90 hover:bg-amber-400 border-amber-300 text-slate-950 shadow-amber-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700/70 hover:border-emerald-400 text-emerald-400'
          }`}
          title="Toggle Fast Forward Bot Speed"
        >
          <div className="flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2.5 overflow-hidden">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                botSpeed === 3 ? 'text-slate-950' : 'text-slate-200'
              }`}
            >
              Bot Speed: {botSpeed}X
            </span>
          </div>
          <FastForward
            className={`w-5 h-5 shrink-0 drop-shadow ${
              botSpeed === 3 ? 'text-slate-950' : 'text-emerald-400'
            }`}
          />
        </button>

        {/* Quick Quality / Battery Saver Toggle */}
        <button
          id="btn-quality-quick-toggle"
          onClick={() => {
            if (!onUpdateSettings) return;
            const current = settings || DEFAULT_SETTINGS;
            const isCurrentlySaver = current.graphicPreset === 'BATTERY_SAVER' || current.isBatterySaver;
            const nextPreset = isCurrentlySaver ? 'HIGH' : 'BATTERY_SAVER';
            const updated: GameSettingsOptions = {
              ...current,
              graphicPreset: nextPreset as any,
              isBatterySaver: !isCurrentlySaver,
              shadowQuality: !isCurrentlySaver ? 'OFF' : 'HIGH',
              bloomEnabled: Boolean(isCurrentlySaver),
              ambientAnimations: Boolean(isCurrentlySaver),
              targetFps: !isCurrentlySaver ? '30' : '60',
            };
            soundFx.playCardDraw();
            onUpdateSettings(updated);
          }}
          className={`group relative h-11 w-11 hover:w-60 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 ease-out flex items-center justify-end px-3 overflow-hidden active:scale-95 cursor-pointer ${
            settings?.graphicPreset === 'BATTERY_SAVER' || settings?.isBatterySaver
              ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/70 text-emerald-400 shadow-emerald-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700/70 hover:border-amber-400 text-amber-400'
          }`}
          title={
            settings?.graphicPreset === 'BATTERY_SAVER' || settings?.isBatterySaver
              ? 'Battery Saver Active (30 FPS, Shadows Off) - Click for High Quality'
              : 'High Quality Active - Click for Battery Saver (30 FPS)'
          }
        >
          <div className="flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2.5 overflow-hidden">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                settings?.graphicPreset === 'BATTERY_SAVER' || settings?.isBatterySaver
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              Mode: {settings?.graphicPreset === 'BATTERY_SAVER' || settings?.isBatterySaver ? 'Battery Saver (30 FPS)' : 'High Quality'}
            </span>
          </div>
          {settings?.graphicPreset === 'BATTERY_SAVER' || settings?.isBatterySaver ? (
            <BatteryCharging className="w-5 h-5 shrink-0 text-emerald-400 drop-shadow animate-pulse" />
          ) : (
            <Zap className="w-5 h-5 shrink-0 text-amber-400 drop-shadow" />
          )}
        </button>

        {/* Live Game Log Dropdown Toggle (Scroll Icon) */}
        <button
          id="btn-toggle-event-log"
          onClick={() => setIsLogDropdownOpen((prev) => !prev)}
          className={`group relative h-11 w-11 hover:w-56 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 ease-out flex items-center justify-end px-3 overflow-hidden active:scale-95 cursor-pointer ${
            isLogDropdownOpen
              ? 'bg-sky-600/90 hover:bg-sky-500 border-sky-400 text-white shadow-sky-500/30'
              : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700/70 hover:border-sky-400 text-sky-400'
          }`}
          title="Toggle Live Game Event Log"
        >
          <div className="flex items-center gap-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-2.5 overflow-hidden">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
              Game Log ({logs.length})
            </span>
          </div>
          <Scroll className="w-5 h-5 shrink-0 text-sky-400 drop-shadow" />
        </button>

        {/* TOP-RIGHT LIVE EVENT LOG DROPDOWN MENU (SHOWN ONLY WHEN PRESSED) */}
        {isLogDropdownOpen && (
          <div className="w-80 max-h-60 bg-slate-950/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 mt-0.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/50">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-sky-400" />
                LIVE GAME EVENT LOG
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{logs.length} EVENTS</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs max-h-44">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-xl border text-[11px] leading-relaxed font-medium ${
                    log.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : log.type === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                      : log.type === 'danger'
                      ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                      : log.type === 'rule'
                      ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] opacity-60 mb-0.5">
                    <span suppressHydrationWarning>{log.timestamp}</span>
                  </div>
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          DRAFT PHASE 3D INTERACTION HUD HINTS & ANNOUNCEMENT BANNER
      ------------------------------------------------------------- */}
      {gamePhase === 'DRAFT' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center gap-2 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
          {draftAnnouncement.visible ? (
            <div
              className="px-6 py-3.5 rounded-2xl bg-slate-950/90 border-2 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
              style={{ borderColor: draftAnnouncement.color }}
            >
              <span
                className="font-black text-sm uppercase tracking-wider drop-shadow"
                style={{ color: draftAnnouncement.color }}
              >
                {draftAnnouncement.text}
              </span>
              <span className="text-xs font-semibold text-slate-300 mt-0.5">
                {draftAnnouncement.subText}
              </span>
            </div>
          ) : (
            <div className="px-6 py-3 rounded-2xl bg-slate-950/85 border border-amber-400/70 backdrop-blur-xl shadow-xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-black text-xs uppercase tracking-wider text-amber-300">
                  CHOOSE A MYSTERY PROPERTY DEED
                </span>
                <span className="text-[11px] font-medium text-slate-300">
                  Click any face-down card in the center of the board to draft it
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          CENTERED END TURN BUTTON & DOUBLES INDICATOR (AT BOTTOM OF SCREEN)
      ------------------------------------------------------------- */}
      {(() => {
        const localPlayer = players.find((p) => p.id === 0);
        const isLocalTurn = gamePhase === 'IN_GAME' && activePlayerId === 0;

        if (isLocalTurn && turnPhase === 'PRE_ROLL') {
          return (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-auto z-30 flex flex-col items-center gap-2 select-none animate-in fade-in zoom-in-95 duration-200">
              {(localPlayer?.consecutiveDoubles || 0) > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/90 border border-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl animate-bounce">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>DOUBLES ROLLED! ROLL AGAIN ({localPlayer?.consecutiveDoubles}/3)</span>
                </div>
              )}
            </div>
          );
        }

        const isDoneWithAllTasks =
          isLocalTurn &&
          turnPhase !== 'PRE_ROLL' &&
          turnPhase !== 'RESOLVING_SPACE' &&
          !isBoardAnimatingState &&
          !activeChanceCard &&
          !activeCommunityChestCard;

        if (!isDoneWithAllTasks) return null;

        return (
          <div className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto z-30 flex flex-col items-center select-none animate-in fade-in zoom-in-95 duration-200">
            <div className="relative group p-[2.5px] rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all duration-200 shadow-[0_0_35px_rgba(139,92,246,0.45)] hover:shadow-[0_0_50px_rgba(236,72,153,0.7)]">
              {/* Outer Wildcard Bloom Glow (Spinning Circle) */}
              <div
                className="w-[420px] h-[420px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-75 blur-xl group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, #EC4899, #8B5CF6, #3B82F6, #10B981, #F59E0B, #EF4444, #EC4899)',
                  animation: 'spin 3.5s linear infinite',
                }}
              />

              {/* Spinning Conic Rainbow Border (Seamless Circle) */}
              <div
                className="w-[400px] h-[400px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, #EC4899, #8B5CF6, #3B82F6, #10B981, #F59E0B, #EF4444, #EC4899)',
                  animation: 'spin 3.5s linear infinite',
                }}
              />

              {/* Inner Button Chassis */}
              <button
                id="btn-end-turn-centered"
                onClick={() => {
                  soundFx.playCardDraw();
                  onEndTurn();
                }}
                className="relative z-10 flex items-center gap-3 px-8 py-3.5 rounded-[13.5px] bg-slate-950/92 hover:bg-slate-900/95 backdrop-blur-xl text-white font-black text-sm uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-45 transition-transform duration-300" />
                <span className="tracking-widest font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  END TURN
                </span>
                <span className="text-[10px] bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-pink-200 border border-pink-400/40 font-black px-2 py-0.5 rounded-md tracking-widest shadow-sm">
                  PASS
                </span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          WILDCARD TARGET SELECTION OVERLAY (PROPERTY OR PLAYER)
      ------------------------------------------------------------- */}
      {targetSelection && (
        <div className="absolute inset-x-0 top-6 z-50 flex flex-col items-center pointer-events-none px-4 select-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-2xl border-2 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)] rounded-2xl p-4 max-w-xl w-full flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide uppercase">
                    {targetSelection.cardName}
                  </h3>
                  <p className="text-xs text-red-300 font-medium">
                    {targetSelection.targetType === 'PROPERTY'
                      ? 'Select a target property on the board'
                      : 'Choose a target player'}
                  </p>
                </div>
              </div>
              <button
                id="btn-cancel-target-selection"
                onClick={() => {
                  soundFx.playCardDraw();
                  onCancelTargeting?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {targetSelection.description}
            </p>

            {targetSelection.targetType === 'PROPERTY' ? (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5 animate-pulse">
                  <span>●</span> Click any red-outlined property on the 3D board to target it
                </div>
                {targetSelection.eligiblePropertyIds && targetSelection.eligiblePropertyIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                    {targetSelection.eligiblePropertyIds.map((propId) => {
                      const prop = properties.find((p) => p.id === propId);
                      if (!prop) return null;
                      const owner = players.find((p) => p.id === prop.ownerId);
                      return (
                        <button
                          key={prop.id}
                          onClick={() => {
                            soundFx.playCardDraw();
                            onSelectTargetProperty?.(prop.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-500/70 text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLOR_HEX_STR[prop.colorGroup] || '#475569' }}
                          />
                          <span className="truncate max-w-[130px]">{prop.name}</span>
                          {prop.houses > 0 && (
                            <span className="text-[10px] text-amber-400 font-bold">
                              {prop.houses}⌂
                            </span>
                          )}
                          {owner && (
                            <span className="text-[10px] text-slate-400">
                              ({owner.name})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {(targetSelection.eligiblePlayerIds || []).map((pid) => {
                  const p = players.find((pl) => pl.id === pid);
                  if (!p) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        soundFx.playCardDraw();
                        onSelectTargetPlayer?.(p.id);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-red-500 text-left transition-all cursor-pointer group"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-red-400 truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>${p.cash}</span>
                          <span>•</span>
                          <span>{properties.filter((pr) => pr.ownerId === p.id).length} props</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Board3D;
