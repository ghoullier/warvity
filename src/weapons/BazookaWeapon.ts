import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { Projectile } from "../entities/Projectile";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const projectiles: Projectile[] = [];

registerWeapon({
  id: "bazooka",
  label: "🚀  Bazooka",
  trajectoryType: "ballistic",

  fire(ctx: WeaponContext): boolean {
    const {
      scene,
      worm,
      angle,
      power,
      terrain,
      audioManager,
      cameraController,
    } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * WEAPON_CONFIG.bazooka.speed;

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
        applyExplosion(
          ctx,
          x,
          y,
          WEAPON_CONFIG.bazooka.radius,
          WEAPON_CONFIG.bazooka.damage,
        );
        ParticleSystem.explode(scene, x, y, PLANET_CENTER);
        ParticleSystem.debris(scene, x, y, PLANET_CENTER);
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
