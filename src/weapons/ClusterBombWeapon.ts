import { PLANET_CENTER, WEAPON_CONFIG } from "../config";
import { ClusterBomb } from "../entities/ClusterBomb";
import * as ParticleSystem from "../systems/ParticleSystem";
import { applyExplosion } from "./explosionHelper";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const clusterBombs: ClusterBomb[] = [];

registerWeapon({
  id: "cluster-bomb",
  label: "🌟  Cluster Bomb",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * WEAPON_CONFIG.clusterBomb.speed;

    clusterBombs.push(
      new ClusterBomb(
        scene,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ),
    );

    scene.events.on("cluster-split", () => {
      audioManager.playClusterSplit();
    });

    const onSubExploded = ({ x, y }: { x: number; y: number }) => {
      audioManager.playSubExplosion();
      applyExplosion(
        ctx,
        x,
        y,
        WEAPON_CONFIG.clusterBomb.subRadius,
        WEAPON_CONFIG.clusterBomb.subDamage,
      );
      ParticleSystem.explode(scene, x, y, PLANET_CENTER);
    };

    scene.events.on("sub-munition-exploded", onSubExploded);

    scene.events.once("cluster-exploded", () => {
      scene.events.off("sub-munition-exploded", onSubExploded);
      scene.events.off("cluster-split");
      ctx.nextTurn();
    });

    return true;
  },

  update(_ctx: WeaponContext): void {
    for (const c of clusterBombs) c.update();
    clusterBombs.splice(
      0,
      clusterBombs.length,
      ...clusterBombs.filter((c) => c.isActive()),
    );
  },

  onReset(): void {
    clusterBombs.length = 0;
  },
});
