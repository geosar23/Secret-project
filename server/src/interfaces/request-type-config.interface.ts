import { Types } from "mongoose";

/**
 * A request type as configured by a company (the `RequestTypes` collection).
 * `system` types have their behaviour (payload, effects) in code, registered in the request-type registry.
 * `custom` types are admin-defined plain approvals; their form fields arrive with the flow builder (P0-11E).
 */
export interface IRequestTypeConfig {
    _id?: Types.ObjectId;
    company?: Types.ObjectId;
    key: string;
    name: string;
    kind: "system" | "custom";
    description?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
