# Zap Rail Feature Specification

# 1. Specification 👻

A "Zap" is a neologism that represents ⚡*zapping*⚡, or copying, text from one element of the application to another element.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to Zap Rail invariants | Approve |
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

Documentation is the public interpretation layer for the Zap Rail feature. 

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use Zap to name a markdown text transfer between application features | Approve |
| 3.2 | MUST | Rename the doc component to the file component | Register |
| 3.3 | MUST | Use a separate spec to define the file component | Register | 


# 4. Rail 🛤️

The Zap Rail is designed as a thin vertical bar, resembling a rail, that stretches the length of the viewport, starting under the header section.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.1 | MUST | Set as the sticky left column in the 3 column main content section | Publish |
| 4.2 | MUST | Hide scrollbars | Publish |
| 4.3 | SHOULD | Show Open, Close, or Toggle controls | Publish |
| 4.4 | SHOULD | Show a lightning bolt to indicate a zappable element | Publish
| 4.5 | MUST | Show the word Zap toggling between horizontal when opened, vertical when closed | Publish |
| 4.6 | MUST | Select the previously selected file on reopen | Publish |
| 4.7 | MUST | Move focus to the main content center column on close | Publish |
| 4.8 | MUST | Use native button semantics for file rows | Publish |

# 5. Interfaces 🔌

Interfaces define what the contracts between the rail and the zap target.

## 5.1 Event

The event interface allows application elements to start a Zap without sharing their behavior.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1.1 | MAY | Send a zap event | Approve |
| 5.1.2 | MUST | Send a zap event from the rail child file component to the markdown editor component | Publish |
| 5.1.3 | MUST | Send a zap event from the rail child file component to the mark map | Publish | 

## 5.2 Key Chord

The key chord interface keeps zapping available without pointer navigation.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.2.1 | MUST | Register key chords to manage the full lifecycle of the rail | Approve |

## 5.3 Child Component

The child component interface separates Rail behavior from the feature presented inside it.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.3.1 | MUST | Use interfaces to inject the child component into the rail | Register |
| 5.3.2 | MUST | 
