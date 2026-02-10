import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { resolveHome } from './config.js';
import { DEFAULT_GITCONFIGS_DIR } from '../types/index.js';
import type { Identity } from '../types/index.js';

const GITCONFIGS_DIR = resolveHome(DEFAULT_GITCONFIGS_DIR);

/** Identity ID must be safe for use in file paths (no path traversal). */
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function assertPathUnderBase(resolvedPath: string, baseDir: string): void {
  const normalizedPath = path.normalize(resolvedPath);
  const normalizedBase = path.normalize(path.resolve(baseDir)) + path.sep;
  if (normalizedPath !== path.resolve(baseDir) && !normalizedPath.startsWith(normalizedBase)) {
    throw new Error('Identity path would resolve outside gitconfigs directory');
  }
}
const GITCONFIG_PATH = path.join(os.homedir(), '.gitconfig');
const GIMAN_INCLUDE_MARKER = '# GiMan includeIf';

/** Escape a value for git config to prevent section/key injection (newlines, "[", etc.). */
function escapeGitConfigValue(value: string): string {
  const sanitized = value.replace(/[\r\n]/g, ' ').trim();
  const escaped = sanitized.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function getGitconfigPath(): string {
  return GITCONFIG_PATH;
}

export function getIdentityGitconfigPath(identityId: string): string {
  if (!SAFE_ID_REGEX.test(identityId)) {
    throw new Error('Identity ID must contain only letters, numbers, underscore, and hyphen');
  }
  const fp = path.join(GITCONFIGS_DIR, `${identityId}.gitconfig`);
  assertPathUnderBase(path.resolve(fp), GITCONFIGS_DIR);
  return fp;
}

export async function writeIdentityGitconfig(identity: Identity): Promise<void> {
  await fs.ensureDir(GITCONFIGS_DIR);
  const fp = getIdentityGitconfigPath(identity.id);
  const keyPath = resolveHome(identity.sshKeyPath);
  const content = [
    '[user]',
    `    name = ${escapeGitConfigValue(identity.name)}`,
    `    email = ${escapeGitConfigValue(identity.email)}`,
    `[url "git@${identity.sshHost}:"]`,
    '    insteadOf = git@github.com:',
    '',
  ].join('\n');
  await fs.writeFile(fp, content, 'utf-8');
}

export async function removeIdentityGitconfig(identityId: string): Promise<void> {
  const fp = getIdentityGitconfigPath(identityId);
  if (await fs.pathExists(fp)) {
    await fs.remove(fp);
  }
}

export async function readGitconfig(): Promise<string> {
  if (!(await fs.pathExists(GITCONFIG_PATH))) {
    return '';
  }
  return fs.readFile(GITCONFIG_PATH, 'utf-8');
}

function removeGiManIncludeIf(content: string): string {
  const lines = content.split('\n');
  const kept: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const isComment = trimmed === GIMAN_INCLUDE_MARKER;
    const isIncludeIf = trimmed.startsWith('[includeIf "gitdir:');
    if (isComment || isIncludeIf) {
      const blockStart = i;
      i++;
      if (isComment && i < lines.length && lines[i]!.trim().startsWith('[includeIf "gitdir:')) {
        i++;
      }
      if (i < lines.length && lines[i]!.trim().startsWith('path =')) {
        const pathLine = lines[i]!;
        if (pathLine.includes('.giman')) {
          i++;
          if (i < lines.length && lines[i]!.trim() === '') i++;
          continue;
        }
      }
      for (let j = blockStart; j < i; j++) {
        kept.push(lines[j]!);
      }
      continue;
    }
    kept.push(line);
    i++;
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Sanitize gitdir pattern so it cannot break includeIf or inject content (no newlines, no "). */
function sanitizeGitdirPattern(pattern: string): string {
  return pattern.replace(/[\r\n"]/g, '').trim();
}

function buildIncludeIfSection(gitdirPattern: string, configPath: string): string {
  const safePattern = sanitizeGitdirPattern(gitdirPattern);
  const normalizedPath = configPath.startsWith('/') ? configPath : path.resolve(configPath);
  return [
    `${GIMAN_INCLUDE_MARKER}`,
    `[includeIf "gitdir:${safePattern}"]`,
    `    path = ${normalizedPath}`,
    '',
  ].join('\n');
}

export async function updateGitconfigIncludeIf(
  directoryToIdentity: Array<{ directory: string; identityId: string }>
): Promise<void> {
  const content = await readGitconfig();
  const before = removeGiManIncludeIf(content);

  const sections = directoryToIdentity.map(({ directory, identityId }) => {
    const pattern = directory.endsWith('/') ? directory : `${directory}/`;
    const configPath = getIdentityGitconfigPath(identityId);
    return buildIncludeIfSection(pattern, configPath);
  });

  const parts = [before, ...sections].filter(Boolean);
  const out = parts.join('\n') + (parts[parts.length - 1]?.endsWith('\n') ? '' : '\n');
  await fs.ensureDir(path.dirname(GITCONFIG_PATH));
  await fs.writeFile(GITCONFIG_PATH, out, 'utf-8');
}

export async function syncAllIdentityGitconfigs(identities: Identity[]): Promise<void> {
  for (const identity of identities) {
    await writeIdentityGitconfig(identity);
  }
}
