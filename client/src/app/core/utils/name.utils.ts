/** "Maria Papadaki" -> "MP": first letters of the first two words, upper-case. */
export function initialsOf(name: string | null | undefined): string {
    return (name ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");
}
