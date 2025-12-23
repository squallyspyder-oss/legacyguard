import fs from 'fs';
import path from 'path';

export type LegacyProfile = {
  filesScanned: number;
  imports: string[];
  findings: string[];
  signals: {
    crypto: boolean;
    network: boolean;
    filesystem: boolean;
    exec: boolean;
    obfuscation: boolean;
  };
  suspiciousStrings: string[];
};

const EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.go']);
const MAX_FILES = 40;
const MAX_BYTES = 200_000;

function shouldScan(file: string) {
  return EXTENSIONS.has(path.extname(file).toLowerCase());
}

export function profileLegacyRepo(repoPath: string): LegacyProfile {
  const imports: string[] = [];
  const findings: string[] = [];
  const suspiciousStrings: string[] = [];
  let filesScanned = 0;

  const signals = {
    crypto: false,
    network: false,
    filesystem: false,
    exec: false,
    obfuscation: false,
  };

  const walk = (dir: string) => {
    if (filesScanned >= MAX_FILES) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        if (filesScanned >= MAX_FILES) return;
        continue;
      }
      if (!shouldScan(entry.name)) continue;
      const stat = fs.statSync(full);
      if (stat.size > MAX_BYTES) continue;
      const content = fs.readFileSync(full, 'utf-8');
      filesScanned += 1;

      // Imports / requires
      const importRegex = /import\s+[^'";]+from\s+['"]([^'";]+)['"]/g;
      const requireRegex = /require\(['"]([^'";]+)['"]\)/g;
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(content)) !== null) imports.push(m[1]);
      while ((m = requireRegex.exec(content)) !== null) imports.push(m[1]);

      const textLower = content.toLowerCase();
      const hit = (kw: string | RegExp) => (typeof kw === 'string' ? textLower.includes(kw) : kw.test(content));

      // Crypto
      if (hit('crypto') || hit('aes') || hit('rsa')) {
        signals.crypto = true;
        findings.push(`crypto em ${path.relative(repoPath, full)}`);
      }

      // Network
      if (hit('fetch(') || hit('axios') || hit('http') || hit('net.')) {
        signals.network = true;
        findings.push(`network em ${path.relative(repoPath, full)}`);
      }

      // Filesystem
      if (hit('fs.') || hit('open(') || hit('readfile') || hit('writefile')) {
        signals.filesystem = true;
        findings.push(`filesystem em ${path.relative(repoPath, full)}`);
      }

      // Exec / spawn
      if (hit('child_process') || hit('exec(') || hit('spawn(')) {
        signals.exec = true;
        findings.push(`exec em ${path.relative(repoPath, full)}`);
      }

      // Obfuscation heuristics
      if (hit(/\b(atob|btoa|buffer\.from)\b/i) && hit(/base64|hex/)) {
        signals.obfuscation = true;
        findings.push(`possível ofuscação em ${path.relative(repoPath, full)}`);
      }

      // Suspicious strings
      ['secret', 'token', 'password', 'vault', 'private key', '-----begin'].forEach((kw) => {
        if (textLower.includes(kw)) suspiciousStrings.push(`${kw} @ ${path.relative(repoPath, full)}`);
      });

      if (filesScanned >= MAX_FILES) return;
    }
  };

  try {
    walk(repoPath);
  } catch {
    // fallback silencioso
  }

  return {
    filesScanned,
    imports: Array.from(new Set(imports)).slice(0, 200),
    findings: Array.from(new Set(findings)).slice(0, 200),
    signals,
    suspiciousStrings: suspiciousStrings.slice(0, 200),
  };
}
