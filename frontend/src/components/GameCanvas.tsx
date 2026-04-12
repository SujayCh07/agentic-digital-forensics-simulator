"use client";

import { useEffect, useRef } from "react";
import { GAME_HEIGHT, GAME_WIDTH, SCALE_FACTOR } from "@/game/config";

/**
 * GameCanvas wraps the Phaser game instance.
 * Agent A builds the real scenes (BootScene, WorldScene) in a separate worktree.
 * This component uses a fallback placeholder scene until those are available.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    async function initGame() {
      const Phaser = await import("phaser");
      const { createGameConfig, setSelectedMap } = await import(
        "@/game/config"
      );

      // Read map param from URL and set before Phaser initializes
      const params = new URLSearchParams(window.location.search);
      const mapParam = params.get("map");
      if (mapParam === "moonCity") {
        setSelectedMap(mapParam);
      }

      // Try to load the real scenes from Agent A's build
      // turbopackOptional suppresses build errors when these files don't exist yet
      let scenes: Phaser.Types.Scenes.SceneType[];
      try {
        const { BootScene } = await import(
          /* turbopackOptional: true */ "@/game/scenes/BootScene"
        );
        const { WorldScene } = await import(
          /* turbopackOptional: true */ "@/game/scenes/WorldScene"
        );
        scenes = [BootScene, WorldScene];
      } catch {
        // Fallback placeholder scene for the active moon-city board.
        scenes = [
          class PlaceholderScene extends Phaser.Scene {
            constructor() {
              super({ key: "PlaceholderScene" });
            }
            create() {
              this.cameras.main.setBackgroundColor("#080c12");
              const g = this.add.graphics();
              g.lineStyle(1, 0x1e3d5a, 0.35);
              for (let x = 0; x <= GAME_WIDTH; x += 32) {
                g.moveTo(x, 0);
                g.lineTo(x, GAME_HEIGHT);
              }
              for (let y = 0; y <= GAME_HEIGHT; y += 32) {
                g.moveTo(0, y);
                g.lineTo(GAME_WIDTH, y);
              }
              g.strokePath();

              const title = this.add
                .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "EchoLocate", {
                  fontSize: "28px",
                  color: "#00d4ff",
                  fontFamily: "monospace",
                  fontStyle: "bold",
                })
                .setOrigin(0.5);

              title.setShadow(0, 0, "#00d4ff", 12, true, true);

              this.add
                .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 16, "Loading moon-city...", {
                  fontSize: "12px",
                  color: "#6f8aa3",
                  fontFamily: "monospace",
                })
                .setOrigin(0.5);

              const dot = this.add.circle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2 + 40,
                3,
                0x00d4ff,
              );
              this.tweens.add({
                targets: dot,
                alpha: 0.2,
                duration: 800,
                yoyo: true,
                repeat: -1,
              });
            }
          },
        ];
      }

      if (destroyed) return;

      const config = createGameConfig(containerRef.current!, scenes);
      gameRef.current = new Phaser.Game(config);
      (globalThis as Record<string, unknown>).__PHASER_GAME__ = gameRef.current;
    }

    initGame();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        (gameRef.current as { destroy: (b: boolean) => void }).destroy(true);
        gameRef.current = null;
        delete (globalThis as Record<string, unknown>).__PHASER_GAME__;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="game-canvas"
      className="overflow-hidden pixel-crisp box-border"
      style={{
        width: "100%",
        maxWidth: "none",
        aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        height: "auto",
        background: "#050911",
      }}
    />
  );
}
