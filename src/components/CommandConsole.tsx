import type { KeyboardEvent, RefObject } from "react";
import { commandIdentity } from "../lib/cliView";
import type { CliView, HistoryEntry, InlineMode, User } from "../types";
import OutputPanel from "./OutputPanel";
import PromptLine from "./PromptLine";
import TerminalWindow from "./TerminalWindow";

interface CommandConsoleProps {
	activeUser: User;
	selectedCommand: CliView;
	currentModeTheme: "website" | "text" | "sandbox";
	inputRef: RefObject<HTMLInputElement>;
	inlineRef: RefObject<HTMLInputElement>;
	inputValue: string;
	inlineMode: InlineMode;
	inlineValue: string;
	onInputChange: (value: string) => void;
	onInlineChange: (value: string) => void;
	onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	onInlineKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	shortcutCommands: string[];
	onApplyQuickSlot: (index: number) => void;
	errorMessage: string;
	shouldShowOutputPanel: boolean;
	currentOutputEntry: HistoryEntry | null;
	emptyLabel: string;
	historyPositionLabel: string;
	durationLabel: string;
	modeLabel: string;
	onShowOlder: () => void;
	onShowNewer: () => void;
	canShowOlder: boolean;
	canShowNewer: boolean;
	olderLabel: string;
	newerLabel: string;
	placeholderSearch: string;
	placeholderArgs: string;
	commentInputPromptLabel: string;
	commentInputPlaceholder: string;
	escapeHintLabel: string;
	quickSlotHint: (slot: number, hint: string) => string;
}

export default function CommandConsole({
	activeUser,
	selectedCommand,
	currentModeTheme,
	inputRef,
	inlineRef,
	inputValue,
	inlineMode,
	inlineValue,
	onInputChange,
	onInlineChange,
	onInputKeyDown,
	onInlineKeyDown,
	shortcutCommands,
	onApplyQuickSlot,
	errorMessage,
	shouldShowOutputPanel,
	currentOutputEntry,
	emptyLabel,
	historyPositionLabel,
	durationLabel,
	modeLabel,
	onShowOlder,
	onShowNewer,
	canShowOlder,
	canShowNewer,
	olderLabel,
	newerLabel,
	placeholderSearch,
	placeholderArgs,
	commentInputPromptLabel,
	commentInputPlaceholder,
	escapeHintLabel,
	quickSlotHint,
}: CommandConsoleProps) {
	return (
		<TerminalWindow
			className="command-console-window"
			title={commandIdentity(selectedCommand)}
			badge={selectedCommand.environmentKind}
			badgeTheme={currentModeTheme}
			escapeHintLabel={escapeHintLabel}
		>
			<div className="terminal-body command-console-body">
				<div className="console-input-row">
					{inlineMode === "comment-prompt" ? (
						<div className="inline-prompt-line">
							<span className="inline-prompt-label">
								{commentInputPromptLabel}:
							</span>
							<input
								ref={inlineRef}
								className="inline-prompt-input"
								value={inlineValue}
								onChange={(event) =>
									onInlineChange(event.target.value)
								}
								onKeyDown={onInlineKeyDown}
								placeholder={commentInputPlaceholder}
								spellCheck={false}
								autoComplete="off"
							/>
						</div>
					) : (
						<PromptLine
							ref={inputRef}
							activeUser={activeUser}
							commandPrefix={selectedCommand.command}
							inputValue={inputValue}
							onInputChange={onInputChange}
							onKeyDown={onInputKeyDown}
							currentModeTheme={currentModeTheme}
							placeholder={
								selectedCommand.environmentKind === "WEBSITE"
									? placeholderSearch
									: placeholderArgs
							}
						/>
					)}
				</div>

				<div className="console-shortcuts-row">
					<div className="console-shortcuts-list">
						{shortcutCommands.slice(0, 3).map((hint, index) => (
							<button
								key={hint}
								type="button"
								className="console-shortcut-chip"
								onClick={() => onApplyQuickSlot(index)}
							>
								{quickSlotHint(index + 1, hint)}
							</button>
						))}
					</div>
				</div>

				{errorMessage ? (
					<div className="error-banner">{errorMessage}</div>
				) : null}

				{shouldShowOutputPanel ? (
					<OutputPanel
						currentEntry={currentOutputEntry}
						activeUser={activeUser}
						emptyLabel={emptyLabel}
						historyPositionLabel={historyPositionLabel}
						durationLabel={durationLabel}
						modeLabel={modeLabel}
						onShowOlder={onShowOlder}
						onShowNewer={onShowNewer}
						canShowOlder={canShowOlder}
						canShowNewer={canShowNewer}
						olderLabel={olderLabel}
						newerLabel={newerLabel}
					/>
				) : null}
			</div>
		</TerminalWindow>
	);
}
