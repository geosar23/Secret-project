import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";
import { StorageService } from "../services/storage.service";
import { ICompany } from "../interfaces/company.interface";
import { success, softError } from "../utils/response.util";

export class CompanyController {
    static async getCompanyData(req: Request, res: Response): Promise<void> {
        try {
            const company = await CompanyService.getById(req.params.id);
            if (!company) {
                res.json(softError("Company not found"));
                return;
            }

            let signed;
            try {
                const logoPath = (company as ICompany).logo?.path;
                if (!logoPath) {
                    throw new Error("Company logo not found");
                }

                signed = await StorageService.createSignedUrl(logoPath);
            } catch (error) {
                console.log("Error getCompanyData:", error);
                signed = { url: "", expiresIn: 0 };
            }

            res.json(success({ ...signed, name: company.name }));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.log("Error in CompanyController.getCompanyData:", error);
            res.json(softError(message, error));
        }
    }
}
