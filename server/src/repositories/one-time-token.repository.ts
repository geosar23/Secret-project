import { companyModel } from "../models/company.model";
import { OneTimeTokenModel } from "../models/one-time-token.model";
import { OneTimeTokenPurpose } from "../interfaces/one-time-token.interface";

export function oneTimeTokenRepository(companyId: string) {
    return companyModel(OneTimeTokenModel, companyId);
}

/**
 * A redeemed token is the only thing that tells us which company it belongs to, so these lookups are
 * intentionally not company-scoped. Everything done after resolving the token must use the token's company.
 */
export function oneTimeTokenIdentityRepository() {
    return {
        findByHash(tokenHash: string) {
            return OneTimeTokenModel.findOne({ tokenHash });
        },

        /** Atomic single use: only one concurrent caller gets the document back. */
        consume(tokenHash: string, purposes: readonly OneTimeTokenPurpose[], now: Date) {
            return OneTimeTokenModel.findOneAndUpdate(
                { tokenHash, purpose: { $in: purposes }, usedAt: null, expiresAt: { $gt: now } },
                { $set: { usedAt: now } },
                { new: true },
            );
        },

        /** Undo consume() when the follow-up write failed, so the user can retry with the same link. */
        release(tokenHash: string) {
            return OneTimeTokenModel.updateOne({ tokenHash }, { $set: { usedAt: null } });
        },
    };
}
