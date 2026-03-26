/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { EmploymentTitleService } from "../services/employment-title.service";
import { softError, success } from "../util/response.util";

export class EmploymentTitleController {
    static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.companyId) {
                res.json(softError("Unauthorized"));
                return;
            }

            const titles = await EmploymentTitleService.getAll(requestingUser.companyId);
            res.json(success(titles));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.getAll:", error);
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

            const title = await EmploymentTitleService.getById(req.params.id, requestingUser.companyId);
            if (!title) {
                res.json(softError("Employment title not found"));
                return;
            }

            res.json(success(title));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.getById:", error);
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

            const { name, description, subDepartmentId } = req.body as {
                name?: string;
                description?: string;
                subDepartmentId?: string;
            };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Employment title name is required (min 2 characters)"));
                return;
            }
            if (!subDepartmentId || typeof subDepartmentId !== "string") {
                res.json(softError("subDepartmentId is required"));
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
                sanitized.subDepartment = req.body.subDepartmentId.trim();
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
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

            const result = await EmploymentTitleService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Employment title not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in EmploymentTitleController.delete:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
