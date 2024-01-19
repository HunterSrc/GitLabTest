module.exports = {
  root: true,
  // ignorePatterns: ["projects/**/*"],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
        sourceType: 'module'
      },
      extends: [
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:@angular-eslint/recommended',
        'airbnb-typescript/base',
        'airbnb-typescript-prettier',
        // Altri plugin...
        'plugin:prettier/recommended'
      ],
      rules: {
        '@angular-eslint/directive-selector': [
          'error',
          {
            type: 'attribute',
            prefix: ['app'],
            style: 'camelCase'
          }
        ],
        '@angular-eslint/component-selector': [
          'error',
          {
            type: 'element',
            prefix: ['app'],
            style: 'kebab-case'
          }
        ],
        // Airbnb override
        'prettier/prettier': [
          'error',
          {
            useTabs: false,
            tabWidth: 4
          }
        ],
        'import/no-unresolved': 'off',
        'dot-notation': 'off',
        'prefer-destructuring': 'off',
        'import/prefer-default-export': 'off',
        'import/no-extraneous-dependencies': 'off',
        'import/extensions': 'off',
        'no-useless-constructor': 'off',
        'class-methods-use-this': 'off',
        'lines-between-class-members': 'off',
        '@typescript-eslint/lines-between-class-members': 'off',
        '@typescript-eslint/unbound-method': [
          'error',
          {
            ignoreStatic: true
          }
        ],
        // Custom rules
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'arrow-body-style': ['error', 'as-needed'],
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            ignoreRestSiblings: true,
            argsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            caughtErrors: 'none'
          }
        ],
        'no-useless-return': 'error',
        'no-unreachable': 'error',
        'no-else-return': 'error',
        'no-bitwise': 'warn',
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
      rules: {}
    }
    // Configura delle regole per altre estensioni di file...
  ]
};
