/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { SubDepartmentService } from "../services/sub-department.service";
import { softError, success } from "../util/response.util";

export class SubDepartmentController {
    static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const subDepartments = await SubDepartmentService.getAll(requestingUser.companyId);
            res.json(success(subDepartments));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.getAll:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const subDepartment = await SubDepartmentService.getById(req.params.id, requestingUser.companyId);
            if (!subDepartment) {
                res.json(softError("Sub-department not found"));
                return;
            }

            res.json(success(subDepartment));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.getById:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const { name, description, departmentId } = req.body as {
                name?: string;
                description?: string;
                departmentId?: string;
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Sub-department name is required (min 2 characters)"));
                return;
            }
            if (!departmentId || typeof departmentId !== "string") {
                res.json(softError("departmentId is required"));
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
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

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
                sanitized.department = req.body.departmentId.trim();
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
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
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const result = await SubDepartmentService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Sub-department not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in SubDepartmentController.delete:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
