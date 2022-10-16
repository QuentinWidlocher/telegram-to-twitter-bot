module.exports = {
    plugins: ['neverthrow'],
    rules: {
        'neverthrow/must-use-result': 'error',
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
};