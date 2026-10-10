/**
 * Structured audit-style log line for the credential flows. Fields must be ids and reasons only:
 * never a token, link, password or email address.
 */
export function authLog(event: string, fields: Record<string, unknown> = {}): void {
    console.info(JSON.stringify({ scope: "auth", event, ...fields }));
}
