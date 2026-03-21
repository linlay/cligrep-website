import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

const PromptLine = forwardRef(function PromptLine(
  { activeUser, currentCli, inputValue, onInputChange, onKeyDown, currentModeTheme },
  ref,
) {
  const { t } = useTranslation();

  return (
    <label className="prompt-line">
      <span className="prompt-user">{activeUser.username}</span>
      <span className="prompt-at">@</span>
      <span className="prompt-ip">{activeUser.ip}</span>
      <span className="prompt-path">:~</span>
      <span className="prompt-dollar">$ </span>
      <input
        ref={ref}
        autoFocus
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={`command-input ${currentModeTheme}`}
        spellCheck="false"
        autoComplete="off"
        placeholder={currentCli ? t("placeholder_help") : t("placeholder_search")}
        aria-label="Terminal input"
      />
    </label>
  );
});

export default PromptLine;
