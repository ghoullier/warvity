import type Phaser from "phaser";
import type { Character } from "../entities/Character";
import { EVENTS } from "../events/GameEvents";

const TURN_DURATION_SECONDS = 30;

export type TeamData = { name: string; worms: Character[] };

/**
 * Manages turn-based alternation between teams and their worms.
 *
 * Cycling order: when a turn ends, the current team's worm index is advanced
 * for their next turn, then control passes to the next team.
 *
 * Example with 2 teams of 2 worms each:
 *   Team 0 / Worm 0 → Team 1 / Worm 0 → Team 0 / Worm 1 → Team 1 / Worm 1 → …
 *
 * Events emitted directly on the Phaser scene event bus:
 *   EVENTS.TURN_START  — payload: (worm: Character, teamName: string)
 *   EVENTS.TURN_END    — no payload
 *   EVENTS.TIMER_TICK  — payload: remaining seconds (integer)
 */
export class TurnManager {
  readonly #teams: TeamData[];
  readonly #teamWormIndices: number[];
  readonly #emitter: Phaser.Events.EventEmitter;
  #currentTeamIndex: number;
  #stopped = false;
  #timerEvent: Phaser.Time.TimerEvent | null = null;
  #remainingSeconds: number = TURN_DURATION_SECONDS;

  get currentTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  get currentWormIndex(): number {
    // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
    return this.#teamWormIndices[this.#currentTeamIndex]!;
  }

  constructor(teams: TeamData[], sceneEmitter: Phaser.Events.EventEmitter) {
    if (teams.length === 0)
      throw new Error("TurnManager requires at least one team");
    for (const team of teams) {
      if (team.worms.length === 0)
        throw new Error("Each team must have at least one worm");
    }

    this.#teams = teams;
    this.#emitter = sceneEmitter;
    this.#teamWormIndices = teams.map(() => 0);
    this.#currentTeamIndex = 0;

    // Highlight the first active worm (no turn-start event for the initial worm)
    this.#activateCurrentWorm();
  }

  /** Returns the worm whose turn it currently is. */
  getCurrentWorm(): Character {
    // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
    return this.#teams[this.#currentTeamIndex]!.worms[
      // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
      this.#teamWormIndices[this.#currentTeamIndex]!
    ]!;
  }

  /** Returns the index of the team currently taking their turn. */
  getActiveTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  /** Returns the name of the team currently taking their turn. */
  getActiveTeamName(): string {
    return this.#teams[this.#currentTeamIndex]?.name ?? "";
  }

  /** Starts (or restarts) the countdown timer for the current turn. */
  startTimer(scene: Phaser.Scene): void {
    this.stopTimer();
    this.#remainingSeconds = TURN_DURATION_SECONDS;

    this.#timerEvent = scene.time.addEvent({
      delay: 1000,
      repeat: TURN_DURATION_SECONDS - 1,
      callback: () => {
        this.#remainingSeconds -= 1;
        this.#emitter.emit(EVENTS.TIMER_TICK, this.#remainingSeconds);
        if (this.#remainingSeconds <= 0) {
          this.nextTurn();
        }
      },
    });
  }

  /** Stops the countdown timer (e.g. when the player fires). */
  stopTimer(): void {
    if (this.#timerEvent) {
      this.#timerEvent.remove(false);
      this.#timerEvent = null;
    }
  }

  /** Returns the remaining turn time in whole seconds. */
  getRemainingTime(): number {
    return this.#remainingSeconds;
  }

  /** Halts the turn cycle — nextTurn() becomes a no-op after this. */
  stop(): void {
    this.stopTimer();
    this.#stopped = true;
  }

  /**
   * Ends the current turn and advances to the next worm.
   *
   * The current team's worm index is incremented (for their next appearance),
   * then control passes to the following team. Emits EVENTS.TURN_END then
   * EVENTS.TURN_START directly on the Phaser scene event bus.
   */
  nextTurn(): void {
    if (this.#stopped) return;
    this.stopTimer();
    this.#emitter.emit(EVENTS.TURN_END);
    this.#deactivateCurrentWorm();

    // Advance this team's worm pointer for when they play again
    // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
    const teamWorms = this.#teams[this.#currentTeamIndex]!.worms;
    this.#teamWormIndices[this.#currentTeamIndex] =
      // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
      (this.#teamWormIndices[this.#currentTeamIndex]! + 1) % teamWorms.length;

    // Move to the next team
    this.#currentTeamIndex = (this.#currentTeamIndex + 1) % this.#teams.length;

    this.#activateCurrentWorm();
    const teamName = this.#teams[this.#currentTeamIndex]?.name ?? "";
    this.#emitter.emit(EVENTS.TURN_START, this.getCurrentWorm(), teamName);
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #activateCurrentWorm(): void {
    this.getCurrentWorm().setActive(true);
  }

  #deactivateCurrentWorm(): void {
    this.getCurrentWorm().setActive(false);
  }
}
