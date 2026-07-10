import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { Singularity } from "../entities/Singularity";
import { GameEvents } from "../systems/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const singularities: Singularity[] = [];
let pendingScene: Phaser.Scene | null = null;
let pendingListener: ((...args: unknown[]) => void) | null = null;

function clearPendingListener(): void {
  if (pendingScene && pendingListener) {
    pendingScene.events.off(GameEvents.SINGULARITY_EXPLODED, pendingListener);
  }
  pendingScene = null;
  pendingListener = null;
}

registerWeapon({
  id: "singularity",
  label: "🕳️  Singularity",
  trajectoryType: "ballistic",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * WEAPON_CONFIG.singularity.speed;

    singularities.push(
      new Singularity(
        scene,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
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
        WEAPON_CONFIG.singularity.radius,
        WEAPON_CONFIG.singularity.damage,
      );
      ParticleSystem.explode(scene, x, y, PLANET_CENTER);
      ParticleSystem.debris(scene, x, y, PLANET_CENTER);
      ctx.nextTurn();
    };
    pendingScene = scene;
    pendingListener = listener as (...args: unknown[]) => void;
    scene.events.once(GameEvents.SINGULARITY_EXPLODED, listener);

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
    clearPendingListener();
    for (const s of singularities) s.silentDestroy();
    singularities.length = 0;
  },
});
