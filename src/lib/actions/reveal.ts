//// # actions/reveal
//// A Svelte action that calls back when its element scrolls into view. This is the infinite-scroll
//// trigger the ZapRail puts on its last row: the htmx `revealed` shape in the native Svelte idiom.
//// One `IntersectionObserver` lives here, encapsulated; the component carries no scroll math. The
//// `armed` flag lets a row watch only while it is the last one, and re-arm when a new last row takes
//// over after a page appends.
////
//// ## Imports
import type { Action } from 'svelte/action';

//// ## Types

//// ### RevealParams
//// The action's parameters: whether to watch, and what to call when the row reveals.
export interface RevealParams {
	//// - `boolean`: __armed__
	////     - *Watch while true; ignore while false.*
	armed: boolean;
	//// - `() => void`: __onReveal__
	////     - *Called the moment the element first enters the viewport while armed.*
	onReveal: () => void;
}

//// ## Functions

//// ### reveal
//// Observe the node while armed and invoke `onReveal` when it intersects the viewport.
export const reveal: Action<HTMLElement, RevealParams> = (node, params) => {
	let current = params;
	let observer: IntersectionObserver | undefined;

	function arm(on: boolean): void {
		if (on && observer === undefined) {
			observer = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) current.onReveal();
				}
			});
			observer.observe(node);
		} else if (!on && observer !== undefined) {
			observer.disconnect();
			observer = undefined;
		}
	}

	arm(current.armed);

	return {
		update(next) {
			current = next;
			arm(next.armed);
		},
		destroy() {
			observer?.disconnect();
			observer = undefined;
		}
	};
};