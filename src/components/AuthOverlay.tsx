import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../types";
import InfoOverlay from "./InfoOverlay";

type AuthOverlayMode = "login" | "register" | "profile";

interface AuthOverlayProps {
  mode: AuthOverlayMode;
  activeUser: User;
  busy: boolean;
  errorMessage: string;
  onClose: () => void;
  onSwitchMode: (mode: AuthOverlayMode) => void;
  onGoogleLogin: () => void;
  onLocalLogin: (username: string, password: string) => Promise<void>;
  onLocalRegister: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  onUpdateDisplayName: (displayName: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export default function AuthOverlay({
  mode,
  activeUser,
  busy,
  errorMessage,
  onClose,
  onSwitchMode,
  onGoogleLogin,
  onLocalLogin,
  onLocalRegister,
  onUpdateDisplayName,
  onLogout,
}: AuthOverlayProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    setUsername("");
    setPassword("");
    setDisplayName(mode === "profile" ? String(activeUser.displayName ?? "") : "");
  }, [activeUser.displayName, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      await onLocalLogin(username, password);
      return;
    }
    if (mode === "register") {
      await onLocalRegister(username, password, displayName);
      return;
    }
    await onUpdateDisplayName(displayName);
  }

  return (
    <InfoOverlay title={t(`auth_overlay_${mode}_title`)} onClose={onClose}>
      <div className="auth-overlay-stack">
        <p className="auth-overlay-note">{t(`auth_overlay_${mode}_subtitle`)}</p>

        <form className="auth-overlay-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode !== "profile" ? (
            <label className="auth-overlay-field">
              <span>{t("auth_field_username")}</span>
              <input
                className="overlay-input auth-overlay-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </label>
          ) : null}

          {mode !== "login" ? (
            <label className="auth-overlay-field">
              <span>{t("auth_field_display_name")}</span>
              <input
                className="overlay-input auth-overlay-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                disabled={busy}
              />
            </label>
          ) : null}

          {mode !== "profile" ? (
            <label className="auth-overlay-field">
              <span>{t("auth_field_password")}</span>
              <input
                className="overlay-input auth-overlay-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                disabled={busy}
              />
            </label>
          ) : null}

          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

          <div className="auth-overlay-actions">
            <button type="submit" className="flat-action-button" disabled={busy}>
              {t(`auth_overlay_${mode}_submit`)}
            </button>

            {mode !== "profile" ? (
              <button
                type="button"
                className="flat-action-button"
                onClick={onGoogleLogin}
                disabled={busy}
              >
                {t("auth_action_google")}
              </button>
            ) : null}

            {mode === "login" ? (
              <button
                type="button"
                className="flat-action-button"
                onClick={() => onSwitchMode("register")}
                disabled={busy}
              >
                {t("auth_action_switch_register")}
              </button>
            ) : null}

            {mode === "register" ? (
              <button
                type="button"
                className="flat-action-button"
                onClick={() => onSwitchMode("login")}
                disabled={busy}
              >
                {t("auth_action_switch_login")}
              </button>
            ) : null}

            {mode === "profile" ? (
              <button
                type="button"
                className="flat-action-button danger"
                onClick={() => void onLogout()}
                disabled={busy}
              >
                {t("session_action_logout")}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </InfoOverlay>
  );
}
