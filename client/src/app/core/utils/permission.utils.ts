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

    if (candidates.some(candidate => effectiveSet.has(candidate))) {
        return true;
    }

    // Mirrors the server: "userProfile:write:country" also covers "userProfile.identity:write:country".
    const dotIndex = category.lastIndexOf(".");
    if (dotIndex === -1) {
        return false;
    }
    const parent = category.substring(0, dotIndex);
    return [
        `${parent}:${wildcard}:${wildcard}`,
        `${parent}:${action}:${wildcard}`,
        `${parent}:${wildcard}:${scope}`,
        `${parent}:${action}:${scope}`,
    ].some(candidate => effectiveSet.has(candidate));
}

export function hasAnyPermission(effectivePermissions: string[], required: readonly string[]): boolean {
    return required.some(key => hasPermission(effectivePermissions, key));
}
