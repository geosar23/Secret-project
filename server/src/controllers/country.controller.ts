/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { CountryService } from "../services/country.service";
import { hardError, softError, success } from "../utils/response.util";
import { findActiveDependents } from "../services/dependency.service";

export class CountryController {
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const countries = await CountryService.getAll(requestingUser.companyId);
            res.json(success(countries));
        } catch (error: any) {
            console.log("Error in CountryController.getAll:", error);
            return hardError(res);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const country = await CountryService.getById(req.params.id, requestingUser.companyId);
            if (!country) {
                res.json(softError("Country not found"));
                return;
            }

            res.json(success(country));
        } catch (error: any) {
            console.log("Error in CountryController.getById:", error);
            return hardError(res);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, description } = req.body as { name?: string; description?: string };
            if (!name || typeof name !== "string" || name.trim().length < 2) {
                res.json(softError("Country name is required (min 2 characters)"));
                return;
            }

            const country = await CountryService.create(
                {
                    name: name.trim(),
                    description: typeof description === "string" ? description.trim() : "",
                    isActive: true,
                },
                requestingUser.companyId,
            );

            res.json(success({ country }));
        } catch (error: any) {
            console.log("Error in CountryController.create:", error);
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

            if (sanitized.isActive === false) {
                const blocker = await findActiveDependents("country", req.params.id, requestingUser.companyId);
                if (blocker) {
                    res.json(softError(blocker));
                    return;
                }
            }

            const updated = await CountryService.update(req.params.id, sanitized, requestingUser.companyId);
            if (!updated) {
                res.json(softError("Country not found"));
                return;
            }

            res.json(success({ country: updated }));
        } catch (error: any) {
            console.log("Error in CountryController.update:", error);
            return hardError(res);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const result = await CountryService.delete(req.params.id, requestingUser.companyId);
            if (result.deletedCount === 0) {
                res.json(softError("Country not found"));
                return;
            }

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in CountryController.delete:", error);
            return hardError(res);
        }
    }
}
