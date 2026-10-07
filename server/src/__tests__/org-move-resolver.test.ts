import {
    OrgHierarchy,
    OrgMoveInput,
    OrgResolution,
    OrgState,
    normalize,
    resolveUserMove,
    validateOrgState,
} from "../services/org-move.resolver";

// Departments d1, d2, d3; sub-departments s1,s2 (d1), s3 (d2), s4 (d3); titles t1,t2 (s1), t3 (s3)
const baseHierarchy = () => ({
    deptOfSub: new Map([
        ["s1", "d1"],
        ["s2", "d1"],
        ["s3", "d2"],
        ["s4", "d3"],
    ]),
    subOfTitle: new Map([
        ["t1", "s1"],
        ["t2", "s1"],
        ["t3", "s3"],
    ]),
    activeSubs: new Set(["s1", "s2", "s3", "s4"]),
    activeTitles: new Set(["t1", "t2", "t3"]),
});

const state = (extra: Partial<OrgState>): OrgState => ({
    secondaryDepartments: [],
    secondarySubDepartments: [],
    ...extra,
});

const follow: OrgResolution = { action: "follow" };

type Resolved = { state: OrgState; invalid: string | null };

function resolve(
    input: OrgMoveInput,
    s: OrgState,
    resolution: OrgResolution,
    h: OrgHierarchy,
): Resolved | { error: string } {
    const result = resolveUserMove(input, s, resolution, h);
    if ("error" in result) {
        return result;
    }
    return { state: result.state, invalid: validateOrgState(result.state, h) };
}

describe("moving a sub-department (s1: d1 -> d2)", () => {
    const input: OrgMoveInput = {
        operation: "moveSubDepartment",
        sourceId: "s1",
        targetId: "d2",
        sourceDepartmentId: "d1",
    };
    const after = () => {
        const h = baseHierarchy();
        h.deptOfSub.set("s1", "d2");
        return h;
    };

    it("primary follow moves the primary department and keeps the title", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            follow,
            after(),
        ) as Resolved;
        expect(r.state).toMatchObject({ primaryDepartment: "d2", primarySubDepartment: "s1", employmentTitle: "t1" });
        expect(r.state.secondaryDepartments).toEqual([]);
        expect(r.invalid).toBeNull();
    });

    it("primary follow keeps the old department as secondary while another sub-department lives in it", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", secondarySubDepartments: ["s2"] }),
            follow,
            after(),
        ) as Resolved;
        expect(r.state.primaryDepartment).toBe("d2");
        expect(r.state.secondaryDepartments).toEqual(["d1"]);
        expect(r.invalid).toBeNull();
    });

    it("secondary follow adds the new department and drops the unused old one", () => {
        const r = resolve(
            input,
            state({
                primaryDepartment: "d3",
                primarySubDepartment: "s4",
                secondaryDepartments: ["d1"],
                secondarySubDepartments: ["s1"],
            }),
            follow,
            after(),
        ) as Resolved;
        expect(r.state.secondaryDepartments).toEqual(["d2"]);
        expect(r.invalid).toBeNull();
    });

    it("primary reassign needs a sub-department and a title in it", () => {
        const s = state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" });
        expect(
            resolve(input, s, { action: "reassign", reassignTo: { subDepartmentId: "s2" } }, after()),
        ).toHaveProperty("error");
        const ok = resolve(
            input,
            s,
            { action: "reassign", reassignTo: { subDepartmentId: "s3", titleId: "t3" } },
            after(),
        ) as Resolved;
        expect(ok.state).toMatchObject({ primaryDepartment: "d2", primarySubDepartment: "s3", employmentTitle: "t3" });
        expect(ok.invalid).toBeNull();
    });

    it("primary clear removes the sub-department and the title", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            { action: "clear" },
            after(),
        ) as Resolved;
        expect(r.state.primarySubDepartment).toBeUndefined();
        expect(r.state.employmentTitle).toBeUndefined();
        expect(r.invalid).toBeNull();
    });
});

describe("moving a title (t1: s1 -> s3)", () => {
    const input: OrgMoveInput = { operation: "moveTitle", sourceId: "t1", targetId: "s3" };
    const after = () => {
        const h = baseHierarchy();
        h.subOfTitle.set("t1", "s3");
        return h;
    };

    it("follow moves the primary and keeps the old sub-department as secondary", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            follow,
            after(),
        ) as Resolved;
        expect(r.state).toMatchObject({ primaryDepartment: "d2", primarySubDepartment: "s3", employmentTitle: "t1" });
        expect(r.state.secondarySubDepartments).toEqual(["s1"]);
        expect(r.state.secondaryDepartments).toEqual(["d1"]);
        expect(r.invalid).toBeNull();
    });

    it("reassign picks another title and keeps the primary when it already fits", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            { action: "reassign", reassignTo: { titleId: "t2" } },
            after(),
        ) as Resolved;
        expect(r.state).toMatchObject({ primarySubDepartment: "s1", employmentTitle: "t2" });
        expect(r.invalid).toBeNull();
    });

    it("reassign rejects the source title and inactive titles", () => {
        const h = after();
        h.activeTitles.delete("t2");
        const s = state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" });
        expect(resolve(input, s, { action: "reassign", reassignTo: { titleId: "t1" } }, h)).toHaveProperty("error");
        expect(resolve(input, s, { action: "reassign", reassignTo: { titleId: "t2" } }, h)).toHaveProperty("error");
    });

    it("clear removes only the title", () => {
        const r = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            { action: "clear" },
            after(),
        ) as Resolved;
        expect(r.state).toMatchObject({ primarySubDepartment: "s1", employmentTitle: undefined });
    });
});

describe("merging", () => {
    it("merging titles moves follow users to the target title", () => {
        const h = baseHierarchy();
        h.activeTitles.delete("t1");
        const r = resolve(
            { operation: "mergeTitle", sourceId: "t1", targetId: "t3" },
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            follow,
            h,
        ) as Resolved;
        expect(r.state).toMatchObject({ primarySubDepartment: "s3", employmentTitle: "t3" });
        expect(r.invalid).toBeNull();
    });

    it("merging sub-departments replaces the source for primary and secondary users", () => {
        const h = baseHierarchy();
        h.subOfTitle.set("t1", "s3");
        h.subOfTitle.set("t2", "s3");
        h.activeSubs.delete("s1");
        const input: OrgMoveInput = {
            operation: "mergeSubDepartment",
            sourceId: "s1",
            targetId: "s3",
            sourceDepartmentId: "d1",
        };
        const primary = resolve(
            input,
            state({ primaryDepartment: "d1", primarySubDepartment: "s1", employmentTitle: "t1" }),
            follow,
            h,
        ) as Resolved;
        expect(primary.state).toMatchObject({
            primaryDepartment: "d2",
            primarySubDepartment: "s3",
            employmentTitle: "t1",
        });
        expect(primary.state.secondaryDepartments).toEqual([]);
        expect(primary.invalid).toBeNull();

        const secondary = resolve(
            input,
            state({
                primaryDepartment: "d3",
                primarySubDepartment: "s4",
                secondaryDepartments: ["d1"],
                secondarySubDepartments: ["s1"],
            }),
            follow,
            h,
        ) as Resolved;
        expect(secondary.state.secondarySubDepartments).toEqual(["s3"]);
        expect(secondary.state.secondaryDepartments).toEqual(["d2"]);
        expect(secondary.invalid).toBeNull();
    });
});

describe("validateOrgState / normalize", () => {
    it("flags hierarchy violations", () => {
        const h = baseHierarchy();
        expect(validateOrgState(state({ primaryDepartment: "d2", primarySubDepartment: "s1" }), h)).toMatch(
            /does not belong/,
        );
        expect(validateOrgState(state({ employmentTitle: "t1" }), h)).toMatch(/requires a primary sub-department/);
        expect(
            validateOrgState(
                state({ primaryDepartment: "d1", primarySubDepartment: "s1", secondarySubDepartments: ["s3"] }),
                h,
            ),
        ).toMatch(/outside/);
    });

    it("normalize adds the departments secondary sub-departments need and removes duplicates of the primary", () => {
        const n = normalize(
            state({
                primaryDepartment: "d1",
                primarySubDepartment: "s1",
                secondarySubDepartments: ["s1", "s3", "s3"],
            }),
            baseHierarchy(),
        );
        expect(n.secondarySubDepartments).toEqual(["s3"]);
        expect(n.secondaryDepartments).toEqual(["d2"]);
    });
});
