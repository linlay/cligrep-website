import type { ReactNode } from "react";

interface TerminalWindowProps {
	title: string;
	badge: string;
	badgeTheme: string;
	children: ReactNode;
	className?: string;
	escapeHintLabel?: string;
}

export default function TerminalWindow({
	title,
	badge,
	badgeTheme,
	children,
	className = "",
	escapeHintLabel,
}: TerminalWindowProps) {
	return (
		<section className={`terminal-window ${className}`.trim()}>
			<div className="terminal-topbar">
				<div className="traffic-lights" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<h2 className="terminal-title">{title}</h2>
				<div className={`mode-badge ${badgeTheme}`}>
					{escapeHintLabel}
				</div>
			</div>
			{children}
		</section>
	);
}
