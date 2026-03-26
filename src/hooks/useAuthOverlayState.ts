import { useCallback, useState } from "react";
import { displayIdentity } from "../lib/session";
import { toErrorMessage, type TranslateFn } from "../lib/appShell";
import { useAuth } from "./useAuth";
import type { HistoryEntryMeta } from "../types";

type AuthOverlayMode = "none" | "login" | "register" | "profile";

interface UseAuthOverlayStateOptions {
  t: TranslateFn;
  appendToBuffer: (
    command: string,
    output: string,
    showPrompt?: boolean,
    meta?: Partial<HistoryEntryMeta>,
  ) => void;
  setStatusMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
}

export function useAuthOverlayState({
  t,
  appendToBuffer,
  setStatusMessage,
  setErrorMessage,
}: UseAuthOverlayStateOptions) {
  const {
    setUser,
    activeUser,
    isAnonymous,
    loginLocal,
    registerLocal,
    updateDisplayName,
    login,
    refreshUser,
    logout,
  } = useAuth();

  const [authOverlayMode, setAuthOverlayMode] =
    useState<AuthOverlayMode>("none");
  const [authOverlayBusy, setAuthOverlayBusy] = useState(false);
  const [authOverlayError, setAuthOverlayError] = useState("");
  const sessionLabel = displayIdentity(activeUser);

  const openAuthOverlay = useCallback(
    (nextMode: Exclude<AuthOverlayMode, "none">) => {
      setAuthOverlayError("");
      setAuthOverlayMode(nextMode);
    },
    [],
  );

  const closeAuthOverlay = useCallback(() => {
    setAuthOverlayMode("none");
    setAuthOverlayError("");
  }, []);

  const switchAuthOverlayMode = useCallback(
    (nextMode: Exclude<AuthOverlayMode, "none">) => {
      setAuthOverlayError("");
      setAuthOverlayMode(nextMode);
    },
    [],
  );

  const beginGoogleLogin = useCallback(() => {
    closeAuthOverlay();
    appendToBuffer("login", t("login_redirecting"), true, {
      modeLabel: "WEBSITE",
    });
    setStatusMessage(t("login_redirecting"));
    login();
  }, [appendToBuffer, closeAuthOverlay, login, setStatusMessage, t]);

  const handleHeaderLogout = useCallback(async () => {
    try {
      await logout();
      closeAuthOverlay();
      setStatusMessage(t("status_logged_out"));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }, [closeAuthOverlay, logout, setErrorMessage, setStatusMessage, t]);

  const handleLocalLogin = useCallback(
    async (username: string, password: string) => {
      setAuthOverlayBusy(true);
      setAuthOverlayError("");
      try {
        const user = await loginLocal(username, password);
        closeAuthOverlay();
        setStatusMessage(t("status_logged_in", { user: displayIdentity(user) }));
        await refreshUser();
      } catch (error) {
        setAuthOverlayError(toErrorMessage(error));
      } finally {
        setAuthOverlayBusy(false);
      }
    },
    [closeAuthOverlay, loginLocal, refreshUser, setStatusMessage, t],
  );

  const handleLocalRegister = useCallback(
    async (username: string, password: string, displayName: string) => {
      setAuthOverlayBusy(true);
      setAuthOverlayError("");
      try {
        const user = await registerLocal(username, password, displayName);
        closeAuthOverlay();
        setStatusMessage(t("status_logged_in", { user: displayIdentity(user) }));
        await refreshUser();
      } catch (error) {
        setAuthOverlayError(toErrorMessage(error));
      } finally {
        setAuthOverlayBusy(false);
      }
    },
    [closeAuthOverlay, refreshUser, registerLocal, setStatusMessage, t],
  );

  const handleProfileUpdate = useCallback(
    async (displayName: string) => {
      setAuthOverlayBusy(true);
      setAuthOverlayError("");
      try {
        const user = await updateDisplayName(displayName);
        closeAuthOverlay();
        setStatusMessage(
          t("status_profile_updated", { user: displayIdentity(user) }),
        );
        await refreshUser();
      } catch (error) {
        setAuthOverlayError(toErrorMessage(error));
      } finally {
        setAuthOverlayBusy(false);
      }
    },
    [closeAuthOverlay, refreshUser, setStatusMessage, t, updateDisplayName],
  );

  const openSessionOverlay = useCallback(() => {
    openAuthOverlay(isAnonymous ? "login" : "profile");
  }, [isAnonymous, openAuthOverlay]);

  const activeAuthOverlayMode =
    authOverlayMode === "none" ? null : authOverlayMode;

  const authOverlayProps = activeAuthOverlayMode
    ? {
        mode: activeAuthOverlayMode,
        activeUser,
        busy: authOverlayBusy,
        errorMessage: authOverlayError,
        onClose: closeAuthOverlay,
        onSwitchMode: switchAuthOverlayMode,
        onGoogleLogin: beginGoogleLogin,
        onLocalLogin: handleLocalLogin,
        onLocalRegister: handleLocalRegister,
        onUpdateDisplayName: handleProfileUpdate,
        onLogout: handleHeaderLogout,
      }
    : null;

  return {
    setUser,
    activeUser,
    isAnonymous,
    sessionLabel,
    authOverlayProps,
    openAuthOverlay,
    openSessionOverlay,
    beginGoogleLogin,
    handleHeaderLogout,
  };
}
