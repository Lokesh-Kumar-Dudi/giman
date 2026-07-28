import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { resolveHome, getConfigPath } from './config.js';
import { DEFAULT_SSH_DIR, GIMAN_SSH_CONFIG_MARKER } from '../types/index.js';

const SSH_DIR = resolveHome(DEFAULT_SSH_DIR);
const SSH_CONFIG_PATH = path.join(SSH_DIR, 'config');

const KEY_EXTENSIONS = ['.pub'];
const KEY_NAMES_TO_SKIP = new Set(['config', 'known_hosts', 'authorized_keys']);

/** Identity ID must be safe for use in file paths (no path traversal). */
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function assertPathUnderBase(resolvedPath: string, baseDir: string, label: string): void {
  const normalizedPath = path.normalize(resolvedPath);
  const normalizedBase = path.normalize(path.resolve(baseDir)) + path.sep;
  if (normalizedPath !== path.resolve(baseDir) && !normalizedPath.startsWith(normalizedBase)) {
    throw new Error(`${label} would resolve outside ${baseDir}`);
  }
}

export async function generateKey(identityId: string): Promise<string> {
  if (!SAFE_ID_REGEX.test(identityId)) {
    throw new Error('Identity ID must contain only letters, numbers, underscore, and hyphen');
  }
  const keyPath = path.join(SSH_DIR, `giman_${identityId}`);
  assertPathUnderBase(path.resolve(keyPath), SSH_DIR, 'SSH key path');
  if (await fs.pathExists(keyPath)) {
    throw new Error(`SSH key already exists at ${keyPath}`);
  }
  await fs.ensureDir(SSH_DIR);

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ssh-keygen',
      ['-t', 'ed25519', '-f', keyPath, '-N', '', '-C', `giman-${identityId}`],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(keyPath);
      } else {
        reject(new Error(`ssh-keygen failed: ${stderr || code}`));
      }
    });
    proc.on('error', (err) => reject(err));
  });
}

export async function listExistingKeys(): Promise<string[]> {
  if (!(await fs.pathExists(SSH_DIR))) {
    return [];
  }
  const entries = await fs.readdir(SSH_DIR);
  const keyPaths: string[] = [];
  const seenBase = new Set<string>();

  for (const name of entries) {
    const base = name.replace(/\.pub$/, '');
    if (KEY_NAMES_TO_SKIP.has(base)) continue;
    const fullPath = path.join(SSH_DIR, name);
    const stat = await fs.stat(fullPath);
    if (stat.isFile() && !name.endsWith('.pub')) {
      const hasPub = await fs.pathExists(path.join(SSH_DIR, `${name}.pub`));
      if (hasPub && !seenBase.has(base)) {
        seenBase.add(base);
        keyPaths.push(fullPath);
      }
    }
  }

  return keyPaths.sort();
}

export function getSshConfigPath(): string {
  return SSH_CONFIG_PATH;
}

export async function readSshConfig(): Promise<string> {
  if (!(await fs.pathExists(SSH_CONFIG_PATH))) {
    return '';
  }
  return fs.readFile(SSH_CONFIG_PATH, 'utf-8');
}

function extractGiManBlocks(content: string): { before: string; after: string } {
  const lines = content.split('\n');
  let inBlock = false;
  let seenHostInBlock = false;
  const before: string[] = [];
  const after: string[] = [];
  let target = before;

  for (const line of lines) {
    if (line.trim().startsWith(GIMAN_SSH_CONFIG_MARKER)) {
      inBlock = true;
      seenHostInBlock = false;
      target = after;
      continue;
    }
    if (inBlock) {
      const trimmed = line.trim();
      const isIndented = line.startsWith(' ') || line.startsWith('\t');
      if (trimmed === '') {
        continue;
      }
      if (isIndented) {
        continue;
      }
      if (/^Host\s+\S+/.test(trimmed)) {
        if (!seenHostInBlock) {
          seenHostInBlock = true;
          continue;
        }
      }
      inBlock = false;
      target = after;
      after.push(line);
      continue;
    }
    target.push(line);
  }

  return {
    before: before.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    after: after.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  };
}

/** Sanitize SSH Host so it cannot break config or inject new Host blocks (no newlines, spaces, quotes, or SSH glob chars). */
function sanitizeSshHost(host: string): string {
  return host.replace(/[^a-zA-Z0-9._-]/g, '').trim();
}

function buildGiManBlock(sshHost: string, identityFile: string): string {
  const safeHost = sanitizeSshHost(sshHost);
  const normalizedPath = identityFile.startsWith('/') ? identityFile : path.resolve(identityFile);
  return [
    `${GIMAN_SSH_CONFIG_MARKER} ${safeHost}`,
    `Host ${safeHost}`,
    '    HostName github.com',
    '    User git',
    `    IdentityFile ${normalizedPath}`,
    '    IdentitiesOnly yes',
    '',
  ].join('\n');
}

export async function writeSshConfigBlocks(blocks: { sshHost: string; identityFile: string }[]): Promise<void> {
  const content = await readSshConfig();
  const { before, after } = extractGiManBlocks(content);
  const newBlocks = blocks.map((b) => buildGiManBlock(b.sshHost, b.identityFile)).join('\n');
  const parts = [before, newBlocks, after].filter(Boolean);
  const out = parts.join('\n\n') + (parts[parts.length - 1]?.endsWith('\n') ? '' : '\n');
  await fs.ensureDir(path.dirname(SSH_CONFIG_PATH));
  await fs.writeFile(SSH_CONFIG_PATH, out, 'utf-8');
}

export async function updateSshConfigFromIdentities(
  identities: { sshHost: string; sshKeyPath: string }[]
): Promise<void> {
  const blocks = identities.map((i) => ({
    sshHost: i.sshHost,
    identityFile: resolveHome(i.sshKeyPath),
  }));
  await writeSshConfigBlocks(blocks);
}
