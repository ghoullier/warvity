import { GravityBoost } from "../entities/GravityBoost";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

let activeBoost: GravityBoost | null = null;

registerWeapon({
  id: "gravity-boost",
  label: "🪐  Gravity Boost",
  trajectoryType: "none",

  fire(ctx: WeaponContext): boolean {
    if (activeBoost?.isActive()) return false;

    ctx.stopTimer();

    const boost = new GravityBoost(
      ctx.scene,
      (m) => {
        ctx.setGravityMultiplier(m);
      },
      () => {
        activeBoost = null;
        ctx.nextTurn();
      },
    );

    activeBoost = boost;
    boost.activate();

    return true;
  },

  onReset(): void {
    activeBoost?.cancel();
    activeBoost = null;
  },
});
