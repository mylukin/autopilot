import { Command } from 'commander';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { createDetectionService } from './service-factory';

export function registerDetectCommand(program: Command, workspaceDir: string): void {
  program
    .command('detect')
    .description('Detect project language and configuration')
    .option('--json', 'Output as JSON')
    .option('--save', 'Save to index metadata')
    .action(async (options) => {
      try {
        const detectionService = createDetectionService(workspaceDir);

        // Use detectAndSave if --save flag is present, otherwise just detect
        const result = options.save
          ? await detectionService.detectAndSave()
          : { languageConfig: detectionService.detect(), saved: false };

        const response = successResponse(result);

        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold('Project Configuration:'));
          console.log(`Language: ${chalk.cyan(data.languageConfig.language)}`);

          if (data.languageConfig.framework) {
            console.log(`Framework: ${chalk.green(data.languageConfig.framework)}`);
          }

          if (data.languageConfig.testFramework) {
            console.log(`Test Framework: ${data.languageConfig.testFramework}`);
          }

          if (data.languageConfig.buildTool) {
            console.log(`Build Tool: ${data.languageConfig.buildTool}`);
          }

          if (data.languageConfig.verifyCommands.length > 0) {
            console.log(chalk.bold('\nVerification Commands:'));
            data.languageConfig.verifyCommands.forEach((cmd: string) => {
              console.log(`  ${chalk.gray('$')} ${cmd}`);
            });
          }

          if (data.saved) {
            console.log(chalk.green('\n✓ Saved to index metadata'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to detect language', error), options.json);
      }
    });
}
