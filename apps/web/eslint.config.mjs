import tseslint from 'typescript-eslint';
import angularEslintPlugin from '@angular-eslint/eslint-plugin';
import angularTemplatePlugin from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import unusedImports from 'eslint-plugin-unused-imports';

const maintainabilityGuidance = {
  'max-lines': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 40 }],
  complexity: ['warn', 10],
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/**/*.spec.ts'],
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: 'warn',
    },
  },
  {
    files: ['src/**/*.ts'],
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
      'max-lines': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['eslint.config.mjs'],
    rules: {
      'max-lines': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
);
