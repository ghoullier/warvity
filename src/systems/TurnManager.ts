import Phaser from "phaser";
import type { Character } from "../entities/Character";
import { GameEvents } from "./GameEvents";

const TURN_DURATION_SECONDS = 30;

/**
 * Manages turn-based alternation between teams and their worms.
 *
 * Cycling order: when a turn ends, the current team's worm index is advanced
 * for their next turn, then control passes to the next team.
 *
 * Example with 2 teams of 2 worms each:
 *   Team 0 / Worm 0 → Team 1 / Worm 0 → Team 0 / Worm 1 → Team 1 / Worm 1 → …
 *
 * Events emitted:
 *   'turn-start'  — payload: the newly active Character
 *   'turn-end'    — no payload
 *   'timer-tick'  — payload: remaining seconds (integer)
 */
export class TurnManager {
  readonly #events: Phaser.Events.EventEmitter;
  readonly #teams: Character[][];
  readonly #teamWormIndices: number[];
  #currentTeamIndex: number;
  #stopped = false;
  #timerEvent: Phaser.Time.TimerEvent | null = null;
  #remainingSeconds: number = TURN_DURATION_SECONDS;

  get currentTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  get currentWormIndex(): number {
    return this.#teamWormIndices[this.#currentTeamIndex] ?? 0;
  }

  constructor(teams: Character[][], events: Phaser.Events.EventEmitter) {
    this.#events = events;
    if (teams.length === 0)
      throw new Error("TurnManager requires at least one team");
    for (const team of teams) {
      if (team.length === 0)
        throw new Error("Each team must have at least one worm");
    }

    this.#teams = teams;
    this.#teamWormIndices = teams.map(() => 0);
    this.#currentTeamIndex = 0;

    // Highlight the first active worm
    this.#activateCurrentWorm();
  }

  /** Returns the worm whose turn it currently is. */
  getCurrentWorm(): Character {
    // Constructor validates both arrays are non-empty and indices stay in-bounds.
    const team = this.#teams[this.#currentTeamIndex];
    const wormIdx = this.#teamWormIndices[this.#currentTeamIndex] ?? 0;
    const worm = team?.[wormIdx];
    if (!worm)
      throw new Error(
        "TurnManager: internal state corrupted — no current worm",
      );
    return worm;
  }

  /** Returns the index of the team currently taking their turn. */
  getActiveTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  /** Starts (or restarts) the countdown timer for the current turn. */
  startTimer(scene: Phaser.Scene): void {
    this.stopTimer();
    this.#remainingSeconds = TURN_DURATION_SECONDS;

    this.#timerEvent = scene.time.addEvent({
      delay: 1000,
      repeat: TURN_DURATION_SECONDS - 1,
      callback: () => {
        if (this.#stopped) return;
        this.#remainingSeconds -= 1;
        this.#events.emit(GameEvents.TIMER_TICK, this.#remainingSeconds);
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

  /**
   * Ends the current turn and advances to the next worm.
   *
   * The current team's worm index is incremented (for their next appearance),
   * then control passes to the following team.
   */
  /** Halts the turn cycle — nextTurn() becomes a no-op after this. */
  stop(): void {
    this.stopTimer();
    this.#stopped = true;
  }

  nextTurn(): void {
    if (this.#stopped) return;
    this.stopTimer();
    this.#events.emit(GameEvents.TURN_END);
    this.#deactivateCurrentWorm();

    // Advance this team's worm pointer for when they play again
    // biome-ignore lint/style/noNonNullAssertion: invariant enforced by constructor
    const team = this.#teams[this.#currentTeamIndex]!;
    this.#teamWormIndices[this.#currentTeamIndex] =
      ((this.#teamWormIndices[this.#currentTeamIndex] ?? 0) + 1) % team.length;

    // Move to the next team
    this.#currentTeamIndex = (this.#currentTeamIndex + 1) % this.#teams.length;

    this.#activateCurrentWorm();
    this.#events.emit(GameEvents.TURN_START, this.getCurrentWorm());
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #activateCurrentWorm(): void {
    this.getCurrentWorm().setActive(true);
  }

  #deactivateCurrentWorm(): void {
    this.getCurrentWorm().setActive(false);
  }
}
