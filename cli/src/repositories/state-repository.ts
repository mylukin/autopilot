/**
 * State Repository Interface
 *
 * Provides abstraction for state persistence operations.
 * Used by skills to manage workflow phase state.
 */

import { State, Phase, StateConfig } from '../domain/state-entity';

export interface StateUpdate {
  phase?: Phase;
  currentTask?: string;
  prd?: any;
  addError?: any;
}

export { State, Phase, StateConfig };

/**
 * State repository interface
 *
 * Manages workflow state persistence in .ralph-dev/state.json
 */
export interface IStateRepository {
  /**
   * Get current state
   * @returns Current state or null if no state exists
   */
  get(): Promise<State | null>;

  /**
   * Set complete state (for initialization)
   * @param state State config to set (plain object)
   */
  set(state: Omit<StateConfig, 'updatedAt'>): Promise<void>;

  /**
   * Update specific state fields
   * @param updates Partial state updates
   */
  update(updates: StateUpdate): Promise<void>;

  /**
   * Clear state (delete state.json)
   */
  clear(): Promise<void>;

  /**
   * Check if state exists
   */
  exists(): Promise<boolean>;
}
