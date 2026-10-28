# Validation: remove carootsReportOnly

Product commit: `1a7f699eda` — `fix(encryption): remove carootsReportOnly`.
Base: `webex/webex-js-sdk:next` at `5b2da71a1f145e18a7d7e712493d3ca758be2ce1`.
Environment: Node 22.14.0 on macOS. Date: 2026-10-27 (America/New_York).

## What was validated

The legacy option, secondary awaited chain validation, and related documentation
and tests are removed. The product diff contains four files. Mandatory key
metadata checks, trust enforcement, failure telemetry, asset loading and retry
behavior remain covered. No replacement report-only option is introduced.

| Acceptance criterion | Evidence |
| --- | --- |
| Legacy option removed | Repository scan `rg -n 'carootsReportOnly' packages` returned no matches; built config has no own property with that name |
| Enforcement remains opt-in | Built config assertion confirms `shouldValidateKMSCertificate === false`; disabled-mode tests accept a valid key without roots and with unrelated roots |
| Enforced trust still works | Trusted chain resolves without metric; unrelated root rejects and reports a complete enforced-failure metric payload; no roots rejects |
| Metadata checks remain mandatory | Malformed metadata rejects with enforcement enabled and disabled; missing key rejects and reports a metric without a kid |
| Existing root acquisition remains covered | Asset verification, configured-root precedence, cache sharing, network/HTTP/verification retry, stale roots and context setup pass |

## Reproduction steps

1. Use Node 22.14.0 and install the repository's locked dependencies.
2. Run `yarn workspace @webex/internal-plugin-encryption build:src`.
3. Run `yarn workspace @webex/internal-plugin-encryption test:unit --targets kms.js`.
4. Run `yarn workspace @webex/internal-plugin-encryption test:unit --targets kms-certificate-validation.js`.
5. Check formatting on the four changed files and inspect the full forced ESLint
   results against the same files at the base commit.

## Positive and negative validation

- Positive: a trusted chain resolves and returns the original key with no metric.
- Negative: an unrelated root rejects when enforcement is enabled, with the exact
  expected metric fields and tags.
- Disabled enforcement: an unrelated root succeeds with no metric; malformed
  metadata still rejects. Mandatory checks are not disabled with trust enforcement.
- Missing roots: enforcement rejects, while disabled enforcement accepts valid metadata.

## Results

- Baseline KMS suite: 31 passed before production edits.
- Final KMS suite: 31 passed; see `kms-tests.txt`.
- Certificate helper suite: 20 passed; see `certificate-tests.txt`.
- Six temporary controls were detected by assertion failures: forced-off and
  forced-on enforcement, discarded CA roots, swallowed failure, missing failure
  telemetry, and wrong returned key. The built production file was restored after
  every control and the final suite passed afterward. See `mutations.json`.
- Prettier check: all four changed files passed.
- `git diff --check`: passed.
- Forced ESLint: four errors and six warnings, identical to the base by file,
  rule, severity and message. Existing errors are two JSDoc syntax errors,
  one unused variable and one bitwise operator. No new findings; see
  `lint-comparison.json` and `lint-comparison.txt`.
- Normal pre-commit tasks and commit-message validation completed successfully.
- Build resolution was checked: tests import this worktree's built encryption
  plugin, with shared dependencies used only for the toolchain and unchanged dependencies.

## Regression risk

| File | Summary | Risk |
| --- | --- | --- |
| src/config.js | Removes legacy setting; enforcement default remains false | Low |
| src/kms.js | Removes secondary validation; primary validation and rejection retained | Medium |
| README.md | Removes obsolete option description | Low |
| test/unit/spec/kms.js | Replaces obsolete tests with enforcement and missing-key checks | Low |

Compatibility impact: applications supplying the removed option no longer run
its extra certificate check or emit its report-only failure metric. Applications
can continue enabling enforced validation with `shouldValidateKMSCertificate`.

This SDK-only deletion adds no browser API, UI, networking, authorization, or
navigation behavior. There are no new accessibility interactions. Browser/OS
differences are not expected from the deletion, but authenticated service behavior,
cross-browser/OS equivalence and the repository-wide suite were not tested.
No additional reachable branch in the changed validation wrapper was left untested.
