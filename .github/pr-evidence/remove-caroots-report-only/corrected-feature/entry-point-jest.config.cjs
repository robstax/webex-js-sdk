const root = '/private/tmp/webex-js-sdk-remove-caroots-report-only';

module.exports = {
  ...require(`${root}/node_modules/@webex/jest-config-legacy`),
  rootDir: `${root}/packages/webex`,
  moduleNameMapper: {
    '^@webex/internal-plugin-encryption$': `${root}/packages/@webex/internal-plugin-encryption/dist/index.js`,
  },
};
