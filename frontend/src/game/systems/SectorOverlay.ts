/**
 * SectorOverlay — Phaser visual system for the sector-based case map.
 *
 * Responsibilities:
 *  - Draws a pulsing landmark glow marker at each sector anchor tile.
 *  - When a case is activated, brightens the relevant glow and dims the rest.
 *  - Draws a colored sector highlight rectangle around the active sector bounds.
 *
 * Lifecycle:
 *  - Instantiated in WorldScene.create() after the tilemap layer is ready.
 *  - destroy() must be called in WorldScene.cleanupScene().
 */

import type * as Phaser from "phaser";
import { PRIMARY_CYBER_CITY_SECTOR_SEEDS } from "@/data/cyberCitySectors";
import type { SectorId } from "@/types/investigation";
import { SECTOR_COLORS_HEX } from "@/types/sectors";
import { TILE_SIZE } from "../config";

interface GlowMarker {
  sectorId: SectorId;
  rect: Phaser.GameObjects.Rectangle;
  pulseTween: Phaser.Tweens.Tween;
}

interface SectorHighlight {
  rect: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
}

const HOVER_DEPTH = 3;

const GLOW_DEPTH = 2; // just above ground, below NPCs (depth 10)
const HIGHLIGHT_DEPTH = 3;

const STATUS_HIGHLIGHT_HEX = {
  healthy: 0x22d3ee,
  suspicious: 0xf59e0b,
  compromised: 0xff4d4f,
  isolated: 0x14b8a6,
};

export class SectorOverlay {
  private scene: Phaser.Scene;
  private markers: Map<SectorId, GlowMarker> = new Map();
  private activeSectorHighlight: SectorHighlight | null = null;
  private hoverHighlight: SectorHighlight | null = null;
  private activeSectorId: SectorId | null = null;
  private activeTone: keyof typeof STATUS_HIGHLIGHT_HEX | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildMarkers();
  }

  // ── Build static landmark glow indicators ──────────────────────────────────

  private buildMarkers() {
    for (const seed of PRIMARY_CYBER_CITY_SECTOR_SEEDS) {
      const sectorId = seed.id as SectorId;
      const color = SECTOR_COLORS_HEX[sectorId] ?? 0x00d4ff;

      const worldX = seed.anchor.tileX * TILE_SIZE + TILE_SIZE / 2;
      const worldY = seed.anchor.tileY * TILE_SIZE + TILE_SIZE / 2;

      // Glow rect: 3×3 tiles centered on the landmark
      const rect = this.scene.add.rectangle(
        worldX,
        worldY,
        TILE_SIZE * 3,
        TILE_SIZE * 3,
        color,
        0.08,
      );
      rect.setDepth(GLOW_DEPTH);
      rect.setStrokeStyle(1, color, 0.35);

      // Pulsing alpha tween
      const pulseTween = this.scene.tweens.add({
        targets: rect,
        alpha: { from: 0.04, to: 0.18 },
        duration: 1800 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.markers.set(sectorId, { sectorId, rect, pulseTween });
    }
  }

  // ── Case activation ────────────────────────────────────────────────────────

  activateCase(
    sectorId: SectorId,
    tone: keyof typeof STATUS_HIGHLIGHT_HEX = "healthy",
  ) {
    if (this.activeSectorId === sectorId && this.activeTone === tone) return;
    this.activeSectorId = sectorId;
    this.activeTone = tone;

    // Dim all markers, brighten the active one
    for (const [id, marker] of this.markers) {
      marker.pulseTween.stop();
      if (id === sectorId) {
        const activeColor = STATUS_HIGHLIGHT_HEX[tone] ?? (SECTOR_COLORS_HEX[sectorId] ?? 0x00d4ff);
        marker.rect.setFillStyle(activeColor, 0.2);
        marker.rect.setStrokeStyle(
          2,
          activeColor,
          0.8,
        );
        // Fast pulse for active sector
        marker.pulseTween = this.scene.tweens.add({
          targets: marker.rect,
          alpha: { from: 0.2, to: 0.42 },
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        marker.rect.setAlpha(0.03);
        marker.rect.setStrokeStyle(0);
      }
    }

    // Draw sector bounds highlight
    this.clearHighlight();
    const seed = PRIMARY_CYBER_CITY_SECTOR_SEEDS.find((s) => s.id === sectorId);
    if (seed) {
      const color = STATUS_HIGHLIGHT_HEX[tone] ?? (SECTOR_COLORS_HEX[sectorId] ?? 0x00d4ff);
      const x = seed.bounds.x * TILE_SIZE;
      const y = seed.bounds.y * TILE_SIZE;
      const w = seed.bounds.width * TILE_SIZE;
      const h = seed.bounds.height * TILE_SIZE;

      const highlight = this.scene.add.rectangle(
        x + w / 2,
        y + h / 2,
        w,
        h,
        color,
        0.06,
      );
      highlight.setDepth(HIGHLIGHT_DEPTH);

      const border = this.scene.add.rectangle(
        x + w / 2,
        y + h / 2,
        w,
        h,
        color,
        0,
      );
      border.setDepth(HIGHLIGHT_DEPTH);
      border.setStrokeStyle(1.5, color, 0.5);

      this.activeSectorHighlight = { rect: highlight, border };

      // Fade in
      this.scene.tweens.add({
        targets: [highlight, border],
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: "Quad.easeOut",
      });
    }
  }

  deactivateCase() {
    this.activeSectorId = null;
    this.activeTone = null;
    this.clearHighlight();

    // Restore all markers to normal pulse
    for (const marker of this.markers.values()) {
      marker.pulseTween.stop();
      const color = SECTOR_COLORS_HEX[marker.sectorId] ?? 0x00d4ff;
      marker.rect.setFillStyle(color, 0.08);
      marker.rect.setStrokeStyle(1, color, 0.35);
      marker.rect.setAlpha(1);
      marker.pulseTween = this.scene.tweens.add({
        targets: marker.rect,
        alpha: { from: 0.04, to: 0.18 },
        duration: 1800 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ── Hover highlight ───────────────────────────────────────────────────────

  hoverSector(sectorId: SectorId) {
    // Don't override the active case highlight
    if (this.activeSectorId === sectorId) return;
    this.clearHoverHighlight();

    const seed = PRIMARY_CYBER_CITY_SECTOR_SEEDS.find((s) => s.id === sectorId);
    if (!seed) return;

    const color = SECTOR_COLORS_HEX[sectorId] ?? 0x00d4ff;
    const x = seed.bounds.x * TILE_SIZE;
    const y = seed.bounds.y * TILE_SIZE;
    const w = seed.bounds.width * TILE_SIZE;
    const h = seed.bounds.height * TILE_SIZE;

    // Start both at alpha 0, fade in together
    const rect = this.scene.add.rectangle(
      x + w / 2,
      y + h / 2,
      w,
      h,
      color,
      0.07,
    );
    rect.setAlpha(0);
    rect.setDepth(HOVER_DEPTH);

    const border = this.scene.add.rectangle(
      x + w / 2,
      y + h / 2,
      w,
      h,
      color,
      0,
    );
    border.setAlpha(0);
    border.setDepth(HOVER_DEPTH);
    border.setStrokeStyle(1.5, color, 0.6);

    this.hoverHighlight = { rect, border };

    this.scene.tweens.add({
      targets: [rect, border],
      alpha: { from: 0, to: 1 },
      duration: 160,
      ease: "Quad.easeOut",
    });
  }

  unhoverSector() {
    this.clearHoverHighlight();
  }

  private clearHoverHighlight() {
    if (this.hoverHighlight) {
      this.hoverHighlight.rect.destroy();
      this.hoverHighlight.border.destroy();
      this.hoverHighlight = null;
    }
  }

  private clearHighlight() {
    if (this.activeSectorHighlight) {
      this.activeSectorHighlight.rect.destroy();
      this.activeSectorHighlight.border.destroy();
      this.activeSectorHighlight = null;
    }
  }

  destroy() {
    this.clearHoverHighlight();
    this.clearHighlight();
    for (const marker of this.markers.values()) {
      marker.pulseTween.stop();
      marker.rect.destroy();
    }
    this.markers.clear();
  }
}
