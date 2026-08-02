# Chords Feature Specification

# 1. Specification 👻

In music, multiple keys played together create a sound called a chord. In context reel, a chord is a combination of keys bound to an action.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 1.1 | MUST | Use normative keywords according to RFC 2119 and RFC 8174 | Approve |
| 1.2 | MUST | Limit this specification to Chord Rail invariants | Approve |
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

Documentation is the public interpretation layer for the Chord Rail feature.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 3.1 | MUST | Use chord to name a combination of keys bound to an action | Approve |
| 3.2 | MUST | Use action to mean what a chord executes | Approve |
| 3.3 | MUST | Use Chord Rail to name the right column of the Workspace | Approve |

# 4. Rail 🛤️

The Chord Rail is the right hand column. It displays the available chords and is populated dynamically through a pub/sub store.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 4.2 | MUST | Show a data driven list of chords | Request |
| 4.3 | MAY | Mount chord storage that enables the chord rail to persist chords | Request |
| 4.4 | MUST | Protect chord storage from duplicate entries. The Chord Rail should block, then notify.  | Request |
| 4.5 | MUST NOT | Send data mutations to chord storage, marshalling only | Request |
| 4.9 | MUST | Show each key of a chord as a separate key | Publish |
| 4.10 | MUST | Assert hard coded chords are removed throughout the application | Remove |

# 5. Chord 🎹

A chord binds a keystroke to an action.

| # | Rule | Invariant | Status |
| --- | --- | --- | --- |
| 5.1 | SHOULD | Register an action on each chord | Approve |
| 5.5 | MUST | Block the browser default action for a keystroke that resolves to a chord action | Publish |
| 5.6 | MUST NOT | Block a keystroke that resolves to no action | Publish |
| 5.7 | MUST | Skip a keystroke that resolves to no action without reporting an error | Publish |
| 5.8 | MUST | Skip a chord whose action has no destination without reporting an error | Publish |
| 5.9 | MUST NOT | Register a chord on a keystroke a browser reserves | Approve |