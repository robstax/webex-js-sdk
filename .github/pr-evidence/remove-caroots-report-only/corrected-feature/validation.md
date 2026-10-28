# Validation: PR 5325's background feature without carootsReportOnly

PR: https://github.com/webex/webex-js-sdk/pull/5326
Product head: `92856c21371dab0775ac4a569cc78d66e9ce263f`.
Reference: PR #5325 at `3e8fba061162f90bd6b278fb54ffacddf79e06d5`.
Base: `next` at `5b2da71a1f145e18a7d7e712493d3ca758be2ce1`.
Environment: Node 22.14.0 and Chrome Headless on macOS, 2026-10-27 (America/New_York).

## Corrected acceptance criteria

This report supersedes the earlier removal-only validation. The intended result
is the background report-only feature from #5325, with its legacy array option
and legacy precedence removed.

| Criterion | Evidence |
| --- | --- |
| New report-only flag is present and defaults to false | Config assertions across six SDK entry points |
| Validated roots are loaded in the background | Pending-download unit and integration tests return the key/context before the asset settles |
| Configured roots take precedence over download | Configured-root success and untrusted-chain cases assert no fetch |
| Report-only failures do not reject setup | Download, bundle signature/version and chain failures reported; context still completes |
| Enforced validation remains fail-closed | With both flags enabled, download/signature/version/chain failures reject before ECDH setup/request; no duplicate background check |
| Mandatory checks precede background work | Invalid metadata rejects without starting report work or submitting KMS requests; missing metadata reports safely |
| Legacy mode is removed completely | `rg -n 'carootsReportOnly' packages` returns no matches; built config has no legacy property |
| Other #5325 behavior is retained | Direct reference-tree comparison in `reference-diff.patch`; integration, entry-point tests and shared fixture match the reference |

## Test results

- KMS unit suite: **47 passed** (`kms-tests.txt`).
- Certificate helper unit suite: **20 passed** (`certificate-tests.txt`).
- Entry-point config suite: **24 passed** (`entry-points-tests.txt`).
- Node asset integration suite: **5 passed** (`node-integration.txt`).
- Chrome asset integration suite: **7 passed** (`chrome-tests.txt`).
- Ten mutation controls detected by failing assertions; production restored;
  final KMS suite passed afterward (`mutations.json`).
- All six changed JavaScript files pass Prettier. Both READMEs pass the Markdown
  check with embedded-language formatting disabled to preserve existing examples.
- Whitespace checks and normal pre-commit/commit-message checks passed.
- Forced ESLint on all changed JavaScript matches baseline findings: four existing
  errors, no added findings. New shared fixture has no findings (`lint-comparison.json`).

## Reproduction

Use Node 22.14.0 with the repository's locked dependencies, then:

1. `yarn workspace @webex/internal-plugin-encryption build:src`
2. `yarn workspace @webex/internal-plugin-encryption test:unit --targets kms.js`
3. `yarn workspace @webex/internal-plugin-encryption test:unit --targets kms-certificate-validation.js`
4. `yarn workspace @webex/internal-plugin-encryption test:integration --targets caroots.js`
5. `yarn workspace webex build:src`
6. Run `assets-config.js` in Jest. This worktree shares installed dependencies, so
   its run used the attached `entry-point-jest.config.cjs` to map the internal
   encryption package to the candidate build globally:
   `node node_modules/jest/bin/jest.js --config /private/tmp/sdk-corrected-assets-jest.config.cjs --runInBand --silent --runTestsByPath /private/tmp/webex-js-sdk-remove-caroots-report-only/packages/webex/test/unit/spec/assets-config.js`.
   `--silent` suppresses asynchronous SDK initialization logging; assertions remain active.
7. Start the fixture server with `SERVER_PORT=9100 FIXTURE_PORT=9102 CORS_PORT=9103
   node packages/@webex/test-helper-server/src/index.js`, then run:
   `SERVER_PORT=9100 FIXTURE_PORT=9102 CORS_PORT=9103 yarn workspace @webex/internal-plugin-encryption test:browser --targets caroots.js --karma-browsers chrome --karma-port 9101`.

The local fixture server was stopped after validation. No production test
configuration or dependency files were modified for the local module mapping.

## Positive and negative cases

- Positive: report-only checking returns a valid key/context while the asset is
  pending; successful configured roots produce no failure metric.
- Negative: both flags false causes no root fetch or background report.
- Report-only failure: untrusted roots produce a complete `report-only` failure
  metric without rejecting setup; asset errors use existing asset categories.
- Enforcement precedence: enabling both flags performs enforced validation only;
  bad roots or assets still reject.
- Mandatory checks: malformed/missing key metadata still rejects independently
  of the trust-enforcement opt-in.

## Mutation controls

Disabled background opt-in, removed enforcement precedence, disabled primary
enforcement, awaited background work, ignored configured roots, retained failed
cache, removed failure telemetry, swallowed primary rejection, changed reporter
return value and replaced checked key were all detected. Every built-file mutation
was restored in a `finally` block before final validation.

## Risk and limits

| File | Summary | Risk |
| --- | --- | --- |
| src/config.js | Add false-default flag; remove legacy option | Medium |
| src/kms.js | Shared root loader and background task; enforcement retained | Medium |
| Two READMEs | Document background policy, precedence, hosting and lifetime | Low |
| Fixture and three test files | Exercise policy, timing, real assets and SDK entry points | Low |

The removed array no longer triggers a check. Applications opt into background
checks with `shouldValidateKMSCertificateReportOnly: true` and can supply `caroots`
or use the verified asset. Enforcement keeps its independent flag. Closing the
tab or SDK instance may prevent late background reports from completing.

No UI or accessibility interaction changes. The browser test exercises the real
SDK root-fetch/verification path with fixtures. Authenticated service behavior,
other browsers/operating systems and the full repository suite were not tested.
