import { RequestStatus } from "../interfaces/request.interface";

export const REQUEST_STATUSES: readonly RequestStatus[] = ["pending", "approved", "rejected", "canceled"];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    canceled: "Canceled",
};

/** The global `.badge-*` class for each status. */
export const REQUEST_STATUS_BADGE: Record<RequestStatus, string> = {
    pending: "badge-warning",
    approved: "badge-success",
    rejected: "badge-error",
    canceled: "badge-gray",
};

/** Label of the "needs routing" option that sits next to the statuses in the Status filter. */
export const NEEDS_ROUTING_LABEL = "Needs routing";
