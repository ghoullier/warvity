import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

/**
 * Teleporter weapon — fires on mouse click instead of the AimingSystem.
 * The Teleporter entity itself lives in GameScene (it's shared game
 * infrastructure). GameScene drives activate/deactivate/handleClick and
 * update() via the 'pointer' inputMode; this definition exists solely to
 * contribute the label and Q-cycle slot.
 */
registerWeapon({
  id: "teleporter",
  label: "🌀  Teleporter",
  inputMode: "pointer",

  fire(_ctx: WeaponContext): boolean {
    // GameScene routes pointer clicks to Teleporter.handleClick() directly.
    // Turn advances via the 'teleport-complete' scene event.
    return true;
  },
});
