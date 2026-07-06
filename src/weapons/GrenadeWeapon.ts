import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { Grenade } from "../entities/Grenade";
import { GameEvents } from "../systems/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const grenades: Grenade[] = [];

registerWeapon({
  id: "grenade",
  label: "💣  Grenade",
  trajectoryType: "ballistic",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * WEAPON_CONFIG.grenade.speed;

    grenades.push(
      new Grenade(
        scene,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ),
    );

    scene.events.once(
      GameEvents.GRENADE_EXPLODED,
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        applyExplosion(
          ctx,
          x,
          y,
          WEAPON_CONFIG.grenade.radius,
          WEAPON_CONFIG.grenade.damage,
        );
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        ctx.nextTurn();
      },
    );

    return true;
  },

  update(_ctx: WeaponContext): void {
    for (const g of grenades) g.update();
    grenades.splice(
      0,
      grenades.length,
      ...grenades.filter((g) => g.isActive()),
    );
  },

  onReset(): void {
    grenades.length = 0;
  },
});
