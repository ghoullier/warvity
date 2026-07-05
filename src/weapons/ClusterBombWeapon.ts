import { PLANET_CENTER } from "../config";
import {
  ClusterBomb,
  MAX_CLUSTER_SPEED,
  MAX_SUB_DAMAGE,
  SUB_EXPLOSION_RADIUS,
} from "../entities/ClusterBomb";
import { EVENTS } from "../events/GameEvents";
import * as ParticleSystem from "../systems/ParticleSystem";
import { FIRE_OFFSET } from "./constants";
import {
  applyBlastDamage,
  registerWeapon,
  type WeaponContext,
} from "./WeaponRegistry";

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

    scene.events.on(EVENTS.CLUSTER_SPLIT, () => {
      audioManager.playClusterSplit();
    });

    const onSubExploded = ({ x, y }: { x: number; y: number }) => {
      audioManager.playSubExplosion();
      terrain.explode(x, y, SUB_EXPLOSION_RADIUS);
      ParticleSystem.explode(scene, x, y, PLANET_CENTER);
      applyBlastDamage(allWorms, x, y, SUB_EXPLOSION_RADIUS, MAX_SUB_DAMAGE);
    };

    scene.events.on(EVENTS.SUB_MUNITION_EXPLODED, onSubExploded);

    scene.events.once(EVENTS.CLUSTER_EXPLODED, () => {
      scene.events.off(EVENTS.SUB_MUNITION_EXPLODED, onSubExploded);
      scene.events.off(EVENTS.CLUSTER_SPLIT);
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
