/**
 * Permission structure: category:scope:action
 *
 * Examples:
 * - employees:view:all - View all employees
 * - employees:edit:managed - Edit employees you manage
 * - employees:delete:self - Delete your own account
 * - leaves:approve:department - Approve leaves in your department
 */

import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";
import { IPermission } from "../interfaces/permission.interface";
import { PermissionModel } from "../models/permission.model";

/**
 * Helper to get parent category from a subcategory
 * @example getParentCategory("requests.leaves") => "requests"
 */
export function getParentCategory(category: string): string {
    return category.split(".")[0];
}

/**
 * Helper to get subcategory from a full category
 * @example getSubCategory("requests.leaves") => "leaves"
 */
export function getSubCategory(category: string): string | null {
    const parts = category.split(".");
    return parts.length > 1 ? parts[1] : null;
}

/**
 * Category hierarchy structure for UI display
 */
export const CATEGORY_HIERARCHY = {
    users: { label: "Users", subcategories: [] },
    employees: { label: "Employees", subcategories: [] },
    departments: { label: "Departments", subcategories: [] },
    company: { label: "Company", subcategories: [] },
    requests: {
        label: "Requests",
        subcategories: [
            { key: "leaves", label: "Leaves" },
            { key: "additional_payments", label: "Additional Payments" },
            { key: "deductions", label: "Deductions" },
            { key: "remote_work", label: "Remote Work Requests" },
        ],
    },
    payroll: { label: "Payroll", subcategories: [] },
    reports: { label: "Reports", subcategories: [] },
    settings: { label: "Settings", subcategories: [] },
    permissions: { label: "Permissions", subcategories: [] },
    roles: { label: "Roles", subcategories: [] },
} as const;

// -----------------------------
// Generate DB-ready permission docs from PERMISSIONS object
function generatePermissionDocs() {
    const docs: Partial<IPermission>[] = [];
    for (const category of Object.values(PermissionCategories)) {
        for (const scope of Object.values(PermissionScopes)) {
            for (const action of Object.values(PermissionActions)) {
                const key = `${category}:${action}:${scope}`;
                const name = toReadableName(key);
                const description = `Allows user to ${action} on ${category} with ${scope} scope.`;
                docs.push({
                    key,
                    name,
                    description,
                    category,
                    scope,
                    action,
                    isActive: true,
                });
            }
        }
    }

    return docs;
}

// -----------------------------
// Seed function
export async function seedPermissions() {
    try {
        const docs = generatePermissionDocs();
        console.log(docs);
        console.log(`Seeding ${docs.length} permissions...`);
        return;

        for (const doc of docs) {
            await PermissionModel.updateOne(
                { key: doc.key }, // match by key
                { $set: doc }, // update fields if exists
                { upsert: true }, // create if missing
            );
        }

        console.log("✅ Permissions seeded successfully.");
    } catch (error) {
        console.error("❌ Error seeding permissions:", error);
    }
}

function toReadableName(key: string): string {
    return key
        .split(":")
        .map(part =>
            part
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
        )
        .join(" ");
}
