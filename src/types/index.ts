import { z } from 'zod';

/** Safe for use in file paths and Host names: no path traversal, no newlines. */
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
/** SSH host alias: only alphanumerics, dot, hyphen — no spaces (SSH treats spaces as pattern separators), no globs or injection chars. */
const SAFE_SSH_HOST_REGEX = /^[a-zA-Z0-9._-]+$/;

export const IdentitySchema = z.object({
  id: z.string().min(1).max(128).regex(SAFE_ID_REGEX, 'Identity ID must contain only letters, numbers, underscore, and hyphen'),
  name: z.string().min(1),
  email: z.string().email(),
  sshKeyPath: z.string().min(1),
  sshHost: z.string().min(1).max(253).regex(SAFE_SSH_HOST_REGEX, 'SSH host alias must contain only letters, numbers, dot, and hyphen (no spaces or special characters)'),
  directories: z.array(z.string()).default([]),
});

export type Identity = z.infer<typeof IdentitySchema>;

export const ConfigSchema = z.object({
  identities: z.array(IdentitySchema),
  defaultIdentity: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG_PATH = '~/.giman/config.json';
export const DEFAULT_GIMAN_DIR = '~/.giman';
export const DEFAULT_GITCONFIGS_DIR = '~/.giman/gitconfigs';
export const DEFAULT_SSH_DIR = '~/.ssh';
export const GIMAN_SSH_CONFIG_MARKER = '# GiMan:';
