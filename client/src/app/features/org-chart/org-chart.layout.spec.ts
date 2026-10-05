import { IOrgChartData } from "../../core/interfaces/org-chart.interface";
import {
    NODE_W,
    OrgNode,
    UNASSIGNED,
    buildDepartmentTree,
    buildLegend,
    buildManagerTree,
    countDescendants,
    layoutTree,
} from "./org-chart.layout";

const user = (id: string, managerId: string | null, subDepartmentId: string | null = null) => ({
    _id: id,
    name: `User ${id}`,
    email: `${id}@test.com`,
    managerId,
    title: "Engineer",
    subDepartmentId,
});

const data = (users: IOrgChartData["users"]): IOrgChartData => ({
    users,
    departments: [
        { _id: "d1", name: "Engineering" },
        { _id: "d2", name: "Sales" },
    ],
    subDepartments: [
        { _id: "s1", name: "Platform", departmentId: "d1" },
        { _id: "s2", name: "Web", departmentId: "d1" },
    ],
});

describe("buildManagerTree", () => {
    it("returns null when there are no users", () => {
        expect(buildManagerTree(data([]), "Acme")).toBeNull();
    });

    it("uses the single top-level person as the root", () => {
        const root = buildManagerTree(data([user("a", null), user("b", "a"), user("c", "a")]), "Acme")!;
        expect(root.id).toBe("a");
        expect(root.children.map(c => c.id)).toEqual(["b", "c"]);
    });

    it("groups several top-level people under the company node", () => {
        const root = buildManagerTree(data([user("a", null), user("b", null)]), "Acme")!;
        expect(root.id).toBe("company");
        expect(root.name).toBe("Acme");
        expect(root.children.map(c => c.id)).toEqual(["a", "b"]);
    });

    it("treats a manager outside the active set as no manager", () => {
        const root = buildManagerTree(data([user("a", "inactive-boss")]), "Acme")!;
        expect(root.id).toBe("a");
    });

    it("does not loop forever on a management cycle", () => {
        const root = buildManagerTree(data([user("a", "b"), user("b", "a")]), "Acme")!;
        const ids: string[] = [];
        const walk = (n: OrgNode) => {
            ids.push(n.id);
            n.children.forEach(walk);
        };
        walk(root);
        expect(ids.filter(id => id === "a" || id === "b").length).toBe(2);
    });

    it("resolves department and colour from the sub-department", () => {
        const root = buildManagerTree(data([user("a", null, "s1"), user("b", "a")]), "Acme")!;
        expect(root.department).toBe("Engineering");
        expect(root.children[0].department).toBe(UNASSIGNED);
        expect(root.children[0].color).not.toBe(root.color);
    });
});

describe("buildLegend", () => {
    it("lists every department, plus Unassigned only when someone has none", () => {
        expect(buildLegend(data([user("a", null, "s1")])).map(e => e.name)).toEqual(["Engineering", "Sales"]);
        expect(buildLegend(data([user("a", null)])).map(e => e.name)).toEqual(["Engineering", "Sales", UNASSIGNED]);
    });
});

describe("buildDepartmentTree", () => {
    it("nests sub-departments and counts people", () => {
        const root = buildDepartmentTree(
            data([user("a", null, "s1"), user("b", null, "s1"), user("c", null, "s2")]),
            "Acme",
        );
        const engineering = root.children.find(c => c.id === "d1")!;
        expect(root.subtitle).toBe("3 employees");
        expect(engineering.subtitle).toBe("3 employees");
        expect(engineering.children.map(c => [c.name, c.subtitle])).toEqual([
            ["Platform", "2 people"],
            ["Web", "1 person"],
        ]);
        expect(root.children.find(c => c.id === "d2")!.children).toEqual([]);
    });
});

describe("layoutTree", () => {
    const tree = buildManagerTree(data([user("a", null), user("b", "a"), user("c", "a"), user("d", "b")]), "Acme")!;

    it("centres a parent over its children and puts children below", () => {
        const { nodes } = layoutTree(tree, new Set());
        const at = (id: string) => nodes.find(n => n.node.id === id)!;
        expect(at("a").x).toBeCloseTo((at("b").x + at("c").x) / 2);
        expect(at("b").y).toBeGreaterThan(at("a").y);
        expect(at("d").y).toBeGreaterThan(at("b").y);
    });

    it("never lets sibling cards overlap", () => {
        const { nodes } = layoutTree(tree, new Set());
        const xs = nodes
            .filter(n => n.y === nodes.find(m => m.node.id === "b")!.y)
            .map(n => n.x)
            .sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) {
            expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_W);
        }
    });

    it("hides the subtree of a collapsed node", () => {
        const layout = layoutTree(tree, new Set(["b"]));
        expect(layout.nodes.map(n => n.node.id).sort()).toEqual(["a", "b", "c"]);
        expect(layout.edges.length).toBe(2);
    });

    it("draws one edge per visible parent-child link", () => {
        expect(layoutTree(tree, new Set()).edges.length).toBe(countDescendants(tree));
    });
});
