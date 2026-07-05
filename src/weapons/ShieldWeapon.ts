import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

/**
 * Shield weapon — fires on bare Space key press (no charge mechanic).
 * Activates the worm's shield, plays audio, and immediately ends the turn.
 */
registerWeapon({
  id: "shield",
  label: "🛡️  Shield",
  inputMode: "space",

  fire(ctx: WeaponContext): boolean {
    ctx.worm.activateShield();
    ctx.audioManager.playShieldActivate();
    ctx.nextTurn();
    return false;
  },
});
