module.exports = {
 root: true,
 env: { browser: true, es2022: true, node: true },
 parser: '@typescript-eslint/parser',
 parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
 plugins: ['@typescript-eslint'],
 ignorePatterns: ['dist', 'node_modules'],
 rules: { 'no-unused-vars': 'off', 'no-undef': 'off', 'no-empty': 'off', '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-explicit-any': 'off' }
};
