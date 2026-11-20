# fleet-worktree

A Herdr app mod: a dialog that asks for a branch name and runs `fleet worktree create <branch>` from the focused terminal's folder, on that space's machine, then opens the new task worktree as a space.

Fleet clones this repo into `~/.config/herdr-app/mods/fleet-worktree` on hosts that opt into `herdr-app`, and binds it to `cmd-shift-n` (macOS) or `ctrl-shift-g` (Linux) with `mod.open:fleet-worktree`.

Fleet is expected at `~/.local/bin/fleet` on every machine.
