import { PLANET_CENTER } from "../config";
import { Grenade, MAX_GRENADE_SPEED } from "../entities/Grenade";
import * as ParticleSystem from "../systems/ParticleSystem";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;
const GRENADE_EXPLOSION_RADIUS = 50;
const MAX_GRENADE_DAMAGE = 40;

const grenades: Grenade[] = [];

registerWeapon({
  id: "grenade",
  label: "💣  Grenade",

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
      "grenade-exploded",
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        terrain.explode(x, y, GRENADE_EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        for (const w of allWorms) {
          if (!w.isAlive()) continue;
          const dx = w.body.position.x - x;
          const dy = w.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < GRENADE_EXPLOSION_RADIUS) {
            w.takeDamage(
              MAX_GRENADE_DAMAGE * (1 - dist / GRENADE_EXPLOSION_RADIUS),
            );
          }
        }
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
