# Markdown Editor Feature Specification

# 1. Specification 👻

..........................
..........................
..........................

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

# 3. Documentation 📃

Documentation is the public interpretation layer for the Markdown Editor feature.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |

# 4. Messages ⚡

The Markdown Editor is a markdown WSYIWYG editor 

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Receive messages from the zap rail | Publish |
| 4.2 | MUST | Send the body text of the editor to the n-model chat message input text area via a chord  | Publish |
| 4.3 | MUST | Send the complete document to Chat as a Zap when no text is selected | Publish |
