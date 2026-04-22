import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "**/dist/",
            "**/node_modules/",
            "**/webpack.config.js",
            "**/lit-css-loader.js",
            "**/babel.config.js",
            "**/_site/",
            "**/coverage/",
            "functions/lib/",
            "utils/dist/",
        ],
    },
    // Base JS config (applies to all files)
    js.configs.recommended,
    
    // Base Node globals (default for root)
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
    },

    // TypeScript config (scoped to TS files)
    // We map over the recommended configs to restrict them to TS files only
    ...tseslint.configs.recommended.map(config => ({
        ...config,
        files: ["**/*.ts", "**/*.tsx"],
    })),

    // Custom TypeScript overrides
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "no-undef": "off", // TypeScript compiler handles this
            "no-case-declarations": "off",
            "no-prototype-builtins": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
            }],
        },
    },

    // Frontend Overrides
    {
        files: ["frontend/**/*.{js,mjs,ts,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    }
];