/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { EmploymentTitleService } from "../services/employment-title.service";
import { hardError, softError, success } from "../utils/response.util";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import { subDepartmentRepository } from "../repositories/sub-department.repository";
import { findActiveDependents, findReparentBlocker } from "../services/dependency.service";

export class EmploymentTitleController {
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const titles = await EmploymentTitleService.getAll(requestingUser.companyId);
            res.json(success(titles));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.getAll:", error);
            return hardError(res);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const title = await EmploymentTitleService.getById(req.params.id, requestingUser.companyId);
            if (!title) {
                res.json(softError("Employment title not found"));
                return;
            }

            res.json(success(title));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.getById:", error);
            return hardError(res);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, description, subDepartmentId } = req.body as {
                name?: string;
                description?: string;
                subDepartmentId?: string;
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Employment title name is required (min 2 characters)"));
                return;
            }
            if (!subDepartmentId || typeof subDepartmentId !== "string" || !isValidObjectId(subDepartmentId)) {
                res.json(softError("A valid subDepartmentId is required"));
                return;
            }

            const subDepartment = await subDepartmentRepository(requestingUser.companyId)
                .findOne({ _id: subDepartmentId, isActive: true })
                .select("_id")
                .lean();
            if (!subDepartment) {
                res.json(softError("Invalid sub-department"));
                return;
            }

            const employmentTitle = await EmploymentTitleService.create(
                {
                    name: name.trim(),
                    description: typeof description === "string" ? description.trim() : "",
                    subDepartment: subDepartmentId as any,
                    isActive: true,
                },
                requestingUser.companyId,
            );

            res.json(success({ employmentTitle }));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.create:", error);
            return hardError(res);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const sanitized: { name?: string; description?: string; isActive?: boolean; subDepartment?: string } = {};

            if (typeof req.body.name === "string" && req.body.name.trim().length > 0) {
                sanitized.name = req.body.name.trim();
            }
            if (typeof req.body.description === "string") {
                sanitized.description = req.body.description.trim();
            }
            if (typeof req.body.isActive === "boolean") {
                sanitized.isActive = req.body.isActive;
            }
            if (typeof req.body.subDepartmentId === "string" && req.body.subDepartmentId.trim().length > 0) {
                const subDepartmentId = req.body.subDepartmentId.trim();
                const current = await EmploymentTitleService.getById(req.params.id, requestingUser.companyId);
                const currentSubDepartmentId = current ? String((current.subDepartment as any)?._id) : undefined;
                if (subDepartmentId !== currentSubDepartmentId) {
                    const subDepartment = isValidObjectId(subDepartmentId)
                        ? await subDepartmentRepository(requestingUser.companyId)
                              .findOne({ _id: subDepartmentId, isActive: true })
                              .select("_id")
                              .lean()
                        : null;
                    if (!subDepartment) {
                        res.json(softError("Invalid sub-department"));
                        return;
                    }
                    const moveBlocker = await findReparentBlocker(
                        "employmentTitle",
                        req.params.id,
                        requestingUser.companyId,
                    );
                    if (moveBlocker) {
                        res.json(softError(moveBlocker));
                        return;
                    }
                    sanitized.subDepartment = subDepartmentId;
                }
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            if (sanitized.isActive === false) {
                const blocker = await findActiveDependents("employmentTitle", req.params.id, requestingUser.companyId);
                if (blocker) {
                    res.json(softError(blocker));
                    return;
                }
            }

            const updated = await EmploymentTitleService.update(
                req.params.id,
                sanitized as any,
                requestingUser.companyId,
            );
            if (!updated) {
                res.json(softError("Employment title not found"));
                return;
            }

            res.json(success({ employmentTitle: updated }));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.update:", error);
            return hardError(res);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const result = await EmploymentTitleService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Employment title not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.delete:", error);
            return hardError(res);
        }
    }
}
