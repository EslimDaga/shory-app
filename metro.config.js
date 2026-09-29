// Sentry's Metro config adds a debug id to each bundle, so crash stack traces map back to the
// source through the uploaded sourcemaps.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
