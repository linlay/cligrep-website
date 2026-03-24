import { forwardRef, type ForwardedRef, type KeyboardEvent } from "react";
import type { User } from "../types";

interface PromptLineProps {
  activeUser: User;
  commandPrefix: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  currentModeTheme: string;
  placeholder: string;
}

const PromptLine = forwardRef(function PromptLine(
  { activeUser, commandPrefix, inputValue, onInputChange, onKeyDown, currentModeTheme, placeholder }: PromptLineProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <label className="prompt-line">
      <span className="prompt-user">{activeUser.username}</span>
      <span className="prompt-at">@</span>
      <span className="prompt-ip">{activeUser.ip}</span>
      <span className="prompt-path">:~</span>
      <span className="prompt-dollar">$</span>
      <span className={`prompt-command-prefix ${currentModeTheme}`}>{commandPrefix}</span>
      <input
        ref={ref}
        autoFocus
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={`command-input ${currentModeTheme}`}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        aria-label="Terminal input"
      />
    </label>
  );
});

export default PromptLine;
