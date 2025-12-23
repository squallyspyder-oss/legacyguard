// Cross-platform sandbox runner using Docker API
// Falls back to shell script on Linux when available

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export type SandboxConfig = {
  enabled?: boolean;
  repoPath: string;
  command?: string;
  runnerPath?: string;
  timeoutMs?: number;
  failMode?: 'fail' | 'warn';
  languageHint?: string;
  onLog?: (message: string) => void;
  useDocker?: boolean; // Force Docker mode
};

export type SandboxResult = {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  method: 'docker' | 'shell' | 'native';
  error?: string;
};

// Language presets for test commands
const LANGUAGE_PRESETS: Record<string, string[]> = {
  javascript: ['npm test', 'yarn test', 'pnpm test'],
  typescript: ['npm test', 'yarn test', 'pnpm test'],
  python: ['pytest', 'python -m pytest', 'python -m unittest'],
  go: ['go test ./...'],
  rust: ['cargo test'],
  java: ['mvn test', 'gradle test'],
  ruby: ['bundle exec rspec', 'rake test'],
  php: ['vendor/bin/phpunit', 'composer test'],
};

// Detect language from repo
async function detectLanguage(repoPath: string): Promise<string | null> {
  const indicators: Record<string, string[]> = {
    javascript: ['package.json'],
    typescript: ['tsconfig.json'],
    python: ['requirements.txt', 'pyproject.toml', 'setup.py'],
    go: ['go.mod', 'go.sum'],
    rust: ['Cargo.toml'],
    java: ['pom.xml', 'build.gradle'],
    ruby: ['Gemfile'],
    php: ['composer.json'],
  };

  for (const [lang, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (fs.existsSync(path.join(repoPath, file))) {
        return lang;
      }
    }
  }
  return null;
}

// Find best test command for language
async function findTestCommand(repoPath: string, languageHint?: string): Promise<string | null> {
  const lang = languageHint || (await detectLanguage(repoPath));
  if (!lang || !LANGUAGE_PRESETS[lang]) return null;

  // Check package.json scripts
  if (['javascript', 'typescript'].includes(lang)) {
    try {
      const pkgPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
          return 'npm test';
        }
      }
    } catch {
      // Ignore
    }
  }

  return LANGUAGE_PRESETS[lang]?.[0] || null;
}

// Check if Docker is available
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker version --format "{{.Server.Version}}"');
    return true;
  } catch {
    return false;
  }
}

// Check if shell runner exists
function isShellRunnerAvailable(runnerPath?: string): boolean {
  if (!runnerPath) return false;
  return fs.existsSync(runnerPath);
}

// Run sandbox via Docker
async function runDockerSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const startTime = Date.now();
  const log = config.onLog || console.log;

  const command = config.command || (await findTestCommand(config.repoPath, config.languageHint)) || 'echo "No test command found"';
  const timeoutSec = Math.ceil((config.timeoutMs || 300000) / 1000);

  // Determine base image based on language
  const lang = config.languageHint || (await detectLanguage(config.repoPath)) || 'javascript';
  const imageMap: Record<string, string> = {
    javascript: 'node:20-alpine',
    typescript: 'node:20-alpine',
    python: 'python:3.11-slim',
    go: 'golang:1.21-alpine',
    rust: 'rust:1.75-slim',
    java: 'maven:3.9-eclipse-temurin-21',
    ruby: 'ruby:3.2-slim',
    php: 'php:8.2-cli',
  };
  const image = imageMap[lang] || 'node:20-alpine';

  log(`[Sandbox/Docker] Starting container with image: ${image}`);
  log(`[Sandbox/Docker] Command: ${command}`);
  log(`[Sandbox/Docker] Timeout: ${timeoutSec}s`);

  return new Promise((resolve) => {
    const args = [
      'run',
      '--rm',
      '--network=none', // No network access
      '--memory=512m',
      '--cpus=1',
      '--read-only',
      '--tmpfs=/tmp:rw,noexec,nosuid,size=100m',
      `-v=${config.repoPath}:/workspace:ro`,
      '-w=/workspace',
      image,
      '/bin/sh',
      '-c',
      command,
    ];

    let stdout = '';
    let stderr = '';
    let killed = false;

    const proc = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: config.timeoutMs || 300000,
    });

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, config.timeoutMs || 300000);

    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      log(`[Sandbox/Docker] ${str.trim()}`);
    });

    proc.stderr?.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      log(`[Sandbox/Docker] [stderr] ${str.trim()}`);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      resolve({
        success: code === 0,
        exitCode: code ?? (killed ? 137 : 1),
        stdout,
        stderr,
        durationMs,
        method: 'docker',
        error: killed ? 'Timeout exceeded' : undefined,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        exitCode: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - startTime,
        method: 'docker',
        error: err.message,
      });
    });
  });
}

// Run sandbox via shell script (Linux/Mac)
async function runShellSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const startTime = Date.now();
  const log = config.onLog || console.log;
  const runnerPath = config.runnerPath!;

  log(`[Sandbox/Shell] Running: ${runnerPath}`);

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      SANDBOX_REPO_PATH: config.repoPath,
      SANDBOX_COMMAND: config.command || '',
      SANDBOX_TIMEOUT_MS: String(config.timeoutMs || 300000),
    };

    const proc = spawn('bash', [runnerPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      timeout: config.timeoutMs || 300000,
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, config.timeoutMs || 300000);

    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      log(`[Sandbox/Shell] ${str.trim()}`);
    });

    proc.stderr?.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      log(`[Sandbox/Shell] [stderr] ${str.trim()}`);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        exitCode: code ?? (killed ? 137 : 1),
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
        method: 'shell',
        error: killed ? 'Timeout exceeded' : undefined,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        exitCode: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - startTime,
        method: 'shell',
        error: err.message,
      });
    });
  });
}

// Run sandbox natively (fallback - less secure)
async function runNativeSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const startTime = Date.now();
  const log = config.onLog || console.log;

  const command = config.command || (await findTestCommand(config.repoPath, config.languageHint)) || 'echo "No test command"';

  log(`[Sandbox/Native] ⚠️ Running without isolation (Docker unavailable)`);
  log(`[Sandbox/Native] Command: ${command}`);

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const proc = spawn(shell, shellArgs, {
      cwd: config.repoPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: config.timeoutMs || 300000,
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, config.timeoutMs || 300000);

    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      log(`[Sandbox/Native] ${str.trim()}`);
    });

    proc.stderr?.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      log(`[Sandbox/Native] [stderr] ${str.trim()}`);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        exitCode: code ?? (killed ? 137 : 1),
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
        method: 'native',
        error: killed ? 'Timeout exceeded' : undefined,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        exitCode: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - startTime,
        method: 'native',
        error: err.message,
      });
    });
  });
}

// Main sandbox runner
export async function runSandbox(config: SandboxConfig): Promise<SandboxResult> {
  const log = config.onLog || console.log;

  if (!config.enabled) {
    log('[Sandbox] Disabled, skipping');
    return {
      success: true,
      exitCode: 0,
      stdout: 'Sandbox disabled',
      stderr: '',
      durationMs: 0,
      method: 'native',
    };
  }

  // Priority: Docker > Shell script > Native
  const dockerAvailable = config.useDocker !== false && (await isDockerAvailable());
  const shellAvailable = isShellRunnerAvailable(config.runnerPath) && process.platform !== 'win32';

  let result: SandboxResult;

  if (dockerAvailable) {
    log('[Sandbox] Using Docker isolation');
    result = await runDockerSandbox(config);
  } else if (shellAvailable) {
    log('[Sandbox] Using shell runner');
    result = await runShellSandbox(config);
  } else {
    log('[Sandbox] ⚠️ Falling back to native execution (no isolation)');
    result = await runNativeSandbox(config);
  }

  // Handle failure based on failMode
  if (!result.success && config.failMode === 'warn') {
    log(`[Sandbox] Warning: Test failed but failMode=warn, continuing`);
    result.success = true; // Override for orchestrator
  }

  return result;
}

// Get sandbox capabilities
export async function getSandboxCapabilities(): Promise<{
  docker: boolean;
  shell: boolean;
  recommended: 'docker' | 'shell' | 'native';
}> {
  const docker = await isDockerAvailable();
  const shell = process.platform !== 'win32';

  return {
    docker,
    shell,
    recommended: docker ? 'docker' : shell ? 'shell' : 'native',
  };
}
