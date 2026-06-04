// Cadence domain types.
//
// Spec floor, repeated in all four documents: the code must not use null.
// We honour that with `undefined` and explicit unions — never the `null` literal.

export type Vendor = 'claude' | 'gemini' | 'gpt' | 'grok' | 'codex';

/** An agent's live reachability, shown as a pill in the roster. */
export type AgentStatus = 'ready' | 'active' | 'offline' | 'error';

/**
 * One roster row. Config owns this shape; the chat only reads it.
 *
 * The row names the env var that holds the key (`envVarName`). It never holds
 * the key itself — that line is the spine of the Config spec.
 */
export interface Agent {
	/** Tick stamp; also the IndexedDB key. */
	id: number;
	vendor: Vendor;
	display: string;
	model: string;
	status: AgentStatus;
	/** e.g. "ANTHROPIC_API_KEY". The server reads the real key from here. */
	envVarName: string;
	systemPrompt: string;
	description: string;
	/** The agent that leads the chat. At most one is active per the v1 design. */
	active: boolean;
	/** Empty until auth scopes a roster to a user. Never undefined; '' instead. */
	userId: string;
}

export type Role = 'user' | 'assistant';

/** A single assistant turn's lifecycle. User turns are always 'complete'. */
export type TurnState = 'streaming' | 'complete' | 'stopped' | 'error';

export interface Message {
	id: number;
	role: Role;
	/** Which bot produced an assistant turn; '' for user turns. */
	vendor: Vendor | '';
	text: string;
	state: TurnState;
	/** Measured time to first token, in ms. 0 until the first token lands. */
	ttftMs: number;
	tokenCount: number;
	createdAt: number;
}

/**
 * Command identity is separate from the chord that triggers it — a rebind
 * changes the keys and leaves the command alone (ChordRail spec).
 */
export type ChordCommand =
	| 'jump.editor'
	| 'jump.chat'
	| 'jump.config'
	| 'editor.zapToChat'
	| 'editor.togglePreview'
	| 'workspace.openZapDrawer'
	| 'workspace.cheatSheet'
	| 'jump.git';

export interface ChordBinding {
	command: ChordCommand;
	/** Canonical chord string, e.g. "Alt+Shift+E". */
	chord: string;
	/** Human label for the cheat sheet. */
	label: string;
}

/** The three views the active-view column can host. */
export type ViewName = 'editor' | 'chat' | 'config';

/** A turn as posted to the stateless stream endpoint. */
export interface TranscriptTurn {
	role: Role;
	content: string;
}
