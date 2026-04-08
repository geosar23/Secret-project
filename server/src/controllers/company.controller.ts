/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction, Request } from "express";
import { AuthenticatedRequest } from "../interfaces/auth.interface";
import { CompanyService } from "../services/company.service";
import { success, softError } from "../utils/response.util";

export class CompanyController {
    static async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companies = await CompanyService.getAll();
            res.json(success(companies));
        } catch (error: any) {
            console.log("Error in CompanyController.getAll:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const company = await CompanyService.getById(req.params.id);
            if (!company) {
                res.json(softError("Company not found"));
                return;
            }
            res.json(success(company));
        } catch (error: any) {
            console.log("Error in CompanyController.getById:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, slug } = req.body as { name?: string; slug?: string };

            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Company name is required (min 2 characters)"));
                return;
            }
            if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug.trim())) {
                res.json(softError("Slug is required and must contain only lowercase letters, numbers and hyphens"));
                return;
            }

            const company = await CompanyService.create({ name: name.trim(), slug: slug.trim() });
            res.json(success({ company }));
        } catch (error: any) {
            console.log("Error in CompanyController.create:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.params.id;

            const sanitized: { name?: string; slug?: string; isActive?: boolean } = {};

            if (typeof req.body.name === "string" && req.body.name.trim().length > 0) {
                sanitized.name = req.body.name.trim();
            }
            if (typeof req.body.slug === "string" && req.body.slug.trim().length > 0) {
                const slug = req.body.slug
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-");
                if (/^[a-z0-9-]+$/.test(slug)) {
                    sanitized.slug = slug;
                }
            }
            if (typeof req.body.isActive === "boolean") {
                sanitized.isActive = req.body.isActive;
            }

            if (Object.keys(sanitized).length === 0) {
                res.json(softError("No valid fields provided for update"));
                return;
            }

            const updated = await CompanyService.update(companyId, sanitized);
            if (!updated) {
                res.json(softError("Company not found"));
                return;
            }

            res.json(success({ company: updated }));
        } catch (error: any) {
            console.log("Error in CompanyController.update:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            throw new Error("Company deletion is not allowed in this version"); // Soft delete or archiving should be implemented instead of hard deletion
            const result = await CompanyService.delete(req.params.id);
            if (result.deletedCount === 0) {
                res.json(softError("Company not found"));
                return;
            }
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in CompanyController.delete:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
