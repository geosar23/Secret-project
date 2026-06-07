/** @type {import('ts-jest').JestConfigWithTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.test.ts"],
    setupFiles: ["<rootDir>/src/__tests__/setup.env.ts"],
    transform: {
        "^.+.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
    },
    testTimeout: 30000,
};
