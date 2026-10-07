import { IOrgMoveUser } from "../interfaces/org-move.interface";
import { blockers, choiceProblem, defaultChoice, reassignNeeds, toResolution } from "./org-move";

const user = (id: string, extra: Partial<IOrgMoveUser> = {}): IOrgMoveUser => ({
    id,
    name: id,
    email: `${id}@test.com`,
    isActive: true,
    relation: "primary",
    canManage: true,
    ...extra,
});

describe("org move helpers", () => {
    it("reassign needs a title for title operations", () => {
        expect(reassignNeeds("moveTitle", user("a", { relation: "title" }))).toEqual({
            subDepartment: false,
            title: true,
        });
    });

    it("reassign needs a sub-department, and a title only for primary users that have one", () => {
        expect(reassignNeeds("moveSubDepartment", user("a", { titleId: "t" }))).toEqual({
            subDepartment: true,
            title: true,
        });
        expect(reassignNeeds("moveSubDepartment", user("a"))).toEqual({ subDepartment: true, title: false });
        expect(reassignNeeds("mergeSubDepartment", user("a", { relation: "secondary", titleId: "t" }))).toEqual({
            subDepartment: true,
            title: false,
        });
    });

    it("follow and clear are always complete; reassign reports what is missing", () => {
        const u = user("a", { titleId: "t" });
        expect(choiceProblem("moveSubDepartment", u, defaultChoice("follow"))).toBeNull();
        expect(choiceProblem("moveSubDepartment", u, defaultChoice("clear"))).toBeNull();
        expect(choiceProblem("moveSubDepartment", u, defaultChoice("reassign"))).toMatch(/sub-department/);
        expect(
            choiceProblem("moveSubDepartment", u, { action: "reassign", subDepartmentId: "s", titleId: "" }),
        ).toMatch(/title/);
        expect(
            choiceProblem("moveSubDepartment", u, { action: "reassign", subDepartmentId: "s", titleId: "t" }),
        ).toBeNull();
    });

    it("toResolution only sends what the operation needs", () => {
        const u = user("a", { relation: "secondary" });
        expect(
            toResolution("moveSubDepartment", u, { action: "reassign", subDepartmentId: "s", titleId: "ignored" }),
        ).toEqual({ userId: "a", action: "reassign", reassignTo: { subDepartmentId: "s" } });
        expect(toResolution("moveTitle", u, { action: "follow", subDepartmentId: "", titleId: "" })).toEqual({
            userId: "a",
            action: "follow",
        });
    });

    it("blockers counts incomplete choices and users the actor cannot manage", () => {
        const users = [user("a"), user("b", { canManage: false }), user("c")];
        expect(blockers("moveSubDepartment", users, { a: defaultChoice("reassign") })).toEqual({
            incomplete: 1,
            forbidden: 1,
        });
    });
});
