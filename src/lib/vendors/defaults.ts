import type { Agent, Vendor } from '$lib/types';

/** Static facts about each vendor: its brand colour and the env var that holds its key. */
export interface VendorMeta {
	vendor: Vendor;
	label: string;
	color: string;
	defaultModel: string;
	envVarName: string;
	/** Does Cadence have a backend that can actually answer for this vendor yet? */
	wired: boolean;
}

export const VENDOR_META: Record<Vendor, VendorMeta> = {
	claude: {
		vendor: 'claude',
		label: 'Claude',
		color: 'var(--vendor-claude)',
		defaultModel: 'claude-sonnet-4-6',
		envVarName: 'ANTHROPIC_API_KEY',
		wired: true
	},
	gemini: {
		vendor: 'gemini',
		label: 'Gemini',
		color: 'var(--vendor-gemini)',
		defaultModel: 'gemini-3.5-flash',
		envVarName: 'GOOGLE_API_KEY',
		wired: true
	},
	gpt: {
		vendor: 'gpt',
		label: 'GPT',
		color: 'var(--vendor-gpt)',
		defaultModel: 'gpt-5.5',
		envVarName: 'OPENAI_API_KEY',
		wired: false
	},
	grok: {
		vendor: 'grok',
		label: 'Grok',
		color: 'var(--vendor-grok)',
		defaultModel: 'grok-4.3',
		envVarName: 'XAI_API_KEY',
		wired: false
	}
};

/** The order vendors appear when adding an agent. */
export const VENDOR_ORDER: Vendor[] = ['claude', 'gemini', 'gpt', 'grok'];

/**
 * The roster seeded into an empty store on first run. Claude leads (active);
 * the rest wait their turn. Grok and GPT have no backend yet and stay offline.
 * Tick stamps are assigned at seed time so the keys are real.
 */
export function defaultRoster(tickBase: number): Agent[] {
	const seeds: Array<{ vendor: Vendor; active: boolean; status: Agent['status']; description: string }> = [
		{ vendor: 'claude', active: true, status: 'active', description: 'Leads the . Streams the first answer.' },
		{ vendor: 'gemini', active: false, status: 'ready', description: 'Fast second voice in the roster.' },
		{ vendor: 'gpt', active: false, status: 'offline', description: 'In the roster, waiting for a backend.' },
		{ vendor: 'grok', active: false, status: 'offline', description: 'In the roster, waiting for a backend.' }
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
			active: seed.active,
			userId: ''
		};
	});
}
