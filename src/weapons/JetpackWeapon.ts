import { GRAVITY_STRENGTH, PLANET_CENTER } from "../config";
import { Jetpack } from "../entities/Jetpack";
import { applyRadialGravity } from "../systems/GravitySystem";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

let activeJetpack: Jetpack | null = null;

registerWeapon({
  id: "jetpack",
  label: "🚀  Jetpack",

  fire(ctx: WeaponContext): boolean {
    if (activeJetpack?.isActive()) return false;

    ctx.stopTimer();
    ctx.deactivateAiming();

    const jetpack = new Jetpack(ctx.scene, ctx.worm, ctx.audioManager);
    activeJetpack = jetpack;
    jetpack.activate();

    ctx.scene.events.once("jetpack-end", () => {
      activeJetpack = null;
      ctx.nextTurn();
    });

    return true;
  },

  update(ctx: WeaponContext): void {
    if (!activeJetpack?.isActive()) return;
    // Cancel 80% of gravity so net radial acceleration is ~0.2× normal
    applyRadialGravity(
      [ctx.worm.body],
      PLANET_CENTER,
      GRAVITY_STRENGTH,
      ctx.gravityMultiplier * -0.8,
    );
    const cursors = ctx.scene.input.keyboard?.createCursorKeys();
    activeJetpack.update(cursors);
  },

  onReset(): void {
    activeJetpack?.deactivate();
    activeJetpack = null;
  },
});
