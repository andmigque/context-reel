//// # types
//// ContextReel domain types.
////
//// Spec floor, repeated in all four documents: the code must not use `null`. We honour that with
//// `undefined` and explicit unions — never the `null` literal.
////
//// ## Types

//// ### Vendor
//// The four model families the roster can configure.
export type Vendor = 'claude' | 'gemini' | 'gpt' | 'grok';

//// ### ModelStatus
//// A configured model's live reachability, shown as a pill in the roster.
export type ModelStatus = 'ready' | 'selected' | 'offline' | 'error';

//// ### ConfiguredModel
//// One roster row. Config owns this shape; the chat only reads it.
//// The row names the env var that holds the key (`envVarName`); it never holds the key itself — that
//// line is the spine of the Config spec.
export interface ConfiguredModel {
	//// - `number`: __id__
	////     - *Tick stamp; also the IndexedDB key.*
	id: number;
	//// - `Vendor`: __vendor__
	////     - *Which model family this row configures.*
	vendor: Vendor;
	//// - `string`: __display__
	////     - *Display name shown in the roster.*
	display: string;
	//// - `string`: __model__
	////     - *Provider model id, e.g. `claude-sonnet-4-6`.*
	model: string;
	//// - `ModelStatus`: __status__
	////     - *Live reachability pill.*
	status: ModelStatus;
	//// - `string`: __envVarName__
	////     - *e.g. "ANTHROPIC_API_KEY". The server reads the real key from here.*
	envVarName: string;
	//// - `string`: __systemPrompt__
	////     - *Per-model system prompt; '' when unset.*
	systemPrompt: string;
	//// - `string`: __description__
	////     - *Free-text note about the model.*
	description: string;
	//// - `boolean`: __selected__
	////     - *The selected model for the next message. At most one row is selected.*
	selected: boolean;
	//// - `string`: __userId__
	////     - *Empty until auth scopes a roster to a user. Never undefined; '' instead.*
	userId: string;
}

//// ### Role
//// Who authored a message turn.
export type Role = 'user' | 'assistant';

//// ### TurnState
//// A single assistant turn's lifecycle. User turns are always 'complete'.
export type TurnState = 'streaming' | 'complete' | 'stopped' | 'error';

//// ### Message
//// One turn in the shared history.
export interface Message {
	//// - `number`: __id__
	////     - *Tick stamp; also the IndexedDB key.*
	id: number;
	//// - `Role`: __role__
	////     - *User or assistant.*
	role: Role;
	//// - `Vendor | ''`: __vendor__
	////     - *Which model produced an assistant turn; '' for user turns.*
	vendor: Vendor | '';
	//// - `string`: __text__
	////     - *The message content.*
	text: string;
	//// - `TurnState`: __state__
	////     - *Lifecycle of this turn.*
	state: TurnState;
	//// - `number`: __ttftMs__
	////     - *Measured time to first token, in ms. 0 until the first token lands.*
	ttftMs: number;
	//// - `number`: __tokenCount__
	////     - *Tokens counted for this turn.*
	tokenCount: number;
	//// - `number`: __createdAt__
	////     - *Creation tick stamp.*
	createdAt: number;
}

//// ### ChordCommand
//// Command identity is separate from the chord that triggers it — a rebind changes the keys and leaves
//// the command alone (ChordRail spec).
export type ChordCommand =
	| 'jump.editor'
	| 'jump.chat'
	| 'jump.config'
	| 'jump.markmap'
	| 'editor.zapToChat'
	| 'editor.togglePreview'
	| 'workspace.openZapDrawer'
	| 'workspace.cheatSheet'
	| 'jump.git';

//// ### ChordBinding
//// Binds a command to the keys that fire it and the label shown in the cheat sheet.
export interface ChordBinding {
	//// - `ChordCommand`: __command__
	////     - *The command this binding fires.*
	command: ChordCommand;
	//// - `string`: __chord__
	////     - *Canonical chord string, e.g. "Alt+Shift+E".*
	chord: string;
	//// - `string`: __label__
	////     - *Human label for the cheat sheet.*
	label: string;
}

//// ### ViewName
//// The views the active-view column can host.
export type ViewName = 'editor' | 'chat' | 'config' | 'markmap';

//// ### TranscriptTurn
//// A turn as posted to the stateless stream endpoint.
export interface TranscriptTurn {
	//// - `Role`: __role__
	////     - *User or assistant.*
	role: Role;
	//// - `string`: __content__
	////     - *The turn's text content.*
	content: string;
}
