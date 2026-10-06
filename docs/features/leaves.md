# Leaves

> **Status: design (not implemented).** This document is the agreed architecture for the Leaves module. It tracks roadmap item _Leaves Module_ and `NEXT_TODOS.md` P0-08. Update it as decisions change.

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
- Multi-step approval chains. The first version is single-step; the approval step is stored as a _rule_ so the roadmap's Request Flow Builder can replace it.
- The payroll module itself. Leaves exposes a payroll contract (section 11).

---

## 2. Design principles

1. **Authorization is evaluated now; accounting is evaluated then.**
    - Anything answering "who may see or approve this today?" is resolved **live** from the current org structure.
    - Anything answering "what happened, how much, at what pay, under which rule?" is **frozen** when it happens.
2. **Append, never mutate, for quantities.** Balances come from an append-only ledger. Corrections are new entries.
3. **Policies are versioned and effective-dated.** A change never rewrites past decisions.
4. **One calculation function.** All duration and pay maths lives in a pure, heavily tested function. The server always calls it; the client's numbers are never trusted.
5. **No hidden sync.** There are no hooks or cron jobs whose job is to keep two copies of the same fact equal. Cron exists only to _generate_ time-driven facts (accruals), and it is idempotent.
6. **Dates are calendar dates.** Store `YYYY-MM-DD` strings, never UTC instants, so a leave never shifts by a day across time zones.

---

## 3. Domain concepts

| Concept                | Meaning                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Leave type**         | A category of leave (Annual, Sick, Unpaid, Maternity). Company-wide definition.                                              |
| **Leave policy**       | The rules for one leave type in one country, effective from a date. Versioned.                                               |
| **Holiday calendar**   | Public holidays for a country (optionally narrowed to an office or region).                                                  |
| **Work schedule**      | Which weekdays and how many hours a user works. Defines weekends (these differ by country, e.g. Fri–Sat) and part-time work. |
| **Leave period**       | The leave year a date falls into: calendar, fiscal, or anniversary-based.                                                    |
| **Leave request**      | A user's request for a date range, with frozen per-day lines.                                                                |
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
    category: "annual" | "sick" | "parental" | "unpaid" | "other"; // drives defaults and reporting only
    isActive: boolean;
}
```

A leave type has no rules. Rules live in policies, because they differ per country.

### 4.2 `LeavePolicies` (versioned, effective-dated)

Never edited in place. A change creates a new document with a later `effectiveFrom`. A policy applies to a `(leaveType, country)` pair; `country: null` is the company-wide fallback.

```ts
interface ILeavePolicy {
    company: ObjectId;
    leaveType: ObjectId;
    country?: ObjectId; // null = fallback for countries without a specific policy
    effectiveFrom: string; // YYYY-MM-DD, inclusive
    version: number; // monotonically increasing per (leaveType, country)

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
    };
}

type LeaveYearRule =
    | { type: "calendar" } // Jan 1 – Dec 31
    | { type: "fiscal"; startMonth: number; startDay: number }
    | { type: "anniversary" }; // each user's year starts on their employment anniversary

type EntitlementRule =
    | { type: "none" } // e.g. unpaid leave, balance not tracked
    | { type: "fixed"; amount: number; proRataFirstYear: boolean }
    | { type: "accrual"; amountPerPeriod: number; frequency: "monthly" | "quarterly" | "perPayPeriod" | "daily" }
    | { type: "tenure"; tiers: { fromYears: number; amount: number }[]; proRataFirstYear: boolean };

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
    user: ObjectId; // requester
    leaveType: ObjectId;

    // What the user asked for (inputs)
    startDate: string; // YYYY-MM-DD
    endDate: string;
    startPart: "full" | "firstHalf" | "secondHalf" | { hours: number }; // partial first day
    endPart: "full" | "firstHalf" | "secondHalf" | { hours: number }; // partial last day
    reason?: string;

    // What it was calculated to be (frozen result)
    lines: ILeaveLine[];
    totals: { quantity: number; unit: "days" | "hours"; paidQuantity: number; unpaidQuantity: number };
    policy: { policyId: ObjectId; version: number }; // the policy version applied
    calculatedAt: Date;

    // Lifecycle
    status: "pending" | "approved" | "rejected" | "canceled";
    approvalStep: { rule: "directManager" | "role"; fallbackRule?: "role"; roleId?: ObjectId };
    decidedBy?: ObjectId; // immutable once set
    decidedAt?: Date;
    decisionNote?: string;
    canceledBy?: ObjectId;
    canceledAt?: Date;

    history: { at: Date; by: ObjectId; from: string; to: string; note?: string }[]; // audit
    createdAt: Date;
    updatedAt: Date;
}

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

- There is **no `approver` field**. See section 9.
- There is **no copy of the requester's department, country or manager**. See section 9.
- `lines` is stored because duration depends on mutable external inputs (calendar, schedule, policy). Deriving it on read would silently change approved history when a holiday is added.

### 4.6 `LeaveLedger` (append-only)

```ts
interface ILeaveLedgerEntry {
    company: ObjectId;
    user: ObjectId;
    leaveType: ObjectId;
    leavePeriodStart: string; // the leave period this entry belongs to
    kind: "accrual" | "grant" | "adjustment" | "carryOver" | "carryOverExpiry" | "usage" | "usageReversal" | "payout";
    amount: number; // signed, in the policy unit; usage is negative
    effectiveDate: string; // when it takes effect for balance-as-of queries
    unit: "days" | "hours";
    request?: ObjectId; // for usage / usageReversal
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

Validation (also server-side): no overlap with the user's pending/approved requests, minimum notice, maximum consecutive days, backdating, `allowHalfDay`, total quantity is positive, and the balance check (section 8).

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
3. For each request whose pay changed, it **does not edit the frozen lines**. It writes a `payAdjustment` record on the request (`{ at, reason, linesBefore → linesAfter, deltaPaidQuantity }`) and the request's effective pay becomes `lines` with adjustments applied.
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

Pending requests are computed live (a small, indexed set per user) rather than written, so reject/cancel of a pending request needs no ledger write.

### 8.2 Transitions

| Event                   | Ledger effect                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Request created         | None. Pending quantity is read live.                                                     |
| Request approved        | One `usage` entry per leave period touched (negative), keyed to the request              |
| Pending reject / cancel | None                                                                                     |
| Approved cancel         | `usageReversal` entries mirroring the usage entries (positive)                           |
| Accrual run             | `accrual` entries                                                                        |
| Period rollover         | `carryOver` and `carryOverExpiry`                                                        |
| HR correction           | `adjustment` with mandatory `reason`                                                     |
| Leaver payout           | `payout` entry, only when HR confirms (zeroes the balance and records what was paid out) |

Order of operations for approval: conditionally flip status (`findOneAndUpdate({ _id, status: "pending" })`), then post the ledger entries. The unique `{request, kind, leavePeriodStart}` index makes a retry after a crash safe. A reconciliation script can scan for approved requests lacking usage entries. This avoids requiring multi-document transactions, while remaining compatible with them if the deployment has a replica set.

Requests are **never hard-deleted**. Cancelled and rejected requests are kept for audit.

### 8.3 Accrual

- Accrual entries are facts, posted by an **idempotent** job: `accrueUpTo(date)`. Each accrual entry has an `accrualKey` (e.g. `2026-10`) with a unique index, so re-running or running late never double-posts.
- The job runs on a schedule **and** lazily: reading balances or creating a request first calls `accrueUpTo(today)` for that user. A missed cron run therefore cannot cause wrong balances.
- Pro-rata for a user's first period uses `employmentDate`.
- A policy version change mid-period: accruals before `effectiveFrom` stay as posted; accruals after use the new rule. If HR wants the new entitlement applied to the current period retroactively, they trigger an explicit **policy-change adjustment** that posts the delta as `adjustment` entries.

### 8.4 Negative balances

A policy may allow overdrawing (`negativeBalance: { allowed, maxAmount }`), for example when a user books approved leave before the accrual has caught up.

- Requests are validated against `available + maxAmount` (or unlimited when `maxAmount` is unset and `allowed` is true).
- The ledger simply goes negative. Nothing special is stored.
- The module must make the situation **trackable**:
    - `GET /leaves/balances/overdrawn` lists users with a negative balance (scoped by `leaves.balances:read`).
    - The balance view marks an overdrawn leave type and shows how much accrual is still expected before the end of the period (`projected`).

### 8.5 Leavers and settlement

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

## 9. Approval and visibility (live resolution)

### Why nothing about the requester is copied onto the request

Storing the requester's manager, department and country on the request makes list queries a single filter, but it creates facts that must be kept in sync with the org:

- The repository's `updateOne` uses `Model.updateOne`, which bypasses document hooks, and the Users page has a bulk-edit dialog. Hooks would silently miss those paths, and a cron would be needed to repair drift.
- A user who changes manager, department or country would leave stale pending requests with the wrong approver or visibility.
- A departed manager leaves orphaned requests that need explicit re-routing.

Access should follow the **current** org. The history that matters, who decided and when, is stored as `decidedBy` and `decidedAt`. If reporting later needs "department at the time", it should come from the effective-dated Employment History Log, not from copies on every leave.

### How it works

- **Approval step is a rule**, not a user: `{ rule: "directManager", fallbackRule: "role", roleId }`. This also maps onto the roadmap's Request Flow Builder, where a step is "an approver rule" resolved at decision time.
- **Queue and visibility** for an actor and scope:
    1. `resolveScopedUserIds(actor, scope)` returns the user ids the actor may see (`managed` = users whose `manager` is the actor; `department`/`country`/`department-country` = users matching the actor's; `*` = no id filter; `self` = the actor).
    2. Requests are filtered with `user: { $in: ids }`, plus status/date filters.
- **Approval authorization is checked at decision time** against the live org, so the _current_ manager can approve even if the manager changed after submission.
- **Fallback:** if the requester has no manager, or the manager is inactive, anyone holding `leaves:approve:*` may approve.
- **Self-approval is forbidden**, regardless of permission.

Cost: two cheap indexed queries. Direct-report sets are tens of ids; department/country sets are at most a few thousand ObjectIds in an indexed `$in`.

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

```
pending ──approve──▶ approved ──cancel──▶ canceled
   │  └──reject──▶ rejected
   └──cancel (owner)──▶ canceled
```

Rules:

- Owner can cancel `pending`. Cancelling `approved` is allowed before the start date; after the start date it requires `leaves:write` beyond `self` (HR), and the days not yet taken are reversed.
- Approve and reject are idempotent through the conditional status update.
- Editing a request is modelled as cancel + new request, so the audit trail stays simple.
- Every transition appends to `history`.

---

## 13. Permissions

New categories, added to both `server/src/enums/permissions.enum.ts` and `client/src/app/core/enums/permissions.enum.ts`:

| Category                  | Actions                    | Scopes                                                                                                             | Gates                                       |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `leaves`                  | `read`, `write`, `approve` | `read`: all scopes; `write`: `*`, `self`; `approve`: `*`, `department`, `country`, `department-country`, `managed` | Requests and queue                          |
| `leaveBalances`           | `read`, `write`            | `read`: all scopes; `write`: `*`                                                                                   | Viewing balances; manual ledger adjustments |
| `leaveSettingsManagement` | `read`, `write`            | `*`                                                                                                                | Leave types, policies, calendars, schedules |

Notes:

- `approve` is a new `PermissionActions` value, so `permission-factory.test.ts`, `rbac-coverage.test.ts` and the Permissions-page matrix (`MATRIX_ACTIONS` in `permission-matrix.ts`) need updating.
- Default roles (`seed.service.ts`): Employee `leaves:read:self`, `leaves:write:self`, `leaveBalances:read:self`; Manager adds `leaves:read:managed`, `leaves:approve:managed`, `leaveBalances:read:managed`; HR gets `leaves` and `leaveBalances` at `*` and `leaveSettingsManagement`.
- Granting is still limited by `canGrantPermissions`.

---

## 14. API

| Method | Path                                                                                                    | Purpose                                                              | Permission                                                                |
| ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/leaves`                                                                                           | Scoped list (filters: status, user, type, date range; paginated)     | `leaves:read:{scope}`                                                     |
| GET    | `/api/leaves/mine`                                                                                      | Own requests                                                         | `leaves:read:self`                                                        |
| POST   | `/api/leaves/preview`                                                                                   | Calculate lines/totals/balance impact without saving                 | `leaves:write:self`                                                       |
| POST   | `/api/leaves`                                                                                           | Create (server recalculates lines)                                   | `leaves:write:self`                                                       |
| POST   | `/api/leaves/:id/cancel`                                                                                | Cancel                                                               | owner or `leaves:write:{scope}`                                           |
| POST   | `/api/leaves/:id/approve`                                                                               | Approve                                                              | `leaves:approve:{scope}`                                                  |
| POST   | `/api/leaves/:id/reject`                                                                                | Reject (note required)                                               | `leaves:approve:{scope}`                                                  |
| GET    | `/api/leaves/balances/me`                                                                               | Own balances per type and period, incl. `available` and `projected`  | `leaveBalances:read:self`                                                 |
| GET    | `/api/leaves/balances/:userId`                                                                          | A user's balances, ledger entries on request                         | `leaveBalances:read:{scope}`                                              |
| GET    | `/api/leaves/balances/overdrawn`                                                                        | Negative balances                                                    | `leaveBalances:read:{scope}`                                              |
| POST   | `/api/leaves/balances/:userId/adjust`                                                                   | Manual ledger adjustment (reason required)                           | `leaveBalances:write:*`                                                   |
| GET    | `/api/leaves/settlement/:userId`                                                                        | Leaver settlement summary                                            | `leaveBalances:read:{scope}`                                              |
| GET    | `/api/leaves/review`                                                                                    | Approved requests whose frozen lines differ from a fresh calculation | `leaveSettingsManagement:read:*`                                          |
| GET    | `/api/leaves/payroll`                                                                                   | Payroll export                                                       | `leaveSettingsManagement:read:*` (revisit when payroll permissions exist) |
| CRUD   | `/api/leave-types`, `/api/leave-policies`, `/api/holiday-calendars` (+ holidays), `/api/work-schedules` | Configuration                                                        | `leaveSettingsManagement`                                                 |

`/api/leaves/preview` is what the request dialog calls on every date change, so the user sees exact days, pay and resulting balance before submitting.

Policies are append-only: `POST` creates a new version; there is no `PUT` that changes an effective version. Deactivating a leave type is blocked while it has pending requests (extend `dependency.service.ts`).

---

## 15. Code layout

### Server (`server/src/`)

```
models/        leave-type | leave-policy | holiday-calendar | holiday | work-schedule | leave-request | leave-ledger
repositories/  one per model (companyModel wrapper)
interfaces/    leave*.interface.ts
services/
  leave-calculator.ts          pure: calculateLeaveLines, getLeavePeriod (no DB imports)
  leave-policy-resolver.service.ts   policy / calendar / schedule resolution for (user, date)
  leave-ledger.service.ts      post entries, balance queries, accrueUpTo, rollover
  leave.service.ts             lifecycle, validation, approval, tier recalculation
  leave-settlement.service.ts
policies/leave.policy.ts       resolveScopedUserIds, canApproveLeave
controllers/ routes/           leave, leave-type, leave-policy, holiday-calendar, work-schedule
scripts/accrueLeaves.ts        scheduled entry point for accrueUpTo
__tests__/                     leave-calculator.test.ts (pure), leaves.test.ts, leaves-isolation.test.ts, leave-ledger.test.ts
```

### Client (`client/src/app/`)

```
core/{enums,interfaces,services}/   leave types, policies, requests, balances
features/leaves/                    My leaves, Team requests, request dialog (with live preview), decision dialog, balance view
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
- Manager changed while a request is pending; manager removed; self-approval blocked.
- Cross-company isolation on every new collection.
- Leaver with future approved leave and a negative balance.

---

## 17. Delivery phases

1. **Permissions plumbing**: `approve` action, new categories, seed roles, matrix, enum parity on client and server, tests.
2. **Calculation core**: work schedules, holiday calendars, leave types, versioned policies, the pure `calculateLeaveLines` and `getLeavePeriod`, with exhaustive unit tests (the riskiest and most valuable piece).
3. **Ledger and accrual**: ledger model and service, balance queries, `accrueUpTo`, rollover, lazy catch-up.
4. **Requests**: preview, create, cancel, approve, reject, live scope resolution, tier recalculation and `payAdjustment`.
5. **Client**: settings screens, request dialog with live preview, team queue, balances, dashboard.
6. **Leaver and payroll support**: end-of-employment date, settlement summary, overdrawn report, review report, payroll export.
7. **Docs**: move this document from "design" to "reference", update the roadmap, changelog and API reference.

---

## 18. Open items

- **End-of-employment date** does not exist on the user model; decide whether it lives on the user or the Employment History Log (section 8.5).
- **Payroll permissions**: the payroll export is gated provisionally; revisit when the payroll module defines its own.
- **Time zones**: leave dates are calendar dates, but "today" for notice and backdating checks needs a defined reference (user's country time zone is the proposal).
- **Holidays falling inside sick leave** (counted or excluded) varies by country; it is expressed through `counting.countPublicHolidays` per policy, but each country's default needs product input.
- **Attachments**: deferred. When added, they reuse the Supabase storage used by user documents and attach to the request.
- **Multi-step approvals**: deferred to the Request Flow Builder. `approvalStep` is deliberately a rule, so it can become a list of steps.
