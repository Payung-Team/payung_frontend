import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // PYG-700: debug log ห้ามเข้า repo — เหลือได้แค่ warn/error ที่ช่วยตรวจปัญหา (ห้ามใส่ token/ข้อมูลส่วนบุคคล)
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
])
