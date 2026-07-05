import { PLANET_CENTER } from "../config";
import { Projectile } from "../entities/Projectile";
import { EVENTS } from "../events/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { DEFAULT_FIRE_SPEED, FIRE_OFFSET } from "./constants";
import {
  applyBlastDamage,
  registerWeapon,
  type WeaponContext,
} from "./WeaponRegistry";

const EXPLOSION_RADIUS = 60;
const MAX_EXPLOSION_DAMAGE = 50;

const projectiles: Projectile[] = [];

registerWeapon({
  id: "bazooka",
  label: "🚀  Bazooka",
  trajectorySpeed: DEFAULT_FIRE_SPEED,

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
    const speed = power * DEFAULT_FIRE_SPEED;

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
      EVENTS.PROJECTILE_EXPLODED,
      ({ x, y }: { x: number; y: number }) => {
        audioManager.playExplosion();
        terrain.explode(x, y, EXPLOSION_RADIUS);
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
        applyBlastDamage(
          allWorms,
          x,
          y,
          EXPLOSION_RADIUS,
          MAX_EXPLOSION_DAMAGE,
        );
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
