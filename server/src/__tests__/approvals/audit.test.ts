/**
 * Opt-in audit logging: only entities listed in config/audited-entities.ts, with redaction and tenant scoping.
 */
import mongoose from "mongoose";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { COMPANY_A_ID, COMPANY_B_ID } from "../helpers/seed";
import { AuditService, diffChanges } from "../../services/audit.service";
import { AuditLogModel } from "../../models/audit-log.model";

const A = COMPANY_A_ID.toString();
const B = COMPANY_B_ID.toString();
const actor = new mongoose.Types.ObjectId().toString();
const entityId = new mongoose.Types.ObjectId();

beforeAll(connectTestDB);
afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});
beforeEach(clearCollections);

describe("AuditService.record", () => {
    it("stores field-level changes for an audited entity", async () => {
        await AuditService.record(A, {
            actor,
            entity: "user",
            entityId,
            action: "update",
            before: { name: "Anna", manager: new mongoose.Types.ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"), city: "Rome" },
            after: { name: "Anna B", manager: new mongoose.Types.ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"), city: "Rome" },
        });

        const [entry] = await AuditLogModel.find({}).lean();
        expect(entry.entity).toBe("user");
        expect(String(entry.actor)).toBe(actor);
        expect(entry.changes).toEqual([
            { field: "name", from: "Anna", to: "Anna B" },
            { field: "manager", from: "aaaaaaaaaaaaaaaaaaaaaaaa", to: "bbbbbbbbbbbbbbbbbbbbbbbb" },
        ]);
    });

    it("keeps only the fact of change for redacted fields", async () => {
        await AuditService.record(A, {
            actor,
            entity: "user",
            entityId,
            action: "update",
            before: { salary: "enc:old", password: "hash1" },
            after: { salary: "enc:new", password: "hash2" },
        });

        const [entry] = await AuditLogModel.find({}).lean();
        expect(entry.changes).toEqual([
            { field: "salary", redacted: true },
            { field: "password", redacted: true },
        ]);
        expect(JSON.stringify(entry)).not.toContain("enc:");
    });

    it("ignores noise fields and writes nothing when an update changed nothing", async () => {
        await AuditService.record(A, {
            actor,
            entity: "user",
            entityId,
            action: "update",
            before: { name: "Anna", updatedAt: new Date(1) },
            after: { name: "Anna", updatedAt: new Date(2) },
        });
        expect(await AuditLogModel.countDocuments({})).toBe(0);
    });

    it("records every field on create and delete", () => {
        expect(diffChanges("user", undefined, { name: "Anna" })).toEqual([
            { field: "name", from: undefined, to: "Anna" },
        ]);
        expect(diffChanges("user", { name: "Anna" }, undefined)).toEqual([
            { field: "name", from: "Anna", to: undefined },
        ]);
    });

    it("is scoped by company", async () => {
        await AuditService.record(A, { actor, entity: "user", entityId, action: "create", after: { name: "Anna" } });
        expect(await AuditLogModel.countDocuments({ company: COMPANY_A_ID })).toBe(1);
        expect(await AuditLogModel.countDocuments({ company: COMPANY_B_ID })).toBe(0);
        await expect(AuditService.record("", { actor, entity: "user", entityId, action: "create" })).rejects.toThrow();
        expect(B).not.toBe(A);
    });

    it("does not compile for entities that are not audited", () => {
        // @ts-expect-error "request" has its own actionsHistory and is deliberately not in AUDITED_ENTITIES
        const notAllowed: Parameters<typeof AuditService.record>[1]["entity"] = "request";
        expect(notAllowed).toBe("request");
    });
});
