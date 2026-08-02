# Workspace Config Feature Specification

# 1. Specification 👻

Workspace Config owns the roster: the set of models Chat can send a turn to. It holds the name of the environment variable that carries each provider key and never the key value.

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

Documentation is the public interpretation layer for the Workspace Config feature. The feature currently names a model family a vendor, which collides with the organization that serves it, so the vocabulary needs both words to mean one thing each.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use roster to name the set of models available to Chat | Approve |
| 3.2 | MUST | Use model to name one entry in the roster | Approve |
| 3.3 | MUST | Use provider to name the organization that serves a model | Register |
| 3.4 | MUST | Unpublish vendor as the word for a model family | Register |
| 3.5 | MUST | Use environment variable name to name what a roster entry holds in place of a provider key | Approve |

# 4. Model Roster 🤖

Workspace Config manages the models available to Chat without exposing provider keys to the browser.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Use environment variable names instead of provider key values in the browser | Publish |
| 4.2 | MUST | Add configured models to the Chat roster | Publish |
| 4.3 | MUST | Select a model in Chat when it is selected in Workspace Config | Publish |
| 4.4 | MUST | Show the environment variable name that carries a model's provider key | Publish |
| 4.5 | MUST NOT | Show a provider key value | Publish |
| 4.6 | MUST | Limit the roster to one selected model at a time | Publish |
| 4.7 | MUST | Add a starting roster the first time the workspace runs | Publish |
| 4.8 | MUST | Restore the roster after a page reload | Publish |
| 4.9 | MUST | Save a change to a roster entry as the change is made | Publish |
| 4.10 | MUST | Show the status of every roster entry | Publish |
| 4.11 | MUST | Limit editing to one roster entry at a time | Publish |

# 5. Removal 🗑️

Removing a model parks it offline and keeps its configuration, so a key that comes back later does not cost the reader the entry they wrote. The control that performs this is still labelled as a delete, which the vocabulary has to settle.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1 | MUST | Set a removed model offline rather than deleting its entry | Publish |
| 5.2 | MUST | Clear the selected state of a model that is removed | Publish |
| 5.3 | MUST | Protect a removed model's configuration from deletion | Publish |
| 5.4 | MUST | Rename the removal control to match the state it sets | Register |
| 5.5 | MUST | Restore a removed model to the Chat roster when it is selected again | Publish |

# 6. Connection 🔌

A connection test asks the server whether a model's provider key resolves. The test reports a status and touches nothing else about the entry.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 6.1 | MUST | Test a model's provider connection on request | Publish |
| 6.2 | MUST | Set the model status from the test result | Publish |
| 6.3 | MUST | Set the model status to error when the test cannot complete | Publish |
| 6.4 | MUST | Protect a selected model's selected state from a passing test | Publish |
| 6.5 | MUST NOT | Set any field other than status from a test result | Publish |
| 6.6 | MUST | Block a second test on a model while its first test is in flight | Publish |
| 6.7 | MUST | Show that a test is in flight | Publish |
| 6.8 | MUST NOT | Send a provider key value to the browser during a test | Publish |

# 7. Availability ✅

Availability is the rule Chat reads to decide which models can answer. A model that cannot answer stays in Workspace Config and stays out of Chat.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 7.1 | MUST | Limit the Chat roster to models that are ready or selected | Publish |
| 7.2 | MUST | Show the selected model first in the Chat roster | Publish |
| 7.3 | MUST | Show guidance in Chat when no model can answer | Publish |
