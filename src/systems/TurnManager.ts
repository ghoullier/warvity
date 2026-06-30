import Phaser from "phaser";
import type { Character } from "../entities/Character";

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
 */
export class TurnManager extends Phaser.Events.EventEmitter {
  readonly #teams: Character[][];
  readonly #teamWormIndices: number[];
  #currentTeamIndex: number;

  get currentTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  get currentWormIndex(): number {
    return this.#teamWormIndices[this.#currentTeamIndex];
  }

  constructor(teams: Character[][]) {
    super();
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
    return this.#teams[this.#currentTeamIndex][
      this.#teamWormIndices[this.#currentTeamIndex]
    ];
  }

  /** Returns the index of the team currently taking their turn. */
  getActiveTeamIndex(): number {
    return this.#currentTeamIndex;
  }

  /**
   * Ends the current turn and advances to the next worm.
   *
   * The current team's worm index is incremented (for their next appearance),
   * then control passes to the following team.
   */
  nextTurn(): void {
    this.emit("turn-end");
    this.#deactivateCurrentWorm();

    // Advance this team's worm pointer for when they play again
    const team = this.#teams[this.#currentTeamIndex];
    this.#teamWormIndices[this.#currentTeamIndex] =
      (this.#teamWormIndices[this.#currentTeamIndex] + 1) % team.length;

    // Move to the next team
    this.#currentTeamIndex = (this.#currentTeamIndex + 1) % this.#teams.length;

    this.#activateCurrentWorm();
    this.emit("turn-start", this.getCurrentWorm());
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #activateCurrentWorm(): void {
    this.getCurrentWorm().setActive(true);
  }

  #deactivateCurrentWorm(): void {
    this.getCurrentWorm().setActive(false);
  }
}
