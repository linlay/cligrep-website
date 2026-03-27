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
		setDisplayName(
			mode === "profile" ? String(activeUser.displayName ?? "") : "",
		);
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
				<p className="auth-overlay-note">
					{t(`auth_overlay_${mode}_subtitle`)}
				</p>

				<form
					className="auth-overlay-form"
					onSubmit={(event) => void handleSubmit(event)}
				>
					{mode !== "profile" ? (
						<label className="auth-overlay-field">
							<span>{t("auth_field_username")}</span>
							<input
								className="overlay-input auth-overlay-input"
								value={username}
								onChange={(event) =>
									setUsername(event.target.value)
								}
								autoFocus
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
								onChange={(event) =>
									setDisplayName(event.target.value)
								}
								autoFocus={mode === "profile"}
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
								onChange={(event) =>
									setPassword(event.target.value)
								}
								autoComplete={
									mode === "register"
										? "new-password"
										: "current-password"
								}
								disabled={busy}
							/>
						</label>
					) : null}

					{errorMessage ? (
						<div className="error-banner">{errorMessage}</div>
					) : null}

					<div className="auth-overlay-actions">
						{mode === "login" ? (
							<>
								<button
									type="button"
									className="auth-choice-button auth-choice-button-featured"
									onClick={onGoogleLogin}
									disabled={busy}
								>
									<span
										className="auth-choice-icon"
										aria-hidden="true"
									>
										<GoogleMark />
									</span>
									<span className="auth-choice-label">
										{t("auth_action_google")}
									</span>
								</button>
								<div className="auth-overlay-secondary-grid">
									<button
										type="submit"
										className="auth-choice-button auth-choice-button-local"
										disabled={busy}
									>
										<span
											className="auth-choice-icon"
											aria-hidden="true"
										>
											<TerminalIcon />
										</span>
										<span className="auth-choice-label">
											{t("auth_overlay_login_submit")}
										</span>
									</button>

									<button
										type="button"
										className="auth-choice-button auth-choice-button-register"
										onClick={() => onSwitchMode("register")}
										disabled={busy}
									>
										<span
											className="auth-choice-icon"
											aria-hidden="true"
										>
											<UserPlusIcon />
										</span>
										<span className="auth-choice-label">
											{t("auth_action_switch_register")}
										</span>
									</button>
								</div>
							</>
						) : null}

						{mode === "register" ? (
							<>
								<button
									type="submit"
									className="auth-choice-button auth-choice-button-featured auth-choice-button-local"
									disabled={busy}
								>
									<span
										className="auth-choice-icon"
										aria-hidden="true"
									>
										<UserPlusIcon />
									</span>
									<span className="auth-choice-label">
										{t("auth_overlay_register_submit")}
									</span>
								</button>

								<div className="auth-overlay-secondary-grid">
									<button
										type="button"
										className="auth-choice-button auth-choice-button-google"
										onClick={onGoogleLogin}
										disabled={busy}
									>
										<span
											className="auth-choice-icon"
											aria-hidden="true"
										>
											<GoogleMark />
										</span>
										<span className="auth-choice-label">
											{t("auth_action_google")}
										</span>
									</button>

									<button
										type="button"
										className="auth-choice-button auth-choice-button-back"
										onClick={() => onSwitchMode("login")}
										disabled={busy}
									>
										<span
											className="auth-choice-icon"
											aria-hidden="true"
										>
											<ArrowLeftIcon />
										</span>
										<span className="auth-choice-label">
											{t("auth_action_switch_login")}
										</span>
									</button>
								</div>
							</>
						) : null}

						{mode === "profile" ? (
							<>
								<button
									type="submit"
									className="auth-choice-button auth-choice-button-featured auth-choice-button-local"
									disabled={busy}
								>
									<span
										className="auth-choice-icon"
										aria-hidden="true"
									>
										<CheckIcon />
									</span>
									<span className="auth-choice-label">
										{t("auth_overlay_profile_submit")}
									</span>
								</button>

								<div className="auth-overlay-secondary-grid single">
									<button
										type="button"
										className="auth-choice-button auth-choice-button-danger"
										onClick={() => void onLogout()}
										disabled={busy}
									>
										<span
											className="auth-choice-icon"
											aria-hidden="true"
										>
											<LogoutIcon />
										</span>
										<span className="auth-choice-label">
											{t("session_action_logout")}
										</span>
									</button>
								</div>
							</>
						) : null}
					</div>
				</form>
			</div>
		</InfoOverlay>
	);
}

function GoogleMark() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				fill="#4285F4"
				d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"
			/>
			<path
				fill="#34A853"
				d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.86-2.99c-1.07.72-2.44 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97H1.27v3.12A11.99 11.99 0 0 0 12 24Z"
			/>
			<path
				fill="#FBBC05"
				d="M5.25 14.28A7.19 7.19 0 0 1 4.86 12c0-.79.14-1.56.39-2.28V6.6H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.4l3.98-3.12Z"
			/>
			<path
				fill="#EA4335"
				d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.18 15.23 0 12 0 7.31 0 3.27 2.69 1.27 6.6l3.98 3.12c.95-2.85 3.61-4.97 6.75-4.97Z"
			/>
		</svg>
	);
}

function UserPlusIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M4 20a8 8 0 0 1 16 0"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M18.5 8.5h5M21 6v5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ArrowLeftIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				d="M19 12H5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="m12 19-7-7 7-7"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function TerminalIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				d="m5 7 5 5-5 5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M13 17h6"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				d="m5 13 4 4L19 7"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function LogoutIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="none" role="presentation">
			<path
				d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M16 17l5-5-5-5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M21 12H9"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
