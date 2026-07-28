import path from 'path';
import { readConfig, writeConfig, resolveHome } from './config.js';
import { generateKey, listExistingKeys, updateSshConfigFromIdentities } from './ssh.js';
import {
  writeIdentityGitconfig,
  removeIdentityGitconfig,
  updateGitconfigIncludeIf,
  syncAllIdentityGitconfigs,
} from './git-config.js';
import type { Config, Identity } from '../types/index.js';

export async function listIdentities(): Promise<Identity[]> {
  const config = await readConfig();
  return config?.identities ?? [];
}

export async function getIdentity(id: string): Promise<Identity | null> {
  const config = await readConfig();
  return config?.identities.find((i) => i.id === id) ?? null;
}

export async function addIdentity(identity: Identity): Promise<void> {
  const config = await readConfig();
  const identities = config?.identities ?? [];
  if (identities.some((i) => i.id === identity.id)) {
    throw new Error(`Identity "${identity.id}" already exists`);
  }
  const next = { ...config, identities: [...identities, identity] } as Config;
  if (!config?.identities?.length) {
    next.defaultIdentity = identity.id;
  }
  await writeConfig(next);
  await writeIdentityGitconfig(identity);
}

export async function updateIdentity(id: string, updates: Partial<Omit<Identity, 'id'>>): Promise<void> {
  const config = await readConfig();
  if (!config) throw new Error('No config found');
  const idx = config.identities.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Identity "${id}" not found`);
  const identity = { ...config.identities[idx]!, ...updates };
  config.identities[idx] = identity;
  await writeConfig(config);
  await writeIdentityGitconfig(identity);
}

export async function removeIdentity(id: string): Promise<void> {
  const config = await readConfig();
  if (!config) throw new Error('No config found');
  const identities = config.identities.filter((i) => i.id !== id);
  if (identities.length === config.identities.length) {
    throw new Error(`Identity "${id}" not found`);
  }
  const defaultIdentity =
    config.defaultIdentity === id ? identities[0]?.id : config.defaultIdentity;
  await writeConfig({ ...config, identities, defaultIdentity });
  await removeIdentityGitconfig(id);
}

function resolveDir(directory: string): string {
  return path.resolve(resolveHome(directory));
}

export async function addDirectoryToIdentity(identityId: string, directory: string): Promise<void> {
  const config = await readConfig();
  if (!config) throw new Error('No config found');
  const identity = config.identities.find((i) => i.id === identityId);
  if (!identity) throw new Error(`Identity "${identityId}" not found`);
  const normalizedDir = resolveDir(directory);
  if (identity.directories.includes(normalizedDir)) return;
  identity.directories = [...identity.directories, normalizedDir];
  await writeConfig(config);
  await refreshGitconfigIncludeIf(config);
}

export async function removeDirectory(directory: string): Promise<void> {
  const config = await readConfig();
  if (!config) throw new Error('No config found');
  const normalizedDir = resolveDir(directory);
  let changed = false;
  for (const identity of config.identities) {
    const idx = identity.directories.indexOf(normalizedDir);
    if (idx !== -1) {
      identity.directories = identity.directories.filter((d) => d !== normalizedDir);
      changed = true;
    }
  }
  if (changed) {
    await writeConfig(config);
    await refreshGitconfigIncludeIf(config);
  }
}

export async function refreshGitconfigIncludeIf(config?: Config | null): Promise<void> {
  const c = config ?? (await readConfig());
  if (!c) return;
  const directoryToIdentity: Array<{ directory: string; identityId: string }> = [];
  for (const identity of c.identities) {
    for (const dir of identity.directories) {
      directoryToIdentity.push({ directory: dir, identityId: identity.id });
    }
  }
  await updateGitconfigIncludeIf(directoryToIdentity);
}

export async function applySshConfig(identities: Identity[], withPermission: () => Promise<boolean>): Promise<boolean> {
  const allowed = await withPermission();
  if (!allowed) return false;
  await updateSshConfigFromIdentities(
    identities.map((i) => ({ sshHost: i.sshHost, sshKeyPath: i.sshKeyPath }))
  );
  return true;
}

export { generateKey, listExistingKeys };
