import { PLANET_CENTER } from "../config";
import { Projectile } from "../entities/Projectile";
import * as ParticleSystem from "../systems/ParticleSystem";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;
const MAX_FIRE_SPEED = 15;
const EXPLOSION_RADIUS = 60;
const MAX_EXPLOSION_DAMAGE = 50;

const projectiles: Projectile[] = [];

registerWeapon({
  id: "bazooka",
  label: "🚀  Bazooka",

  fire(ctx: WeaponContext): boolean {
    const {
      scene,
      worm,
      angle,
      power,
      terrain,
      allWorms,
      audioManager,
      cameraController,
    } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * MAX_FIRE_SPEED;

    projectiles.push(
      new Projectile(
        scene,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        terrain,
        cameraController,
      ),
    );

    scene.events.once(
      "projectile-exploded",
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        terrain.explode(x, y, EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        for (const w of allWorms) {
          if (!w.isAlive()) continue;
          const dx = w.body.position.x - x;
          const dy = w.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EXPLOSION_RADIUS) {
            w.takeDamage(MAX_EXPLOSION_DAMAGE * (1 - dist / EXPLOSION_RADIUS));
          }
        }
        ctx.nextTurn();
      },
    );

    return true;
  },

  update(_ctx: WeaponContext): void {
    for (const p of projectiles) p.update();
    projectiles.splice(
      0,
      projectiles.length,
      ...projectiles.filter((p) => p.isActive()),
    );
  },

  onReset(): void {
    projectiles.length = 0;
  },
});
