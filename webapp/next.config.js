const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  typedRoutes: false,
};

module.exports = withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  tunnelRoute: "/sentry-tunnel",
});
