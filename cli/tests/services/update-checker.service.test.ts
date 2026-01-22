import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  checkForUpdates,
  compareVersions,
  showUpdateNotification,
  checkAndNotify,
} from '../../src/services/update-checker.service';

// Mock child_process.execSync
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

// Import after mock setup
import * as child_process from 'child_process';

describe('update-checker.service', () => {
  const originalEnv = { ...process.env };
  let testCacheDir: string;

  beforeEach(() => {
    // Create unique test cache directory for each test
    testCacheDir = join(tmpdir(), `update-checker-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.CI;
    delete process.env.NO_UPDATE_NOTIFIER;

    // Set custom cache directory for tests
    process.env.RALPH_DEV_CACHE_DIR = testCacheDir;

    // Create test cache directory
    if (!existsSync(testCacheDir)) {
      mkdirSync(testCacheDir, { recursive: true });
    }

    // Reset all mocks before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Clean up test cache directory first
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }

    // Restore environment
    process.env = originalEnv;
  });

  describe('compareVersions', () => {
    it('should return positive when a > b', () => {
      expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });

    it('should return negative when a < b', () => {
      expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('should return 0 when versions are equal', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
    });

    it('should handle version prefixes', () => {
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('v2.0.0', 'v1.0.0')).toBeGreaterThan(0);
    });

    it('should handle different version lengths', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0.1', '1.0.0')).toBeGreaterThan(0);
    });
  });

  describe('checkForUpdates', () => {
    it('should skip check in CI environment', () => {
      process.env.CI = 'true';

      const result = checkForUpdates({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.fromCache).toBe(false);
      // execSync should not be called in CI
      expect(child_process.execSync).not.toHaveBeenCalled();
    });

    it('should skip check when NO_UPDATE_NOTIFIER is set', () => {
      process.env.NO_UPDATE_NOTIFIER = '1';

      const result = checkForUpdates({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.fromCache).toBe(false);
      // execSync should not be called when disabled
      expect(child_process.execSync).not.toHaveBeenCalled();
    });

    it('should detect update when npm returns newer version', () => {
      vi.mocked(child_process.execSync).mockReturnValue('2.0.0\n');

      const result = checkForUpdates({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('2.0.0');
      expect(result.currentVersion).toBe('1.0.0');
    });

    it('should not detect update when current version is latest', () => {
      vi.mocked(child_process.execSync).mockReturnValue('1.0.0\n');

      const result = checkForUpdates({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.latestVersion).toBe('1.0.0');
    });

    it('should handle npm command failure gracefully', () => {
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = checkForUpdates({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(result.hasUpdate).toBe(false);
      // No latestVersion when network fails and no cache
      expect(result.latestVersion).toBeUndefined();
    });
  });

  describe('showUpdateNotification', () => {
    it('should output notification to stderr', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      showUpdateNotification('1.0.0', '2.0.0', 'test-package');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('Update available');
      expect(output).toContain('1.0.0');
      expect(output).toContain('2.0.0');
      expect(output).toContain('ralph-dev update');

      consoleSpy.mockRestore();
    });
  });

  describe('checkAndNotify', () => {
    it('should not show notification when showNotification is false', () => {
      vi.mocked(child_process.execSync).mockReturnValue('2.0.0\n');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      checkAndNotify({
        packageName: 'test-package',
        currentVersion: '1.0.0',
        showNotification: false,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show notification when update is available', () => {
      vi.mocked(child_process.execSync).mockReturnValue('2.0.0\n');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      checkAndNotify({
        packageName: 'test-package',
        currentVersion: '1.0.0',
        showNotification: true,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not show notification when no update available', () => {
      vi.mocked(child_process.execSync).mockReturnValue('1.0.0\n');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      checkAndNotify({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip notification in CI environment', () => {
      process.env.CI = 'true';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      checkAndNotify({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
