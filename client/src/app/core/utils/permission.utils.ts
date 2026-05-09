export function hasPermission(effectivePermissions: string[], required: string): boolean {
    if (!Array.isArray(effectivePermissions) || !required) {
        return false;
    }

    const effectiveSet = new Set(effectivePermissions);
    const parts = required.split(":");
    if (parts.length !== 3) {
        return effectiveSet.has(required);
    }

    const [category, action, scope] = parts;
    const wildcard = "*";
    const candidates = [
        `${wildcard}:${wildcard}:${wildcard}`,
        `${category}:${wildcard}:${wildcard}`,
        `${wildcard}:${action}:${wildcard}`,
        `${wildcard}:${wildcard}:${scope}`,
        `${category}:${action}:${wildcard}`,
        `${category}:${wildcard}:${scope}`,
        `${wildcard}:${action}:${scope}`,
        required,
    ];

    return candidates.some(candidate => effectiveSet.has(candidate));
}
