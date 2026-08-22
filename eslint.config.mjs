import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// eslint-config-next ships native flat-config presets (this file's imports)
// specifically so consumers don't need FlatCompat at all. Going through
// FlatCompat.extends('next/core-web-vitals', ...) instead crashed outright
// (`Converting circular structure to JSON`, from eslint-plugin-react's own
// self-referencing `configs.recommended` object) -- FlatCompat's legacy
// config-ingestion path tries to validate and JSON.stringify configs meant
// to be consumed as already-flat, native arrays like these.
const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts', 'src/migrations/**'],
  },
]

export default eslintConfig
