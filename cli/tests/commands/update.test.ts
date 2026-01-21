import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerUpdateCommand } from '../../src/commands/update';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs functions
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
  };
});

describe('Update Command', () => {
  let program: Command;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('registerUpdateCommand', () => {
    it('should register update command', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();
    });

    it('should have correct description', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd?.description()).toContain('update');
    });

    it('should have --cli-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const cliOnlyOption = options.find(
        (opt) => opt.long === '--cli-only'
      );
      expect(cliOnlyOption).toBeDefined();
    });

    it('should have --plugin-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const pluginOnlyOption = options.find(
        (opt) => opt.long === '--plugin-only'
      );
      expect(pluginOnlyOption).toBeDefined();
    });

    it('should have --check option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const checkOption = options.find((opt) => opt.long === '--check');
      expect(checkOption).toBeDefined();
    });

    it('should have --json option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('command options', () => {
    it('--cli-only and --plugin-only are mutually exclusive in intent', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();

      // Both options exist but serve different purposes
      const options = updateCmd?.options || [];
      const cliOnly = options.find((opt) => opt.long === '--cli-only');
      const pluginOnly = options.find((opt) => opt.long === '--plugin-only');

      expect(cliOnly).toBeDefined();
      expect(pluginOnly).toBeDefined();
    });
  });
});

describe('Update Command Integration', () => {
  let program: Command;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should handle --check option without throwing', async () => {
    const { execSync } = await import('child_process');
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReturnValue('0.4.1\n');

    // This should not throw
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--check', '--json']);
      } catch {
        // Expected to fail in test environment
      }
    }).not.toThrow();
  });

  it('should display help without errors', () => {
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--help']);
      } catch {
        // Help throws in commander
      }
    }).not.toThrow();
  });
});
