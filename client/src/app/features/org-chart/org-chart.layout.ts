import { IOrgChartData } from "../../core/interfaces/org-chart.interface";

export type OrgView = "manager" | "dept";

export interface OrgNode {
    id: string;
    kind: "person" | "dept";
    name: string;
    /** person: job title; dept: "N employees" */
    subtitle: string;
    /** person: level name, when the employee has one */
    level?: string;
    /** person: department name */
    department: string;
    email: string;
    icon: string;
    color: string;
    children: OrgNode[];
}

export interface PositionedNode {
    node: OrgNode;
    x: number;
    y: number;
}

export interface OrgEdge {
    id: string;
    d: string;
}

export interface OrgLayout {
    nodes: PositionedNode[];
    edges: OrgEdge[];
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface LegendEntry {
    name: string;
    color: string;
}

export const NODE_W = 200;
export const PERSON_H = 124;
export const DEPT_H = 132;
const H_GAP = 36;
const V_GAP = 80;

const PALETTE = ["#C2185B", "#1565C0", "#2E7D32", "#E65100", "#6A1B9A", "#00838F", "#558B2F", "#AD1457"];
const NEUTRAL_COLOR = "#6B4C57";
export const UNASSIGNED = "Unassigned";

const nodeHeight = (node: OrgNode): number => (node.kind === "person" ? PERSON_H : DEPT_H);

/** Maps each department id to a stable colour, in the order the server returns them. */
function departmentColors(data: IOrgChartData): Map<string, string> {
    return new Map(data.departments.map((d, i) => [d._id, PALETTE[i % PALETTE.length]]));
}

export function buildLegend(data: IOrgChartData): LegendEntry[] {
    const colors = departmentColors(data);
    const entries = data.departments.map(d => ({ name: d.name, color: colors.get(d._id)! }));
    const hasUnassigned = data.users.some(u => !departmentOfUser(data, u.subDepartmentId));
    return hasUnassigned ? [...entries, { name: UNASSIGNED, color: NEUTRAL_COLOR }] : entries;
}

function departmentOfUser(data: IOrgChartData, subDepartmentId: string | null) {
    const sub = data.subDepartments.find(sd => sd._id === subDepartmentId);
    return sub ? data.departments.find(d => d._id === sub.departmentId) : undefined;
}

/**
 * Line-manager tree. Several top-level people (or people stuck in a management cycle) are grouped
 * under one synthetic company node so the chart is always a single tree.
 */
export function buildManagerTree(data: IOrgChartData, companyName: string): OrgNode | null {
    if (!data.users.length) {
        return null;
    }
    const colors = departmentColors(data);
    const byId = new Map(data.users.map(u => [u._id, u]));
    const childrenOf = new Map<string, string[]>();
    const roots: string[] = [];

    for (const user of data.users) {
        if (user.managerId && user.managerId !== user._id && byId.has(user.managerId)) {
            childrenOf.set(user.managerId, [...(childrenOf.get(user.managerId) ?? []), user._id]);
        } else {
            roots.push(user._id);
        }
    }

    const visited = new Set<string>();
    const toNode = (id: string): OrgNode => {
        visited.add(id);
        const user = byId.get(id)!;
        const department = departmentOfUser(data, user.subDepartmentId);
        return {
            id,
            kind: "person",
            name: user.name,
            subtitle: user.title ?? "",
            level: user.level ?? undefined,
            department: department?.name ?? UNASSIGNED,
            email: user.email,
            icon: "person",
            color: department ? colors.get(department._id)! : NEUTRAL_COLOR,
            children: (childrenOf.get(id) ?? []).filter(c => !visited.has(c)).map(toNode),
        };
    };

    const rootNodes = roots.map(toNode);
    // Anyone left over sits in a manager cycle that never reaches a root: surface them as extra roots.
    for (const user of data.users) {
        if (!visited.has(user._id)) {
            rootNodes.push(toNode(user._id));
        }
    }

    if (rootNodes.length === 1) {
        return rootNodes[0];
    }
    return {
        id: "company",
        kind: "dept",
        name: companyName,
        subtitle: `${data.users.length} employees`,
        department: "",
        email: "",
        icon: "business",
        color: PALETTE[0],
        children: rootNodes,
    };
}

export function buildDepartmentTree(data: IOrgChartData, companyName: string): OrgNode {
    const colors = departmentColors(data);
    const countBySub = new Map<string, number>();
    for (const user of data.users) {
        if (user.subDepartmentId) {
            countBySub.set(user.subDepartmentId, (countBySub.get(user.subDepartmentId) ?? 0) + 1);
        }
    }
    const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

    const departments = data.departments.map<OrgNode>(department => {
        const subs = data.subDepartments.filter(sd => sd.departmentId === department._id);
        const color = colors.get(department._id)!;
        const total = subs.reduce((sum, sd) => sum + (countBySub.get(sd._id) ?? 0), 0);
        return {
            id: department._id,
            kind: "dept",
            name: department.name,
            subtitle: `${total} ${total === 1 ? "employee" : "employees"}`,
            department: "",
            email: "",
            icon: "corporate_fare",
            color,
            children: subs.map<OrgNode>(sd => ({
                id: sd._id,
                kind: "dept",
                name: sd.name,
                subtitle: people(countBySub.get(sd._id) ?? 0),
                department: department.name,
                email: "",
                icon: "account_tree",
                color,
                children: [],
            })),
        };
    });

    return {
        id: "company",
        kind: "dept",
        name: companyName,
        subtitle: `${data.users.length} employees`,
        department: "",
        email: "",
        icon: "business",
        color: PALETTE[0],
        children: departments,
    };
}

export function countDescendants(node: OrgNode): number {
    return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/** Number of management levels below a node (0 for someone with no reports). */
export function treeDepth(node: OrgNode): number {
    return node.children.length ? 1 + Math.max(...node.children.map(treeDepth)) : 0;
}

export function findNode(root: OrgNode | null, id: string): OrgNode | null {
    if (!root) {
        return null;
    }
    if (root.id === id) {
        return root;
    }
    for (const child of root.children) {
        const found = findNode(child, id);
        if (found) {
            return found;
        }
    }
    return null;
}

export function flattenNodes(root: OrgNode | null): OrgNode[] {
    return root ? [root, ...root.children.flatMap(flattenNodes)] : [];
}

const visibleChildren = (node: OrgNode, collapsed: ReadonlySet<string>): OrgNode[] =>
    collapsed.has(node.id) ? [] : node.children;

function subtreeWidth(node: OrgNode, collapsed: ReadonlySet<string>): number {
    const children = visibleChildren(node, collapsed);
    if (!children.length) {
        return NODE_W;
    }
    const childrenWidth = children.reduce((sum, child) => sum + subtreeWidth(child, collapsed) + H_GAP, -H_GAP);
    return Math.max(childrenWidth, NODE_W);
}

/** Top-down tree layout. Nodes are positioned by their centre. Collapsed nodes hide their subtree. */
export function layoutTree(root: OrgNode, collapsed: ReadonlySet<string>): OrgLayout {
    const nodes: PositionedNode[] = [];
    const edges: OrgEdge[] = [];

    const place = (node: OrgNode, x: number, y: number): void => {
        nodes.push({ node, x, y });
        const children = visibleChildren(node, collapsed);
        if (!children.length) {
            return;
        }
        const totalWidth = children.reduce((sum, child) => sum + subtreeWidth(child, collapsed) + H_GAP, -H_GAP);
        const childY = y + nodeHeight(node) / 2 + V_GAP + nodeHeight(children[0]) / 2;
        let cursor = x - totalWidth / 2;
        for (const child of children) {
            const width = subtreeWidth(child, collapsed);
            const childX = cursor + width / 2;
            const startY = y + nodeHeight(node) / 2;
            const endY = childY - nodeHeight(child) / 2;
            const midY = (startY + endY) / 2;
            edges.push({
                id: `${node.id}->${child.id}`,
                d: `M${x},${startY} C${x},${midY} ${childX},${midY} ${childX},${endY}`,
            });
            place(child, childX, childY);
            cursor += width + H_GAP;
        }
    };
    place(root, 0, 0);

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    return {
        nodes,
        edges,
        bounds: {
            minX: Math.min(...xs) - NODE_W / 2,
            maxX: Math.max(...xs) + NODE_W / 2,
            minY: Math.min(...ys) - DEPT_H / 2,
            maxY: Math.max(...ys) + DEPT_H / 2,
        },
    };
}
