import { Types } from "mongoose";

/** What a link-delivered token may be used for. `invite` is reserved for the invitation flow (P0-24). */
export const ONE_TIME_TOKEN_PURPOSES = ["forgot", "invite"] as const;
export type OneTimeTokenPurpose = (typeof ONE_TIME_TOKEN_PURPOSES)[number];

export interface IOneTimeToken {
    _id?: Types.ObjectId;
    /** SHA-256 of the raw token. The raw token only exists in the email. */
    tokenHash: string;
    user: Types.ObjectId;
    company: Types.ObjectId;
    purpose: OneTimeTokenPurpose;
    expiresAt: Date;
    /** Set when redeemed or superseded by a newer token; a token with usedAt can never be used. */
    usedAt?: Date | null;
    createdAt?: Date;
}
