# cligrep website guardrails

## Product positioning
- This product is a homepage-style website, not a pure web terminal or browser console.
- The homepage focus is the command line itself and the hot CLI list directly below it.
- Homepage copy must stay minimal and action-oriented. Do not explain the design, philosophy, or product framing with large text blocks.

## Required homepage structure
- The homepage must contain:
  - a visible command input entry point
  - a visible hot CLI list directly below the command input
  - compact corner controls for theme/language and session actions
- Hot CLI content must be visible on the homepage without requiring execution mode.
- Default home state should feel quiet and usable, not explanatory.

## Visual direction
- The whole site should keep a Bash / Terminal flavor.
- Apple-style red / yellow / green window controls are required whenever a terminal window metaphor is used.
- Monospace typography, prompt styling, terminal chrome, and shell vocabulary are encouraged.
- Terminal visuals must support the homepage experience; they must not turn the whole product into a fullscreen console.
- Theme, language, and login controls belong in the corner and should preferably use dropdown-style controls.

## Historical baseline
- Use commit `f77710e` (`init`) as the early visual/reference baseline for homepage intent.
- Do not use `bee717f` as a UI rollback target; that commit only contains the initial README and no actual website implementation.

## Anti-patterns
- Do not redesign the homepage into a command-line control center, terminal dashboard, or web shell.
- Do not make scrolling command history or terminal output the dominant first-screen content on the homepage.
- Do not hide the ranked CLI discovery surface behind command execution flows.
- Do not add large marketing copy, onboarding paragraphs, feature pills, runbook blocks, hot-now callout blocks, or design self-explanations to the homepage.
- Do not show generic help text on the homepage when the same help can appear only when the user reaches the relevant state.
