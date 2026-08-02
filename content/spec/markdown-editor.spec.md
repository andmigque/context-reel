# Markdown Editor Feature Specification

# 1. Specification 👻

The Markdown Editor holds one Markdown document and is the middle column view where that document is written. It receives a document from the Zap Rail and it sends text to Chat as a Zap.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to Markdown Editor invariants | Approve |
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

Documentation is the public interpretation layer for the Markdown Editor feature.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use Markdown Editor to name the feature that edits the document | Approve |
| 3.2 | MUST | Use document to name the Markdown the editor holds | Approve |
| 3.3 | MUST | Use Zap as defined in the Zap Rail specification | Approve |
| 3.4 | MUST | Unpublish WSYIWYG as a spelling of WYSIWYG | Approve |

# 4. Messages ⚡

The Markdown Editor is a Markdown WYSIWYG editor. Every message it sends or receives is a Zap on the pub/sub store the Workspace mounts, so the editor never addresses another component directly.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Receive a Zap published on the pub/sub store the Workspace mounts | Register |
| 4.2 | MUST | Publish the body text of the editor as a Zap when a chord runs | Register |
| 4.3 | MUST | Publish the complete document as the Zap content when no text is selected | Publish |
| 4.4 | MUST | Publish only the selected text as the Zap content when text is selected | Publish |
| 4.5 | MUST | Show Chat after a Zap leaves the editor | Publish |
| 4.6 | MUST | Protect the document from change when a Zap leaves the editor | Publish |
| 4.7 | MUST | Replace the whole document with a Zap that arrives from the Zap Rail | Publish |
| 4.8 | MUST | Confirm the replacement before a Zap from the Zap Rail overwrites an edited document | Register |
| 4.10 | MUST | Assert messages the editor sends or receives outside that store are removed | Remove |

# 5. Document 📄

The document is the single unit of text the editor holds. It survives a view switch and a page reload, and it never leaves the browser except as a Zap the reader asked for.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1 | MUST | Limit the editor to one document at a time | Publish |
| 5.2 | MUST | Save the document on every change | Publish |
| 5.3 | MUST | Restore the saved document when the editor mounts | Publish |
| 5.4 | MUST | Show an empty document when nothing is saved | Publish |
| 5.5 | MUST | Protect the document from loss when saving fails | Publish |
| 5.6 | MUST NOT | Send the document to the server | Publish |
| 5.7 | MUST | Publish the document under one address that other features read | Publish |
| 5.8 | MUST NOT | Grant another feature write access to the document | Publish |

# 6. Preview 👁️

Preview renders the document as it will read. Editing and preview are one surface in two states, never two documents.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 6.1 | MUST | Show the rendered document while preview is on | Publish |
| 6.2 | MUST | Hide the editing surface while preview is on | Publish |
| 6.3 | MUST | Update the rendered document as the document changes | Publish |
| 6.4 | MUST | Set preview off when the editor first mounts | Publish |
| 6.5 | MUST | Switch preview on and off through a chord | Publish |
| 6.6 | MUST | Show which of edit or preview is the current state | Publish |
