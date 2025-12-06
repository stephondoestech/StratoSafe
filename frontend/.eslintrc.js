module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['off'],
    'testing-library/no-wait-for-multiple-assertions': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
