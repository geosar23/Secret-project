/**
 * Sends the "test-email" template to an address using the configured provider.
 * Usage: npm run email:test -- you@example.com
 */
import { getEmailConfigErrors, config } from "../config/env";
import { EmailService } from "../services/email/email.service";

async function main() {
    const to = process.argv[2];
    if (!to) {
        console.error("Usage: npm run email:test -- you@example.com");
        process.exit(1);
    }
    const errors = getEmailConfigErrors();
    if (errors.length > 0) {
        console.error(errors.map(e => `  - ${e}`).join(String.fromCharCode(10)));
        process.exit(1);
    }
    console.info(`Sending test email with provider "${config.EMAIL_PROVIDER}"...`);
    const result = await EmailService.send("test-email", to, {}, { company: { companyName: "HRMS" } });
    console.info(
        result.ok
            ? `Sent (attempts: ${result.attempts}).`
            : `Failed after ${result.attempts} attempt(s); see log above.`,
    );
    process.exit(result.ok ? 0 : 1);
}

void main();
