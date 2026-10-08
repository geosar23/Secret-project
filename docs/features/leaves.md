# Leaves

> **Status: design (not implemented).** This document is the agreed architecture for the Leaves module. It tracks roadmap item _Leaves Module_ and `NEXT_TODOS.md` P0-08. Update it as decisions change.
>
> **Approvals are not owned by this module.** Leave runs on the shared approval engine described in [docs/plans/approval-flows.md](../plans/approval-flows.md): workflow status, steps and approvers live in the shared `Requests` envelope and `ApprovalTasks`. This document owns the leave _domain_: duration, policies, pay, balances and the ledger. Where the two meet (sections 9 and 12) the engine plan is authoritative for workflow, and this document is authoritative for leave rules. Reconciled on 07/10/2026.

---

## 1. Goals and non-goals

### Goals

- Employees create, view and cancel leave requests; managers approve or reject.
- Correct duration maths: weekends, public holidays, work schedules, half days and any fraction in between, per country.
- Per-country, per-leave-type policies that change often, without rewriting history.
- Paid, unpaid and partially paid leave, including tiered pay (e.g. sick leave 100% for 3 days, then 50%). The result must be consumable by payroll.
- Balances that are explainable, auditable and correct in the presence of accruals, carry-over, adjustments and negative balances.
- Both calendar-year and anniversary (hire-date) leave years.

### Non-goals (for now)

- Attachments (e.g. sick certificates). The model leaves room for them.
- Building approval machinery inside Leaves (queues, task assignment, delegation, flow builder). These belong to the shared engine. Leave ships on the engine's default one-step line-manager flow; multi-step flows and country/department/leave-type flow scoping arrive with the engine's later phases, with no change to the leave model.
- Editing or returning a submitted request. A rejection is final and the employee raises a new request (see section 12).
- The payroll module itself. Leaves exposes a payroll contract (section 11).

---

## 2. Design principles

1. **Workflow and accounting are frozen when they happen; authority and visibility are checked now.**
    - "Who was asked to approve?" is **frozen on `ApprovalTasks`** when a step activates (shared engine). Org changes are handled by explicit, audited reassignment effects; completed steps are never touched.
    - "May this person decide right now?" is **rechecked at decision time**. A task is necessary but not sufficient: if the assignee lost the authority, the decision is blocked.
    - "Who may see this leave?" is evaluated **live** from the current org through the permission scopes.
    - "What happened, how much, at what pay, under which rule?" is **frozen** when it happens (lines, pay, policy version, ledger entries).
2. **Append, never mutate, for quantities.** Balances come from an append-only ledger. Corrections are new entries.
3. **Policies are versioned and effective-dated.** A change never rewrites past decisions.
4. **One calculation function.** All duration and pay maths lives in a pure, heavily tested function. The server always calls it; the client's numbers are never trusted.
5. **No hidden sync.** There are no hooks or cron jobs whose job is to keep two copies of the same fact equal. Cron exists only to _generate_ time-driven facts (accruals), and it is idempotent.
6. **Dates are calendar dates.** Store `YYYY-MM-DD` strings, never UTC instants, so a leave never shifts by a day across time zones.
7. **Foundations versus rules.** Three things are non-negotiable and expensive to retrofit: the **ledger**, the **frozen per-day breakdown** and the **calendars/schedules**. Everything else (notice periods, blackout windows, overlap limits, eligibility, probation) is a _rule_ evaluated on top of them and can be added or changed without touching stored facts.

---

## 3. Domain concepts

| Concept                | Meaning                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Leave type**         | A category of leave (Annual, Sick, Unpaid, Maternity). Company-wide definition.                                              |
| **Leave policy**       | The rules for one leave type in one country, effective from a date. Versioned.                                               |
| **Holiday calendar**   | Public holidays for a country (optionally narrowed to an office or region).                                                  |
| **Work schedule**      | Which weekdays and how many hours a user works. Defines weekends (these differ by country, e.g. Fri–Sat) and part-time work. |
| **Leave period**       | The leave year a date falls into: calendar, fiscal, or anniversary-based.                                                    |
| **Leave request**      | The leave _domain record_ for a date range, with frozen per-day lines. Its workflow status lives on the linked `Request`.    |
| **Request**            | The shared approval envelope (status, flow, steps). One per leave request, referenced by `LeaveRequests.request`.            |
| **Approval task**      | One stored work item per approver per step, created when the step activates (shared engine).                                 |
| **Line**               | One calendar day of a request with its quantity and pay percentage.                                                          |
| **Ledger entry**       | One signed, immutable change to a user's balance for a leave type.                                                           |
| **Balance**            | Derived: the sum of ledger entries up to a date, minus pending reservations.                                                 |
| **Pay tier**           | A rule such as "first 3 days 100%, next 10 days 50%, then 0%".                                                               |
| **Settlement summary** | A derived view of what a leaver owes or is owed in leave, for payroll.                                                       |

---

## 4. Data model

All collections carry a required `company` field and are accessed only through repositories (see the _repositories_ skill). Each new collection needs an isolation test.

### 4.1 `LeaveTypes`

```ts
interface ILeaveType {
    company: ObjectId;
    name: string; // "Annual leave"
    code: string; // "ANNUAL" — unique per company
    color?: string;
    category: "annual" | "sick" | "maternity" | "paternity" | "bereavement" | "study" | "compTime" | "unpaid" | "other"; // drives defaults and reporting only
    countsAgainstEntitlement: boolean; // false for unpaid leave, bereavement, etc.: reduces no balance
    requiresAttachment: boolean; // e.g. medical certificate; stored now, enforced when attachments ship
    overridesOtherLeave: boolean; // true for sick leave: overlapping days of other leave are converted (section 12.3)
    eligibility?: {
        genders?: string[]; // e.g. maternity; matches user.gender
        employmentTypes?: string[]; // matches user.employmentType
        minTenureMonths?: number; // from user.employmentDate
    };
    isActive: boolean;
}
```

A leave type carries identity and eligibility only. Rules live in policies, because they differ per country. Eligibility is checked when creating a request (and by `/preview`), so ineligible users never see a type offered.

### 4.2 `LeavePolicies` (versioned, effective-dated)

Never edited in place. A change creates a new document with a later `effectiveFrom`. A policy applies to a `leaveType` for a set of users described by `appliesTo`.

**Assignment and specificity.** Policies can target a country, office, employment type, level or one individual. For a given user, leave type and date, the resolver collects every policy version effective on that date whose `appliesTo` matches, then picks the **most specific**: `user` > `level` / `employmentType` > `office` > `country` > company-wide (empty `appliesTo`). Two matching policies at the same specificity level are a configuration error, rejected when the policy is saved (it must not be a runtime surprise). The individual override is how a single employee gets a negotiated entitlement without a new policy per person.

```ts
interface ILeavePolicy {
    company: ObjectId;
    leaveType: ObjectId;
    appliesTo: {
        country?: ObjectId;
        office?: ObjectId;
        employmentType?: string;
        level?: ObjectId;
        user?: ObjectId; // individual override
    }; // all fields empty = company-wide fallback
    effectiveFrom: string; // YYYY-MM-DD, inclusive
    version: number; // monotonically increasing per (leaveType, appliesTo)

    unit: "days" | "hours"; // unit the balance is kept and displayed in
    granularity: number; // smallest bookable amount: 1 (full day), 0.5, 0.25, or hours 1, 0.5 …

    leaveYear: LeaveYearRule;
    entitlement: EntitlementRule;
    carryOver?: CarryOverRule;
    negativeBalance: { allowed: boolean; maxAmount?: number }; // in `unit`

    counting: {
        countWeekends: boolean; // calendar-day counting (true) vs working-day counting (false)
        countPublicHolidays: boolean;
    };

    pay: PayRule; // see section 7

    requestRules: {
        requiresApproval: boolean;
        minNoticeDays?: number;
        maxConsecutiveDays?: number;
        allowBackdated: boolean;
        allowHalfDay: boolean; // if false, granularity is forced to a full day
        blockedDuringProbation?: boolean; // needs a probation end date on the user (see section 18)
        requiresCoverPerson?: boolean;
        blackoutPeriods?: {
            from: string;
            to: string;
            scope?: { department?: ObjectId; office?: ObjectId };
            reason: string;
        }[];
    };
}

type LeaveYearRule =
    | { type: "calendar" } // Jan 1 – Dec 31
    | { type: "fiscal"; startMonth: number; startDay: number }
    | { type: "anniversary" }; // each user's year starts on their employment anniversary

type EntitlementRule =
    | { type: "none" } // e.g. unpaid leave, balance not tracked
    | { type: "fixed"; amount: number; proRataFirstYear: boolean } // granted upfront at period start
    | { type: "accrual"; amountPerPeriod: number; frequency: "monthly" | "quarterly" | "perPayPeriod" | "daily" }
    | { type: "perHoursWorked"; hoursWorkedPerUnit: number; amount: number } // needs the Attendance module
    | { type: "tenure"; tiers: { fromYears: number; amount: number }[]; proRataFirstYear: boolean }
    | { type: "earned" }; // comp time: balance is only ever `grant`ed (e.g. from overtime), never accrued

interface CarryOverRule {
    maxAmount?: number; // undefined = unlimited
    expiresAfterMonths?: number; // carried amount expires if unused
}
```

### 4.3 `HolidayCalendars` and `Holidays`

```ts
interface IHolidayCalendar {
    company: ObjectId;
    name: string;
    country: ObjectId;
    office?: ObjectId; // optional narrowing; most specific wins
    isActive: boolean;
}

interface IHoliday {
    company: ObjectId;
    calendar: ObjectId;
    date: string; // YYYY-MM-DD
    name: string;
    fraction: number; // 1 = full day off, 0.5 = half-day holiday (e.g. Christmas Eve)
}
```

Resolution: office calendar → country calendar → none.

### 4.4 `WorkSchedules`

```ts
interface IWorkSchedule {
    company: ObjectId;
    name: string; // "Standard 40h", "UAE Sun–Thu", "Part-time 60%"
    country?: ObjectId; // default schedule for a country
    weekdays: { day: 0 | 1 | 2 | 3 | 4 | 5 | 6; hours: number }[]; // 0 = Sunday; omitted/0 = non-working
    isDefault?: boolean;
}
```

Resolution: user-specific schedule (`user.workSchedule`, new optional field) → country default → company default. A schedule gives both the weekend definition and the hours in a scheduled day, which is what lets "half a day" and "2 hours" mean the same thing in either unit.

### 4.5 `LeaveRequests`

```ts
interface ILeaveRequest {
    company: ObjectId;
    request: ObjectId; // the shared Request envelope: single source of truth for status, flow and approvers
    user: ObjectId; // the subject: whose leave this is (Request.requester is whoever submitted it)
    leaveType: ObjectId;

    // What the user asked for (inputs)
    startDate: string; // YYYY-MM-DD
    endDate: string;
    startPart: "full" | "firstHalf" | "secondHalf" | { hours: number }; // partial first day
    endPart: "full" | "firstHalf" | "secondHalf" | { hours: number }; // partial last day
    reason?: string;
    coverPerson?: ObjectId; // colleague covering the absence
    overrides?: { rule: string; reason: string }[]; // validations bypassed by a privileged creator (backdating, notice, balance …)

    // Links to other leave records (domain relations, not workflow state)
    replaces?: ObjectId; // this is a change request for an approved leave (section 12.1)
    supersededBy?: ObjectId; // set on the original once the change is approved
    convertedFrom?: ObjectId; // created by converting overlapping leave to sick leave (section 12.3)

    // What it was calculated to be (frozen result)
    lines: ILeaveLine[];
    totals: { quantity: number; unit: "days" | "hours"; paidQuantity: number; unpaidQuantity: number };
    policy: { policyId: ObjectId; version: number }; // the policy version applied
    calculatedAt: Date;

    adjustments?: ILeaveAdjustment[]; // pay and conversion corrections (sections 7 and 12.3); lines themselves are never edited

    createdAt: Date;
    updatedAt: Date;
}

// There is deliberately no `status`, `approvalStep`, `decidedBy`, `decidedAt`, `decisionNote` or `history` here.
// Workflow state has one home, the Request envelope; ApprovalTasks hold who was asked and who decided.

interface ILeaveLine {
    date: string; // one calendar day
    scheduledHours: number; // user's scheduled hours that day (0 on weekends / non-working days)
    fraction: number; // 0–1 of the scheduled day taken
    hours: number; // fraction * scheduledHours
    quantity: number; // in policy unit: counts against the balance
    countsAgainstBalance: boolean; // false for weekends/holidays when the policy doesn't count them
    payPercent: number; // 0–100, from the pay rule
    leavePeriodStart: string; // which leave year's balance this line draws from
    note?: "weekend" | "publicHoliday" | "nonWorkingDay";
}
```

Notes:

- There is **no approver or status on the leave record**. Both live on the `Request` and its `ApprovalTasks`. See section 9.
- There is **no copy of the requester's department, country or manager**. Visibility is evaluated live; the approver identity is frozen on the task, not on the leave. See section 9.
- Queries that need a leave's workflow status (overlap detection, pending quantity, coverage counts) select leave records by their own indexed dates first, then filter by `Request.status` for those `request` ids. `Requests` is indexed on `{ company, type, subject, status }` for the per-user case.
- `lines` is stored because duration depends on mutable external inputs (calendar, schedule, policy). Deriving it on read would silently change approved history when a holiday is added.
- `adjustments` is an append-only list: `{ at, by, kind: "payRecalculation" | "holidayCorrection" | "sicknessConversion", reason, linesBefore, linesAfter, deltaPaidQuantity }`. The effective result of a leave is `lines` with adjustments applied; payroll receives adjustments as correction items.

### 4.6 `LeaveLedger` (append-only)

```ts
interface ILeaveLedgerEntry {
    company: ObjectId;
    user: ObjectId;
    leaveType: ObjectId;
    leavePeriodStart: string; // the leave period this entry belongs to
    kind:
        | "accrual"
        | "grant" // upfront entitlement, comp time earned, one-off awards
        | "adjustment"
        | "carryOver"
        | "carryOverExpiry"
        | "usage"
        | "usageReversal"
        | "encashment" // balance cashed out during employment
        | "payout"; // balance paid out at termination
    amount: number; // signed, in the policy unit; usage is negative
    effectiveDate: string; // when it takes effect for balance-as-of queries
    expiresOn?: string; // on credit entries: when the unused remainder expires (carry-over buckets)
    bucket?: ObjectId; // on usage / usageReversal / carryOverExpiry: the credit entry it draws from (section 8.3)
    source?: string; // free-form origin of a grant, e.g. "overtime:2026-09-12"
    unit: "days" | "hours";
    request?: ObjectId; // the shared Request id (not the LeaveRequests id), so idempotency keys match the engine's; for usage / usageReversal
    policy?: { policyId: ObjectId; version: number };
    reason?: string; // required for adjustment / payout
    createdBy: ObjectId | "system";
    createdAt: Date;
}
```

Indexes:

- `{ company, user, leaveType, leavePeriodStart, effectiveDate }`
- Unique `{ request, kind, leavePeriodStart }` (partial, where `request` exists): makes approve/cancel retries idempotent.
- Unique `{ user, leaveType, leavePeriodStart, kind, accrualKey }` for accruals (see section 8).

Existing models use `autoIndex: false`, so indexes need an explicit creation step.

---

## 5. Duration calculation

One pure function, no I/O (inputs are passed in, so it is trivially unit-testable):

```ts
calculateLeaveLines({
    startDate, endDate, startPart, endPart,
    schedule,        // resolved work schedule
    holidays,        // resolved calendar entries within the range
    policy,          // resolved policy version for each leave period touched
    priorUsageForTiers, // see section 7
}): { lines: ILeaveLine[]; totals: ... }
```

Pipeline, per calendar day in the range:

1. Look up `scheduledHours` from the schedule. Non-working day → `note: "weekend"/"nonWorkingDay"`.
2. Look up the holiday fraction. A full holiday on a working day → `note: "publicHoliday"`.
3. Apply the partial-day inputs (`startPart` on the first day, `endPart` on the last).
4. Apply `policy.counting`:
    - `countWeekends = false` → weekend days get `countsAgainstBalance: false` and `quantity: 0`.
    - `countPublicHolidays = false` → holiday days likewise. A half-day holiday only removes the holiday portion.
    - `countWeekends = true` (calendar-day counting) → weekend days count as full calendar days.
5. Convert to the policy unit: `days` → `fraction`-based quantity; `hours` → `hours`.
6. Round to `granularity`.
7. Assign `leavePeriodStart` using the leave year rule (section 6). A request that crosses a leave-year boundary produces lines in two periods.
8. Assign `payPercent` (section 7).

Validation (also server-side): eligibility, no overlap with the user's pending/approved requests, minimum notice, maximum consecutive days, backdating, `allowHalfDay`, probation, blackout periods, cover person, total quantity is positive, the balance check (section 8) and team coverage limits (section 9.5).

Each check returns either a **block** (request cannot be created) or a **warning** (shown in `/preview` and to the approver). A creator holding enough permission may bypass specific blocks; every bypass is stored in `overrides` with a mandatory reason (section 12.2).

---

## 6. Leave years: calendar and anniversary

A policy chooses its `leaveYear` rule. One function resolves it:

```ts
getLeavePeriod(user, policy, date): { start: string; end: string }
```

- `calendar`: Jan 1 to Dec 31.
- `fiscal`: starts on the configured month/day.
- `anniversary`: starts on the user's `employmentDate` anniversary. Different users have different periods for the same policy, so the ledger always records `leavePeriodStart` explicitly instead of a bare year.

Rules:

- A line draws from the balance of the period its date falls in.
- Carry-over is evaluated at period end by the accrual job: it posts a `carryOver` entry into the new period (capped by `maxAmount`) and, when `expiresAfterMonths` is set, a `carryOverExpiry` entry for any unused carried amount after that time.
- If a user's employment date is changed (a data fix), anniversary periods shift. This is an explicit, audited admin operation, not a silent recompute.
- Users with no `employmentDate` cannot be on an anniversary policy. Validation blocks assigning one.

---

## 7. Pay rules and tiered pay

```ts
type PayRule =
    | { type: "flat"; percent: number } // 0–100
    | {
          type: "tiered";
          tiers: { upTo: number | null; percent: number }[]; // cumulative quantity within the window, in policy unit; null = no cap
          window: "calendarYear" | "leavePeriod" | "rolling" | "spell";
          rollingDays?: number; // for "rolling"
          spellGapDays?: number; // for "spell": absences within N days of each other are one illness episode
      };
```

Examples:

- Unpaid leave: `{ type: "flat", percent: 0 }`.
- Annual leave: `{ type: "flat", percent: 100 }`.
- Sick leave: `{ type: "tiered", window: "leavePeriod", tiers: [{ upTo: 3, percent: 100 }, { upTo: 13, percent: 50 }, { upTo: null, percent: 0 }] }`.

How tiers are evaluated:

- `payPercent` is assigned **per line**. The calculator walks lines chronologically, tracking how much of that type has already been consumed in the tier window (`priorUsageForTiers`: approved lines of the same type earlier in the window, supplied by the service).
- A request can therefore straddle a tier boundary: some lines at 100%, the rest at 50%.
- Pay is **frozen on the lines at approval**. Payroll reads it from there; it never re-evaluates tiers.

### Tier recalculation when earlier usage changes

Tiers depend on earlier usage, so cancelling or reversing an earlier approved leave changes what _later_ requests in the same window should have been paid. Handling:

1. On cancel/reversal of an approved request, the service finds later approved requests of the same type in the same tier window.
2. It recalculates their lines against the new prior usage.
3. For each request whose pay changed, it **does not edit the frozen lines**. It appends a `payRecalculation` entry to the leave record's `adjustments` (`{ at, reason, linesBefore → linesAfter, deltaPaidQuantity }`) and the leave's effective pay becomes `lines` with adjustments applied.
4. Payroll receives adjustments as separate correction items (section 11), so a payroll period that was already closed is corrected in the next one instead of being rewritten.

The same adjustment mechanism covers HR-triggered recalculation after a holiday-calendar correction.

---

## 8. Ledger, balances, accrual and negative balances

### 8.1 Balance

```
balance(user, type, period, asOf)  =  Σ ledger.amount   where effectiveDate ≤ asOf
available(user, type, period)      =  balance(period, today) − Σ pending request quantity in that period
projected(user, type, period, date) = balance(period, date) − pending/approved future usage up to date
```

- `balance` answers "what has been earned and used up to a date".
- `available` is what a new request is checked against.
- `projected` is a UI aid: it shows what the balance will be at the leave date once planned accruals land.

Pending leaves are those whose `Request.status` is `pending` (a small, indexed set per user), computed on read rather than written, so reject/cancel of a pending request needs no ledger write.

### 8.2 Transitions

| Event                   | Ledger effect                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Request created         | None. Pending quantity is read live.                                                                |
| Request approved        | Engine `onApproved`: one `usage` entry per leave period and bucket (negative), keyed to the Request |
| Pending reject / cancel | None                                                                                                |
| Approved cancel         | Engine `onCanceled`: `usageReversal` entries mirroring the usage entries (positive)                 |
| Accrual run             | `accrual` entries                                                                                   |
| Period rollover         | `carryOver` and `carryOverExpiry`                                                                   |
| HR correction           | `adjustment` with mandatory `reason`                                                                |
| Encashment              | `encashment` entry, approved by HR; negative amount, mirrors what payroll pays out                  |
| Leaver payout           | `payout` entry, only when HR confirms (zeroes the balance and records what was paid out)            |
| Comp time earned        | `grant` with `source` (needs Attendance for automatic grants; manual until then)                    |

Order of operations for approval: the engine conditionally flips the `Request` status, then calls the leave type's `onApproved`, which posts the ledger entries. `onApproved` must be idempotent, and the unique `{request, kind, leavePeriodStart}` index guarantees it, so a retry after a crash is safe. A reconciliation script scans for approved leave `Requests` lacking usage entries (the same approach the engine plan prescribes for task/request drift). This avoids requiring multi-document transactions, while remaining compatible with them if the deployment has a replica set.

Requests are **never hard-deleted**. Cancelled and rejected requests are kept for audit.

### 8.3 Consuming balance: oldest bucket first

Carry-over with an expiry means a balance is not one number but several **buckets**: each credit entry (`grant`, `accrual`, `carryOver`) is a bucket, with an optional `expiresOn`. Usage must draw from the bucket that expires first (then the oldest), otherwise expiry would destroy days the employee never had a chance to use.

- When approving, the service allocates the request's quantity across buckets, oldest/soonest-expiring first, and writes one `usage` entry per bucket (with `bucket` set). A request that crosses a leave-year boundary or a carry-over expiry therefore deducts from the right buckets automatically.
- Expiry is a ledger fact: the accrual job posts `carryOverExpiry` for the **unused remainder** of each bucket after its `expiresOn`.
- Reversal returns days to the **same bucket**. If that bucket has already expired, the restored amount is posted as an `adjustment` into the current period (with a reason) instead, so an expired balance never silently revives.
- Which bucket a usage line draws from is decided by its **date**: leave taken before a bucket's `expiresOn` may use it, even if approved after.

### 8.4 Accrual

- Accrual entries are facts, posted by an **idempotent** job: `accrueUpTo(date)`. Each accrual entry has an `accrualKey` (e.g. `2026-10`) with a unique index, so re-running or running late never double-posts.
- The job runs on a schedule **and** lazily: reading balances or creating a request first calls `accrueUpTo(today)` for that user. A missed cron run therefore cannot cause wrong balances.
- Pro-rata for a user's first period uses `employmentDate`.
- A policy version change mid-period: accruals before `effectiveFrom` stay as posted; accruals after use the new rule. If HR wants the new entitlement applied to the current period retroactively, they trigger an explicit **policy-change adjustment** that posts the delta as `adjustment` entries.

### 8.5 Negative balances

A policy may allow overdrawing (`negativeBalance: { allowed, maxAmount }`), for example when a user books approved leave before the accrual has caught up.

- Requests are validated against `available + maxAmount` (or unlimited when `maxAmount` is unset and `allowed` is true).
- The ledger simply goes negative. Nothing special is stored.
- The module must make the situation **trackable**:
    - `GET /leaves/balances/overdrawn` lists users with a negative balance (scoped by `leaves.balances:read`).
    - The balance view marks an overdrawn leave type and shows how much accrual is still expected before the end of the period (`projected`).

### 8.6 Leavers and settlement

When a user leaves the company, payroll needs to know what they are owed (unused paid leave) or owe (negative balance). Leaves exposes a **settlement summary**, computed (not stored) from the ledger:

```ts
interface ILeaveSettlement {
    user: ObjectId;
    asOf: string; // last working day
    byType: {
        leaveType: ObjectId;
        balance: number; // positive = owed to employee, negative = overdrawn
        unit: "days" | "hours";
        isPayable: boolean; // from policy: some countries require payout, others forfeit
        isRecoverable: boolean; // from policy: whether a negative balance may be recovered
    }[];
    futureApprovedLeaves: ObjectId[]; // approved requests starting after asOf — need cancelling or review
}
```

Needed for this:

- An **end-of-employment date** on the user. I did not find one on the user model (only `employmentDate` and `isActive`), so it must be added or sourced from the planned Employment History Log. **To verify before building.**
- On a leaver's end date, approved future leaves are flagged for HR to cancel (which posts reversals) rather than being cancelled automatically.
- `payout` entries are only posted when HR confirms the settlement, so the ledger remains the record of what was actually paid out.

---

## 9. Approval and visibility (shared engine)

Leave does not implement approval. It registers a **request type** with the engine in [docs/plans/approval-flows.md](../plans/approval-flows.md) and supplies the leave-specific hooks. Decisions taken for the pilot (07/10/2026):

- The approver is **resolved when a step activates** and stored as an `ApprovalTask`, one per approver.
- Org changes (manager change, deactivation, role loss) trigger an automatic, audited **reassign open tasks** effect. Completed steps are never touched.
- A task is **necessary but not sufficient**: authority is rechecked at decision time and the decision is blocked if the assignee lost it.
- A **rejection is final**. There is no edit or return-to-requester.
- Flows are scoped by request type plus optional country, department and **leave type**; the most specific active flow wins. The pilot spans several countries.

### 9.1 Where each fact lives

| Fact                                         | Home                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| Status, current step, flow version used      | `Requests` (envelope)                                 |
| Who was asked, who decided, on whose behalf  | `ApprovalTasks`                                       |
| Delegations                                  | `ApprovalDelegations` (shared)                        |
| Dates, per-day lines, pay, policy, overrides | `LeaveRequests` (leave domain record, `request` link) |
| Quantities                                   | `LeaveLedger`                                         |

A domain record never stores a second copy of workflow status.

### 9.2 What the leave type registers

```ts
leaveRequestType: RequestTypeDefinition<LeavePayload> = {
    type: "leave",
    payloadSchema,                 // dates, parts, leave type, reason, cover person, overrides
    defaultFlow: [{ key: "lineManager", resolver: { kind: "lineManager" }, fallback: { kind: "hrRepresentative" }, ... }],
    canCreate,                     // eligibility, overlap, notice, blackout, balance, probation (section 5 validation)
    canApprove,                    // authority recheck at decision time (below)
    onApproved,                    // idempotent: allocate buckets, post usage entries
    onCanceled,                    // idempotent: post usage reversals if usage had been posted
    onRejected,                    // nothing to undo: usage is only posted on approval
    summarize,                     // "Annual leave, 12–16 Jan (4 days)" for lists and notifications
};
```

- **Default flow:** one step, line manager, fallback HR representative. Companies can configure richer flows per country, department and leave type (for example a long sick leave adding an HR step) without changing the leave model.
- **`canApprove` (authority recheck):** the actor must hold `leaves:approve:{scope}` whose scope covers the subject, must not be the subject, and must clear the coverage-limit re-check (9.5). A task whose assignee fails this is blocked, and the engine's reassignment effect handles the task.
- **Flow validation:** the flow builder should warn when a resolver (for example `role`) can yield people who do not hold `leaves:approve` over the subject, because those tasks would always be blocked.
- **Self-approval:** impossible through the engine (`allowSelfApproval: false`, and `skipIfRequesterIsApprover` or fallback applies).

### 9.3 Visibility and queues

- **Needs my action** is the shared inbox: `ApprovalTasks` for the current user. There is no leave-specific queue and no `user: { $in: scopedIds }` approval query.
- **Who may read a leave** stays a live scope evaluation: the subject, the requester, anyone holding a task on it, and scoped viewers with `leaves:read:{scope}`. `resolveScopedUserIds(actor, scope)` remains and serves visibility lists, coverage-limit headcounts and reports. It must resolve department scope through the title chain.
- **Org changes** are handled by the engine's effects (plan section 7), which must be called from the **service layer** on every path that changes the org, including the Users bulk edit and imports. The repository's `updateOne` bypasses Mongoose hooks, so model hooks cannot be relied on. A reconciliation job catches stale open tasks.
- **Why still no copy of department, country or manager on the leave:** visibility follows the current org and the approver is frozen on tasks, so nothing about the requester needs copying. If reporting needs "department at the time", it comes from the effective-dated Employment History Log.

> The existing `buildUserSearchAccessQuery` filters on a `department` field, but the user model I inspected only has `employmentTitle` (department is reached via title → sub-department → department). I have not traced how the Users list resolves this. Verify before reusing that pattern.

### 9.4 Delegation and approver availability

Delegation is the shared `ApprovalDelegations` collection (`{ delegator, delegate, from, to, requestTypes?, isActive }`), applied **when tasks are created**: if the resolved approver has an active delegation, the task is created for the delegate with `originalAssignee` and `onBehalfOf` recorded.

Leave-specific rules on top:

- A delegate gains no permissions. `canApprove` is evaluated for the delegate's own authority, so delegating to someone with a narrower scope than the subject blocks the decision.
- A delegate cannot decide a leave they themselves requested or are the subject of.
- **Approver on approved leave, no delegation:** leave is the module that knows an approver is away, so it supplies an _availability signal_ to the resolver. At task creation, an approver whose approved leave covers today is treated like "resolver returned nobody" and the step `fallback` applies. If the approver goes on leave _after_ the task was created, the leave module triggers the engine's reassign effect for that approver's open tasks (proposed addition to plan section 7).

### 9.5 Team coverage limits

Rules such as "at most 2 people of Engineering out at once" or "at most 30% of a team":

```ts
interface ILeaveCoverageRule {
    company: ObjectId;
    name: string;
    group: {
        type: "department" | "subDepartment" | "office" | "country" | "manager" | "employmentTitle";
        id: ObjectId;
    };
    leaveTypes?: ObjectId[]; // empty = all types
    maxConcurrent?: number;
    maxPercent?: number; // of active headcount in the group
    mode: "warn" | "block";
    isActive: boolean;
}
```

- Evaluated **live** against leaves whose `Request.status` is approved (and, for `warn`, pending) for each day of the new request, using the group's current members (same resolver as section 9.3). No counters are stored, so org changes can't desync them.
- At create: `block` rules reject, `warn` rules appear in `/preview` and in the Requests page detail for the approver.
- **Re-checked at approval** inside `canApprove`, because the picture can change between submission and decision. A `block` rule that now fails stops the approval unless the approver holds an override permission, recorded in `overrides`.
- This is a validation rule, so it is independent of the approval model.

> The existing `buildUserSearchAccessQuery` filters on a `department` field, but the user model I inspected only has `employmentTitle` (department is reached via title → sub-department → department). I have not traced how the Users list resolves this. Verify before reusing that pattern; `resolveScopedUserIds` must resolve department scope through the title chain.

---

## 10. Policy and calendar changes

| Change                                              | Effect on past approved leaves                                          | Effect going forward                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| New policy version (e.g. pay tiers, counting rules) | None. Lines, pay and `policy` reference are frozen.                     | New requests resolve the version effective on each leave date.                                  |
| Entitlement change mid-period                       | None                                                                    | Accruals after `effectiveFrom` use the new rule. Optional explicit retro `adjustment` by HR.    |
| Holiday added, removed or changed                   | None automatically                                                      | New requests use the new calendar. HR gets a "needs review" list of affected approved requests. |
| Work schedule changed for a user                    | None                                                                    | New requests use the new schedule; future approved leaves appear in the review list.            |
| Leave year rule changed                             | None                                                                    | HR-run migration with explicit rollover entries. Not silent.                                    |
| Retroactive correction (legal change, data error)   | Corrected via `payAdjustment` and ledger `adjustment`, never by editing | Same                                                                                            |

"Needs review" is a query, not stored state: approved requests whose frozen lines differ from what `calculateLeaveLines` would produce now. HR can recalc individually or in bulk; each recalc produces adjustments.

---

## 11. Payroll contract

Payroll never recalculates leave. It reads frozen results:

```
GET /api/leaves/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD
```

returns, for approved requests intersecting the range:

- per line: `date`, `quantity`, `unit`, `payPercent`, `leaveType`, `request`
- `payAdjustments` recorded after the period was previously exported, as correction items
- settlement summaries for leavers in the range

Lines are per calendar day, so a request that crosses a payroll period boundary is allocated correctly without any splitting logic in payroll.

---

## 12. Request lifecycle

Workflow status is the engine's (`pending`, `approved`, `rejected`, `canceled`) and lives on the `Request`:

```
pending ──approve──▶ approved ──cancel──▶ canceled
   │  └──reject──▶ rejected   (final)
   └──cancel (requester)──▶ canceled
```

Rules:

- **A rejection is final.** The employee raises a new request. Nothing was reserved or posted before approval, so a rejection has no ledger effect.
- **A pending request is never edited.** To change it, cancel it (the engine closes its open tasks) and submit a new one.
- The requester can cancel `pending`. Cancelling `approved` is allowed before the start date; after the start date it requires `leaves:write` beyond `self` (HR), and the days not yet taken are reversed by `onCanceled`.
- Approve, reject and cancel are idempotent through the engine's conditional updates; the leave hooks are idempotent through the ledger's unique keys.
- Transitions are audited by the engine (tasks and request timeline), not by a `history` array on the leave.

### 12.1 Changing an approved leave is a new, linked request

Changing an approved leave (different dates, shorter, split) is **not** an edit of a submitted request, so it does not conflict with "rejection is final". It is a **new request** linked with `replaces: <original>`, going through the same flow as any leave.

Cancel + new request would leave a gap in which the employee has no approved leave and could lose their slot or have the balance re-checked against a state that no longer includes the original. The link avoids that:

- The original stays `approved` and keeps its ledger usage while the change is `pending`.
- The balance check, tier calculation and coverage rules are evaluated on the **net effect** (the change minus what the original already consumed).
- On approval, the change's `onApproved` does, idempotently: post the new usage, reverse the original's usage, set `supersededBy` on the original and **cancel the original `Request` through the engine** (reason "superseded"), so there is still one workflow status per leave and "approved and not canceled" always means "in effect".
- If the change is **rejected, nothing changes**: the original is untouched. To try again, the user raises another change request.
- Only one open change request per original.

### 12.2 HR or a manager entering leave on someone's behalf

- `leaves:write:{scope}` beyond `self` lets the creator submit for any user in scope. The `Request` records `requester` (the creator) and `subject` (the employee); `LeaveRequests.user` is the subject.
- Retroactive entry (past dates) is allowed when the policy has `allowBackdated` **or** the creator holds `leaves:write:*`.
- Any validation bypassed (notice, backdating, balance, blackout, coverage) is stored in `overrides` with a mandatory reason, and shown to the approver.
- An authorized creator can submit with `autoApprove`. This needs an engine capability (see section 18): the request is created with its tasks decided immediately by the creator (`decidedBy = creator`, audited), not "skipped", so the timeline stays honest and `onApproved` posts the usual ledger entries. A creator can never auto-approve their own leave.

### 12.3 Sickness during approved leave

When a person falls sick during approved annual leave, the overlapping days should be sick leave, not annual leave (for leave types with `overridesOtherLeave`, normally sick):

1. The user or HR creates a sick request with `convertedFrom: <annual request>` for the overlapping range.
2. On approval, in one operation: the sick request's usage is posted; the overlapping lines of the annual request are **reversed** in the ledger (a `usageReversal` per affected line, to the original bucket); the annual request keeps its frozen `lines` but records an `adjustments` entry marking those dates converted, so exports and the balance both agree.
3. Annual days not overlapping are unaffected. If the whole annual leave is overlapped, its `Request` is canceled through the engine (reason "converted to sick leave") and `supersededBy` is set.

Pay moves with the lines: payroll sees the converted days under the sick leave's pay tiers (section 7).

---

## 13. Permissions

New categories, added to both `server/src/enums/permissions.enum.ts` and `client/src/app/core/enums/permissions.enum.ts`:

| Category                  | Actions                    | Scopes                                                                                                             | Gates                                            |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `leaves`                  | `read`, `write`, `approve` | `read`: all scopes; `write`: `*`, `self`; `approve`: `*`, `department`, `country`, `department-country`, `managed` | Leave visibility, submission, approval authority |
| `leaveBalances`           | `read`, `write`            | `read`: all scopes; `write`: `*`                                                                                   | Viewing balances; manual ledger adjustments      |
| `leaveSettingsManagement` | `read`, `write`            | `*`                                                                                                                | Leave types, policies, calendars, schedules      |

Notes:

- `approve` is a new `PermissionActions` value, so `permission-factory.test.ts`, `rbac-coverage.test.ts` and the Permissions-page matrix (`MATRIX_ACTIONS` in `permission-matrix.ts`) need updating.
- Default roles (`seed.service.ts`): Employee `leaves:read:self`, `leaves:write:self`, `leaveBalances:read:self`; Manager adds `leaves:read:managed`, `leaves:approve:managed`, `leaveBalances:read:managed`; HR gets `leaves` and `leaveBalances` at `*` and `leaveSettingsManagement`.
- Granting is still limited by `canGrantPermissions`.
- `leaves:approve:{scope}` is the **authority** checked in `canApprove` at decision time; it is not what puts a request in someone's inbox (that is the flow and its tasks). Both are needed.
- The shared engine adds its own categories (`requests:read`, `approvalFlows:read|write`, and an admin-override permission; see the plan, section 9). The flow builder UI, the Requests page and approval delegations are gated there, not here.

---

## 14. API

| Method | Path                                                                                                    | Purpose                                                                                                                          | Permission                                                                |
| ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/leaves/:id`                                                                                       | Leave domain detail (lines, pay, policy, overrides, adjustments, balance impact, coverage warnings) for the Requests page drawer | visibility per section 9.3                                                |
| POST   | `/api/leaves/preview`                                                                                   | Calculate lines/totals/balance impact without saving                                                                             | `leaves:write:self`                                                       |
| POST   | `/api/leaves`                                                                                           | Create the leave record **and** its `Request` through the engine (server recalculates lines)                                     | `leaves:write:self`                                                       |
| POST   | `/api/leaves/:id/change`                                                                                | Create a change request for an approved leave (section 12.1)                                                                     | owner or `leaves:write:{scope}`                                           |
| POST   | `/api/leaves/:id/convert`                                                                               | Convert overlapping days to sick leave (section 12.3)                                                                            | owner or `leaves:write:{scope}`                                           |
| CRUD   | `/api/leave-coverage-rules`                                                                             | Team coverage limits                                                                                                             | `leaveSettingsManagement`                                                 |
| GET    | `/api/leaves/balances/me`                                                                               | Own balances per type and period, incl. `available` and `projected`                                                              | `leaveBalances:read:self`                                                 |
| GET    | `/api/leaves/balances/:userId`                                                                          | A user's balances, ledger entries on request                                                                                     | `leaveBalances:read:{scope}`                                              |
| GET    | `/api/leaves/balances/overdrawn`                                                                        | Negative balances                                                                                                                | `leaveBalances:read:{scope}`                                              |
| POST   | `/api/leaves/balances/:userId/adjust`                                                                   | Manual ledger adjustment (reason required)                                                                                       | `leaveBalances:write:*`                                                   |
| GET    | `/api/leaves/settlement/:userId`                                                                        | Leaver settlement summary                                                                                                        | `leaveBalances:read:{scope}`                                              |
| GET    | `/api/leaves/review`                                                                                    | Approved requests whose frozen lines differ from a fresh calculation                                                             | `leaveSettingsManagement:read:*`                                          |
| GET    | `/api/leaves/payroll`                                                                                   | Payroll export                                                                                                                   | `leaveSettingsManagement:read:*` (revisit when payroll permissions exist) |
| CRUD   | `/api/leave-types`, `/api/leave-policies`, `/api/holiday-calendars` (+ holidays), `/api/work-schedules` | Configuration                                                                                                                    | `leaveSettingsManagement`                                                 |

**Not in this module:** the approval inbox, approve/reject/cancel of a request, the "my requests" and team lists, and delegations. These are the shared engine's endpoints (`ApprovalTasks` inbox, `Requests`, `ApprovalDelegations`; see the plan). Leave lists on the Requests page are the engine's `Requests` filtered by `type = "leave"`.

`/api/leaves/preview` is what the request dialog calls on every date change, so the user sees exact days, pay, resulting balance (including which bucket is consumed) and any `blocks` and `warnings` before submitting. `POST /api/leaves` accepts an optional `onBehalfOf` user id, `autoApprove` and `overrides` for authorized creators (section 12.2).

Policies are append-only: `POST` creates a new version; there is no `PUT` that changes an effective version. Deactivating a leave type is blocked while it has pending requests (extend `dependency.service.ts`).

---

## 15. Code layout

### Server (`server/src/`)

```
models/        leave-type | leave-policy | holiday-calendar | holiday | work-schedule | leave-request | leave-ledger
               | leave-coverage-rule
               (Request, ApprovalTask, ApprovalFlow, ApprovalDelegation belong to the shared engine)
repositories/  one per model (companyModel wrapper)
interfaces/    leave*.interface.ts
services/
  leave-calculator.ts          pure: calculateLeaveLines, getLeavePeriod (no DB imports)
  leave-policy-resolver.service.ts   policy / calendar / schedule resolution for (user, date)
  leave-ledger.service.ts      post entries, balance queries, accrueUpTo, rollover
  leave.service.ts             validation, creating the leave + Request, tier recalculation, change/convert
  leave-settlement.service.ts
requests/types/leave.ts        registers the "leave" RequestTypeDefinition (canCreate, canApprove, onApproved, onCanceled, summarize)
policies/leave.policy.ts       resolveScopedUserIds (visibility), canApproveLeave (authority recheck)
controllers/ routes/           leave, leave-type, leave-policy, holiday-calendar, work-schedule
scripts/accrueLeaves.ts        scheduled entry point for accrueUpTo
__tests__/                     leave-calculator.test.ts (pure), leaves.test.ts, leaves-isolation.test.ts, leave-ledger.test.ts
```

### Client (`client/src/app/`)

```
core/{enums,interfaces,services}/   leave types, policies, requests, balances
features/leaves/                    request dialog (with live preview), balance view, leave detail panel rendered inside the shared Requests drawer
                                    (inbox, "my requests", team tab and decision buttons are the shared features/requests/ page)
features/leave-settings/            types, policies (version history), holiday calendars, work schedules
features/dashboard/                 replace the sample "Leave Tracker" with real balances
```

Sidebar: a "Time Off" section. Follow the _ui-conventions_ skill (Material first, then existing global classes and tokens; `.badge-*` for status).

---

## 16. Edge cases to cover in tests

- Leave crossing a year/leave-period boundary draws from two periods.
- Leave crossing a payroll month boundary: lines allocate by date.
- Weekend in Fri–Sat countries; part-time schedules; zero-hour days.
- Half-day holiday inside a leave; holiday on a weekend.
- Calendar-day vs working-day counting for the same range.
- First/last day partial (`firstHalf`, `secondHalf`, hours).
- Tier straddle within one request; tiers across several requests; recalculation after an earlier cancel.
- Overlapping requests, back-to-back requests, backdating, minimum notice.
- Double approve, double cancel, retry after partial failure (idempotency).
- Approve → cancel → balance and tiers restored.
- Overdrawn balance: allowed within `maxAmount`, rejected beyond it, surfaces in `overdrawn`.
- Accrual catch-up after a missed run; no double posting.
- Anniversary period after an `employmentDate` change.
- Policy version change mid-period; past requests unchanged.
- Org change while pending: manager changed, manager deactivated, manager loses `leaves:approve`: open tasks are reassigned and audited, completed steps untouched, unresolved tasks flagged "needs routing". Must hold for single edit, bulk edit and import.
- Task is necessary but not sufficient: an assignee who lost authority cannot decide.
- Flow scoping: country + department + leave type; most specific active flow wins; a request keeps its frozen flow after the flow is edited.
- Delegation applied at task creation (`originalAssignee`, `onBehalfOf`); delegate with narrower scope is blocked by `canApprove`.
- Self-approval blocked; approver on approved leave falls back (at creation and after, via reassign).
- Rejected leave is final: no ledger entries ever existed, new request needed; rejected change request leaves the original untouched.
- Status joins: overlap detection and coverage counts ignore leaves whose `Request` is rejected or canceled.
- Cross-company isolation on every new collection.
- Leaver with future approved leave and a negative balance.
- Carry-over bucket consumed before the current year's balance; expiry of only the unused remainder; reversal into an already expired bucket.
- Leave spanning a carry-over expiry date: days before it draw from the expiring bucket, days after from the current one.
- Policy specificity: individual > level/employment type > office > country > company; conflicting same-level policies rejected on save.
- Eligibility (gender, employment type, tenure), probation, blackout windows, required cover person.
- Coverage limits: warn vs block, re-check at approval after another request was approved in between.
- Delegation: active window, expired delegation, delegate cannot approve a request they raised, `onBehalfOf` audit.
- Change request: net-effect balance check, approval swaps usage idempotently and cancels the original `Request`, rejection leaves the original untouched, one open change per original.
- HR entry on behalf, retroactive, with overrides and auto-approve; creator cannot auto-approve their own leave.
- Sickness during annual leave: partial and full overlap; pay and balance both move.
- Encashment reduces balance and appears in payroll export.

---

## 17. Delivery phases

1. **Permissions plumbing**: `approve` action, new categories, seed roles, matrix, enum parity on client and server, tests.
2. **Calculation core**: work schedules, holiday calendars, leave types, versioned policies, the pure `calculateLeaveLines` and `getLeavePeriod`, with exhaustive unit tests (the riskiest and most valuable piece).
3. **Ledger and accrual**: ledger model and service, balance queries, `accrueUpTo`, rollover, lazy catch-up.
4. **Requests on the engine** (depends on approval-flows plan phases 1 and 2: engine core, then leave as the first type): preview, create the leave plus its `Request`, register the leave type's hooks (`canCreate`, `canApprove`, `onApproved`, `onCanceled`), bucket allocation, tier recalculation and `payRecalculation` adjustments. Then the request variants: change requests, HR entry on behalf with overrides, sickness conversion.
   4b. **Rules layer** (after 4, independently shippable): team coverage limits, blackout periods, eligibility, probation (once the date exists), approver-availability signal. Multi-step and scoped flows, delegation and org-change effects arrive with plan phases 4 and 5, with no leave changes.
5. **Client**: settings screens, request dialog with live preview, balances, leave detail panel in the shared Requests drawer, dashboard. The inbox and Requests page are the engine's (plan phase 3).
6. **Leaver and payroll support**: end-of-employment date, settlement summary, overdrawn report, review report, payroll export.
7. **Docs**: move this document from "design" to "reference", update the roadmap, changelog and API reference.

---

## 18. Open items

- **End-of-employment date** does not exist on the user model; decide whether it lives on the user or the Employment History Log (section 8.6).
- **Probation end date** does not exist on the user model either, so `blockedDuringProbation` cannot be enforced until it does. Eligibility by `gender`, `employmentType` and `employmentDate` can use the existing user fields.
- **Attendance dependency**: `perHoursWorked` entitlement and automatic comp-time grants need the Attendance module. Until then comp time is granted manually via `grant` entries.
- **Attachments and `requiresAttachment`**: the flag is stored on the leave type now; enforcement ships with attachments.
- **Payroll permissions**: the payroll export is gated provisionally; revisit when the payroll module defines its own.
- **Time zones**: leave dates are calendar dates, but "today" for notice and backdating checks needs a defined reference (user's country time zone is the proposal).
- **Holidays falling inside sick leave** (counted or excluded) varies by country; it is expressed through `counting.countPublicHolidays` per policy, but each country's default needs product input.
- **Attachments**: deferred. When added, they reuse the Supabase storage used by user documents and attach to the request.
- **Engine capabilities leave needs that the plan does not yet state** (to confirm with the approval-flows plan):
    1. **Cancel after approval**: a `approved → canceled` transition, with the type's `onCanceled` reversing side effects. Plan section 5.1 only describes the requester cancelling open requests.
    2. **Engine-initiated cancel by another type's effect**: a change request's `onApproved` cancels the original leave's `Request` (reason "superseded").
    3. **Immediate approval by an authorized creator** (HR entry with `autoApprove`), recorded as decided tasks, not skipped steps. Plan section 5.3 allows auto-approval only when a flow explicitly permits it.
    4. **Approver availability signal**: a registry hook so a type can say "this approver is unavailable" to the resolver, plus a reassign trigger when an approver goes on approved leave (plan section 7).
    5. **Type-specific detail in the Requests drawer**: `summarize` is not enough for lines, pay, balance impact and warnings; the drawer needs a per-type detail renderer or endpoint.
    6. **Flow-scope precedence** when both `country` and `department` match different flows (plan open question 6). Leave type is a third dimension.
- **Status joins**: because leave records carry no status, overlap and coverage queries join to `Requests`. If measurement shows this is too slow for company-wide coverage counts, add a rebuildable read projection rather than a second status field.
