import { EmailService } from "./email.service";
import { brandingFromCompany } from "./email.templates";
import { clientBaseUrl } from "../../config/env";

interface NotifiableUser {
    name: string;
    email: string;
    /** Populated company of the user itself (never another tenant's). */
    company?: { _id?: unknown; name?: string } | null;
}

/**
 * Fire-and-forget wrapper: returns immediately, never throws, and never delays or alters the caller's response.
 */
function sendInBackground(
    user: NotifiableUser,
    send: (company: { _id?: unknown; name: string }) => Promise<unknown>,
): void {
    try {
        const company = user.company;
        if (!company?.name) {
            console.warn(JSON.stringify({ scope: "email", event: "email.skipped_no_company" }));
            return;
        }
        void send({ _id: company._id, name: company.name }).catch(() => undefined);
    } catch {
        // Notification problems must never reach the request path.
    }
}

/** Sends the temporary password issued by an administrator. The password is only ever in this email. */
export function notifyTemporaryPassword(
    user: NotifiableUser,
    temporaryPassword: string,
    expiresInHours: number,
    requestId?: string,
): void {
    sendInBackground(user, company =>
        EmailService.send(
            "temporary-password",
            user.email,
            { recipientName: user.name, temporaryPassword, expiresInHours, loginUrl: `${clientBaseUrl()}/login` },
            { company: brandingFromCompany(company), companyId: String(company._id), requestId },
        ),
    );
}

/** Confirmation after the user set a new password. Contains no password and no link. */
export function notifyPasswordChanged(user: NotifiableUser, changedAt: Date, requestId?: string): void {
    sendInBackground(user, company =>
        EmailService.send(
            "password-changed",
            user.email,
            { recipientName: user.name, changedAt },
            { company: brandingFromCompany(company), companyId: String(company._id), requestId },
        ),
    );
}
