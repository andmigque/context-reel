# Workspace Feature Specification

# 1. Specification 👻

The Workspace uses a 3 column layout with 2 rails and one switchable middle content column. The middle content column is switched by the navigation bars items.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to Workspace invariants | Approve |
| 1.3 | MUST | Set one address on each invariant | Approve |
| 1.4 | MUST | Use addresses in place of restating invariants | Approve |
| 1.5 | MUST | Open each invariant with an approved PowerShell verb | Approve |
| 1.6 | SHOULD | Set a unique semver style address on every markdown element | Approve |

# 2. Status 📋

The status model defines the lifecycle vocabulary used by every invariant.

## 2.1 Deployment Status Vocabulary

This table defines the lifecycle states available to an invariant.

| Status | Meaning |
| --- | --- |
| Approve | Reviewed, agreed, and approved for deployment |
| Publish | Deployed to production |
| Register | Planned for a future deployment |
| Remove | Remove from all deployments |
| Request | Request architecture design review |

# 3. Documentation 📃

Documentation is the public interpretation layer for the Workspace feature. There is significant background vocabulary required to achieve high readability and semantic coherence in the workspace. The section enumerates that vocabulary.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | SHOULD NOT | Read store and storage as synonyms | Remove |
| 3.2 | MUST | Use Zap as defined in the Zap Rail specification | Approve | 
| 3.3 | SHOULD | Write substantial, but relevant, background documentation on svelte to reduce learning curves | Approve |
| 3.4 | SHOULD | Add the spec and svelte documentation to content for viewing in app | Approve |
| 3.5 | MUST | Use Workspace to name the navbar plus the three column main content area as the application | Approve |
| 3.6 | MUST | Use view to name whatever fills the middle column | Approve |
| 3.7 | MUST | Use store exclusively with svelte pub/sub semantics , e.g. using the subscribe interface | Approve |
| 3.8 | MUST | Assert runes, misnamed as stores, are refactored | Approve |
| 3.9 | MUST | Use storage to mean durable storage such as databases  | Approve |
| 3.10 | SHOULD | Use the term rail to mean a thin when collapsed vertical bar that consumes the entire vertical space it occupies | Register |



# 4. Workspace 🖼️

The workspace is the primary component abstraction that behaves as the central coordination for the application.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Set a 3 column layout as rail, main content, rail | Publish |
| 4.2 | MUST | Mount a pub/sub interface intended for child component subscription | Request |
| 4.3 | MUST NOT | Assert lifecycle governance over child components through direct functional UI mutations | Request |
| 4.4 | MUST | Build an interface that is reactive using framework feature sets where available | Approve |
| 4.5 | MUST | Switch view state through a store | Approve |
| 4.6 | MUST NOT | Scroll the Workspace itself | Publish |
| 4.7 | MUST | Grant each column its own scrolling | Publish |
| 4.8 | SHOULD | Expand a rail by delegating the action as a slide in and out drawer style toggling | Approve |