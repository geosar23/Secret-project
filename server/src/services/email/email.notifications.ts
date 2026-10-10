import { EmailService } from "./email.service";
import { brandingFromCompany } from "./email.templates";

interface NotifiableUser {
    name: string;
    email: string;
    /** Populated company of the user itself (never another tenant's). */
    company?: { _id?: unknown; name?: string } | null;
}

/**
 * Emails a user the temporary password an administrator just set for them. Fire-and-forget: returns immediately, never throws,
 * and never delays or alters the caller's response. The password appears only in the message body, never in logs.
 */
export function notifyPasswordResetByAdmin(user: NotifiableUser, temporaryPassword: string, requestId?: string): void {
    try {
        const company = user.company;
        if (!company?.name) {
            console.warn(JSON.stringify({ scope: "email", event: "email.skipped_no_company" }));
            return;
        }
        void EmailService.send(
            "password-reset-notice",
            user.email,
            { recipientName: user.name, resetAt: new Date(), temporaryPassword },
            { company: brandingFromCompany({ name: company.name }), companyId: String(company._id), requestId },
        ).catch(() => undefined);
    } catch {
        // Notification problems must never reach the request path.
    }
}
