import { useTranslation } from "react-i18next";

export default function StatusBar({ theme, resolvedTheme, mode, busy, lang }) {
  const { t } = useTranslation();

  return (
    <div className="status-bar" role="status">
      <div className="status-bar-left">
        <span>{busy ? t("status_executing") : t("status_ready_short")}</span>
        <span>mode: {mode}</span>
      </div>
      <div className="status-bar-right">
        <span>theme: {resolvedTheme} ({theme})</span>
        <span>lang: {lang}</span>
        <span>Ctrl+K: palette</span>
      </div>
    </div>
  );
}
