/** `jane.doe@acme.com` -> `j***@acme.com`. Safe for logs; never returns the full local part. */
export function maskEmail(address: string): string {
    const at = address.lastIndexOf("@");
    if (at < 1) {
        return "***";
    }
    return `${address[0]}***${address.slice(at)}`;
}
