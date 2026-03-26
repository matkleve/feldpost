import tseslint from 'typescript-eslint';
import angularEslintPlugin from '@angular-eslint/eslint-plugin';
import angularTemplatePlugin from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import unusedImports from 'eslint-plugin-unused-imports';

const maintainabilityGuidance = {
  'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 60 }],
  complexity: ['warn', 15],
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // ── TypeScript source files ───────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': angularEslintPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...maintainabilityGuidance,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1, 2], ignoreArrayIndexes: true }],
      'no-warning-comments': ['warn', { terms: ['FIXME', 'HACK'], location: 'anywhere' }],
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 60, styles: 5 }],
      'unused-imports/no-unused-imports': 'error',
    },
  },

  // ── Spec files — relaxed rules ────────────────────────────────────────────
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // Specs can be longer — each scenario adds lines
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 60 }],
      // No magic numbers rule in specs — test values are explicit by nature
      'no-magic-numbers': 'off',
      // any is sometimes needed in mocks
      '@typescript-eslint/no-explicit-any': 'warn',
      // unused imports still important
      'unused-imports/no-unused-imports': 'error',
    },
  },

  // ── HTML templates ────────────────────────────────────────────────────────
  {
    files: ['src/**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplatePlugin,
    },
    rules: {
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },

  // ── ESLint config itself ──────────────────────────────────────────────────
  {
    files: ['eslint.config.mjs'],
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
);
