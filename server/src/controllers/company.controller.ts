import { Response } from "express";
import { CompanyService } from "../services/company.service";
import { StorageService } from "../services/storage.service";
import { ICompany } from "../interfaces/company.interface";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { success, hardError, softError, forbiddenError } from "../utils/response.util";

export class CompanyController {
    static async getCompanyData(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const actor = req.decoded as tokenPayload;
            if (req.params.id !== actor.companyId) {
                return forbiddenError(res);
            }

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
            console.log("Error in CompanyController.getCompanyData:", error);
            return hardError(res);
        }
    }
}
