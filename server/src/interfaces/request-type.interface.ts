/* eslint-disable no-unused-vars */
import { PermissionCategories } from "../enums/permissions.enum";
import { IFlowStep } from "./approval-flow.interface";
import { IRequest } from "./request.interface";

/** The user performing an engine operation. Types load whatever else they need (permissions, scope) themselves. */
export interface EngineActor {
    id: string;
}

export interface RequestTypeDefinition<TPayload = unknown> {
    type: string;
    /** Display name used when the type is first seeded into a company's RequestTypes. */
    name: string;
    version: number;
    /** Permission category whose scoped `read` also lets someone view this type's requests (e.g. "leaves"). */
    readCategory?: PermissionCategories;
    /** Validates and normalises the payload; throws BadRequestError when invalid. */
    validatePayload(payload: unknown): TPayload;
    /** Steps of the flow seeded for a company the first time the type is enabled. Never used at request time. */
    flowTemplate: IFlowStep[];
    canCreate(companyId: string, actor: EngineActor, subjectId: string, payload: TPayload): Promise<void>;
    onSubmitted?(request: IRequest): Promise<void>;
    /** Idempotent, keyed by request id. */
    onApproved(request: IRequest): Promise<void>;
    onRejected?(request: IRequest): Promise<void>;
    /** Idempotent; must reverse everything onApproved did when the request was approved. */
    onCanceled?(request: IRequest): Promise<void>;
    summarize(request: IRequest): { title: string; subtitle?: string };
    /** Rechecked at decision time; false blocks the decision. */
    canApprove(companyId: string, actor: EngineActor, request: IRequest): Promise<boolean>;
    /** Immediate approval by an authorized creator (recorded as decisions with an override flag). */
    canApproveOnCreate?(companyId: string, actor: EngineActor, request: IRequest): Promise<boolean>;
    allowCancelAfterApproval?: boolean;
    /**
     * Who may cancel this request (type-level permission). Called with the request in its current status, so a type can
     * allow the requester while pending and HR after approval. Defaults to the requester only when not defined.
     */
    canCancel?(companyId: string, actor: EngineActor, request: IRequest): Promise<boolean>;
    /** Resolver hook: an unavailable approver is treated as "nobody". */
    isUnavailable?(companyId: string, userId: string, date: Date): Promise<boolean>;
    detail(request: IRequest): Promise<unknown>;
}
