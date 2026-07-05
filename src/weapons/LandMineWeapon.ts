import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { LandMine } from "../entities/LandMine";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const mines: LandMine[] = [];

registerWeapon({
  id: "mine",
  label: "💣  Mine",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;

    mines.push(new LandMine(scene, cx, cy));
    audioManager.playMinePlaced();

    // Turn ends immediately after placing the mine
    ctx.nextTurn();
    return false;
  },

  update(ctx: WeaponContext): void {
    for (const mine of mines) mine.update(ctx.allWorms);
    mines.splice(0, mines.length, ...mines.filter((m) => m.isActive()));
  },

  /**
   * Persistent listener for mine detonations. Mines can explode on any turn so
   * the handler must remain active for the lifetime of the scene.
   */
  onSceneCreate(scene, buildCtx): void {
    scene.events.on("mine-beep", () => {
      buildCtx().audioManager.playMineBeep();
    });

    scene.events.on("mine-exploded", ({ x, y }: { x: number; y: number }) => {
      const ctx = buildCtx();
      ctx.audioManager.playMineExplosion();
      applyExplosion(
        ctx,
        x,
        y,
        WEAPON_CONFIG.landMine.radius,
        WEAPON_CONFIG.landMine.damage,
      );
      ParticleSystem.explode(scene, x, y, PLANET_CENTER);
      ParticleSystem.debris(scene, x, y, PLANET_CENTER);
      ctx.nextTurn();
    });
  },

  onReset(): void {
    for (const mine of mines) mine.destroy();
    mines.length = 0;
  },
});
