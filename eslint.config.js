import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: ['**/dist/**', '**/node_modules/**', 'prettier.config.cjs'],
    },

    eslint.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['server/src/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './server/tsconfig.json', // 👉 FIXED
                tsconfigRootDir: import.meta.dirname, // important
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
];
