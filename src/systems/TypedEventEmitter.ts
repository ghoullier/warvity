import Phaser from "phaser";
import type { GameEventPayloads } from "./GameEvents";

type EventKey = keyof GameEventPayloads;
type Handler<K extends EventKey> = GameEventPayloads[K] extends undefined
  ? () => void
  : (payload: GameEventPayloads[K]) => void;

export class TypedEventEmitter extends Phaser.Events.EventEmitter {
  typedOn<K extends EventKey>(
    event: K,
    fn: Handler<K>,
    context?: unknown,
  ): this {
    return this.on(event, fn as (...args: unknown[]) => void, context);
  }
  typedOnce<K extends EventKey>(
    event: K,
    fn: Handler<K>,
    context?: unknown,
  ): this {
    return this.once(event, fn as (...args: unknown[]) => void, context);
  }
  typedEmit<K extends EventKey>(
    event: K,
    ...args: GameEventPayloads[K] extends undefined
      ? []
      : [GameEventPayloads[K]]
  ): boolean {
    return this.emit(event, ...args);
  }
  typedOff<K extends EventKey>(
    event: K,
    fn?: Handler<K>,
    context?: unknown,
  ): this {
    return this.off(
      event,
      fn as ((...args: unknown[]) => void) | undefined,
      context,
    );
  }
}
