/**
 * Service Factory - Dependency Injection Container
 *
 * Creates and wires up services with their dependencies.
 * Provides a central place for dependency management.
 */

import * as path from 'path';
import { TaskService, ITaskService } from '../services/task-service';
import { StateService, IStateService } from '../services/state-service';
import { DetectionService, IDetectionService } from '../services/detection-service';
import { SagaService, ISagaService } from '../services/saga-service';
import { HealingService, IHealingService } from '../services/healing-service';
import { FileSystemTaskRepository } from '../repositories/task-repository.service';
import { FileSystemStateRepository } from '../repositories/state-repository.service';
import { LanguageDetector } from '../language/detector';
import { IndexManager } from '../core/index-manager';
import { FileSystemService } from '../infrastructure/file-system.service';
import { ConsoleLogger } from '../infrastructure/logger.service';
import { ILogger } from '../infrastructure/logger';

/**
 * Service container holding all initialized services
 */
export interface ServiceContainer {
  taskService: ITaskService;
  stateService: IStateService;
  detectionService: IDetectionService;
  sagaService: ISagaService;
  healingService: IHealingService;
  logger: ILogger;
}

/**
 * Create and wire up all services for a workspace
 */
export function createServices(workspaceDir: string): ServiceContainer {
  // Create shared infrastructure
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();

  // Create repositories
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const taskRepository = new FileSystemTaskRepository(fileSystem, tasksDir);
  const stateRepository = new FileSystemStateRepository(fileSystem, workspaceDir);

  // Create services with dependency injection
  const taskService = new TaskService(taskRepository, stateRepository, logger);
  const stateService = new StateService(stateRepository, logger);

  // Detection service
  const indexManager = new IndexManager(tasksDir);
  const detectionService = new DetectionService(
    LanguageDetector,
    indexManager,
    logger,
    workspaceDir
  );

  // Saga service
  const sagaService = new SagaService(logger, workspaceDir);

  // Healing service with circuit breaker
  const healingService = new HealingService(logger, {
    failureThreshold: 5,
    timeout: 60000,
    successThreshold: 2,
  });

  return {
    taskService,
    stateService,
    detectionService,
    sagaService,
    healingService,
    logger,
  };
}
