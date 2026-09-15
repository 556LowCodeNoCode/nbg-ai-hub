/**
 * shortcuts.ts — canonical keyboard-shortcut and control-key table.
 *
 * SOURCE OF TRUTH. Every entry here was verified on 2026-09-15 against the
 * installed Claude Code binary (v2.1.235) by extracting its keybinding table
 * and command registry — not copied from a blog post or a video write-up.
 * Roughly a quarter of the third-party claims we checked were wrong, so the
 * rule for this file is: if it isn't in the binary, it doesn't go in here.
 *
 * `action` is Claude Code's own internal action id where one exists
 * (e.g. `chat:stash`) — it is the audit trail back to the binary and the
 * thing to re-grep when a new version ships.
 *
 * There is deliberately NO /shortcuts/ page. A reference page is somewhere a
 * beginner has to go and then come back from; the popover has to answer the
 * whole question in place. Everything here therefore renders in the tooltip.
 *
 * Consumed by:
 *   - src/plugins/remark-shortcut-link.ts (auto-link inside markdown bodies)
 *   - src/lib/shortcut-link-string.ts     (auto-link inside frontmatter strings)
 *   - src/components/primitives/ShortcutKey.astro (popover registry)
 *
 * Adding one: give it a stable `slug`, the display `keys`, every spelling a
 * writer might plausibly type in `aliases`, and a `tldr` under ~160 chars —
 * the popover shows `tldr` only.
 */

export interface Shortcut {
  /** Stable id — the key the popover payload is looked up by. */
  slug: string;
  /** Canonical display form, e.g. "Ctrl+R". Windows/Linux spelling. */
  keys: string;
  /**
   * macOS spelling, when it differs. Per the official keybindings reference
   * (https://code.claude.com/docs/en/keybindings): `alt`/`opt`/`option`/`meta`
   * are all the SAME modifier — Alt on Windows and Linux, Option on macOS.
   * `cmd`/`super`/`win` is the separate Command/Windows key, and Claude Code
   * notes most terminals never report it. So the bindings are identical across
   * platforms; only the modifier's NAME changes. Set this only where it truly
   * differs, and `keysWin` where the default binding itself differs.
   */
  keysMac?: string;
  /** Windows/Linux spelling when the DEFAULT BINDING itself differs (rare). */
  keysWin?: string;
  /** A second default binding for the same action, if one exists. */
  alsoBound?: string;
  /** Caveat shown to everyone. */
  note?: string;
  /** Caveat shown only to Windows readers. */
  noteWin?: string;
  /** Caveat shown only to macOS readers. */
  noteMac?: string;
  /** Claude Code's internal action id, or null for commands//chords without one. */
  action: string | null;
  /** Short label — what it does. */
  does: string;
  /** One or two sentences for the popover. Keep under ~160 chars. */
  tldr: string;
  /** When a beginner would reach for it. */
  when: string;
  /** Section the homepage Shortcuts dialog files it under. */
  group: 'essential' | 'prompt' | 'view' | 'session';
  /** Extra spellings to auto-link. Canonical `keys` is matched automatically. */
  aliases: string[];
}

export const SHORTCUTS: Shortcut[] = [
  {
    slug: 'esc',
    group: 'essential',
    keys: 'Esc',
    action: 'app:interrupt',
    does: 'Stop Claude mid-action',
    tldr: 'Halts whatever Claude is doing right now. The single most important key — it stops the action without ending the session.',
    when: 'The moment Claude starts doing something you did not intend.',
    aliases: ['Escape'],
  },
  {
    slug: 'esc-esc',
    group: 'essential',
    keys: 'Esc Esc',
    action: null,
    does: 'Clear the input box',
    tldr: 'Double-tap Esc clears what you have typed. It does not rewind the conversation — that is /rewind.',
    when: 'Your half-written prompt has turned into a mess and you want a clean line.',
    aliases: ['Esc twice', 'double Esc', 'double-tap Esc'],
  },
  {
    slug: 'shift-tab',
    group: 'essential',
    keys: 'Shift+Tab',
    action: 'chat:cycleMode',
    does: 'Cycle permission mode',
    noteWin: 'On older Windows setups without VT mode, this is Meta+M instead.',
    tldr: 'Cycles between auto, accept-edits, plan and bypass modes. Changes how often Claude stops to ask you.',
    when: 'Starting an exploration (plan) or letting an agreed plan run (accept edits).',
    aliases: ['Shift Tab', 'shift+tab'],
  },

  {
    slug: 'ctrl-j',
    keys: 'Ctrl+J',
    action: 'chat:newline',
    group: 'prompt',
    does: 'Start a new line without sending',
    tldr: 'Adds a line break instead of submitting. The answer to “how do I write a second paragraph without pressing send?”',
    when: 'Any prompt longer than one sentence.',
    aliases: [],
  },
  {
    slug: 'ctrl-r',
    group: 'prompt',
    keys: 'Ctrl+R',
    action: 'history:search',
    does: 'Search your prompt history',
    tldr: 'Searches the prompts you have typed before. Your own past prompts are the best prompt library you have.',
    when: '"What did I type last week that worked?"',
    note: 'Inside the search, Ctrl+S cycles the scope: this session → this project → everywhere.',
    aliases: [],
  },
  {
    slug: 'ctrl-s',
    group: 'prompt',
    keys: 'Ctrl+S',
    action: 'chat:stash',
    does: 'Park the half-written prompt',
    tldr: "Parks what you’re typing so you can do something else, then puts it back. Claude Code calls this ‘stash’.",
    when: 'You are three sentences into a prompt and need to go check something.',
    aliases: [],
  },
  {
    slug: 'ctrl-g',
    group: 'prompt',
    keys: 'Ctrl+G',
    action: 'chat:externalEditor',
    does: 'Edit the prompt in your real editor',
    tldr: 'Opens the current prompt in $EDITOR instead of the terminal box. Also the cheap way to edit a plan by hand.',
    when: 'Writing anything long or carefully structured.',
    aliases: [],
  },
  {
    slug: 'ctrl-v',
    group: 'prompt',
    keys: 'Ctrl+V',
    keysWin: 'Alt+V',
    noteMac: 'Ctrl+V, not Cmd+V — macOS keeps Cmd+V for its own paste.',
    noteWin: 'Windows and WSL use Alt+V. On WSL both Ctrl+V and Alt+V work.',
    action: 'chat:imagePaste',
    does: 'Paste an image',
    tldr: 'Pastes a screenshot straight into the prompt. On macOS this is Ctrl+V — not Cmd+V, which catches everyone once.',
    when: 'Anything visual. Annotate the screenshot first and it works even better.',
    aliases: [],
  },
  {
    slug: 'alt-t',
    group: 'prompt',
    keys: 'Alt+T',
    keysMac: 'Option+T',
    action: 'chat:thinkingToggle',
    does: 'Toggle thinking for the next turn',
    tldr: 'Turns extended reasoning on or off for your next message only, without changing the session effort level.',
    when: 'One hard question in the middle of otherwise simple work.',
    aliases: ['Option+T', 'Opt+T'],
  },

  {
    slug: 'ctrl-o',
    group: 'view',
    keys: 'Ctrl+O',
    action: 'app:toggleTranscript',
    does: 'Toggle the full transcript',
    tldr: 'Expands everything Claude collapsed — every command it ran and every file it touched.',
    when: 'You want to know what it actually did, not the summary.',
    aliases: [],
  },
  {
    slug: 'ctrl-t',
    group: 'view',
    keys: 'Ctrl+T',
    action: 'app:toggleTodos',
    does: 'Toggle the task checklist',
    tldr: "Shows the to-do list Claude is working from — the cheapest way to catch it planning the wrong thing.",
    when: 'Any multi-step task, before it gets far.',
    aliases: [],
  },

  {
    slug: 'ctrl-b',
    group: 'session',
    keys: 'Ctrl+B',
    action: 'task:background',
    does: 'Send the running job to the background',
    alsoBound: 'Ctrl+X Ctrl+B',
    tldr: 'Sends the current job to the background so the session stays usable while it finishes.',
    when: 'A long build, test run, or search you do not want to sit and watch.',
    aliases: [],
  },
  {
    slug: 'alt-p',
    group: 'session',
    keys: 'Alt+P',
    keysMac: 'Option+P',
    action: 'chat:modelPicker',
    does: 'Switch model',
    tldr: 'Opens the model picker. Worth knowing that switching mid-conversation re-reads your context from scratch.',
    when: 'Between tasks — rarely a good idea mid-task.',
    aliases: ['Option+P'],
  },
  {
    slug: 'alt-o',
    group: 'session',
    keys: 'Alt+O',
    keysMac: 'Option+O',
    action: 'chat:fastMode',
    does: 'Toggle fast mode',
    tldr: 'Turns fast mode on or off for the session.',
    when: 'Straightforward work where you would rather have speed than depth.',
    aliases: ['Option+O'],
  },
  {
    slug: 'ctrl-z',
    group: 'session',
    keys: 'Ctrl+Z',
    note: 'Terminal-level shortcut (Unix SIGTSTP), not a Claude Code binding.',
    noteWin: 'Windows has no direct equivalent.',
    action: null,
    does: 'Step out to the shell without quitting',
    tldr: 'Pauses Claude Code and hands you back the terminal. Type `fg` to come straight back — nothing is lost.',
    when: 'You need the terminal for one command and do not want to lose the session.',
    aliases: [],
  },
  {
    slug: 'ctrl-underscore',
    group: 'prompt',
    keys: 'Ctrl+_',
    action: 'chat:undo',
    does: 'Undo in the input box',
    tldr: 'Undoes your last edit to the text you are typing. Editing only — it does not undo anything Claude did.',
    when: 'You deleted half a prompt by accident.',
    aliases: [],
  },
];

export const SHORTCUT_GROUPS = [
  { key: 'essential', label: 'The three to learn first', blurb: 'If you remember nothing else.' },
  { key: 'prompt', label: 'Writing the prompt', blurb: 'Composing, searching, pasting.' },
  { key: 'view', label: 'Seeing what happened', blurb: 'What Claude did and what it plans to do.' },
  { key: 'session', label: 'Running the session', blurb: 'Long jobs, models, the terminal.' },
] as const;

/**
 * Split a combo into individual key caps so the UI can render
 * `Ctrl+T` as [Ctrl] + [T] rather than one wide chip.
 *
 * Two joiners in the data, and they mean different things:
 *   "Ctrl+T"  → keys pressed together      → parts joined by "+"
 *   "Esc Esc" → keys pressed in sequence   → parts joined by a thin space
 * Rendering them differently is the point: a reader should be able to tell
 * "hold both" from "press twice" without being told.
 */
export function splitKeys(keys: string): { parts: string[]; joiner: '+' | 'then' } {
  if (keys.includes('+')) {
    return { parts: keys.split('+').map((k) => k.trim()).filter(Boolean), joiner: '+' };
  }
  const spaced = keys.trim().split(/\s+/);
  if (spaced.length > 1) return { parts: spaced, joiner: 'then' };
  return { parts: [keys.trim()], joiner: '+' };
}

/** The spelling to show for a given OS. */
export function keysFor(s: Shortcut, os: 'mac' | 'windows'): string {
  if (os === 'mac' && s.keysMac) return s.keysMac;
  if (os === 'windows' && s.keysWin) return s.keysWin;
  return s.keys;
}
