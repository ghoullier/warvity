import { Flamethrower } from "../entities/Flamethrower";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

let activeFlamethrower: Flamethrower | null = null;

registerWeapon({
  id: "flamethrower",
  label: "🔥  Flamethrower",
  trajectoryType: "none",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, terrain, allWorms, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;

    activeFlamethrower = new Flamethrower(
      scene,
      cx + Math.cos(angle) * FIRE_OFFSET,
      cy + Math.sin(angle) * FIRE_OFFSET,
      angle,
      terrain,
      allWorms,
    );
    audioManager.playFlamethrower();

    scene.events.once("flamethrower-done", () => {
      activeFlamethrower = null;
      ctx.nextTurn();
    });

    return true;
  },

  update(ctx: WeaponContext): void {
    if (activeFlamethrower) {
      activeFlamethrower.update(ctx.delta);
    }
  },

  onReset(): void {
    activeFlamethrower = null;
  },
});
