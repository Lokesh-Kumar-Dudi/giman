#!/usr/bin/env node
import { Command } from 'commander';
import { registerIdentityCommands } from './commands/identity.js';
import { registerDirectoryCommands } from './commands/directory.js';
import { runInit } from './commands/init.js';
import { runStatus } from './commands/status.js';
import { runApply } from './commands/apply.js';
import { runClone } from './commands/clone.js';

const program = new Command();

program
  .name('gid')
  .description('GiMan - manage multiple git identities via SSH')
  .version('1.0.0');

program.command('init').description('Interactive setup; detects existing config').action(runInit);
program.command('status').description('Show current identity for current directory').action(runStatus);
program.command('apply').description('Apply all configs to system files').action(runApply);
program
  .command('clone <repo-url> [directory]')
  .description('Clone a repo; prompts to select identity (profile) for the clone')
  .action((repoUrl: string, directory?: string) => runClone(repoUrl, directory));

registerIdentityCommands(program);
registerDirectoryCommands(program);

program.parse();
