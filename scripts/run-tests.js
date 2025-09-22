#!/usr/bin/env node

/**
 * Comprehensive Test Runner for FinTrac Personal Finance Tracker
 *
 * This script provides a unified interface for running all tests in the FinTrac
 * codebase with proper reporting, coverage analysis, and CI/CD integration.
 *
 * Features:
 * - Unit tests for utilities, services, and repositories
 * - Integration tests for database operations
 * - React hook testing with proper mocking
 * - Coverage reporting with configurable thresholds
 * - Watch mode for development
 * - CI-friendly output formatting
 * - Test result summarization and reporting
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Test configuration
const TEST_CONFIG = {
  // Coverage thresholds
  coverage: {
    lines: 80,
    functions: 80,
    branches: 70,
    statements: 80
  },

  // Test patterns
  patterns: {
    unit: ['src/**/*.test.{ts,tsx}'],
    integration: ['src/test/**/*.test.{ts,tsx}'],
    utils: ['src/services/utils/**/*.test.{ts,tsx}'],
    repos: ['src/services/repos/**/*.test.{ts,tsx}'],
    sync: ['src/services/sync/**/*.test.{ts,tsx}'],
    hooks: ['src/hooks/**/*.test.{ts,tsx}']
  },

  // Vitest configuration
  vitest: {
    config: 'vite.config.ts',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('', 'reset');
  log('='.repeat(60), 'cyan');
  log(`${message}`, 'bright');
  log('='.repeat(60), 'cyan');
  log('', 'reset');
}

function logSection(message) {
  log('', 'reset');
  log(`📋 ${message}`, 'yellow');
  log('-'.repeat(40), 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Execute command and return promise
function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Get command output as string
function getCommandOutput(command, args = []) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    const process = spawn(command, args, {
      cwd: projectRoot,
      shell: true
    });

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Command failed: ${errorOutput}`));
      }
    });
  });
}

// Ensure directory exists
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    coverage: false,
    ci: false,
    pattern: null,
    verbose: false,
    bail: false,
    parallel: true,
    silent: false,
    reporter: 'default',
    updateSnapshots: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--ci':
        options.ci = true;
        options.coverage = true;
        options.bail = true;
        options.reporter = 'verbose';
        break;
      case '--pattern':
      case '-p':
        options.pattern = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--silent':
      case '-s':
        options.silent = true;
        break;
      case '--reporter':
      case '-r':
        options.reporter = args[++i];
        break;
      case '--update-snapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          logError(`Unknown option: ${arg}`);
          showHelp();
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

// Show help information
function showHelp() {
  logHeader('FinTrac Test Runner');

  console.log(`
Usage: node scripts/run-tests.js [options]

Options:
  -w, --watch              Run tests in watch mode
  -c, --coverage           Generate coverage report
  --ci                     Run in CI mode (coverage + bail + verbose)
  -p, --pattern <pattern>  Run specific test pattern
  -v, --verbose            Verbose output
  -b, --bail               Stop on first test failure
  --no-parallel            Disable parallel test execution
  -s, --silent             Suppress output
  -r, --reporter <type>    Test reporter (default, verbose, json)
  -u, --update-snapshots   Update test snapshots
  -h, --help               Show this help message

Test Patterns:
  unit                     All unit tests
  integration              Integration tests
  utils                    Utility function tests
  repos                    Repository tests
  sync                     Sync service tests
  hooks                    React hook tests

Examples:
  node scripts/run-tests.js                    # Run all tests
  node scripts/run-tests.js --watch            # Watch mode
  node scripts/run-tests.js --coverage         # With coverage
  node scripts/run-tests.js --pattern utils    # Only utility tests
  node scripts/run-tests.js --ci               # CI mode
  `);
}

// Generate test report
async function generateTestReport(results) {
  const reportDir = join(projectRoot, 'test-results');
  ensureDir(reportDir);

  const report = {
    timestamp: new Date().toISOString(),
    summary: results,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  const reportFile = join(reportDir, 'test-report.json');
  writeFileSync(reportFile, JSON.stringify(report, null, 2));

  logInfo(`Test report generated: ${reportFile}`);
}

// Check test prerequisites
async function checkPrerequisites() {
  logSection('Checking Prerequisites');

  try {
    // Check if node_modules exists
    if (!existsSync(join(projectRoot, 'node_modules'))) {
      logError('node_modules not found. Please run: npm install');
      return false;
    }

    // Check if vitest is available
    await getCommandOutput('npx', ['vitest', '--version']);
    logSuccess('Vitest is available');

    // Check TypeScript configuration
    if (!existsSync(join(projectRoot, 'tsconfig.json'))) {
      logWarning('tsconfig.json not found');
    } else {
      logSuccess('TypeScript configuration found');
    }

    // Check test setup file
    if (!existsSync(join(projectRoot, 'src/test/setup.ts'))) {
      logWarning('Test setup file not found');
    } else {
      logSuccess('Test setup file found');
    }

    return true;
  } catch (error) {
    logError(`Prerequisites check failed: ${error.message}`);
    return false;
  }
}

// Run specific test suite
async function runTestSuite(pattern, options) {
  const vitestArgs = ['vitest'];

  // Add configuration
  vitestArgs.push('--config', 'vite.config.ts');

  // Add pattern if specified
  if (pattern && TEST_CONFIG.patterns[pattern]) {
    vitestArgs.push(...TEST_CONFIG.patterns[pattern]);
  } else if (pattern) {
    vitestArgs.push(pattern);
  }

  // Add options
  if (options.watch) {
    vitestArgs.push('--watch');
  } else {
    vitestArgs.push('--run');
  }

  if (options.coverage) {
    vitestArgs.push('--coverage');
    vitestArgs.push('--coverage.reporter=text');
    vitestArgs.push('--coverage.reporter=html');
    vitestArgs.push('--coverage.reporter=json');
  }

  if (options.bail) {
    vitestArgs.push('--bail=1');
  }

  if (options.verbose) {
    vitestArgs.push('--reporter=verbose');
  } else if (options.reporter !== 'default') {
    vitestArgs.push(`--reporter=${options.reporter}`);
  }

  if (!options.parallel) {
    vitestArgs.push('--no-threads');
  }

  if (options.silent) {
    vitestArgs.push('--silent');
  }

  if (options.updateSnapshots) {
    vitestArgs.push('--update');
  }

  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    VITEST: 'true'
  };

  if (options.ci) {
    env.CI = 'true';
  }

  try {
    await execCommand('npx', vitestArgs, { env });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main test runner function
async function runTests() {
  const options = parseArgs();

  if (!options.silent) {
    logHeader('FinTrac Test Suite');
    logInfo(`Running tests with options: ${JSON.stringify(options, null, 2)}`);
  }

  // Check prerequisites
  const prerequisitesOk = await checkPrerequisites();
  if (!prerequisitesOk) {
    process.exit(1);
  }

  // Prepare coverage directory
  if (options.coverage) {
    const coverageDir = join(projectRoot, 'coverage');
    ensureDir(coverageDir);
  }

  const startTime = Date.now();
  let results = { success: false };

  try {
    if (options.watch) {
      logSection('Running Tests in Watch Mode');
      logInfo('Press Ctrl+C to exit watch mode');
    } else {
      logSection('Running Test Suite');
    }

    // Run tests
    results = await runTestSuite(options.pattern, options);

    const duration = Date.now() - startTime;

    if (results.success) {
      logSuccess(`Tests completed successfully in ${duration}ms`);
    } else {
      logError(`Tests failed after ${duration}ms`);
      if (results.error) {
        logError(`Error: ${results.error}`);
      }
    }

    // Generate coverage report summary
    if (options.coverage && results.success) {
      try {
        const coverageFile = join(projectRoot, 'coverage/coverage-summary.json');
        if (existsSync(coverageFile)) {
          logSection('Coverage Summary');
          const coverage = JSON.parse(require('fs').readFileSync(coverageFile, 'utf8'));

          Object.entries(coverage.total).forEach(([metric, data]) => {
            const percentage = data.pct;
            const threshold = TEST_CONFIG.coverage[metric] || 0;
            const status = percentage >= threshold ? '✅' : '❌';

            log(`${status} ${metric}: ${percentage}% (threshold: ${threshold}%)`,
                percentage >= threshold ? 'green' : 'red');
          });
        }
      } catch (error) {
        logWarning(`Could not read coverage summary: ${error.message}`);
      }
    }

    // Generate test report for CI
    if (options.ci) {
      await generateTestReport({
        success: results.success,
        duration,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    results = { success: false, error: error.message };
  }

  // Exit with appropriate code
  process.exit(results.success ? 0 : 1);
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n🛑 Test execution interrupted', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n🛑 Test execution terminated', 'yellow');
  process.exit(143);
});

// Run the tests
runTests().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
