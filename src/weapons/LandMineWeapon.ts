import { PLANET_CENTER } from "../config";
import { LandMine } from "../entities/LandMine";
import { EVENTS } from "../events/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import {
  applyBlastDamage,
  registerWeapon,
  type WeaponContext,
} from "./WeaponRegistry";

const MINE_EXPLOSION_RADIUS = 60;
const MINE_EXPLOSION_DAMAGE = 50;

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
    scene.events.on(EVENTS.MINE_BEEP, () => {
      buildCtx().audioManager.playMineBeep();
    });

    scene.events.on(
      EVENTS.MINE_EXPLODED,
      ({ x, y }: { x: number; y: number }) => {
        const ctx = buildCtx();
        ctx.audioManager.playMineExplosion();
        ctx.terrain.explode(x, y, MINE_EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        applyBlastDamage(
          ctx.allWorms,
          x,
          y,
          MINE_EXPLOSION_RADIUS,
          MINE_EXPLOSION_DAMAGE,
        );
        ctx.nextTurn();
      },
    );
  },

  onReset(): void {
    mines.length = 0;
  },
});
