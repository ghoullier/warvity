import type Matter from "matter-js";

/** Single-point cast from Phaser's MatterJS.BodyType to Matter.js Matter.Body */
export function toMatterBody(body: MatterJS.BodyType): Matter.Body {
  return body as unknown as Matter.Body;
}

/** Cast Phaser's Matter world engine to Matter.Engine */
export function toMatterEngine(engine: unknown): Matter.Engine {
  return engine as Matter.Engine;
}
