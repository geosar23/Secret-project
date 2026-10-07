/* eslint-disable no-unused-vars */
import { Types } from "mongoose";
import { IUser, IUserPopulated } from "../interfaces/user.interface";
import { IOrgMoveSnapshot } from "../interfaces/org-move.interface";
import { departmentRepository } from "../repositories/department.repository";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { employmentTitleRepository } from "../repositories/employment-title.repository";
import { OrgRecordKind, orgMoveRepository, orgMoveWriteRepository } from "../repositories/org-move.repository";
import { userRepository } from "../repositories/user.repository";
import { canManageUser } from "../policies/user.policy";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import {
    OrgHierarchy,
    OrgMoveInput,
    OrgMoveOperation,
    OrgResolution,
    OrgState,
    isSubDepartmentOperation,
    resolveUserMove,
    validateOrgState,
} from "./org-move.resolver";

const OPERATIONS: OrgMoveOperation[] = ["moveSubDepartment", "moveTitle", "mergeSubDepartment", "mergeTitle"];

interface NamedRef {
    id: string;
    name: string;
}

interface MoveScope {
    input: OrgMoveInput;
    source: NamedRef;
    target: NamedRef;
    /** Hierarchy after the move, used to compute and validate the users' new assignments. */
    hierarchy: OrgHierarchy;
    /** Entity writes for the move, and the snapshot that reverses them. */
    entityWrites: () => Promise<void>;
    entitySnapshot: IOrgMoveSnapshot["entities"];
    childTitleCount: number;
    /** Records whose updatedAt guards an undo. */
    touched: { kind: "sub" | "title"; ids: string[] };
}

type Failure = { ok: false; message: string; details?: string[] };
type Ok<T> = { ok: true; value: T };
const fail = (message: string, details?: string[]): Failure => ({ ok: false, message, details });

export interface OrgMoveAffectedUser {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    relation: "primary" | "secondary" | "title";
    titleId?: string;
    titleName?: string;
    canManage: boolean;
}

export interface OrgMovePreview {
    operation: OrgMoveOperation;
    source: NamedRef;
    target: NamedRef;
    childTitleCount: number;
    users: OrgMoveAffectedUser[];
}

const idOf = (value: unknown): string | undefined => (value ? String(value) : undefined);
const idsOf = (values: unknown[] | undefined): string[] => (values ?? []).map(v => String(v));

const toState = (user: Partial<IUser>): OrgState => ({
    primaryDepartment: idOf(user.primaryDepartment),
    primarySubDepartment: idOf(user.primarySubDepartment),
    secondaryDepartments: idsOf(user.secondaryDepartments),
    secondarySubDepartments: idsOf(user.secondarySubDepartments),
    employmentTitle: idOf(user.employmentTitle),
});

/** Mongo update that writes a state: arrays are set, unset optional ids are removed. */
function stateUpdate(state: OrgState) {
    const $set: Record<string, unknown> = {
        secondaryDepartments: state.secondaryDepartments,
        secondarySubDepartments: state.secondarySubDepartments,
    };
    const $unset: Record<string, 1> = {};
    for (const field of ["primaryDepartment", "primarySubDepartment", "employmentTitle"] as const) {
        if (state[field]) {
            $set[field] = state[field];
        } else {
            $unset[field] = 1;
        }
    }
    return Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
}

async function writeUserStates(companyId: string, states: { id: string; state: OrgState }[]): Promise<void> {
    await orgMoveWriteRepository(companyId).bulkUpdate(
        "user",
        states.map(({ id, state }) => ({ id, update: stateUpdate(state) })),
    );
}

async function writeEntities(companyId: string, entities: IOrgMoveSnapshot["entities"]): Promise<void> {
    const repo = orgMoveWriteRepository(companyId);
    for (const [model, kind] of [
        ["SubDepartments", "sub"],
        ["EmploymentTitles", "title"],
    ] as const) {
        await repo.bulkUpdate(
            kind,
            entities.filter(e => e.model === model).map(e => ({ id: e.id, update: { $set: e.set } })),
        );
    }
}

async function loadUpdatedAt(companyId: string, touched: { kind: OrgRecordKind; ids: string[] }) {
    return orgMoveWriteRepository(companyId).updatedAt(touched.kind, touched.ids);
}

/** Loads the org tree and validates the requested operation; builds the post-move hierarchy. */
async function loadScope(companyId: string, raw: Record<string, unknown>): Promise<Ok<MoveScope> | Failure> {
    const operation = raw.operation as OrgMoveOperation;
    const sourceId = raw.sourceId;
    const targetId = raw.targetId;
    if (!OPERATIONS.includes(operation) || !isValidObjectId(sourceId) || !isValidObjectId(targetId)) {
        return fail("A valid operation, source and target are required");
    }
    if (sourceId === targetId && operation !== "moveSubDepartment" && operation !== "moveTitle") {
        return fail("The source and target must be different");
    }

    const [departments, subs, titles] = await Promise.all([
        departmentRepository(companyId).find().select("_id name isActive").lean(),
        subDepartmentRepository(companyId).find().select("_id name department isActive").lean(),
        employmentTitleRepository(companyId).find().select("_id name subDepartment isActive").lean(),
    ]);
    const deptById = new Map(departments.map(d => [String(d._id), d]));
    const subById = new Map(subs.map(s => [String(s._id), s]));
    const titleById = new Map(titles.map(t => [String(t._id), t]));

    const deptOfSub = new Map(subs.map(s => [String(s._id), String(s.department)]));
    const subOfTitle = new Map(titles.map(t => [String(t._id), String(t.subDepartment)]));
    const activeSubs = new Set(subs.filter(s => s.isActive !== false).map(s => String(s._id)));
    const activeTitles = new Set(titles.filter(t => t.isActive !== false).map(t => String(t._id)));
    const hierarchy: OrgHierarchy = { deptOfSub, subOfTitle, activeSubs, activeTitles };
    const input: OrgMoveInput = { operation, sourceId, targetId };

    if (operation === "moveSubDepartment") {
        const source = subById.get(sourceId);
        const target = deptById.get(targetId);
        if (!source) {
            return fail("Sub-department not found");
        }
        if (!target || target.isActive === false) {
            return fail("Choose an active department as the destination");
        }
        if (String(source.department) === targetId) {
            return fail("The sub-department already belongs to that department");
        }
        input.sourceDepartmentId = String(source.department);
        deptOfSub.set(sourceId, targetId);
        const childIds = titles.filter(t => String(t.subDepartment) === sourceId).map(t => String(t._id));
        return {
            ok: true,
            value: {
                input,
                source: { id: sourceId, name: source.name },
                target: { id: targetId, name: target.name },
                hierarchy,
                childTitleCount: childIds.length,
                entitySnapshot: [
                    { model: "SubDepartments", id: sourceId, set: { department: String(source.department) } },
                ],
                entityWrites: async () => {
                    await subDepartmentRepository(companyId).updateOne({ _id: sourceId }, {
                        department: targetId,
                    } as never);
                },
                touched: { kind: "sub", ids: [sourceId] },
            },
        };
    }

    if (operation === "mergeSubDepartment") {
        const source = subById.get(sourceId);
        const target = subById.get(targetId);
        if (!source || !target) {
            return fail("Sub-department not found");
        }
        if (target.isActive === false) {
            return fail("Choose an active sub-department as the destination");
        }
        input.sourceDepartmentId = String(source.department);
        const children = titles.filter(t => String(t.subDepartment) === sourceId);
        for (const t of children) {
            subOfTitle.set(String(t._id), targetId);
        }
        activeSubs.delete(sourceId);
        return {
            ok: true,
            value: {
                input,
                source: { id: sourceId, name: source.name },
                target: { id: targetId, name: target.name },
                hierarchy,
                childTitleCount: children.length,
                entitySnapshot: [
                    { model: "SubDepartments", id: sourceId, set: { isActive: source.isActive !== false } },
                    ...children.map(t => ({
                        model: "EmploymentTitles" as const,
                        id: String(t._id),
                        set: { subDepartment: sourceId },
                    })),
                ],
                entityWrites: async () => {
                    await orgMoveWriteRepository(companyId).reparentTitles(sourceId, targetId);
                    await subDepartmentRepository(companyId).updateOne({ _id: sourceId }, {
                        isActive: false,
                    } as never);
                },
                touched: { kind: "sub", ids: [sourceId] },
            },
        };
    }

    if (operation === "moveTitle") {
        const source = titleById.get(sourceId);
        const target = subById.get(targetId);
        if (!source) {
            return fail("Employment title not found");
        }
        if (!target || target.isActive === false) {
            return fail("Choose an active sub-department as the destination");
        }
        if (String(source.subDepartment) === targetId) {
            return fail("The employment title already belongs to that sub-department");
        }
        subOfTitle.set(sourceId, targetId);
        return {
            ok: true,
            value: {
                input,
                source: { id: sourceId, name: source.name },
                target: { id: targetId, name: target.name },
                hierarchy,
                childTitleCount: 0,
                entitySnapshot: [
                    { model: "EmploymentTitles", id: sourceId, set: { subDepartment: String(source.subDepartment) } },
                ],
                entityWrites: async () => {
                    await employmentTitleRepository(companyId).updateOne({ _id: sourceId }, {
                        subDepartment: targetId,
                    } as never);
                },
                touched: { kind: "title", ids: [sourceId] },
            },
        };
    }

    const source = titleById.get(sourceId);
    const target = titleById.get(targetId);
    if (!source || !target) {
        return fail("Employment title not found");
    }
    if (target.isActive === false) {
        return fail("Choose an active employment title as the destination");
    }
    activeTitles.delete(sourceId);
    return {
        ok: true,
        value: {
            input,
            source: { id: sourceId, name: source.name },
            target: { id: targetId, name: target.name },
            hierarchy,
            childTitleCount: 0,
            entitySnapshot: [{ model: "EmploymentTitles", id: sourceId, set: { isActive: source.isActive !== false } }],
            entityWrites: async () => {
                await employmentTitleRepository(companyId).updateOne({ _id: sourceId }, { isActive: false } as never);
            },
            touched: { kind: "title", ids: [sourceId] },
        },
    };
}

async function loadAffectedUsers(companyId: string, input: OrgMoveInput) {
    const filter = isSubDepartmentOperation(input.operation)
        ? { $or: [{ primarySubDepartment: input.sourceId }, { secondarySubDepartments: input.sourceId }] }
        : { employmentTitle: input.sourceId };
    return (await userRepository(companyId)
        .find(filter as never)
        .select(
            "name email isActive country manager employmentTitle primaryDepartment primarySubDepartment secondaryDepartments secondarySubDepartments",
        )
        .sort({ name: 1 })
        .lean()) as unknown as (Partial<IUser> & { _id: Types.ObjectId; name: string; email: string })[];
}

const canActorManage = (actor: IUserPopulated, user: unknown): boolean => canManageUser(actor, user as IUserPopulated);

export const OrgMoveService = {
    async preview(
        actor: IUserPopulated,
        companyId: string,
        raw: Record<string, unknown>,
    ): Promise<Ok<OrgMovePreview> | Failure> {
        const scope = await loadScope(companyId, raw);
        if (!scope.ok) {
            return scope;
        }
        const { input } = scope.value;
        const users = await loadAffectedUsers(companyId, input);
        const titleNames = new Map(
            (await employmentTitleRepository(companyId).find().select("_id name").lean()).map(t => [
                String(t._id),
                t.name,
            ]),
        );

        return {
            ok: true,
            value: {
                operation: input.operation,
                source: scope.value.source,
                target: scope.value.target,
                childTitleCount: scope.value.childTitleCount,
                users: users.map(u => {
                    const titleId = idOf(u.employmentTitle);
                    return {
                        id: String(u._id),
                        name: u.name,
                        email: u.email,
                        isActive: u.isActive !== false,
                        relation: !isSubDepartmentOperation(input.operation)
                            ? "title"
                            : idOf(u.primarySubDepartment) === input.sourceId
                              ? "primary"
                              : "secondary",
                        titleId,
                        titleName: titleId ? titleNames.get(titleId) : undefined,
                        canManage: canActorManage(actor, u),
                    };
                }),
            },
        };
    },

    async apply(
        actor: IUserPopulated,
        companyId: string,
        raw: Record<string, unknown>,
    ): Promise<Ok<{ moveId: string; updated: number }> | Failure> {
        const scope = await loadScope(companyId, raw);
        if (!scope.ok) {
            return scope;
        }
        const { input, hierarchy } = scope.value;

        const rawResolutions = Array.isArray(raw.resolutions) ? (raw.resolutions as Record<string, unknown>[]) : [];
        const resolutions = new Map<string, OrgResolution>();
        for (const r of rawResolutions) {
            if (typeof r?.userId !== "string" || !["follow", "reassign", "clear"].includes(String(r.action))) {
                return fail("Every resolution needs a userId and an action");
            }
            resolutions.set(r.userId, {
                action: r.action as OrgResolution["action"],
                reassignTo: (r.reassignTo as OrgResolution["reassignTo"]) ?? undefined,
            });
        }

        const users = await loadAffectedUsers(companyId, input);
        const affectedIds = new Set(users.map(u => String(u._id)));
        if ([...resolutions.keys()].some(id => !affectedIds.has(id))) {
            return fail("A resolution refers to a user who is not affected by this change");
        }

        const problems: string[] = [];
        const before: { id: string; state: OrgState }[] = [];
        const after: { id: string; state: OrgState }[] = [];
        for (const user of users) {
            const id = String(user._id);
            const label = user.name;
            const resolution = resolutions.get(id);
            if (!resolution) {
                problems.push(`${label}: choose what happens to this user`);
                continue;
            }
            if (!canActorManage(actor, user)) {
                problems.push(`${label}: you do not have permission to change this user`);
                continue;
            }
            const state = toState(user);
            const result = resolveUserMove(input, state, resolution, hierarchy);
            if ("error" in result) {
                problems.push(`${label}: ${result.error}`);
                continue;
            }
            const invalid = validateOrgState(result.state, hierarchy);
            if (invalid) {
                problems.push(`${label}: ${invalid}`);
                continue;
            }
            before.push({ id, state });
            after.push({ id, state: result.state });
        }
        if (problems.length > 0) {
            return fail("Some users need attention before this change can be applied", problems);
        }

        const snapshot: IOrgMoveSnapshot = { entities: scope.value.entitySnapshot, users: before };
        try {
            await scope.value.entityWrites();
            await writeUserStates(companyId, after);
        } catch (error) {
            // Nothing was committed atomically; put back what the failed write may have changed.
            await writeEntities(companyId, snapshot.entities).catch(() => undefined);
            await writeUserStates(companyId, before).catch(() => undefined);
            throw error;
        }

        const touchedIds = after.map(u => u.id);
        const stamps = {
            ...(await loadUpdatedAt(companyId, { kind: "user", ids: touchedIds })),
            ...(await loadUpdatedAt(companyId, scope.value.touched)),
        };
        if (input.operation === "mergeSubDepartment") {
            const titleIds = snapshot.entities.filter(e => e.model === "EmploymentTitles").map(e => e.id);
            Object.assign(stamps, await loadUpdatedAt(companyId, { kind: "title", ids: titleIds }));
        }

        const move = await orgMoveRepository(companyId).create({
            operation: input.operation,
            source: new Types.ObjectId(input.sourceId),
            target: new Types.ObjectId(input.targetId),
            actor: actor._id,
            affectedUsers: after.length,
            snapshot,
            after: stamps,
        });
        return { ok: true, value: { moveId: String(move._id), updated: after.length } };
    },

    async undo(
        actor: IUserPopulated,
        companyId: string,
        moveId: string,
        canWriteArea: (area: "subDepartments" | "employmentTitles") => boolean,
    ): Promise<Ok<{ restored: number }> | Failure> {
        if (!isValidObjectId(moveId)) {
            return fail("Move not found");
        }
        const move = await orgMoveRepository(companyId).findById(moveId).lean();
        if (!move) {
            return fail("Move not found");
        }
        const area = operationArea(move.operation);
        if (!area || !canWriteArea(area)) {
            return fail("You do not have permission to undo this change");
        }
        if (move.undoneAt) {
            return fail("This change has already been undone");
        }

        const snapshot = move.snapshot;
        const userIds = snapshot.users.map(u => u.id);
        const currentStamps = {
            ...(await loadUpdatedAt(companyId, { kind: "user", ids: userIds })),
            ...(await loadUpdatedAt(companyId, {
                kind: "sub",
                ids: snapshot.entities.filter(e => e.model === "SubDepartments").map(e => e.id),
            })),
            ...(await loadUpdatedAt(companyId, {
                kind: "title",
                ids: snapshot.entities.filter(e => e.model === "EmploymentTitles").map(e => e.id),
            })),
        };
        const changedSince = Object.entries(move.after).filter(([key, stamp]) => currentStamps[key] !== stamp);
        if (changedSince.length > 0) {
            return fail(`Cannot undo: ${changedSince.length} affected record(s) were changed after this move`);
        }

        const users = (await userRepository(companyId)
            .find({ _id: { $in: userIds } } as never)
            .select("country manager primaryDepartment secondaryDepartments")
            .lean()) as unknown[];
        if (users.some(u => !canActorManage(actor, u))) {
            return fail("You do not have permission to change every affected user");
        }

        await writeEntities(companyId, snapshot.entities);
        await writeUserStates(companyId, snapshot.users);
        await orgMoveRepository(companyId).updateOne({ _id: moveId }, { undoneAt: new Date() } as never);
        return { ok: true, value: { restored: snapshot.users.length } };
    },
};

export function operationArea(operation: unknown): "subDepartments" | "employmentTitles" | null {
    if (operation === "moveSubDepartment" || operation === "mergeSubDepartment") {
        return "subDepartments";
    }
    if (operation === "moveTitle" || operation === "mergeTitle") {
        return "employmentTitles";
    }
    return null;
}
