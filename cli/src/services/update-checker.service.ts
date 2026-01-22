/**
 * Update Checker Service
 *
 * Checks for CLI updates on every command execution.
 * Uses local file cache to avoid hammering npm registry.
 *
 * Key differences from update-notifier:
 * - Shows notification EVERY time if update available (not just once)
 * - 24 hour check interval (configurable) - only queries npm once per day
 * - Direct npm registry check via npm view command
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

export interface UpdateCheckOptions {
  /** Package name to check */
  packageName: string;
  /** Current version */
  currentVersion: string;
  /** Check interval in milliseconds (default: 24 hours) */
  checkInterval?: number;
  /** Whether to show notification (default: true) */
  showNotification?: boolean;
}

export interface CachedVersionInfo {
  /** Latest version from npm */
  latestVersion: string;
  /** Timestamp of last check */
  lastChecked: number;
  /** Current version at time of check */
  checkedVersion: string;
}

export interface UpdateCheckResult {
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Current version */
  currentVersion: string;
  /** Latest version (if available) */
  latestVersion?: string;
  /** Whether cache was used */
  fromCache: boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = 'ralph-dev-update-check.json';

/**
 * Get cache directory path
 * Uses ~/.config/configstore/ (standard location for CLI tools)
 * Supports RALPH_DEV_CACHE_DIR environment variable for testing
 */
function getCacheDir(): string {
  return process.env.RALPH_DEV_CACHE_DIR || join(homedir(), '.config', 'configstore');
}

/**
 * Get cache file path
 */
function getCacheFilePath(): string {
  return join(getCacheDir(), CACHE_FILE);
}

/**
 * Read cached version info
 */
function readCache(): CachedVersionInfo | null {
  const cacheFile = getCacheFilePath();
  if (!existsSync(cacheFile)) {
    return null;
  }

  try {
    const content = readFileSync(cacheFile, 'utf-8');
    return JSON.parse(content) as CachedVersionInfo;
  } catch {
    return null;
  }
}

/**
 * Write cache
 */
function writeCache(info: CachedVersionInfo): void {
  const cacheFile = getCacheFilePath();
  const dir = dirname(cacheFile);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    writeFileSync(cacheFile, JSON.stringify(info, null, 2), 'utf-8');
  } catch {
    // Silent failure - cache is not critical
  }
}

/**
 * Fetch latest version from npm registry
 * Non-blocking with short timeout
 */
function fetchLatestVersion(packageName: string): string | null {
  try {
    // Use npm view with short timeout
    const result = execSync(`npm view ${packageName} version 2>/dev/null`, {
      timeout: 5000, // 5 second timeout
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Compare two semantic version strings
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): number[] => {
    return v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  };

  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }

  return 0;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(
  cache: CachedVersionInfo,
  currentVersion: string,
  checkInterval: number
): boolean {
  // Cache invalid if current version changed (user updated manually)
  if (cache.checkedVersion !== currentVersion) {
    return false;
  }

  // Cache invalid if interval expired
  const now = Date.now();
  return now - cache.lastChecked < checkInterval;
}

/**
 * Check for updates
 *
 * This function:
 * 1. Checks local cache first
 * 2. If cache expired, fetches from npm registry
 * 3. Returns update info
 */
export function checkForUpdates(options: UpdateCheckOptions): UpdateCheckResult {
  const { packageName, currentVersion, checkInterval = ONE_DAY_MS } = options;

  const result: UpdateCheckResult = {
    hasUpdate: false,
    currentVersion,
    fromCache: false,
  };

  // Skip in CI environment
  if (process.env.CI || process.env.NO_UPDATE_NOTIFIER) {
    return result;
  }

  // Check cache first
  const cache = readCache();

  if (cache && isCacheValid(cache, currentVersion, checkInterval)) {
    // Use cached version info
    result.latestVersion = cache.latestVersion;
    result.hasUpdate = compareVersions(cache.latestVersion, currentVersion) > 0;
    result.fromCache = true;
    return result;
  }

  // Cache expired or invalid - fetch from npm
  const latestVersion = fetchLatestVersion(packageName);

  if (!latestVersion) {
    // Network error - use stale cache if available
    if (cache) {
      result.latestVersion = cache.latestVersion;
      result.hasUpdate =
        compareVersions(cache.latestVersion, currentVersion) > 0;
      result.fromCache = true;
    }
    return result;
  }

  // Update cache
  writeCache({
    latestVersion,
    lastChecked: Date.now(),
    checkedVersion: currentVersion,
  });

  result.latestVersion = latestVersion;
  result.hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
  return result;
}

/**
 * Show update notification
 * This is shown EVERY time if an update is available
 */
export function showUpdateNotification(
  currentVersion: string,
  latestVersion: string,
  packageName: string
): void {
  const message = [
    '',
    chalk.yellow(
      '┌────────────────────────────────────────────────────────────┐'
    ),
    chalk.yellow('│') +
      '                                                            ' +
      chalk.yellow('│'),
    chalk.yellow('│') +
      chalk.white.bold('   Update available! ') +
      chalk.dim(currentVersion) +
      chalk.white(' → ') +
      chalk.green.bold(latestVersion) +
      ' '.repeat(
        Math.max(
          0,
          35 - currentVersion.length - latestVersion.length
        )
      ) +
      chalk.yellow('│'),
    chalk.yellow('│') +
      '                                                            ' +
      chalk.yellow('│'),
    chalk.yellow('│') +
      chalk.cyan(`   Run: ralph-dev update`) +
      ' '.repeat(35) +
      chalk.yellow('│'),
    chalk.yellow('│') +
      chalk.dim(`   Or:  npm install -g ${packageName}`) +
      ' '.repeat(Math.max(0, 35 - packageName.length)) +
      chalk.yellow('│'),
    chalk.yellow('│') +
      '                                                            ' +
      chalk.yellow('│'),
    chalk.yellow(
      '└────────────────────────────────────────────────────────────┘'
    ),
    '',
  ].join('\n');

  console.error(message);
}

/**
 * Main entry point - check and notify
 *
 * Call this on every CLI command execution.
 * It's optimized to be non-blocking and cache-aware.
 */
export function checkAndNotify(options: UpdateCheckOptions): void {
  const { showNotification = true } = options;

  const result = checkForUpdates(options);

  if (result.hasUpdate && result.latestVersion && showNotification) {
    showUpdateNotification(
      result.currentVersion,
      result.latestVersion,
      options.packageName
    );
  }
}
