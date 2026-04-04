import tseslint from 'typescript-eslint';
import angularEslintPlugin from '@angular-eslint/eslint-plugin';
import angularTemplatePlugin from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import angularEslintUtils from '@angular-eslint/utils';
import { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';
import unusedImports from 'eslint-plugin-unused-imports';

const { getTemplateParserServices } = angularEslintUtils;

const maintainabilityGuidance = {
  'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 60 }],
  complexity: ['warn', 15],
};

const operationalNumberGuidance = {
  ignore: [0, 1, -1, 2, 8, 60, 90, 120, 180, 300, 360, 1000, 1024, 1500, 3600, 180000],
  ignoreArrayIndexes: true,
};

const inherentlyInteractiveTags = new Set([
  'button',
  'details',
  'input',
  'select',
  'summary',
  'textarea',
]);
const interactiveRoles = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]);
const interactiveEvents = [
  'click',
  'dblclick',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseup',
];

const feldpostTemplatePlugin = {
  rules: {
    'no-nested-interactive': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          noNestedInteractive:
            'Interactive elements must not be nested inside other interactive elements.',
        },
      },
      create(context) {
        const parserServices = getTemplateParserServices(context);

        return {
          Element(node) {
            if (!isInteractiveElement(node) || !hasInteractiveAncestor(node)) {
              return;
            }

            context.report({
              loc: parserServices.convertElementSourceSpanToLoc(context, node),
              messageId: 'noNestedInteractive',
            });
          },
        };
      },
    },
  },
};

function hasInteractiveAncestor(node) {
  let parent = node.parent;

  while (parent) {
    if (parent instanceof TmplAstElement && isInteractiveElement(parent)) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

function isInteractiveElement(node) {
  const name = node.name.toLowerCase();

  if (inherentlyInteractiveTags.has(name)) {
    return name !== 'input' || getAttributeValue(node, 'type')?.toLowerCase() !== 'hidden';
  }

  if (name === 'a') {
    return hasAttribute(node, 'href') || hasAttribute(node, 'routerLink');
  }

  const role = getAttributeValue(node, 'role')?.toLowerCase();
  if (role && interactiveRoles.has(role)) {
    return true;
  }

  return node.outputs.some((output) =>
    interactiveEvents.some(
      (eventName) => output.name === eventName || output.name.startsWith(`${eventName}.`),
    ),
  );
}

function hasAttribute(node, attributeName) {
  return [...node.attributes, ...node.inputs].some((attribute) => attribute.name === attributeName);
}

function getAttributeValue(node, attributeName) {
  const attribute = [...node.attributes, ...node.inputs].find(
    (candidate) => candidate.name === attributeName,
  );
  return typeof attribute?.value === 'string' ? attribute.value : null;
}

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/archive/**', // Ignoriert alle Ordner namens archive überall
      'src/app/core/archive/**', // Spezifischer Pfad, falls nötig
    ],
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
      'no-magic-numbers': ['warn', operationalNumberGuidance],
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

  // ── Upload orchestrator exception ─────────────────────────────────────────
  {
    files: ['src/app/core/upload/upload-manager.service.ts'],
    rules: {
      // Singleton orchestrator coordinates many pipelines and delegated streams.
      // Keep max-lines rule active globally; disable only for this service file.
      'max-lines': 'off',
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
      'feldpost-template': feldpostTemplatePlugin,
    },
    rules: {
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/no-nested-tags': 'error',
      'feldpost-template/no-nested-interactive': 'error',
      'max-lines': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
);
