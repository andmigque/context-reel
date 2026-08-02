# Workspace Config Feature Specification

# 1. Specification 👻

..........................
..........................
..........................

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to Workspace Config invariants | Approve |
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

Documentation is the public interpretation layer for the Workspace Config feature.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |

# 4. Model Roster 🤖

Workspace Config manages the models available to Chat without exposing provider keys to the browser.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Use environment variable names instead of provider key values in the browser | Publish |
| 4.2 | MUST | Add configured models to the Chat roster | Publish |
| 4.3 | MUST | Select a model in Chat when it is selected in Workspace Config | Publish |
