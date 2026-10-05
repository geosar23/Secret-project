/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { SubDepartmentService } from "../services/sub-department.service";
import { hardError, softError, success } from "../utils/response.util";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import { departmentRepository } from "../repositories/department.repository";
import { findActiveDependents } from "../services/dependency.service";

export class SubDepartmentController {
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const subDepartments = await SubDepartmentService.getAll(requestingUser.companyId);
            res.json(success(subDepartments));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.getAll:", error);
            return hardError(res);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const subDepartment = await SubDepartmentService.getById(req.params.id, requestingUser.companyId);
            if (!subDepartment) {
                res.json(softError("Sub-department not found"));
                return;
            }

            res.json(success(subDepartment));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.getById:", error);
            return hardError(res);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, description, departmentId } = req.body as {
                name?: string;
                description?: string;
                departmentId?: string;
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Sub-department name is required (min 2 characters)"));
                return;
            }
            if (!departmentId || typeof departmentId !== "string" || !isValidObjectId(departmentId)) {
                res.json(softError("A valid departmentId is required"));
                return;
            }

            const department = await departmentRepository(requestingUser.companyId)
                .findOne({ _id: departmentId, isActive: true })
                .select("_id")
                .lean();
            if (!department) {
                res.json(softError("Invalid department"));
                return;
            }

            const subDepartment = await SubDepartmentService.create(
                {
                    name: name.trim(),
                    description: typeof description === "string" ? description.trim() : "",
                    department: departmentId as any,
                    isActive: true,
                },
                requestingUser.companyId,
            );

            res.json(success({ subDepartment }));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.create:", error);
            return hardError(res);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const sanitized: { name?: string; description?: string; isActive?: boolean; department?: string } = {};

            if (typeof req.body.name === "string" && req.body.name.trim().length > 0) {
                sanitized.name = req.body.name.trim();
            }
            if (typeof req.body.description === "string") {
                sanitized.description = req.body.description.trim();
            }
            if (typeof req.body.isActive === "boolean") {
                sanitized.isActive = req.body.isActive;
            }
            if (typeof req.body.departmentId === "string" && req.body.departmentId.trim().length > 0) {
                const departmentId = req.body.departmentId.trim();
                const department = isValidObjectId(departmentId)
                    ? await departmentRepository(requestingUser.companyId).findById(departmentId).select("_id").lean()
                    : null;
                if (!department) {
                    res.json(softError("Invalid department"));
                    return;
                }
                sanitized.department = departmentId;
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            if (sanitized.isActive === false) {
                const blocker = await findActiveDependents("subDepartment", req.params.id, requestingUser.companyId);
                if (blocker) {
                    res.json(softError(blocker));
                    return;
                }
            }

            const updated = await SubDepartmentService.update(
                req.params.id,
                sanitized as any,
                requestingUser.companyId,
            );
            if (!updated) {
                res.json(softError("Sub-department not found"));
                return;
            }

            res.json(success({ subDepartment: updated }));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.update:", error);
            return hardError(res);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const result = await SubDepartmentService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Sub-department not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.delete:", error);
            return hardError(res);
        }
    }
}
