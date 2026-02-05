# GitBuddy (gib) — Documentation

  

Manage multiple Git identities via SSH so you can use personal and work GitHub accounts on the same machine.

  

---

  

## Install

  

```bash

npm  install  -g  gitbuddy

```

  

Requires **Node.js 18+**.

  

---

  

## Quick start

  

1.  **Initialize** (creates `~/.gitbuddy/config.json`, detects existing config):

  

```bash

gib init

```

  

2.  **Map directories** to identities so Git uses the right identity per folder:

  

```bash

gib dir add ~/dev/personal --identity personal

gib dir add ~/dev/work --identity work

```

  

3.  **Check current identity** in the current directory:

  

```bash

gib status

```

  

---

  

## Commands reference

  


| Command                             | Description                                                         |
|-------------------------------------|---------------------------------------------------------------------|
| `gib init`                          | Interactive setup and config detection                               |
| `gib status`                        | Show active identity for the current directory                       |
| `gib apply`                         | Apply config to `~/.gitconfig` and `~/.ssh/config`                   |
| `gib identity list`                 | List all identities                                                  |
| `gib identity add`                  | Add a new identity (interactive)                                     |
| `gib identity edit <id>`            | Edit an existing identity                                            |
| `gib identity remove <id>`          | Remove an identity                                                   |
| `gib identity show <id>`            | Show details for one identity                                        |
| `gib dir add <path> --identity <id>`| Map a directory to an identity                                       |
| `gib dir remove <path>`             | Remove a directory mapping                                           |
| `gib dir list`                      | List all directory mappings                                          |


  

---

  

## Command details

  

###  `gib init`

  

**What it does:** One-time interactive setup. If you don’t have config yet, it walks you through creating your first identity (ID, name, email, SSH key path, SSH host alias). It then creates `~/.gitbuddy/config.json`, writes per-identity Git configs, updates `~/.gitconfig` with `includeIf` rules, and optionally updates `~/.ssh/config` with Host blocks.

  

**If config already exists:** It detects your existing identities and asks whether to apply them now (write to `~/.ssh/config` and `~/.gitconfig`). Use this after cloning your config to a new machine or to re-apply after manual edits.

  

**When to use:** First time setup, or after moving to a new machine. Run once before using other commands.

  

```bash
gib  init
```

  

---

  

### `gib status`

  

**What it does:** Shows which identity is active for your **current working directory**. It looks up your CWD in the directory mappings and prints the matching identity (id, name, email), or tells you no identity is mapped and suggests `gib dir add . --identity <id>`.

  

**When to use:** To confirm which account Git will use for commits and SSH in the current folder.

  

```bash
cd  ~/dev/work/project

gib  status
# Identity: work — John Doe <john@company.com>

```

---

  

### `gib apply`

  

**What it does:** Writes the **current** state of `~/.gitbuddy/config.json` out to the system: updates `~/.ssh/config` (Host blocks for each identity), writes identity gitconfigs under `~/.gitbuddy/gitconfigs`, and refreshes `~/.gitconfig` includeIf rules. It will prompt before modifying `~/.ssh/config`.

  

**When to use:** After you’ve added/edited identities or directory mappings (e.g. via `gib identity add`, `gib dir add`, or by editing the JSON) and want those changes to take effect. Also useful if you manually changed `~/.ssh/config` or `~/.gitconfig` and want to re-sync from GitBuddy.

  

```bash
gib  apply
```

  

---

  

### `gib identity list`

  

**What it does:** Lists every identity in your config. For each identity it shows: id, name, email, SSH key path (tilde form), SSH host alias, and which directories are mapped to it.

  

**When to use:** To see all identities and their mappings at a glance.

  

```bash
gib  identity  list
```

  

---

  

### `gib identity add`

  

**What it does:** Interactive flow to add a **new** identity. Prompts for: identity ID (e.g. `personal`, `work`), display name, email, and SSH key (path or generate new). Saves to config and optionally updates `~/.ssh/config`. The new identity has no directories until you run `gib dir add`.

  

**When to use:** When you need a second (or third) GitHub account or Git identity on the same machine.

  

```bash
gib  identity  add
```

  

---

  

### `gib identity edit <id>`

  

**What it does:** Edits an existing identity by **id**. Prompts for name, email, and SSH host alias (existing values pre-filled). Updates only those fields in config; it does **not** change the SSH key path. After editing, run `gib apply` if you want SSH/gitconfig rewritten immediately.

  

**When to use:** You changed your name/email or want to rename the SSH host alias (e.g. `github-work` → `github-company`).

  

```bash
gib  identity  edit  work
```

  

---

  

### `gib identity remove <id>`

  

**What it does:** Removes the identity with the given **id** from config and removes all directory mappings that pointed to it. Then rewrites `~/.ssh/config` so that Host block is gone.

  

**When to use:** You no longer use that account or identity on this machine.

  

```bash
gib  identity  remove  work
```

  

---

  

### `gib identity show <id>`

  

**What it does:** Prints full details for one identity: name, email, SSH key path, SSH host alias, and the list of directories mapped to it. Exits with an error if the id doesn’t exist.

  

**When to use:** To double-check one identity’s settings and which paths use it.

  

```bash
gib  identity  show  personal
```

  

---

  

### `gib dir add <path> --identity <id>`

  

**What it does:** Maps a **directory path** to an identity. Any repo inside that path (including subdirectories) will use that identity’s `user.name`, `user.email`, and SSH key. Path can be absolute or use `~`; `.` means current directory. The identity must already exist (from `gib init` or `gib identity add`).

  

**Options:**  `-i, --identity <id>` (required) — the identity id to attach the path to.

  

**When to use:** When you want “everything under this folder” to use a specific account (e.g. `~/dev/personal` → personal, `~/dev/work` → work).

  

```bash
gib  dir  add  ~/dev/personal  --identity  personal
gib  dir  add  .  --identity  work
```

  

---

  

### `gib dir remove <path>`

  

**What it does:** Removes the directory mapping for the given path. The path is resolved the same way as for `dir add` (e.g. `~` expanded). Repos under that path will no longer auto-use an identity from GitBuddy until you add a mapping again.

  

**When to use:** You moved a project or no longer want that folder to use a specific identity.

  

```bash
gib  dir  remove  ~/dev/work
```

  

---

  

### `gib dir list`

  

**What it does:** Lists all directory-to-identity mappings. For each identity that has directories, it prints the identity id and the paths mapped to it.

  

**When to use:** To see which folders are tied to which identity.

  

```bash
gib  dir  list
```

  

---

  

## Examples

  

### Add and use two identities

  

```bash
# One-time setup
gib  init
# Create "personal" (name, email, SSH key path)

# Create "work" (name, email, SSH key path)
gib  dir  add  ~/dev/personal  --identity  personal
gib  dir  add  ~/dev/work  --identity  work
gib  apply

```

  

### Clone with the right identity

  

Use the **SSH host alias** for the identity when cloning:

  
| Identity  | SSH Host Alias (used in URL) | Example Clone URL                                  |
|-----------|------------------------------|----------------------------------------------------|
| personal  | `github-personal`            | `git@github-personal:username/repo.git`            |
| work      | `github-work`                | `git@github-work:company/repo.git`                 |


```bash
cd  ~/dev/personal
git  clone  git@github-personal:username/my-repo.git

cd  ~/dev/work
git  clone  git@github-work:company/project.git

```

  

### Commits and push (automatic in mapped dirs)

  

Inside a mapped directory, `user.name` and `user.email` are set automatically; SSH uses the right key for push.

  

```bash
cd  ~/dev/work/project

git  config  user.email
# john@company.com

git  commit  -m  "feat: add feature"
# Committed as: John Doe <john@company.com>

git  push  origin  main
# Uses the correct SSH key
```

  

### Fix existing repo to use an identity

  

Point the remote at the identity’s SSH host alias:

  

```bash

cd  ~/dev/personal/existing-repo

git  remote  set-url  origin  git@github-personal:username/existing-repo.git

git  remote  -v

# origin git@github-personal:username/existing-repo.git (fetch)

# origin git@github-personal:username/existing-repo.git (push)

```

  

### List and inspect

  

```bash
gib  identity  list

gib  identity  show  personal

gib  dir  list

gib  status
```

  

---

  

## Config location

  

-  **GitBuddy config:**  `~/.gitbuddy/config.json` (identities, SSH key paths, directory mappings).

-  **Git:**  `~/.gitconfig` gets `includeIf` directives when you run `gib init`, `gib identity add`, `gib dir add`, or `gib apply`.

-  **SSH:**  `~/.ssh/config` gets `Host` blocks for each identity (e.g. `github-personal`, `github-work`) when you run those commands (with your permission).

  

---

  

## License

  

MIT.