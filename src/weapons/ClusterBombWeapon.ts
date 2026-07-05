import { PLANET_CENTER } from "../config";
import {
  ClusterBomb,
  MAX_CLUSTER_SPEED,
  MAX_SUB_DAMAGE,
  SUB_EXPLOSION_RADIUS,
} from "../entities/ClusterBomb";
import * as ParticleSystem from "../systems/ParticleSystem";
import { registerWeapon, type WeaponContext } from "./WeaponRegistry";

const FIRE_OFFSET = 40;

const clusterBombs: ClusterBomb[] = [];

registerWeapon({
  id: "cluster-bomb",
  label: "🌟  Cluster Bomb",

  fire(ctx: WeaponContext): boolean {
    const { scene, worm, angle, power, terrain, allWorms, audioManager } = ctx;
    const cx = worm.body.position.x;
    const cy = worm.body.position.y;
    const speed = power * MAX_CLUSTER_SPEED;

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
      terrain.explode(x, y, SUB_EXPLOSION_RADIUS);
      ParticleSystem.explode(scene, x, y, PLANET_CENTER);
      for (const w of allWorms) {
        if (!w.isAlive()) continue;
        const dx = w.body.position.x - x;
        const dy = w.body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SUB_EXPLOSION_RADIUS) {
          w.takeDamage(MAX_SUB_DAMAGE * (1 - dist / SUB_EXPLOSION_RADIUS));
        }
      }
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
