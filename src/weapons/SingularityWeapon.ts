import { PLANET_CENTER } from "../config";
import { Singularity } from "../entities/Singularity";
import * as ParticleSystem from "../systems/ParticleSystem";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;
const MAX_FIRE_SPEED = 15;
const SINGULARITY_EXPLOSION_RADIUS = 80;
const MAX_SINGULARITY_DAMAGE = 60;

const singularities: Singularity[] = [];

registerWeapon({
  id: "singularity",
  label: "🕳️  Singularity",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, terrain, allWorms, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * MAX_FIRE_SPEED;

    singularities.push(
      new Singularity(
        scene,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ),
    );

    scene.events.once(
      "singularity-exploded",
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        terrain.explode(x, y, SINGULARITY_EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        for (const w of allWorms) {
          if (!w.isAlive()) continue;
          const dx = w.body.position.x - x;
          const dy = w.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SINGULARITY_EXPLOSION_RADIUS) {
            w.takeDamage(
              MAX_SINGULARITY_DAMAGE *
                (1 - dist / SINGULARITY_EXPLOSION_RADIUS),
            );
          }
        }
        ctx.nextTurn();
      },
    );

    return true;
  },

  update(_ctx: WeaponContext): void {
    for (const s of singularities) s.update();
    singularities.splice(
      0,
      singularities.length,
      ...singularities.filter((s) => s.isActive()),
    );
  },

  onReset(): void {
    singularities.length = 0;
  },
});
