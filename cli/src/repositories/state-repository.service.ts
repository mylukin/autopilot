/**
 * FileSystem-based State Repository Implementation
 *
 * Persists workflow state to .ralph-dev/state.json with retry logic.
 */

import * as path from 'path';
import { IFileSystem } from '../infrastructure/file-system';
import { IStateRepository, State, StateUpdate } from './state-repository';

export class FileSystemStateRepository implements IStateRepository {
  private readonly stateFile: string;

  constructor(
    private fileSystem: IFileSystem,
    private workspaceDir: string
  ) {
    this.stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');
  }

  async get(): Promise<State | null> {
    const exists = await this.fileSystem.exists(this.stateFile);
    if (!exists) {
      return null;
    }

    const content = await this.fileSystem.readFile(this.stateFile, 'utf-8');
    const data = JSON.parse(content as string);

    // Convert JSON to State domain entity
    return State.fromJSON(data);
  }

  async set(stateConfig: Omit<import('./state-repository').StateConfig, 'updatedAt'>): Promise<void> {
    // Ensure directory exists
    await this.fileSystem.ensureDir(path.dirname(this.stateFile));

    // Add updatedAt timestamp
    const fullStateConfig = {
      ...stateConfig,
      updatedAt: new Date().toISOString(),
    };

    // Write state
    await this.fileSystem.writeFile(
      this.stateFile,
      JSON.stringify(fullStateConfig, null, 2),
      { encoding: 'utf-8' }
    );
  }

  async update(updates: StateUpdate): Promise<void> {
    const currentState = await this.get();
    if (!currentState) {
      throw new Error('State not found. Use set() to initialize state.');
    }

    // Apply updates using State domain entity methods
    if (updates.phase !== undefined) {
      currentState.transitionTo(updates.phase);
    }

    // Use 'in' operator to allow setting currentTask to undefined
    if ('currentTask' in updates) {
      currentState.setCurrentTask(updates.currentTask);
    }

    if (updates.prd !== undefined) {
      currentState.setPrd(updates.prd);
    }

    if (updates.addError !== undefined) {
      currentState.addError(updates.addError);
    }

    // Write updated state
    const stateData = currentState.toJSON();
    await this.fileSystem.writeFile(
      this.stateFile,
      JSON.stringify(stateData, null, 2),
      { encoding: 'utf-8' }
    );
  }

  async clear(): Promise<void> {
    const exists = await this.fileSystem.exists(this.stateFile);
    if (exists) {
      await this.fileSystem.remove(this.stateFile);
    }
  }

  async exists(): Promise<boolean> {
    return this.fileSystem.exists(this.stateFile);
  }
}
