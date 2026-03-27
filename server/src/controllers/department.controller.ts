/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { DepartmentService } from "../services/department.service";
import { softError, success } from "../util/response.util";

export class DepartmentController {
    static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const departments = await DepartmentService.getAll(requestingUser.companyId);
            res.json(success(departments));
        } catch (error: any) {
            console.log("Error in DepartmentController.getAll:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const department = await DepartmentService.getById(req.params.id, requestingUser.companyId);
            if (!department) {
                res.json(softError("Department not found"));
                return;
            }

            res.json(success(department));
        } catch (error: any) {
            console.log("Error in DepartmentController.getById:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, description } = req.body as { name?: string; description?: string };
            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Department name is required (min 2 characters)"));
                return;
            }

            const department = await DepartmentService.create(
                {
                    name: name.trim(),
                    description: typeof description === "string" ? description.trim() : "",
                    isActive: true,
                },
                requestingUser.companyId,
            );

            res.json(success({ department }));
        } catch (error: any) {
            console.log("Error in DepartmentController.create:", error, req.body);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const sanitized: { name?: string; description?: string; isActive?: boolean } = {};

            if (typeof req.body.name === "string" && req.body.name.trim().length > 0) {
                sanitized.name = req.body.name.trim();
            }
            if (typeof req.body.description === "string") {
                sanitized.description = req.body.description.trim();
            }
            if (typeof req.body.isActive === "boolean") {
                sanitized.isActive = req.body.isActive;
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            const updated = await DepartmentService.update(req.params.id, sanitized, requestingUser.companyId);
            if (!updated) {
                res.json(softError("Department not found"));
                return;
            }

            res.json(success({ department: updated }));
        } catch (error: any) {
            console.log("Error in DepartmentController.update:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const result = await DepartmentService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Department not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in DepartmentController.delete:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
