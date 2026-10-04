/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IDepartment } from "../interfaces/department.interface";
import { DepartmentService } from "../services/department.service";
import { hardError, softError, success } from "../utils/response.util";
import { FieldMap, setMappedFields } from "../utils/field-sanitizer.util";

type DepartmentFieldMap = FieldMap<IDepartment>;

export class DepartmentController {
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const departments = await DepartmentService.getAll(requestingUser.companyId);
            res.json(success(departments));
        } catch (error: any) {
            console.log("Error in DepartmentController.getAll:", error);
            return hardError(res);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            return hardError(res);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const params: Partial<IDepartment> = { isActive: true };

            const DEPARTMENT_CREATE_REQUIRED_FIELDS: DepartmentFieldMap = {
                name: { type: "string", targetField: "name", required: true, minLength: 2 },
                companyId: {
                    type: "string",
                    targetField: "company",
                    isPointer: true,
                    pointerClass: "Companies",
                    required: true,
                },
            };

            setMappedFields(params, DEPARTMENT_CREATE_REQUIRED_FIELDS, {
                ...(req.body as Record<string, unknown>),
                companyId: requestingUser.companyId,
            });

            const DEPARTMENT_CREATE_OPTIONAL_FIELDS: DepartmentFieldMap = {
                description: { type: "string", targetField: "description" },
            };

            setMappedFields(params, DEPARTMENT_CREATE_OPTIONAL_FIELDS, req.body as Record<string, unknown>);

            if (!params.name) {
                res.json(softError("Department name is required (min 2 characters)"));
                return;
            }

            const department = await DepartmentService.create(
                params as Omit<IDepartment, "_id" | "createdAt" | "updatedAt">,
                requestingUser.companyId,
            );

            res.json(success({ department }));
        } catch (error: any) {
            console.log("Error in DepartmentController.create:", error, req.body);
            return hardError(res);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            return hardError(res);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            return hardError(res);
        }
    }
}
