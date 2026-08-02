# N Model Chat Feature Specification

# 1. Specification 👻

N Model Chat routes each turn to one selected model and gives every model the same conversation history. The selected model is chosen per turn, so a single thread carries answers produced by Claude, GPT, Gemini, and Grok.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to N Model Chat invariants | Approve |
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

Documentation is the public interpretation layer for the N Model Chat feature. The feature is easy to mistake for ordinary model switching, so the vocabulary has to keep one history and many models in the same sentence.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use N Model Chat to name the feature that routes a turn to one selected model | Approve |
| 3.2 | MUST NOT | Publish model switching as a description of N Model Chat | Approve |
| 3.3 | MUST | Use turn to name one message in the conversation history | Approve |
| 3.4 | MUST | Use composer to name the message input | Approve |
| 3.5 | MUST | Use roster as defined in the Workspace Config specification | Approve |
| 3.6 | MUST | Use Zap as defined in the Zap Rail specification | Approve |

# 4. Conversation 💬

N Model Chat gives every selected model the same conversation history.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Use one conversation history across all selected models | Publish |
| 4.2 | MUST | Send the complete conversation history to the selected model with each turn | Publish |
| 4.3 | MUST | Show each answer as the selected model produces it | Publish |
| 4.4 | MUST | Send every assistant turn as an assistant turn whichever model produced it | Publish |
| 4.5 | MUST NOT | Send the producing model of an earlier turn to the selected model | Publish |
| 4.6 | MUST | Show the producing model on each assistant turn | Publish |
| 4.7 | MUST | Send the system prompt configured for the selected model with each turn | Publish |
| 4.8 | MUST | Skip a turn holding no text when sending the conversation history | Publish |
| 4.9 | MUST | Merge consecutive turns sharing one role when the provider accepts only alternating roles | Publish |
| 4.10 | MUST | Restore the conversation history after a page reload | Publish |

# 5. Turn ⏱️

A turn is one message in the conversation history. The reader watches an answer take shape rather than waiting on a blank panel, so every state an answer can reach is visible while it is in that state.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1 | MUST | Show the user turn before the selected model produces any output | Publish |
| 5.2 | MUST | Show each token of an answer as it arrives | Publish |
| 5.3 | MUST | Show a partially received answer as rendered Markdown | Publish |
| 5.4 | MUST | Measure the interval from send to the first token of an answer | Publish |
| 5.5 | MUST | Show the measured interval on the answer it belongs to | Publish |
| 5.6 | MUST | Show a notice on an answer that receives no token for a bounded interval | Publish |
| 5.7 | MUST | Clear that notice when the next token arrives | Publish |
| 5.8 | MUST | Stop an answer in progress on request | Publish |
| 5.9 | MUST | Protect the received part of a stopped answer from deletion | Publish |
| 5.10 | MUST | Show a stopped answer as stopped | Publish |
| 5.11 | MUST | Show the provider message on an answer that fails | Publish |
| 5.12 | MUST | Send the last user turn again on request | Publish |
| 5.13 | MUST | Send the last user turn to a different selected model on request | Publish |
| 5.14 | MUST | Move the thread to the newest turn while the reader sits at the end of the thread | Publish |
| 5.15 | MUST NOT | Move the thread while the reader sits away from the end of the thread | Publish |

# 6. Composer ⌨️

The composer is the message input. It originates every user turn, and it is where a Zap lands after arriving on the pub/sub store the Workspace mounts.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 6.1 | SHOULD | Optimize the available composer area through some combination of resizing, min and max dimensions, or other | Register |
| 6.2 | MUST | Send the composer contents on Shift+Enter | Publish |
| 6.4 | MUST | Block a send while the composer holds no text | Publish |
| 6.5 | MUST | Block a send while an answer is in progress | Publish |
| 6.6 | MUST | Clear the composer once its contents become a user turn | Publish |
| 6.7 | MUST | Receive a Zap from the markdown editor published on the pub/sub store | Register |
| 6.8 | SHOULD | Send a Zap that to the markdown editor through the pub sub store | Publish |
| 6.9 | MUST | Assert Zaps held as buffered state rather than published as events are removed | Remove |
| 6.10 | MUST | Add unsent composer text to a Zap that arrives | Register |

# 7. Provider Boundary 🔐

N Model Chat reaches a provider through the server. The boundary exists so a provider key value never enters the browser, and so no conversation outlives the request that carried it.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 7.1 | MUST | Read a provider key on the server from the environment variable named by the selected model | Publish |
| 7.2 | MUST NOT | Send a provider key value to the browser | Publish |
| 7.3 | MUST | Show a failed answer naming the environment variable when its value is absent | Publish |
| 7.4 | MUST NOT | Save the conversation history on the server | Publish |
| 7.5 | MUST | Close the provider request when the reader stops an answer | Publish |
