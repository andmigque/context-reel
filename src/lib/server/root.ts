//// # server/root
//// Resolve the doc root from the environment. Kept apart from `server/docs` so the pure source logic
//// stays free of `$env` and unit-testable. Lives under `$lib/server`, which SvelteKit forbids the
//// client from importing.
////
//// ## Imports
import { env } from '$env/dynamic/private';
import { join } from 'node:path';

//// ## Functions

//// ### docRoot
//// The directory the doc source scans. Read from `DOC_ROOT`; falls back to a `content/` directory
//// beside the running server. Never a hardcoded machine path.
export function docRoot(): string {
	//// **Returns**
	//// - `string`
	////     - *The absolute or cwd-relative doc root.*
	const configured = env.DOC_ROOT?.trim();
	return configured && configured.length > 0 ? configured : join(process.cwd(), 'content');
}