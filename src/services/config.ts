import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config, ConfigSchema, DEFAULT_CONFIG_PATH } from '../types/index.js';

export function resolveHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  if (filePath.startsWith('$HOME/')) {
    return path.join(os.homedir(), filePath.slice(6));
  }
  return filePath;
}

export function getConfigPath(customPath?: string): string {
  return resolveHome(customPath ?? DEFAULT_CONFIG_PATH);
}

export async function readConfig(configPath?: string): Promise<Config | null> {
  const fp = getConfigPath(configPath);
  if (!(await fs.pathExists(fp))) {
    return null;
  }
  const raw = await fs.readJson(fp);
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  return result.data;
}

export async function writeConfig(config: Config, configPath?: string): Promise<void> {
  const fp = getConfigPath(configPath);
  const dir = path.dirname(fp);
  await fs.ensureDir(dir);
  await fs.writeJson(fp, config, { spaces: 2 });
}

export async function configExists(configPath?: string): Promise<boolean> {
  return fs.pathExists(getConfigPath(configPath));
}
