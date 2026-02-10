import chalk from 'chalk';
import path from 'path';
import { readConfig } from '../services/config.js';
import { resolveHome } from '../services/config.js';
import { section, info, success } from '../utils/ui.js';

export async function runStatus(): Promise<void> {
  const config = await readConfig();
  if (!config || config.identities.length === 0) {
    section('Status');
    info('No identities configured yet.');
    console.log('  Run ' + chalk.cyan('gid init') + ' to set up your first identity.');
    return;
  }

  const cwd = process.cwd();
  const cwdNormalized = path.resolve(cwd) + path.sep;

  let matched: { id: string; email: string; name: string } | null = null;
  let longestMatch = 0;

  for (const identity of config.identities) {
    for (const dir of identity.directories) {
      const resolved = resolveHome(dir);
      const prefix = path.resolve(resolved);
      const prefixWithSep = prefix.endsWith(path.sep) ? prefix : prefix + path.sep;
      if (cwdNormalized.startsWith(prefixWithSep) || cwd === prefix) {
        if (prefix.length > longestMatch) {
          longestMatch = prefix.length;
          matched = { id: identity.id, email: identity.email, name: identity.name };
        }
      }
    }
  }

  section('Current directory');
  if (matched) {
    success('Identity: ' + chalk.cyan(matched.id) + ' — ' + matched.name + ' <' + matched.email + '>');
    info('Commits and push/pull here will use this identity.');
  } else {
    info('No identity is mapped for this directory.');
    console.log('  Map it: ' + chalk.cyan('gid dir add . --identity <id>'));
  }
}
