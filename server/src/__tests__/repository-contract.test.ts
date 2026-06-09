/* eslint-disable no-unused-vars */
import { connectTestDB, disconnectTestDB, clearCollections } from "./helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID, seedUserInCompany } from "./helpers/seed";
import { userDocumentRepository } from "../repositories/user-document.repository";
import { UserDocumentModel } from "../models/user-document.model";
import { DocumentType } from "../enums/profile.enum";

describe("Repository contract audit", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await clearCollections();
        await disconnectTestDB();
    });

    it("userDocumentRepository should require companyId for company-scoped access", () => {
        const factory = userDocumentRepository as unknown as (companyId?: string) => unknown;
        expect(() => factory()).toThrow();
    });

    it("userDocumentRepository should return company-scoped results", async () => {
        const companyAUser = await seedUserInCompany({
            companyId: COMPANY_A_ID,
            email: "repo-a@test.com",
            name: "Repo A",
            permissions: ["*:*:*"],
            roleKey: "repo-a-role",
        });

        const companyBUser = await seedUserInCompany({
            companyId: COMPANY_B_ID,
            email: "repo-b@test.com",
            name: "Repo B",
            permissions: ["*:*:*"],
            roleKey: "repo-b-role",
        });

        await UserDocumentModel.create({
            user: companyAUser._id,
            company: COMPANY_A_ID,
            type: DocumentType.PASSPORT,
            documentNumber: "A-001",
        });

        await UserDocumentModel.create({
            user: companyBUser._id,
            company: COMPANY_B_ID,
            type: DocumentType.PASSPORT,
            documentNumber: "B-001",
        });

        const repo = (
            userDocumentRepository as unknown as (companyId: string) => {
                find: (filter?: Record<string, unknown>) => Promise<Array<{ company: string }>>;
            }
        )(COMPANY_A_ID.toString());

        const docs = await repo.find({});

        expect(docs).toHaveLength(1);
        expect(String(docs[0].company)).toBe(COMPANY_A_ID.toString());
    });
});
