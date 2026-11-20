import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { run, props, closeOverlay, theme, spaces, focused, exec, notify, checking } from "herdr";

const FLEET = 'PATH="$HOME/.local/bin:$PATH" exec fleet "$@"';

const fleet = (args, cwd, on) =>
  exec("sh", ["-c", FLEET, "fleet", ...args], { cwd, on, timeout: 600_000 });

const lastLine = (text) => (text ?? "").trim().split("\n").filter(Boolean).pop() ?? "";

export default class FleetWorktree extends View {
  init(_props, cx) {
    const here = focused();
    const space = spaces().find((s) => s.id === here?.space);
    this.on = space?.machine ?? null;
    this.folder = here?.cwd || space?.folder || null;
    this.where = space ? `${space.name}${this.on ? ` on ${this.on}` : ""}` : "";
    this.text = "";
    this.busy = false;
    this.error = this.folder ? "" : "Focus a terminal in a repo first.";
    this.input = InputState.new({ value: "", placeholder: "branch name" });
    this.input.on("change", (_e, cx) => {
      this.text = this.input.value();
      this.error = "";
      cx.notify();
    });
    this.input.on("submit", (_e, cx) => this.create(cx));
    this.handle = cx.focus_handle();
    this.handle.focus();
    if (!checking()) cx.timer.after(50, () => this.input.focus());
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  create(cx) {
    const branch = this.text.trim();
    if (this.busy || !this.folder) return;
    if (!branch) {
      this.error = "Type a branch name.";
      return cx.notify();
    }
    this.busy = true;
    this.error = "";
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await fleet(["worktree", "create", branch, "--print-path"], this.folder, this.on);
        const path = lastLine(r.stdout);
        if (!path.startsWith("/")) {
          this.error = lastLine(r.stderr) || `fleet worktree create failed (${r.code}).`;
        } else {
          if (r.code !== 0) {
            notify({ title: "Worktree needs setup", body: lastLine(r.stderr), level: "warning" });
          }
          run("space.new", { folder: path, machine: this.on ?? "" });
          this.close();
        }
      } catch (error) {
        this.error = String(error);
      }
      this.busy = false;
      cx.notify();
    });
  }

  render(cx) {
    const t = theme();
    return v_flex()
      .id("fleet-worktree")
      .track_focus(this.handle)
      .on_key_down((e) => {
        if (e.key === "escape") this.close();
      })
      .size_full()
      .p(16)
      .gap(10)
      .bg(t.popover)
      .text_size(13)
      .child(div().font_semibold().text_color(t.foreground).child("New Fleet worktree"))
      .child(
        div()
          .text_color(t.muted)
          .child(
            this.folder
              ? `fleet worktree create from ${this.folder}${this.where ? ` (${this.where})` : ""}. A branch that exists is checked out; worktree local files are copied and dependencies installed.`
              : "No folder to start from.",
          ),
      )
      .when(Boolean(this.folder), (el) =>
        el.child(
          Input.new(this.input)
            .h(32)
            .px(10)
            .items_center()
            .rounded(6)
            .border(1)
            .border_color(t.input)
            .bg(t.background)
            .text_color(t.foreground),
        ),
      )
      .when(Boolean(this.error), (el) => el.child(div().text_color(t.blocked).child(this.error)))
      .child(div().flex_1())
      .child(
        h_flex()
          .justify_end()
          .gap(6)
          .text_size(11)
          .text_color(t.dim)
          .when(this.busy, (el) => el.child(div().frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90)))
          .child(this.busy ? "creating…" : this.folder ? "↵ create · esc cancel" : "esc close"),
      );
  }
}
