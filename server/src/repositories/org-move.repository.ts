import { Types } from "mongoose";
import { companyModel } from "../models/company.model";
import { OrgMoveModel } from "../models/org-move.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { UserModel } from "../models/user.model";

export function orgMoveRepository(companyId: string) {
    return companyModel(OrgMoveModel, companyId);
}

type UpdateDoc = Record<string, unknown>;
export type OrgRecordKind = "sub" | "title" | "user";

const modelFor = (kind: OrgRecordKind) =>
    (kind === "sub" ? SubDepartmentModel : kind === "title" ? EmploymentTitleModel : UserModel) as typeof UserModel;

/**
 * Bulk writes for org moves. The generic company repositories only expose single-document updates, so
 * these are kept here, always filtered by company, and take ready-made update documents.
 */
export function orgMoveWriteRepository(companyId: string) {
    const bulkUpdate = async (kind: OrgRecordKind, ops: { id: string; update: UpdateDoc }[]): Promise<void> => {
        if (ops.length === 0) {
            return;
        }
        await modelFor(kind).bulkWrite(
            ops.map(({ id, update }) => ({
                updateOne: { filter: { _id: id, company: companyId }, update },
            })) as never,
        );
    };

    return {
        bulkUpdate,

        /** Points every title of one sub-department at another. */
        async reparentTitles(fromSubDepartmentId: string, toSubDepartmentId: string): Promise<void> {
            await EmploymentTitleModel.updateMany(
                { company: companyId, subDepartment: fromSubDepartmentId },
                { subDepartment: toSubDepartmentId },
            );
        },

        /** `${kind}:${id}` -> updatedAt in ms, used to detect edits made after a move. */
        async updatedAt(kind: OrgRecordKind, ids: string[]): Promise<Record<string, number>> {
            if (ids.length === 0) {
                return {};
            }
            const docs = (await modelFor(kind)
                .find({ _id: { $in: ids }, company: companyId })
                .select("_id updatedAt")
                .lean()) as unknown as { _id: Types.ObjectId; updatedAt?: Date }[];
            return Object.fromEntries(docs.map(d => [`${kind}:${d._id}`, d.updatedAt?.getTime() ?? 0]));
        },
    };
}
