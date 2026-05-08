import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";
import { StorageService } from "../services/storage.service";
import { ICompany } from "../interfaces/company.interface";
import { success, softError } from "../utils/response.util";

export class CompanyController {
    static async getLogoUrl(req: Request, res: Response): Promise<void> {
        try {
            const company = await CompanyService.getById(req.params.id);
            if (!company) {
                res.json(softError("Company not found"));
                return;
            }

            const logoPath = (company as ICompany).logo?.path;
            if (!logoPath) {
                res.json(softError("Company logo not found"));
                return;
            }

            const signed = await StorageService.createSignedUrl(logoPath);
            res.json(success({ ...signed }));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.log("Error in CompanyController.getLogoUrl:", error);
            res.json(softError(message, error));
        }
    }
}
