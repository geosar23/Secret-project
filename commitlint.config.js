export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [
            2,
            "always",
            [
                "feat", // New feature
                "fix", // Bug fix
                "style", // UI/styling changes
                "chore", // Maintenance tasks
                "security", // Security improvements
                "docs", // Documentation changes
                "refactor", // Code refactoring
                "test", // Adding/updating tests
                "perf", // Performance improvements
                "ci", // CI/CD changes
                "build", // Build system changes
                "revert", // Revert previous commit
            ],
        ],
        "type-case": [2, "always", "lower-case"],
        "type-empty": [2, "never"],
        "subject-empty": [2, "never"],
        "subject-full-stop": [2, "never", "."],
        "header-max-length": [2, "always", 100],
    },
};
