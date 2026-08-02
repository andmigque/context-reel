# MarkMap Feature Specification

# 1. Specification 👻

MarkMap renders the document as a node tree. It is one of the views that fills the middle column, and it is a second reading of one document rather than a second document.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to MarkMap invariants | Approve |
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

Documentation is the public interpretation layer for the MarkMap feature. The feature currently answers to two names, which the vocabulary has to settle before either name can carry meaning.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use MarkMap to name the feature that renders the document as a node tree | Approve |
| 3.2 | MUST | Use node to name one heading or list item in the rendered tree | Approve |
| 3.3 | MUST | Use document as defined in the Markdown Editor specification | Approve |
| 3.4 | MUST | Use Zap as defined in the Zap Rail specification | Approve |
| 3.5 | MUST | Assert mind map used as a second name for MarkMap is removed | Remove |

# 4. Map 🗺️

MarkMap renders the document as a node tree. The panel always holds a tree, so a failed render or an unwritten document never leaves the reader looking at nothing.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Show the document as a node tree | Publish |
| 4.2 | MUST | Show a heading as a node | Publish |
| 4.3 | MUST | Show a list item as a node | Publish |
| 4.4 | MAY | Fold a node on selection | Publish |
| 4.5 | MUST | Fit the tree to the panel it occupies | Publish |
| 4.6 | MUST | Show a placeholder tree when no document has been written | Publish |
| 4.7 | MUST | Show the previous tree when a render fails | Publish |
| 4.8 | MUST | Receive a Zap from the editor only | Approve |

# 5. Source 🔗

MarkMap reads the document the Markdown Editor owns and never writes it, so the two views of one document cannot diverge. Everything that reaches MarkMap arrives as a Zap on the pub/sub store the Workspace mounts.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1 | MUST | Show the same document the Markdown Editor holds | Publish |
| 5.2 | MUST NOT | Write the document | Publish |
| 5.3 | MUST | Receive a Zap published on the pub/sub store the Workspace mounts | Register |
| 5.4 | MUST | Show the document again when MarkMap becomes the shown view | Publish |
| 5.5 | MUST | Assert reads of another feature's storage made outside that store are removed | Remove |
