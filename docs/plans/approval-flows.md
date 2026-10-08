# Plan: Configurable Approval Flows

Status: **Draft for discussion** (07/10/2026). Covers roadmap items P0-10 (Requests page) and P0-11 (Request Flow Builder), and the foundation that leaves (P0-08), promotions (P0-14) and every later approval-based module build on.

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
- Timed escalation and auto-approval. Reassignment and delegation are included; timers come later.
- Parallel branches. A step can have several approvers ("any of" or "all of"), but steps run in sequence.

---

## 2. Decisions

### D1. Resolve the approver when a step activates, and store the result

The earlier idea (resolve live, at fetch time) is replaced by **resolve at step activation**.

- When a request enters a step, the engine resolves the step's rule (for example "line manager") into concrete users and creates one **approval task** per approver.
- From then on, "who must act" is stored data, not a computation.
- Steps that have not started yet resolve later, when they activate. Completed steps are frozen.

### D2. Org changes are handled by explicit effects, not by recomputing

When something changes who should approve (manager change, termination, leave of absence, role removal), a **reassignment effect** reacts to that event and updates the open tasks, writing an audit entry. Details in section 7.

### D3. Actionable work is a separate collection from notifications

- **`ApprovalTasks`** = things a person must act on. Source of truth for the inbox and pending counts.
- **`Notifications`** = informational messages (read/unread). Created from events, never used to decide who can approve.

Mixing the two is the most common reason inboxes become unreliable.

### D4. Engine and request types are decoupled by a registry

The `Request` envelope is fixed. Each type registers its payload schema, default flow and effects (section 6). See the earlier discussion on when a type deserves its own domain collection; the same rule applies here.

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

1. **Yes**, a materialised task per pending approver is the standard, and it is what makes the inbox cheap.
2. **Resolve at activation** matches the standard and gives a real audit answer to "who was supposed to approve this?".
3. Mid-flight org changes are an **explicit, audited operation**. That is exactly the "effects" idea in D2.

---

## 4. Data model

All collections are company-scoped (`company` on every document, every repository query filtered by it, consistent with the existing repositories).

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

### 4.2 `Requests` (the envelope)

```ts
interface IRequest {
    company: ObjectId;
    type: string;
    typeVersion: number; // payload schema version
    requester: ObjectId;
    subject: ObjectId; // who it is about; equals requester for self-service
    status: "pending" | "approved" | "rejected" | "canceled";
    flow: { flowId: ObjectId; version: number; steps: IFlowStep[] }; // frozen copy
    currentStepIndex: number | null; // null once finished
    steps: IRequestStepState[];
    payload: unknown; // validated by the registry entry for `type`
    ref?: { collection: string; id: ObjectId }; // domain record, if the type has one
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

### 4.3 `ApprovalTasks` (the inbox)

One document per (request, step, assignee).

```ts
interface IApprovalTask {
    company: ObjectId;
    request: ObjectId;
    requestType: string; // denormalised for filtering without a join
    stepKey: string;
    assignee: ObjectId; // who must act now
    originalAssignee: ObjectId; // who the rule resolved to (differs after reassign/delegation)
    status: "open" | "approved" | "rejected" | "superseded" | "canceled" | "reassigned";
    dueAt?: Date; // reserved for escalation
    decidedBy?: ObjectId; // may differ from assignee (admin acting)
    onBehalfOf?: ObjectId; // set when a delegate decided
    decidedAt?: Date;
    comment?: string;
    createdAt: Date;
}
```

- `superseded`: a sibling task finished an `any` step first.
- `reassigned`: the task was moved; a new `open` task is created for the new assignee and the old one is kept for history.

### 4.4 `ApprovalDelegations`

Time-boxed record `{ company, delegator, delegate, from, to, requestTypes?, isActive }`. At task creation, if the resolved approver has an active delegation, the task is created for the delegate with `originalAssignee` and `onBehalfOf` set. Dates are `YYYY-MM-DD` strings, as in the leaves design.

### 4.5 `Notifications`

Separate, simple collection: `{ company, user, kind, request?, title, readAt?, createdAt }`. Created by event handlers (task created, request decided, request canceled). Not part of authorization.

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
        | "taskAssigned" // an approver now has a task
        | "stepApproved"
        | "requestApproved"
        | "requestRejected"
        | "requestCanceled"
        | "taskReassigned"
        | "needsRouting";
    recipients: NotificationRecipient[];
    channels: { inApp: true; email: boolean }; // inApp is always on
    templateKey?: string; // optional override of the default template
    isActive: boolean;
}

type NotificationRecipient =
    | { kind: "requester" }
    | { kind: "subject" }
    | { kind: "taskAssignees" } // the approvers of the step in question
    | { kind: "nextApprovers" }
    | { kind: "lineManager" }
    | { kind: "hrRepresentative" }
    | { kind: "role"; roleId: ObjectId }
    | { kind: "user"; userId: ObjectId };
```

- A company with no rules gets sensible defaults per type (for example: email the approvers on `taskAssigned`, the requester on `requestApproved`/`requestRejected`). Defaults ship with the registry entry; admins override them with rules.
- Emails are sent through the P0-23 email service, asynchronously. A failed email never affects the request.
- Rules are evaluated when the event happens and the resulting recipients are stored on the notification, so later org changes do not rewrite history.

---

## 5. Engine behaviour

### 5.1 Lifecycle

```
create → resolve flow (most specific, active, latest version) → freeze flow on request
       → activate step 0 → resolve approvers → create tasks (apply delegation)
       → each decision updates task → step complete? → activate next step / finish
finish approved → run type's onApproved effect → status = approved
finish rejected → run type's onRejected effect → status = rejected
requester cancels → close open tasks (canceled) → run onCanceled → status = canceled
cancel after approval (permitted per type) → status approved → canceled → run onCanceled (type reverses its effects, e.g. ledger reversal)
approval of request B may cancel request A (reason "superseded"), via engine.cancel(A, reason) called from B's onApproved
```

Cancel-after-approval is an explicit, audited transition and only for types whose registry entry allows it (`allowCancelAfterApproval`, who may do it is a type-level permission). The type's `onCanceled` must be idempotent and must reverse everything `onApproved` did.

### 5.2 Step completion

- `any`: first approval completes the step; remaining open tasks become `superseded`.
- `all`: step completes when every task is `approved`; any rejection rejects the request and cancels remaining open tasks.
- A rejection in either mode rejects the request in v1.

### 5.3 Resolution edge cases (must be defined, not left to chance)

| Case                                                                     | Behaviour                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolver returns nobody (no manager, inactive manager)                   | Use the step's `fallback`. If still nobody, **do not silently approve**: the request is flagged "needs routing" and surfaced to admins.                                                                                                                                                                        |
| Requester is the resolved approver                                       | If `skipIfRequesterIsApprover`, mark the step `skipped` and move on. Otherwise use the fallback. Never self-approve.                                                                                                                                                                                           |
| All steps skipped                                                        | Allowed only if the flow explicitly permits auto-approval; otherwise flag "needs routing".                                                                                                                                                                                                                     |
| Authorized creator enters it on someone's behalf (e.g. HR records leave) | **Decided (08/10/2026):** immediate approval is not a skip. The engine creates the tasks and records them as decided by the creator, with `decidedBy`, a mandatory reason and an override flag, so the timeline stays complete and the audit trail honest. Needs a permission per type (`canApproveOnCreate`). |
| Resolved approver is unavailable (e.g. on approved leave)                | The type's `isUnavailable(user, date)` hook is consulted by the resolver; an unavailable approver is replaced by their delegate if one exists, otherwise the step's `fallback`.                                                                                                                                |
| Same user appears in two steps                                           | **Decided (08/10/2026): never collapse.** Each step asks them separately.                                                                                                                                                                                                                                      |
| Approver loses approval authority before acting                          | Authorization is rechecked at decision time (the task is necessary but not sufficient). Task is flagged and reassigned by the effect in section 7.                                                                                                                                                             |

### 5.4 Concurrency and idempotency

- Deciding a task is a conditional update: `findOneAndUpdate({ _id, status: "open" }, ...)`. Two clicks or two tabs cannot both succeed.
- Step advancement and finishing use a conditional update on the request (`currentStepIndex` matches) so a retry after a crash is safe. The same pattern the leaves design uses for approval.
- Side effects of a type (for example posting a ledger entry) must be idempotent, keyed by request id.

---

## 6. Request type registry

```ts
interface RequestTypeDefinition<TPayload> {
    type: string;
    version: number;
    payloadSchema: Schema<TPayload>; // validated on create and on any edit
    defaultFlow: IFlowStep[]; // used when a company has no custom flow
    canCreate(actor, subject, payload): Promise<void>; // permission and business-rule checks
    onSubmitted?(request): Promise<void>;
    onApproved(request): Promise<void>; // idempotent
    onRejected?(request): Promise<void>;
    onCanceled?(request): Promise<void>;
    summarize(request): { title: string; subtitle?: string }; // for lists and notifications
    canApprove(actor, request): Promise<boolean>; // rechecked at decision time (D2, blocks if false)
    canApproveOnCreate?(actor, request): Promise<boolean>; // immediate approval by an authorized creator
    allowCancelAfterApproval?: boolean; // approved -> canceled permitted, with onCanceled reversing effects
    isUnavailable?(userId, date): Promise<boolean>; // resolver hook, e.g. approver on approved leave
    detail(request): Promise<unknown>; // type-specific data for the detail drawer (lines, pay, balance impact, warnings)
}

// Engine API available to registry handlers
engine.cancel(requestId, { reason, actor }); // e.g. a change request's onApproved cancels the original
```

The detail drawer renders a per-type component keyed by `type`, fed by `detail(request)` (or a type-specific endpoint). `summarize()` is only for lists and notifications.

- Leave registers `payloadSchema`, a default flow of one line-manager step, and `onApproved` posting ledger entries. The leave design's per-day lines and ledger stay in leave-owned collections; `Request.ref` points to them.
- Promotion registers a payload (new title, level, department, effective date, reason), a default flow, and `onApproved` that applies the changes and writes an employment-history entry.
- A type that outgrows payload-only storage moves its data to its own collection; only its handlers change.

---

## 7. Effects: org changes and other events

An **effect** is an event handler that keeps stored workflow state correct when the world changes. Each effect writes an audit entry (actor "system" or the admin who triggered it).

| Event                                                                          | Effect                                                                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| User's line manager changes                                                    | For the user's **pending requests**, re-resolve **open** tasks whose rule was `lineManager`/`managerChain` and reassign.       |
| A manager is deactivated or leaves                                             | Their open tasks are re-resolved through each step's rule and fallback; unresolved ones are flagged "needs routing".           |
| A user loses the role or permission a task needed                              | Reassign through the rule and fallback, or flag.                                                                               |
| An approver goes on approved leave later (type's `isUnavailable` becomes true) | Reassign their open tasks to their delegate, else the fallback; also runs when the leave starts, not only when it is approved. |
| Delegation created, changed or ended                                           | Optional: move currently open tasks for that delegator; new tasks follow delegation automatically.                             |
| Requester deactivated                                                          | Their pending requests are canceled: open tasks closed as `canceled`, type's `onCanceled` runs, audit entry written.           |
| Admin reassigns a task manually                                                | Same reassign operation, with a mandatory reason.                                                                              |
| Flow edited                                                                    | No effect on in-flight requests (they use their frozen flow). Optional admin action "re-route in-flight to latest version".    |

Important detail: effects must run on **every code path that changes the org**, including the Users page bulk edit and imports. The existing repository `updateOne` bypasses Mongoose document hooks, so effects must be called from the **service layer** (or from an explicit domain event published by it), not from model hooks. A periodic reconciliation job (find open tasks whose assignee is inactive or no longer matches the rule) is the safety net.

Completed steps are never touched. Only `open` tasks of `pending` requests are eligible.

---

## 8. Inbox, counts and the Requests page

### 8.1 Queries

| Need                                     | Query                                                          | Index                                       |
| ---------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| Pending count for badge / home page      | `count({ company, assignee: me, status: "open" })`             | `{ company, assignee, status, createdAt }`  |
| My approval inbox                        | same filter, sorted and paginated, optionally by `requestType` | same                                        |
| My requests (as requester)               | `{ company, requester: me, status }` on `Requests`             | `{ company, requester, status, createdAt }` |
| Requests for a person (HR, manager view) | `{ company, subject: { $in: scopedIds } }`                     | `{ company, subject, createdAt }`           |
| Admin overview, "needs routing"          | `{ company, status: "pending", needsRouting: true }`           | `{ company, status, needsRouting }`         |

Home page and login should call **one** summary endpoint returning `{ openTasks, myPending, unreadNotifications }`, each a small indexed count.

### 8.2 Visibility is separate from approval

- **Approval authority:** you hold an open task for the request (or a valid override such as admin).
- **Visibility** (who may read a request): requester, subject, anyone with a task on it, and scoped viewers through the existing permission scopes (`managed`, `department`, `country`, `*`).
- Both go through the existing permission and scope helpers; no new authorization model.

### 8.3 Requests page (P0-10)

- Tabs: **Needs my action**, **My requests**, **Team/Company** (permission and scope dependent).
- Filters: type, status, date range, requester, current step. Consistent server-side pagination and sorting.
- Detail drawer: payload summary via `summarize()`, the step timeline (assigned, decided, reassigned, on behalf of), comments, and Approve/Reject/Cancel buttons driven by what the current user may do.

---

## 9. Permissions

- `requests:read` with scopes for the Team/Company tab.
- `approvalFlows:read` and `approvalFlows:write` for the flow builder (admin).
- Deciding a task requires holding the task (and the type's `canApprove` check, rechecked at decision time). Creating a request is type-specific (`canCreate`).
- Admin override (decide or reassign on someone's behalf) is a distinct permission, always audited with a reason.

---

## 10. Audit

Every transition writes an audit entry via the shared helper from P1-29: request created, step activated, tasks created, decision, reassignment (with reason and trigger), cancellation, flow version used. Because tasks are never deleted, the request timeline can be rebuilt from `ApprovalTasks` alone.

---

## 11. Code layout (proposed)

Server (`server/src/`):

- `models/`: `approval-flow.model.ts`, `request.model.ts`, `approval-task.model.ts`, `approval-delegation.model.ts`, `notification.model.ts`
- `services/approvals/`: `flow.service.ts`, `request.service.ts` (engine), `task.service.ts`, `resolver.service.ts`, `effects.service.ts`
- `requests/types/`: one file per request type registering its `RequestTypeDefinition`
- `routes/`: `request.routes.ts`, `approval-flow.routes.ts`, `notification.routes.ts`

Client (`client/src/app/`): `features/requests/` (page, detail drawer), `features/approval-flows/` (builder), `shared/components/pending-badge/`.

---

## 12. Delivery phases

| Phase | Deliverable                                                                                                                            | Done when                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0     | Agree this plan; reconcile with `docs/features/leaves.md` section 9 (see section 14).                                                  | Both documents describe the same approval model.                                                        |
| 1     | Engine core: models, resolver service, create/decide/cancel, registry, tasks, idempotency, audit helper calls. Single-step flows only. | Integration tests cover create, approve, reject, cancel, double-decide, self-approval, missing manager. |
| 2     | Leave as the first type on the engine (default one-step flow). Inbox endpoint and pending summary endpoint.                            | Leave approval works end to end through tasks.                                                          |
| 3     | Requests page (P0-10): needs-my-action, my requests, team tab, detail timeline.                                                        | Users and managers can find and act on everything from one page.                                        |
| 4     | Multi-step flows, `any`/`all` modes, resolver kinds, flow versioning, flow builder UI (list of steps).                                 | An admin builds a 2-step flow; in-flight requests keep their frozen flow.                               |
| 5     | Effects: manager change, deactivation, manual reassign, delegation, reconciliation job.                                                | Org change tests show open tasks reassigned and audited; completed steps untouched.                     |
| 6     | Promotion as the second type; notifications UI.                                                                                        | Promotion runs on a configurable flow with no engine changes.                                           |
| 7     | Later: conditions, escalation timers, return-to-requester, parallel steps.                                                             | Scoped separately.                                                                                      |

Phase 1 intentionally ships single-step flows first, but the schema is already multi-step, so phase 4 is additive.

---

## 13. Risks

- **Effects coverage.** If one org-changing path forgets to call the effect, tasks go stale. Mitigation: services-only mutation paths, the reconciliation job, and tests per path (bulk edit, import, single edit).
- **Task and request drift.** Two collections must agree. Mitigation: conditional updates, idempotent keys, and a reconciliation script (same approach as the leave ledger).
- **Over-building the flow builder.** Conditions and escalation are tempting. Keep v1 to ordered steps and resolver kinds.
- **Reconciling with the leaves design.** The leaves document currently chooses the opposite approval model (section 14), so one of the two must change before leave work continues.
- **Mongo transactions.** The design avoids requiring them. If Atlas replica sets are available, a transaction around decide + advance is a possible simplification, not a prerequisite.

---

## 14. Conflict with the leaves design (resolved 07/10/2026, kept for the record)

Status: the leaves doc has been rewritten to follow this plan; see section 15 for what it asked of the engine in return.

`docs/features/leaves.md` currently specifies **live resolution** (principle 2.1, section 9): no approver stored, approval authority checked at decision time, queues built from `user: { $in: scopedIds }`, delegation resolved live, and `LeaveRequests` carrying its own status and `approvalStep` rule.

This plan chooses **resolution at step activation with stored tasks**. If this plan is accepted, the leaves design needs these changes:

1. Section 2, principle 1 and section 9 are rewritten: approver identity is frozen on tasks; accounting and authorization at activation time.
2. `LeaveRequests.status` and `approvalStep` move to the `Request` envelope (single source of truth). The leave record keeps dates, per-day lines, pay, overrides, and a `request` reference.
3. Section 9.1 (delegation) becomes the `ApprovalDelegations` collection with task creation applying it.
4. Section 9.2 (team coverage limits) is unaffected; it is a validation rule.
5. The leave queue and API use the shared inbox and Requests page instead of leave-specific queue endpoints.

Because another agent owns the leaves document, I have **not** edited it.

---

## 15. Requirements raised by the leaves design (07/10/2026)

`docs/features/leaves.md` is now reconciled with this plan (approver frozen on tasks, `canApprove` rechecked, delegation shared, change-after-approval is a new request linked by `replaces`). It raised six engine requirements, all folded into this plan:

| #   | Requirement                                                             | Where it landed                                  | Status            |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------ | ----------------- |
| 1   | Cancel after approval, `onCanceled` reverses effects                    | Section 5.1, registry `allowCancelAfterApproval` | Added             |
| 2   | `onApproved` can cancel another request ("superseded")                  | Section 5.1, `engine.cancel(...)`                | Added             |
| 3   | Immediate approval by an authorized creator, recorded as decisions      | Section 5.3, registry `canApproveOnCreate`       | Decided           |
| 4   | Approver availability hook, and reassign when an approver goes on leave | Section 5.3, section 7, registry `isUnavailable` | Added             |
| 5   | Per-type detail renderer for the drawer                                 | Registry `detail()`, section 6                   | Added             |
| 6   | Flow-scope precedence across three dimensions                           | Open question 6                                  | Proposed, confirm |

One cost to keep in mind: leave records no longer carry a status, so overlap and coverage checks join leave dates to `Requests`. If that proves slow, add a rebuildable projection rather than a second status field (the leaves doc takes the same position).

---

## 16. Open questions

1. ~~**Approver authority at decision time**~~ **Decided (07/10/2026): block.** A task is necessary but not sufficient; the decision is rejected if the assignee no longer holds the authority, and the reassignment effect handles the task.
2. ~~**Org change reassign**~~ **Decided (07/10/2026): automatic** on manager change, audited. Unresolvable tasks are flagged "needs routing".
3. ~~**Requester deactivated**~~ **Decided (07/10/2026): cancel.** Deactivation is an effect: the user's pending requests are canceled, their open tasks closed as `canceled`, the type's `onCanceled` runs, and an audit entry is written.
4. ~~**Reject semantics**~~ **Decided (07/10/2026): a rejection is final** for requests and leaves. The requester can raise a new request; there are no edits or step-backs for short flows. Long-running processes (recruiting, performance reviews) are their own modules, not `Request` types, and may support returning or reopening a stage. "Return to requester" is therefore removed from the engine's scope, not just deferred.
5. ~~**Same person in consecutive steps**~~ **Decided (08/10/2026): never collapse.**
6. ~~**Flow scope:** per company and request type only?~~ **Decided (07/10/2026): no.** The pilot spans several countries, so flows are scoped by request type plus optional `country`, `department` and `leaveType`, and the most specific active flow wins (section 4.1). There are now **three** scope dimensions (`country`, `department`, `leaveType`), so precedence must be defined for combinations. Proposed: a flow matches only if every dimension it specifies matches; among matches, the one specifying the **most dimensions** wins; ties are broken by a fixed dimension priority (`leaveType` > `department` > `country`), and two flows with identical scope for the same type are rejected at save time. Needs your confirmation.
7. ~~**Notifications**~~ **Decided (08/10/2026):** in-app always, email optional and configurable per request type, step, event and recipient (section 4.6).
