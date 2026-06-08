//// # defaults
//// Vendor defaults: the static facts about each model family, and the roster seeded on first run.
////
//// ## Imports
import type { ConfiguredModel, Vendor } from '$lib/types';

//// ## Types

//// ### VendorMeta
//// Static facts about each vendor: its brand colour and the env var that holds its key.
export interface VendorMeta {
	//// - `Vendor`: __vendor__
	////     - *The model family.*
	vendor: Vendor;
	//// - `string`: __label__
	////     - *Display label, e.g. "Claude".*
	label: string;
	//// - `string`: __color__
	////     - *Brand colour as a CSS var reference.*
	color: string;
	//// - `string`: __defaultModel__
	////     - *Provider model id used when seeding a row.*
	defaultModel: string;
	//// - `string`: __envVarName__
	////     - *Name of the env var holding this vendor's key.*
	envVarName: string;
}

//// ## Constants

//// ### VENDOR_META
//// Static metadata for every vendor, keyed by `Vendor`.
export const VENDOR_META: Record<Vendor, VendorMeta> = {
	claude: {
		vendor: 'claude',
		label: 'Claude',
		color: 'var(--vendor-claude)',
		defaultModel: 'claude-sonnet-4-6',
		envVarName: 'ANTHROPIC_API_KEY'
	},
	gemini: {
		vendor: 'gemini',
		label: 'Gemini',
		color: 'var(--vendor-gemini)',
		defaultModel: 'gemini-3.5-flash',
		envVarName: 'GOOGLE_API_KEY'
	},
	gpt: {
		vendor: 'gpt',
		label: 'GPT',
		color: 'var(--vendor-gpt)',
		defaultModel: 'gpt-5.5',
		envVarName: 'OPENAI_API_KEY'
	},
	grok: {
		vendor: 'grok',
		label: 'Grok',
		color: 'var(--vendor-grok)',
		defaultModel: 'grok-4.3',
		envVarName: 'XAI_API_KEY'
	}
};

//// ### VENDOR_ORDER
//// The order providers appear when adding a model.
export const VENDOR_ORDER: Vendor[] = ['claude', 'gemini', 'gpt', 'grok'];

//// ## Functions

//// ### defaultRoster
//// The roster seeded into an empty store on first run. Claude starts selected; the rest wait their
//// turn. Tick stamps are assigned at seed time so the keys are real.
export function defaultRoster(tickBase: number): ConfiguredModel[] {
	//// **Parameters**
	//// - `number`: __tickBase__
	////     - *Base tick stamp; each seed row takes `tickBase + i` as its id.*
	//// **Returns**
	//// - `ConfiguredModel[]`
	////     - *The four seeded roster rows, Claude selected.*
	const seeds: Array<{ vendor: Vendor; selected: boolean; status: ConfiguredModel['status']; description: string }> = [
		{ vendor: 'claude', selected: true, status: 'selected', description: 'Claude Sonnet from Anthropic.' },
		{ vendor: 'gemini', selected: false, status: 'ready', description: 'Gemini from Google.' },
		{ vendor: 'gpt', selected: false, status: 'ready', description: 'GPT from OpenAI.' },
		{ vendor: 'grok', selected: false, status: 'ready', description: 'Grok from xAI.' }
	];

	return seeds.map((seed, i) => {
		const meta = VENDOR_META[seed.vendor];
		return {
			id: tickBase + i,
			vendor: seed.vendor,
			display: meta.label,
			model: meta.defaultModel,
			status: seed.status,
			envVarName: meta.envVarName,
			systemPrompt: '',
			description: seed.description,
			selected: seed.selected,
			userId: ''
		};
	});
}
