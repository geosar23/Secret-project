import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["**/dist/**", "**/node_modules/**", "prettier.config.cjs"],
    },

    eslint.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ["server/src/**/*.ts"],
        ignores: ["server/src/__tests__/**"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./server/tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            curly: ["error", "all"],
        },
    },

    {
        files: ["client/src/**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "warn",
            "no-console": "off",
            curly: ["error", "all"],
        },
    },

    // Test files use tsconfig.test.json which includes @types/jest
    {
        files: ["server/src/__tests__/**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./server/tsconfig.test.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            curly: ["error", "all"],
        },
    },
];
