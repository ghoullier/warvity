import { Flamethrower } from "../entities/Flamethrower";
import { EVENTS } from "../events/GameEvents";
import { FIRE_OFFSET } from "./constants";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

let activeFlamethrower: Flamethrower | null = null;

registerWeapon({
  id: "flamethrower",
  label: "🔥  Flamethrower",

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

    scene.events.once(EVENTS.FLAMETHROWER_DONE, () => {
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
