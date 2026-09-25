const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*'],
  },
  {
    files: ['src/hooks/useTrackLoader.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
