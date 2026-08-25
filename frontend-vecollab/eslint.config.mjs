import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: [
        ...compat.extends("eslint:recommended"),
        ...nextCoreWebVitals,
        ...compat.extends("plugin:react/recommended"),
        ...compat.extends("prettier")
    ],

    languageOptions: {
        globals: {
            JSX: true,
        },
    },

    rules: {
        "react/react-in-jsx-scope": "off",
        "no-unused-vars": "off",
        "react/no-unknown-property": "off",
    },
}]);