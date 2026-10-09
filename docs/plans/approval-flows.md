# Plan: Configurable Approval Flows

Status: **Phases 1 and 2 built** (09/10/2026). Covers roadmap items P0-10 (Requests page) and P0-11 (Request Flow Builder), and the foundation that leaves (P0-08), promotions (P0-14) and every later approval-based module build on.

> **Revision 08/10/2026.** The first draft stored one `ApprovalTask` document per approver. We replaced that with **approvers and timeline stored on the request itself** (`pendingApprovers` and `actionsHistory`). The reasoning, the alternatives and the conditions under which we would reverse the decision are in section 2.1. Who may cancel is a type-level decision (D5).
>
> **Revision 09/10/2026.** Request types are configured per company in a **`RequestTypes` collection** (D4), and the **default flow is stored in the database** instead of living in code (D6, 2.2). A request is refused when its type is not enabled for the company or no flow matches. Leave is the first type on the engine (phase 2), with the HTTP layer of section 8.4.

---

## 1. Goals and non-goals

### Goals

- Any approval-based action (leave, promotion, expense, work-from-home, offer approval, payroll run sign-off, and so on) goes through **one engine**.
- Admins configure, per company and per request type (optionally narrowed by country, department or leave type, because the pilot spans several countries): **how many approval steps, and who approves each**.
- Fast "what is waiting for me?" for any user (login, home page, badge counts).
- A complete, honest history: who was asked, who decided, when, on whose behalf.
- Adding a new request type means writing a registry entry, not touching the engine or the Requests page.

### Non-goals (for the first version)

- A visual drag-and-drop flow designer. The first builder is a simple ordered list of steps.
- Conditional branching (for example "over 10 days adds an HR step"). The schema leaves room for it.
- Editing a submitted request or returning it to the requester. A rejection is final; the user raises a new request.
- Timed escalation and auto-approval. Reassignment and delegation are included; timers come later (a scheduled job, see 2.1).
- Parallel branches. A step can have several approvers ("any of" or "all of"), but steps run in sequence.

---

## 2. Decisions

### D1. Resolve the approver when a step activates, and store the result

The earlier idea (resolve live, at fetch time) is replaced by **resolve at step activation**.

- When a request enters a step, the engine resolves the step's rule (for example "line manager") into concrete users and stores them on the request as `pendingApprovers`.
- From then on, "who must act" is stored data, not a computation.
- Steps that have not started yet resolve later, when they activate. Completed steps are frozen.

### D2. Org changes are handled by explicit effects, not by recomputing

When something changes who should approve (manager change, termination, leave of absence, role removal), a **reassignment effect** reacts to that event and updates `pendingApprovers` of the affected pending requests, appending a history entry.

### D3. Actionable work lives on the request; notifications are a separate collection

- **`Requests.pendingApprovers`** = who must act now. Source of truth for the inbox and pending counts.
- **`Requests.actionsHistory`** = what happened, append-only.
- **`Notifications`** = informational messages (read/unread). Created from events, never used to decide who can approve.

Mixing actionable work with notifications is the most common reason inboxes become unreliable.

### D4. Engine and request types are decoupled by a registry

The `Request` envelope is fixed. Each type registers its payload schema, flow template and effects (section 6).

**Decided 09/10/2026: types are also configured per company.** The `RequestTypes` collection (section 4.0) is the catalogue a company offers: name, active flag, and a `kind`:

- `system`: the behaviour (payload, rules, effects such as ledger entries or profile changes) lives in code, in the registry. Admins can rename, enable or disable the type and edit its flows, but approval effects need code. Leave is the first; promotion and bank-details change will be system types.
- `custom`: an admin-defined plain approval with no effect beyond its status (for example "Work from home"). Its form (`fields`) arrives with the flow builder (phase 4); until then the engine refuses custom types.

The engine refuses a request whose type is not active for the company or has no registered behaviour.

### D5. The engine owns the cancel state rules; the request type owns who may cancel (08/10/2026)

- **State rules (engine):** a pending request can be canceled; an approved request only if its type opts in (`allowCancelAfterApproval`); rejected and canceled requests are final.
- **Authorization (type):** the registry hook `canCancel(actor, request)` decides who. It sees the request in its current status, so a type can allow the requester while it is pending and HR (or a scoped permission) after approval. Without the hook the safe default is **the requester only**.
- **Reject and cancel are different things.** Rejection is how an approver says "no" to a pending request and is final. Cancel withdraws or reverses a request, which is why it can also apply to an approved one.
- **System-initiated cancels** are engine-internal effects with actor `"system"`, never reachable from user input: a change request that supersedes the original, and cancelling the pending requests of a deactivated requester. They are recorded in the timeline like everything else.
- **History of the decision:** a hard-coded "requester only" rule was tried on 08/10/2026 and reverted the same day, because it could not express HR cancelling an approved leave. The engine therefore asks the type.

### D6. A request keeps a frozen copy of its flow, not a pointer

The request stores `flow: { flowId, version, steps }`, a copy of the steps it started with. See 2.2 for why we copy.

**Decided 09/10/2026: every flow lives in the database.** When a request type is enabled for a company (company seed, or `scripts/setupLeaves.ts` for existing companies), its company-wide flow is stored as version 1, built from the type's `flowTemplate` in code. The template is only a starting value; it is never read at request time. If no active flow matches, creation is refused ("no approval flow configured"); there is no silent code fallback and no version 0.

---

## 2.1 Decision record: where does "who must act" live?

This was the main design dilemma of the engine. Both options satisfy every requirement; they trade consistency and simplicity against flexibility at scale.

### The two options

**A. Separate `ApprovalTasks` collection** (the first draft, and the usual shape in workflow products). One document per (request, step, approver). The inbox queries tasks.

**B. Embedded on the request** (chosen). The request holds `pendingApprovers: ObjectId[]` (who must act on the current step) and `actionsHistory[]` (an append-only timeline). The inbox queries requests.

### What the data looks like

Anna requests leave. Step 1: her line manager Bob. Step 2: the HR role (mode `any`), resolving to Hana, Hugo, Hilda.

| After                     | A: tasks collection                                                               | B: embedded (chosen)                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Anna submits              | `Requests` row + task (Bob, open)                                                 | `Requests` row: `pendingApprovers: [Bob]`                                                                     |
| Bob approves              | update task, update request, insert 3 HR tasks (three writes, can be interrupted) | one write: `pendingApprovers: [Hana, Hugo, Hilda]`, history gets `approved`, `stepCompleted`, `stepActivated` |
| Hugo approves (`any`)     | update Hugo's task, mark two `superseded`, update request                         | one write: `pendingApprovers: []`, status `approved`, history records `superseded: [Hana, Hilda]`             |
| "What is waiting for me?" | `ApprovalTasks.find({ assignee: me, status: "open" })`                            | `Requests.find({ status: "pending", pendingApprovers: me })`                                                  |

### Comparison

| Concern                                               | A: tasks collection                                              | B: embedded                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Consistency between request and approvers             | Two collections can drift; needs guards and a reconciliation job | One document, one atomic write; drift cannot happen                                          |
| Double click / concurrent decisions                   | Conditional update on the task                                   | Conditional update on `pendingApprovers: me`                                                 |
| Inbox and badge count                                 | Indexed, simple                                                  | Indexed (partial multikey), equally simple                                                   |
| Index size                                            | Grows with all tasks                                             | Only **pending** requests are indexed (partial index), so it does not grow with history      |
| `all` mode (everyone must approve)                    | Check all sibling tasks                                          | Step done when `pendingApprovers` is empty and an approval is recorded                       |
| Crash recovery                                        | Reconcile task state against request state                       | A stuck request is visible in one document (step active, nobody pending, approvals recorded) |
| Code surface                                          | Extra model, repository, service                                 | Less code                                                                                    |
| Approver groups of tens                               | Fine                                                             | Fine, and cheaper to write (one array write instead of N inserts)                            |
| Approver groups of hundreds or more                   | Fine                                                             | Array and index entries get heavy                                                            |
| Per-approver timers, due dates, seen state            | Natural (a row each)                                             | Awkward as embedded data; handled at step level by a scheduled job instead                   |
| "Everything user X ever decided", approver statistics | One index                                                        | Needs an index on `actionsHistory.user` or a rebuildable projection                          |

### Why we chose B

1. **The largest risk of A was inconsistency.** The first draft listed "task and request drift" as a risk and prescribed conditional updates, idempotent keys and a reconciliation job to contain it. B removes the risk instead of mitigating it.
2. **Our expected load fits B.** Role-based steps will match tens of people, not hundreds. At that size the multikey index is small and one array write is cheaper than N task inserts.
3. **The pilot is small.** Fewer collections and less code means a faster, easier-to-test first version.
4. **Reminders do not need per-person rows.** A scheduled job finds pending requests whose current step has been active longer than N days and reminds everyone still in `pendingApprovers`, which is exactly the people who have not acted. A `lastReminderAt` on the step prevents repeats. Only a _different due date per approver_ is lost, which we do not need.
5. **The usual industry argument for work items is convention, not necessity** (section 3). It matters most for very large assignee pools and heavy per-assignee reporting.

### Index sketch

```
{ company: 1, pendingApprovers: 1, createdAt: -1 }   partialFilterExpression: { status: "pending" }
```

Because the index is partial, approved, rejected and canceled requests contribute no entries. Approved people are never kept in `pendingApprovers`; their decisions live in `actionsHistory`.

### When to revisit (tripwires)

Reintroduce a task collection, or a rebuildable projection of one, if any of these becomes true:

- Role-based steps regularly match **hundreds or thousands** of people (document and index size).
- We need **per-approver timers or due dates** (escalation to a specific person on their own clock).
- **Cross-request approver analytics** become a product feature (response time per approver, workload reports) and an index on `actionsHistory.user` is not enough.

The move is additive: the request still exposes "who must act now", so a tasks projection can be added for reporting or timers without changing the engine's behaviour.

---

## 2.2 Decision record: frozen flow copy or a pointer?

A request could point at its flow version (`flowId`, `version`) instead of copying the steps.

- **Why not adapt pending requests automatically when a flow changes?** If a step were removed or reordered, `currentStepIndex` and the stored step states would point at the wrong step, an already-approved request could be asked again, and nobody could later answer "which rules was this approved under?". Moving in-flight requests to a newer version is an explicit, audited admin action (section 7), never a side effect of editing.
- **Why copy rather than point at the version?** The original reason was that default flows lived in code (version 0, not persisted), so a deploy could silently change in-flight requests. Since 09/10/2026 default flows are stored rows (D6), so a pointer would now give the same guarantee. We keep the copy anyway: it saves a lookup on every step, and a request stays readable on its own (audit, export) even if a flow row is ever archived.
- **Alternative if the duplication bothers us later:** keep only `{ flowId, version }` and load the steps from the immutable flow version.

---

## 3. Industry comparison

How the common platforms handle "who approves, and how do users find their pending work". Treat this table as orientation, not as documentation of those products; I am describing well-known behaviour from memory and it should be verified against vendor docs before we cite it anywhere.

| Aspect                        | Typical industry pattern                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flow definition               | A configurable process definition per transaction type: ordered steps, each with an assignee rule (role, management chain, security group, user).            |
| When the approver is resolved | **When the step is initiated.** Workday-style business processes, ServiceNow approval records and BPMN user tasks all create work items at activation.       |
| What users see                | A **work item / task inbox**: one stored item per assignee, queried directly. Not a scan of source records.                                                  |
| Org changes mid-flight        | In-flight items usually stay with the original assignee until someone **reassigns** them (admin action, delegation, or automation). Not silently recomputed. |
| Delegation                    | Time-boxed delegation records route new items to the delegate; the audit trail records the delegate and the delegator.                                       |
| Audit                         | Each step records who was assigned, who acted, when, and any reassignment.                                                                                   |

Takeaways for us:

1. **Resolve at activation** matches the standard and gives a real audit answer to "who was supposed to approve this?". We follow it.
2. A **stored, directly queryable assignee list** is also the standard, and we follow the principle. We deliberately deviate on _where_ it lives: on the request instead of in a separate work-item collection (section 2.1), because it removes a consistency risk and fits our approver-group sizes.
3. Mid-flight org changes are an **explicit, audited operation**. That is exactly the "effects" idea in D2.

---

## 4. Data model

All collections are company-scoped (`company` on every document, every repository query filtered by it, consistent with the existing repositories).

### 4.0 `RequestTypes` (per-company catalogue, built 09/10/2026)

```jsonc
{ "company": "co_1", "key": "leave", "name": "Leave", "kind": "system", "isActive": true, "description": "" }
// unique { company, key }. Requests.type holds the key.
```

`custom` types will add `fields` (a simple form schema) with the flow builder.

### 4.1 `ApprovalFlows` (definitions, versioned)

```ts
interface IApprovalFlow {
    company: ObjectId;
    requestType: string; // "leave", "promotion", ...
    scope?: { country?: ObjectId; department?: ObjectId; leaveType?: ObjectId }; // optional narrowing; most specific wins
    version: number;
    isActive: boolean;
    steps: IFlowStep[];
    createdBy: ObjectId;
    createdAt: Date;
}

interface IFlowStep {
    key: string; // stable id inside the flow
    name: string; // "Line manager", "HR review"
    resolver: ApproverResolver;
    fallback?: ApproverResolver; // used when the resolver returns nobody
    mode: "any" | "all"; // any: first approval completes the step; all: every approver must approve
    onReject: "rejectRequest"; // v1 only; "returnToRequester" later
    allowSelfApproval: false; // always false in v1
    skipIfRequesterIsApprover: boolean; // true when the requester would be asked to approve their own request
}

type ApproverResolver =
    | { kind: "lineManager" }
    | { kind: "managerChain"; levelsUp: number } // 2 = manager's manager
    | { kind: "departmentHead" }
    | { kind: "hrRepresentative" }
    | { kind: "role"; roleId: ObjectId }
    | { kind: "user"; userId: ObjectId };
```

Rules:

- Editing a flow creates a **new version**. A request stores the version it started with, so edits never change in-flight requests.
- Validation blocks: empty flows, a step whose resolver and fallback can both return nobody for the whole company, duplicate step keys, references to inactive roles or users.
- Built in phase 1: `lineManager`, `hrRepresentative`, `role`, `user`. `managerChain` and `departmentHead` are rejected as unsupported until their phase.

### 4.2 `Requests` (the envelope: workflow state, approvers and timeline)

```ts
interface IRequest {
    company: ObjectId;
    type: string;
    typeVersion: number; // payload schema version
    requester: ObjectId;
    subject: ObjectId; // who it is about; equals requester for self-service
    status: "pending" | "approved" | "rejected" | "canceled";
    flow: { flowId?: ObjectId; version: number; steps: IFlowStep[] }; // frozen copy (2.2); flowId absent for the code default (version 0)
    currentStepIndex: number | null; // null once finished
    steps: IRequestStepState[];
    pendingApprovers: ObjectId[]; // who must act on the current step; emptied when the step or request finishes
    actionsHistory: IRequestAction[]; // append-only timeline
    needsRouting: boolean; // nobody could be resolved; surfaced to admins
    payload: unknown; // validated by the registry entry for `type`
    ref?: { collection: string; id: ObjectId }; // domain record, if the type has one
    cancelReason?: string;
    canceledBy?: ObjectId;
    decidedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface IRequestStepState {
    key: string;
    state: "waiting" | "active" | "approved" | "rejected" | "skipped";
    activatedAt?: Date;
    completedAt?: Date;
    resolvedFrom?: ApproverResolver; // which rule produced the assignees (audit)
}
```

The request holds the **workflow state**. Status lives only here; a domain record never stores a second copy of it.

### 4.3 `actionsHistory` (the timeline, embedded in the request)

```ts
interface IRequestAction {
    action:
        | "submitted"
        | "stepActivated"
        | "stepSkipped"
        | "stepCompleted"
        | "approved" // one approver's decision
        | "rejected" // one approver's decision
        | "requestApproved"
        | "requestRejected"
        | "needsRouting"
        | "canceled";
    status: RequestStatus; // request status right after the action
    user: ObjectId | "system"; // who acted
    date: Date;
    data?: Record<string, unknown>; // typed per action: stepKey, comment, reason, isOverride, onBehalfOf, superseded, assignees, flowVersion
}
```

- Append-only. Entries are never edited or removed.
- **State is the truth, history is the record.** `pendingApprovers` and `steps` say what is true now; `actionsHistory` says what happened. Decisions pull the user from `pendingApprovers` and push a history entry in the same atomic write.
- `any` mode: other approvers are dropped from `pendingApprovers` when one approves, and the dropped users are recorded in `data.superseded`.
- A decision by an authorized creator on someone's behalf is an `approved` entry with `data: { isOverride: true, reason, onBehalfOf }`.
- Reassignment and delegation (later phases) add `reassigned` entries carrying the original and new approver, the trigger and the reason.
- The list is bounded by flow length plus reassignments, so the document stays small for short flows.

### 4.4 `ApprovalDelegations`

Time-boxed record `{ company, delegator, delegate, from, to, requestTypes?, isActive }`. When a step activates, if a resolved approver has an active delegation, the **delegate is placed in `pendingApprovers`** and the activation history entry records `originalAssignee` and `onBehalfOf`. Dates are `YYYY-MM-DD` strings, as in the leaves design. Not built in phase 1.

### 4.5 `Notifications`

Separate, simple collection: `{ company, user, kind, request?, title, readAt?, createdAt }`. Created by event handlers (approver assigned, request decided, request canceled). Not part of authorization.

### 4.6 `NotificationRules` (configurable email)

In-app notifications are always created. Email is optional and **configured per rule**, so admins control when, for which request and step, and to whom.

```ts
interface INotificationRule {
    company: ObjectId;
    requestType: string; // "leave", "promotion", or "*"
    scope?: { country?: ObjectId; department?: ObjectId; leaveType?: ObjectId }; // same matching as flows
    stepKey?: string; // only for step events; omitted = any step
    event:
        | "submitted" // request created
        | "approverAssigned" // an approver is now pending on a step
        | "stepApproved"
        | "requestApproved"
        | "requestRejected"
        | "requestCanceled"
        | "approverReassigned"
        | "needsRouting";
    recipients: NotificationRecipient[];
    channels: { inApp: true; email: boolean }; // inApp is always on
    templateKey?: string; // optional override of the default template
    isActive: boolean;
}

type NotificationRecipient =
    | { kind: "requester" }
    | { kind: "subject" }
    | { kind: "pendingApprovers" } // the approvers of the step in question
    | { kind: "nextApprovers" }
    | { kind: "lineManager" }
    | { kind: "hrRepresentative" }
    | { kind: "role"; roleId: ObjectId }
    | { kind: "user"; userId: ObjectId };
```

- A company with no rules gets sensible defaults per type (for example: email the approvers on `approverAssigned`, the requester on `requestApproved`/`requestRejected`). Defaults ship with the registry entry; admins override them with rules.
- Emails are sent through the P0-23 email service, asynchronously. A failed email never affects the request.
- Rules are evaluated when the event happens and the resulting recipients are stored on the notification, so later org changes do not rewrite history.

---

## 5. Engine behaviour

### 5.1 Lifecycle

```
create → type enabled for the company? (RequestTypes) → resolve flow (most specific, active, latest version; none → refused) → freeze flow on request
       → activate step 0 → resolve approvers → store pendingApprovers (apply delegation)
       → each decision pulls the approver and appends history → step complete? → activate next step / finish
finish approved → run type's onApproved effect → status = approved
finish rejected → run type's onRejected effect → status = rejected
an allowed actor (default: the requester) cancels → clear pendingApprovers → run onCanceled → status = canceled
cancel after approval (only if the type allows it, and only for actors the type's canCancel accepts) → status approved → canceled → run onCanceled (type reverses its effects, e.g. ledger reversal)
system cancel (D5): approval of request B may cancel request A (reason "superseded"), via engine.cancel(A, { actor: "system" }) called from B's onApproved
```

Cancel after approval is an explicit, audited transition and only for types whose registry entry allows it (`allowCancelAfterApproval`). The type's `onCanceled` must be idempotent and must reverse everything `onApproved` did. Who may trigger it is the type's `canCancel` (D5), for example HR for an approved leave.

### 5.2 Step completion

- `any`: first approval completes the step; the remaining approvers are dropped from `pendingApprovers` and recorded as superseded.
- `all`: each approval removes that approver from `pendingApprovers`; the step completes when the list is empty and at least one approval is recorded. Any rejection rejects the request.
- A rejection in either mode rejects the request in v1.
- Completion is recomputed from stored state alone (`reevaluate`), so a retry after a crash picks up where it stopped.

### 5.3 Resolution edge cases (must be defined, not left to chance)

| Case                                                                     | Behaviour                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolver returns nobody (no manager, inactive manager)                   | Use the step's `fallback`. If still nobody, **do not silently approve**: the request is flagged "needs routing" (`needsRouting: true`, empty `pendingApprovers`) and surfaced to admins.                                                                                                                                              |
| Requester is the resolved approver                                       | If `skipIfRequesterIsApprover`, mark the step `skipped` and move on. Otherwise use the fallback. Never self-approve.                                                                                                                                                                                                                  |
| All steps skipped                                                        | Allowed only if the flow explicitly permits auto-approval; otherwise flag "needs routing".                                                                                                                                                                                                                                            |
| Authorized creator enters it on someone's behalf (e.g. HR records leave) | **Decided (08/10/2026):** immediate approval is not a skip. The engine activates the steps and records an `approved` history entry per pending approver, made by the creator with a mandatory reason and `isOverride`, so the timeline stays complete and the audit trail honest. Needs a permission per type (`canApproveOnCreate`). |
| Resolved approver is unavailable (e.g. on approved leave)                | The type's `isUnavailable(user, date)` hook is consulted by the resolver; an unavailable approver is replaced by their delegate if one exists, otherwise the step's `fallback`.                                                                                                                                                       |
| Same user appears in two steps                                           | **Decided (08/10/2026): never collapse.** Each step asks them separately.                                                                                                                                                                                                                                                             |
| Approver loses approval authority before acting                          | Authorization is rechecked at decision time (being pending is necessary but not sufficient). The decision is blocked, and the reassignment effect in section 7 handles the pending slot.                                                                                                                                              |

### 5.4 Concurrency and idempotency

- Deciding is one conditional update: `findOneAndUpdate({ _id, status: "pending", currentStepIndex, pendingApprovers: me }, { $pull: { pendingApprovers: me }, $push: { actionsHistory: entry } })`. Two clicks or two tabs cannot both succeed; the loser gets a conflict.
- Step advancement and finishing use a conditional update on the request (`currentStepIndex` matches) so a retry after a crash is safe.
- Side effects of a type (for example posting a ledger entry) must be idempotent, keyed by request id. Known gap: if the process dies after the request is marked approved but before `onApproved` runs, a retry does not re-run it; the reconciliation job (phase 5) closes this.

---

## 6. Request type registry

```ts
interface RequestTypeDefinition<TPayload> {
    type: string;
    name: string; // display name used when the type is first seeded into a company's RequestTypes
    version: number;
    readCategory?: PermissionCategories; // its scoped "read" also grants visibility (leave: "leaves")
    validatePayload(payload: unknown): TPayload; // validated on create; throws BadRequestError
    flowTemplate: IFlowStep[]; // seeds the company's first stored flow (version 1); never read at request time
    canCreate(companyId, actor, subjectId, payload): Promise<void>; // permission and business-rule checks
    onSubmitted?(request): Promise<void>;
    onApproved(request): Promise<void>; // idempotent
    onRejected?(request): Promise<void>;
    onCanceled?(request): Promise<void>;
    summarize(request): { title: string; subtitle?: string }; // for lists and notifications
    canApprove(companyId, actor, request): Promise<boolean>; // rechecked at decision time (D2, blocks if false)
    canApproveOnCreate?(companyId, actor, request): Promise<boolean>; // immediate approval by an authorized creator
    allowCancelAfterApproval?: boolean; // approved -> canceled permitted, with onCanceled reversing effects
    canCancel?(companyId, actor, request): Promise<boolean>; // who may cancel, given the request's current status; default: requester only
    isUnavailable?(companyId, userId, date): Promise<boolean>; // resolver hook, e.g. approver on approved leave
    detail(request): Promise<unknown>; // type-specific data for the detail drawer (lines, pay, balance impact, warnings)
}

// Engine API available to registry handlers
engine.cancel(requestId, { reason, actor: "system" }); // e.g. a change request's onApproved cancels the original
```

The detail drawer renders a per-type component keyed by `type`, fed by `detail(request)` (or a type-specific endpoint). `summarize()` is only for lists and notifications.

- **Leave (built 09/10/2026)** registers a payload validator, a flow template of one line-manager step (fallback HR representative), `canCreate` (rules), `canApprove` (`leaves:approve:{scope}`), `canApproveOnCreate`, `canCancel`, `allowCancelAfterApproval`, and `onApproved` / `onCanceled` posting and reversing ledger entries. See `docs/features/leaves.md` section 0. The leave design's per-day lines and ledger stay in leave-owned collections; `Request.ref` points to them.
- Promotion registers a payload (new title, level, department, effective date, reason), a default flow, and `onApproved` that applies the changes and writes an employment-history entry.
- A type that outgrows payload-only storage moves its data to its own collection; only its handlers change.

---

## 7. Effects: org changes and other events

An **effect** is an event handler that keeps stored workflow state correct when the world changes. Each effect appends a history entry (actor "system" or the admin who triggered it).

| Event                                                                          | Effect                                                                                                                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User's line manager changes                                                    | For the user's **pending requests**, re-resolve the current step's `pendingApprovers` when its rule was `lineManager`/`managerChain` and replace the stale entries. |
| A manager is deactivated or leaves                                             | Requests where they are pending are re-resolved through each step's rule and fallback; unresolved ones are flagged "needs routing".                                 |
| A user loses the role or permission a pending slot needed                      | Reassign through the rule and fallback, or flag.                                                                                                                    |
| An approver goes on approved leave later (type's `isUnavailable` becomes true) | Replace them in `pendingApprovers` with their delegate, else the fallback; also runs when the leave starts, not only when it is approved.                           |
| Delegation created, changed or ended                                           | Optional: move currently pending slots for that delegator; new steps follow delegation automatically.                                                               |
| Requester deactivated                                                          | Their pending requests are canceled by the system (D5): `pendingApprovers` cleared, type's `onCanceled` runs, history entry written.                                |
| Admin reassigns a pending approver manually                                    | Same reassign operation, with a mandatory reason.                                                                                                                   |
| Flow edited                                                                    | No effect on in-flight requests (they use their frozen flow). Optional admin action "re-route in-flight to latest version".                                         |

Important detail: effects must run on **every code path that changes the org**, including the Users page bulk edit and imports. The existing repository `updateOne` bypasses Mongoose document hooks, so effects must be called from the **service layer** (or from an explicit domain event published by it), not from model hooks. A periodic reconciliation job (find pending requests whose approvers are inactive or no longer match the rule, or stuck requests) is the safety net.

Completed steps are never touched. Only the current step of `pending` requests is eligible.

---

## 8. Inbox, counts and the Requests page

### 8.1 Queries

| Need                                     | Query                                                         | Index                                                                      |
| ---------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pending count for badge / home page      | `count({ company, status: "pending", pendingApprovers: me })` | `{ company, pendingApprovers, createdAt }`, partial on `status: "pending"` |
| My approval inbox                        | same filter, sorted and paginated, optionally by `type`       | same                                                                       |
| My requests (as requester)               | `{ company, requester: me, status }` on `Requests`            | `{ company, requester, status, createdAt }`                                |
| Requests for a person (HR, manager view) | `{ company, subject: { $in: scopedIds } }`                    | `{ company, subject, createdAt }`                                          |
| Admin overview, "needs routing"          | `{ company, status: "pending", needsRouting: true }`          | `{ company, status, needsRouting }`                                        |

Home page and login should call **one** summary endpoint returning `{ pendingForMe, myPending, unreadNotifications }`, each a small indexed count. Built as `GET /api/requests/summary`; `unreadNotifications` is 0 until notifications exist (phase 6).

"My requests" (built) matches requests where the user is the requester **or** the subject, so leave HR entered on someone's behalf shows up for that person too.

### 8.2 Visibility is separate from approval

- **Approval authority:** you are in `pendingApprovers` (or hold a valid override such as admin).
- **Visibility** (who may read a request): requester, subject, anyone currently pending or who acted on it (from `actionsHistory`), and scoped viewers through the existing permission scopes (`managed`, `department`, `country`, `*`).
- Both go through the existing permission and scope helpers; no new authorization model.

### 8.3 Requests page (P0-10)

Design proposals (desktop, mobile and the empty, loading, error and "Needs my action" states) are in [`designs/requests-page.html`](../../designs/requests-page.html): option A is a table in the existing page layout, option B a list with a detail panel inside the app shell. Both are type-agnostic; leave is only the first request type.

- Tabs: **Needs my action**, **My requests**, **Team/Company** (permission and scope dependent).
- Filters: type, status, date range, requester, current step. Consistent server-side pagination and sorting.
- Detail drawer: payload summary via `summarize()`, the step timeline rendered from `actionsHistory` (assigned, decided, reassigned, on behalf of), comments, and Approve/Reject buttons driven by whether the current user is pending, plus Cancel for the requester.

### 8.4 HTTP API (built 09/10/2026)

Shared by every request type. All routes require a token; `companyId` comes from the token only. Approval authority is never a route permission: each handler checks the caller against the request (pending approver plus `canApprove`, the type's `canCancel`, the visibility rule of 8.2).

| Method | Path                         | Purpose                                                                                       |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/requests/inbox`        | Pending requests where I am in `pendingApprovers`. Query: `type`, `page`, `limit` (max 100)   |
| GET    | `/api/requests/mine`         | Requests I raised or that are about me. Query: `type`, `status`, `page`, `limit`              |
| GET    | `/api/requests/summary`      | `{ pendingForMe, myPending, unreadNotifications }`                                            |
| GET    | `/api/requests/:id`          | Request, timeline, steps, the type's `detail()`, and `can: { decide, cancel }` for the caller |
| POST   | `/api/requests/:id/decision` | `{ decision: "approve"                                                                        | "reject", comment? }`. 403 if not pending or authority lost, 409 if already decided |
| POST   | `/api/requests/:id/cancel`   | `{ reason }` (required). 403 if `canCancel` refuses, 409 if the state does not allow it       |
| GET    | `/api/request-types`         | Request types the company has enabled                                                         |

`GET /api/requests/:id` also returns `people` (user id to `{ id, name, email }` for the requester, subject, pending approvers and everyone in `actionsHistory`, including step assignees), so a client can label the timeline without extra calls.

Lists return `{ items, total, page, limit, totalPages }`; each item carries `summary` (from `summarize()`), requester and subject names, the current step and `needsRouting`. A business rule the user can act on (for example overlapping leave) is answered as a soft error: HTTP 200, `success: false`, a readable `message` and `error.rule`.

---

## 9. Permissions

- `requests:read` with scopes `*`, `department`, `country`, `department-country`, `managed` (built). There is no `self` scope: one's own requests need no permission. A type can add its own read category (`readCategory`; leave uses `leaves:read`).
- `approvalFlows:read` and `approvalFlows:write` for the flow builder (admin).
- Deciding requires being in `pendingApprovers` (and the type's `canApprove` check, rechecked at decision time). Creating a request is type-specific (`canCreate`).
- **Cancel** is authorized by the request type's `canCancel` (D5), which typically combines the requester and a scoped permission such as `leaves:write`. Without the hook only the requester may cancel. `"system"` is reserved for engine effects.
- Admin override (decide or reassign on someone's behalf) is a distinct permission, always recorded with a reason.

---

## 10. Audit

Two mechanisms, deliberately different:

- **Requests carry their own timeline.** Every transition (request created, step activated, approvers assigned, decision, reassignment with reason and trigger, cancellation, flow version used) is an `actionsHistory` entry written atomically with the state change. Requests are not mutated records in the audit sense, so they are **not** in the shared audit log.
- **`AuditLogs` is a generic, opt-in change log for mutable records** (a user whose fields get overwritten). Which entities are tracked is chosen in `server/src/config/audited-entities.ts`; each entry lists fields to **redact** (record that it changed, never the value) and fields to **ignore**. Services call `AuditService.record({ actor, entity, entityId, action, before, after })`, which stores a field-level diff and writes nothing when an update changed nothing. The entity type is checked at compile time against the registry. Repository updates bypass Mongoose hooks, so the call is explicit in the service layer. Retention is still open (P1-29).

---

## 11. Code layout

Server (`server/src/`):

- `models/`: `approval-flow.model.ts`, `request.model.ts`, `request-type.model.ts`, `audit-log.model.ts` (later: `approval-delegation.model.ts`, `notification.model.ts`)
- `repositories/`: one company-scoped repository per model
- `services/approvals/`: `flow.service.ts`, `request.service.ts` (engine), `resolver.service.ts`, `request-type.registry.ts`, `request-type-config.service.ts` (RequestTypes, seeding of default flows), `register-request-types.ts` (registers system types at startup), `request-view.service.ts` (inbox, mine, summary, detail views) (later: `effects.service.ts`)
- `policies/request.policy.ts`: scoped access helper and the visibility rule (8.2)
- `services/audit.service.ts`, `config/audited-entities.ts`
- `scripts/syncIndexes.ts` (renamed from `syncApprovalIndexes.ts`): models use `autoIndex: false`, so indexes (including the partial inbox index and the leave ledger's idempotency key) exist only after this script runs. Re-run it whenever these schemas gain an index.
- Request type definitions live with their module, for example `services/leaves/leave.request-type.ts` (under `services/` so the model-import lint rule applies), instead of a separate `requests/types/` folder
- `routes/`: `request.routes.ts` (built); later `approval-flow.routes.ts`, `notification.routes.ts`

Client (`client/src/app/`): `features/requests/` (page, detail drawer), `features/approval-flows/` (builder), `shared/components/pending-badge/`.

---

## 12. Delivery phases

| Phase | Deliverable                                                                                                                                                                                                                         | Done when                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0     | Agree this plan; reconcile with `docs/features/leaves.md` section 9 (see section 14).                                                                                                                                               | Both documents describe the same approval model.                                                        |
| 1     | **Built (08/10/2026).** Engine core: models, resolver service, create/decide/cancel, registry, embedded approvers and timeline, idempotency, opt-in audit. Single-step flows run; multi-step and `any`/`all` already work in tests. | Integration tests cover create, approve, reject, cancel, double-decide, self-approval, missing manager. |
| 2     | **Built (09/10/2026).** Leave as the first type on the engine (stored default one-step flow), `RequestTypes`, inbox, my requests, summary, detail, decide and cancel endpoints.                                                     | Leave approval works end to end through `pendingApprovers`.                                             |
| 3     | Requests page (P0-10): needs-my-action, my requests, team tab, detail timeline.                                                                                                                                                     | Users and managers can find and act on everything from one page.                                        |
| 4     | Multi-step flows in the builder, resolver kinds (`managerChain`, `departmentHead`), flow versioning UI, flow builder UI (list of steps).                                                                                            | An admin builds a 2-step flow; in-flight requests keep their frozen flow.                               |
| 5     | Effects: manager change, deactivation, manual reassign, delegation, reconciliation job, reminder job.                                                                                                                               | Org change tests show pending approvers replaced and recorded; completed steps untouched.               |
| 6     | Promotion as the second type; notifications UI.                                                                                                                                                                                     | Promotion runs on a configurable flow with no engine changes.                                           |
| 7     | Later: conditions, escalation to a specific person, return-to-requester, parallel steps.                                                                                                                                            | Scoped separately.                                                                                      |

Phase 1 intentionally ships single-step flows first, but the schema is already multi-step, so phase 4 is additive.

---

## 13. Risks

- **Effects coverage.** If one org-changing path forgets to call the effect, `pendingApprovers` goes stale. Mitigation: services-only mutation paths, the reconciliation job, and tests per path (bulk edit, import, single edit).
- **Growth of the embedded model.** Very large approver groups or per-approver timers would strain the embedded design. Mitigation: the tripwires in section 2.1; the move to a tasks projection is additive.
- **Effect not re-run after a crash.** `onApproved` can be skipped if the process dies between marking approved and running the effect. Mitigation: idempotent effects, plus a reconciliation script (same approach as the leave ledger).
- **Over-building the flow builder.** Conditions and escalation are tempting. Keep v1 to ordered steps and resolver kinds.
- **Reconciling with the leaves design.** Resolved, see section 14.
- **Mongo transactions.** The design avoids requiring them; with one document per transition it needs them even less.

---

## 14. Conflict with the leaves design (resolved 07/10/2026, kept for the record)

Status: the leaves doc has been rewritten to follow this plan; see section 15 for what it asked of the engine in return.

`docs/features/leaves.md` originally specified **live resolution** (principle 2.1, section 9): no approver stored, approval authority checked at decision time, queues built from `user: { $in: scopedIds }`, delegation resolved live, and `LeaveRequests` carrying its own status and `approvalStep` rule.

This plan chose **resolution at step activation with stored approvers**. The leaves design changed as follows:

1. Section 2, principle 1 and section 9 rewritten: approver identity is frozen on the request when the step activates; accounting and authorization at activation time.
2. `LeaveRequests.status` and `approvalStep` moved to the `Request` envelope (single source of truth). The leave record keeps dates, per-day lines, pay, overrides, and a `request` reference.
3. Section 9.1 (delegation) became the `ApprovalDelegations` collection with the delegate placed in `pendingApprovers`.
4. Section 9.2 (team coverage limits) is unaffected; it is a validation rule.
5. The leave queue and API use the shared inbox and Requests page instead of leave-specific queue endpoints.

---

## 15. Requirements raised by the leaves design (07/10/2026)

`docs/features/leaves.md` is reconciled with this plan (approver stored on the request, `canApprove` rechecked, delegation shared, change-after-approval is a new request linked by `replaces`). It raised six engine requirements, all folded into this plan:

| #   | Requirement                                                             | Where it landed                                         | Status                                               |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Cancel after approval, `onCanceled` reverses effects                    | Section 5.1, registry `allowCancelAfterApproval`        | Built; who may cancel is the type's `canCancel` (D5) |
| 2   | `onApproved` can cancel another request ("superseded")                  | Section 5.1, `engine.cancel(...)` with actor `"system"` | Built                                                |
| 3   | Immediate approval by an authorized creator, recorded as decisions      | Section 5.3, registry `canApproveOnCreate`              | Built                                                |
| 4   | Approver availability hook, and reassign when an approver goes on leave | Section 5.3, section 7, registry `isUnavailable`        | Hook built; reassign effect is phase 5               |
| 5   | Per-type detail renderer for the drawer                                 | Registry `detail()`, section 6                          | Interface only                                       |
| 6   | Flow-scope precedence across three dimensions                           | Open question 6                                         | Proposed, confirm                                    |

One cost to keep in mind: leave records no longer carry a status, so overlap and coverage checks join leave dates to `Requests`. If that proves slow, add a rebuildable projection rather than a second status field (the leaves doc takes the same position).

---

## 16. Open questions

1. ~~**Approver authority at decision time**~~ **Decided (07/10/2026): block.** Being pending is necessary but not sufficient; the decision is rejected if the approver no longer holds the authority, and the reassignment effect handles the slot.
2. ~~**Org change reassign**~~ **Decided (07/10/2026): automatic** on manager change, audited. Unresolvable steps are flagged "needs routing".
3. ~~**Requester deactivated**~~ **Decided (07/10/2026): cancel.** Deactivation is an effect: the user's pending requests are canceled by the system, `pendingApprovers` cleared, the type's `onCanceled` runs, and a history entry is written.
4. ~~**Reject semantics**~~ **Decided (07/10/2026): a rejection is final** for requests and leaves. The requester can raise a new request; there are no edits or step-backs for short flows. Long-running processes (recruiting, performance reviews) are their own modules, not `Request` types, and may support returning or reopening a stage. "Return to requester" is therefore removed from the engine's scope, not just deferred.
5. ~~**Same person in consecutive steps**~~ **Decided (08/10/2026): never collapse.**
6. ~~**Flow scope:** per company and request type only?~~ **Decided (07/10/2026): no.** The pilot spans several countries, so flows are scoped by request type plus optional `country`, `department` and `leaveType`, and the most specific active flow wins (section 4.1). There are now **three** scope dimensions (`country`, `department`, `leaveType`), so precedence must be defined for combinations. Proposed: a flow matches only if every dimension it specifies matches; among matches, the one specifying the **most dimensions** wins; ties are broken by a fixed dimension priority (`leaveType` > `department` > `country`), and two flows with identical scope for the same type are rejected at save time. Implemented that way in phase 1 (one small function, easy to change); still needs your confirmation.
7. ~~**Notifications**~~ **Decided (08/10/2026):** in-app always, email optional and configurable per request type, step, event and recipient (section 4.6).
8. ~~**Where does "who must act" live?**~~ **Decided (08/10/2026): embedded on the request** (`pendingApprovers` plus `actionsHistory`), no separate tasks collection. Alternatives, reasons and the conditions for reversing are in section 2.1.
9. ~~**Cancelling an approved request on someone else's behalf**~~ **Decided (08/10/2026): the request type decides** through the `canCancel` hook (D5). The engine enforces the state rules and the default is requester only. Leave defines its own rule: the requester for their own pending leave and for approved leave before the start date, and `leaves:write` beyond `self` (HR) after the start date and for a leaver's future leaves.
10. ~~**Where do request types and default flows live?**~~ **Decided (09/10/2026): in the database, per company.** A `RequestTypes` collection with `kind: "system" | "custom"` (D4), and every flow stored as a versioned row; the type's code template only seeds version 1 (D6). No flow configured means creation is refused.
11. ~~**Promotion effective dates**~~ **Decided (09/10/2026):** approval does not change the profile. The approved promotion is scheduled and a job applies it on the effective date (P0-14).
