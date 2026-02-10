import { spawnSync } from 'child_process';
import { readConfig } from '../services/config.js';
import { listIdentities } from '../services/identity.js';
import { promptSelectIdentity } from '../utils/prompts.js';
import { section, info, success, failure } from '../utils/ui.js';

/**
 * Parse SSH clone URL into host and path.
 * e.g. git@github.com:user/repo.git -> { host: 'github.com', path: 'user/repo.git' }
 */
function parseSshCloneUrl(url: string): { host: string; path: string } | null {
  const m = url.match(/^git@([^:]+):(.+)$/);
  if (!m) return null;
  return { host: m[1]!, path: m[2]!.replace(/\/$/, '') };
}

/**
 * Build SSH clone URL using identity's SSH host alias.
 */
function buildCloneUrl(sshHost: string, path: string): string {
  return `git@${sshHost}:${path}`;
}

export async function runClone(repoUrl: string, directory?: string): Promise<void> {
  const parsed = parseSshCloneUrl(repoUrl.trim());
  if (!parsed) {
    failure(
      'Invalid clone URL',
      'Use an SSH URL like git@github.com:user/repo.git or git@github:user/repo.git'
    );
    process.exit(1);
  }

  const config = await readConfig();
  if (!config || config.identities.length === 0) {
    failure('No config or identities', 'Run gid init first, then gid clone.');
    process.exit(1);
  }

  const identities = await listIdentities();
  section('Clone repository');
  info(`Repository: ${repoUrl}`);
  info('Choose which identity (profile) to use for this clone.');
  console.log('');

  const identity = await promptSelectIdentity(identities);
  const cloneUrl = buildCloneUrl(identity.sshHost, parsed.path);

  console.log('');
  info(`Cloning with identity "${identity.id}" (${identity.sshHost})...`);
  info(`URL: ${cloneUrl}`);
  console.log('');

  const args = ['clone', cloneUrl];
  if (directory) args.push(directory);

  const result = spawnSync('git', args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    failure('Clone failed', result.error?.message ?? `git clone exited with code ${result.status}`);
    process.exit(1);
  }

  console.log('');
  success(`Cloned with identity "${identity.id}".`);
}
