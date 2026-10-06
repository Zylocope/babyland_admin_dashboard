import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // A context file exporting its provider and its hook is the usual React
      // pattern; the only cost is a full reload instead of a hot swap when
      // one of these two files is edited.
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, allowExportNames: ['useAuth', 'useTheme'] }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Run under Node, not the browser: the build config and the tests.
    files: ['vite.config.js', '**/*.test.js'],
    languageOptions: { globals: globals.node },
  },
])
