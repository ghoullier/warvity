import { PLANET_CENTER } from "../config";
import { Grenade, MAX_GRENADE_SPEED } from "../entities/Grenade";
import { EVENTS } from "../events/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { FIRE_OFFSET } from "./constants";
import {
  applyBlastDamage,
  registerWeapon,
  type WeaponContext,
} from "./WeaponRegistry";

const GRENADE_EXPLOSION_RADIUS = 50;
const MAX_GRENADE_DAMAGE = 40;

const grenades: Grenade[] = [];

registerWeapon({
  id: "grenade",
  label: "💣  Grenade",
  trajectorySpeed: MAX_GRENADE_SPEED,

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, terrain, allWorms, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * MAX_GRENADE_SPEED;

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
      EVENTS.GRENADE_EXPLODED,
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        terrain.explode(x, y, GRENADE_EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        applyBlastDamage(
          allWorms,
          x,
          y,
          GRENADE_EXPLOSION_RADIUS,
          MAX_GRENADE_DAMAGE,
        );
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
