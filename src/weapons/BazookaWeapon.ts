import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { Projectile } from "../entities/Projectile";
import { GameEvents } from "../systems/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const projectiles: Projectile[] = [];
let pendingScene: Phaser.Scene | null = null;
let pendingListener: ((...args: unknown[]) => void) | null = null;

function clearPendingListener(): void {
  if (pendingScene && pendingListener) {
    pendingScene.events.off(GameEvents.PROJECTILE_EXPLODED, pendingListener);
  }
  pendingScene = null;
  pendingListener = null;
}

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

    clearPendingListener();
    const listener = ({ x, y }: { x: number; y: number }) => {
      clearPendingListener();
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
    };
    pendingScene = scene;
    pendingListener = listener as (...args: unknown[]) => void;
    scene.events.once(GameEvents.PROJECTILE_EXPLODED, listener);

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
    clearPendingListener();
    for (const p of projectiles) p.silentDestroy();
    projectiles.length = 0;
  },
});
