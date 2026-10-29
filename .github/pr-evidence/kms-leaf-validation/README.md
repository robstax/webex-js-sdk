# KMS identity leaf validation evidence

Date: 2026-10-29. Repository: `webex/webex-js-sdk`.

Product commit: `b04018929b7e4b8d94cd4b1e49ad6d7b4976310e`.

The product change binds chain validation to `x5c[0]`, including duplicate TBS
values and copies in the trust store. The source SHA-256 is recorded in
[validation-summary.json](validation-summary.json). This branch contains evidence;
the product pull request contains the validator, documentation, and tests.

## Results

| Check | Result | Raw evidence |
| --- | --- | --- |
| Build encryption package | Passed | [build.log](build.log) |
| Original validator unit target | 20 passed | [unit-validator.log](unit-validator.log) |
| New chain unit target, restored source | 56 passed | [unit-chain-restored.log](unit-chain-restored.log) |
| Original KMS unit target | 58 passed | [unit-kms.log](unit-kms.log) |
| Chrome Headless 156 | 56 passed | [browser-chrome.log](browser-chrome.log) |
| Firefox 158 | 56 passed | [browser-firefox.log](browser-firefox.log) |
| Final certificate matrix | All 33 expected outcomes | [chain-results.json](chain-results.json) |
| System openssl reference | Valid accepted; expired, future, and corrupt leaves rejected | [chain-results.json](chain-results.json) |
| Deliberate source mutations | All 15 detected by the expected cases; source restored | [mutation-results.json](mutation-results.json) |
| Expanded matrix before the fix | 13 failures, 41 passes | [expanded-tests-before-fix.log](expanded-tests-before-fix.log) |
| Focused lint | 0 errors, 4 test import warnings | [pre-push-lint.log](pre-push-lint.log) |
| Focused formatting | Passed | [pre-push-format.log](pre-push-format.log) |

The two tests added after the recorded before-fix run cover engine-failure
authority and an additional trust-store order. The final target has 56 tests.
All unit and browser entries use the same fixture matrix and shared assertions.

## Acceptance coverage

| Behavior | Positive evidence | Negative evidence |
| --- | --- | --- |
| Intended leaf | Valid direct-CA and leaf/intermediate chains pass | Expired, future, and invalid-signature leaves reject with a valid intermediate |
| Root and supplied extras | Root omitted, included, or duplicated; unrelated certificates pass | Unrelated trust cannot validate the invalid intended leaf |
| Duplicate leaf TBS | Valid first leaf followed by an invalid duplicate passes | Invalid first leaf followed by a valid duplicate rejects |
| Leaf in trust store | Valid chain passes for both store orders | Expired/future/corrupt leaf and missing intermediate reject |
| Self-issued anchors | Exact explicitly trusted CA passes with extras and both store orders | Untrusted, expired, future, and signature-different certificates reject |
| Mandatory identity | Valid key is returned unchanged | Nine identity errors still reject with signature validation disabled |
| Explicit signature bypass | Expired, future, and corrupt leaves continue when signature checks are disabled | Those leaves reject with checks enabled |
| Public inputs | Frozen certificate/root arrays remain unchanged; returned key keeps object identity | Mutation attempts fail assertions |
| KMS policy | Valid leaves continue without failure metrics | Enforced failure rejects; both report-only forms report and continue |
| Background timing | Setup returns while root loading is pending | A later validation failure reports without rejecting setup |
| Library result and selected path | Actual valid paths start with the original leaf | Wrong/missing/empty paths reject; library failure still rejects with a correct leaf in its path |

The raw test logs contain the corresponding named cases. The 33 chain cases
also appear individually in `chain-results.json` with unchanged-source and
fixed-source results. The mutation report names the expected failing test for
each removed or altered condition.

## Reproduction

Use Node 22.14.0 from the product branch checkout. Run these targets separately:

```sh
yarn workspace @webex/internal-plugin-encryption build:src
yarn workspace @webex/internal-plugin-encryption test:unit --targets kms-certificate-validation.js
yarn workspace @webex/internal-plugin-encryption test:unit --targets kms-certificate-chain.ts
yarn workspace @webex/internal-plugin-encryption test:unit --targets kms.js
SERVER_PORT=8136 FIXTURE_PORT=9136 CORS_PORT=9138 yarn workspace @webex/internal-plugin-encryption test:browser --targets kms-certificate-chain.js --karma-port 9137 --karma-browsers chrome
SERVER_PORT=8136 FIXTURE_PORT=9136 CORS_PORT=9138 yarn workspace @webex/internal-plugin-encryption test:browser --targets kms-certificate-chain.js --karma-port 9137 --karma-browsers firefox
```

Check that the ports are free. The runner needs permission to bind local ports.
No customer credentials or HDS access are needed.

The included `reproduce.cjs` accepts the product checkout path as its first
argument. It compiles original and fixed validators in memory and compares the
same certificate bytes, roots, intermediates, and dates. Four ordinary cases
also run through the system `/usr/bin/openssl`. The matching public PEM files
are included. Direct-trust cases are not compared with openssl because its
anchor semantics can differ.

`mutate.py` also accepts the product checkout path. Run it only in an idle
checkout: it temporarily changes source, runs the focused unit target, and
restores source in `finally`. Run the focused target again after restoration.

## Scope and limits

All certificates and keys here are synthetic public data. There are no private
keys or customer certificates. Validation ran on macOS 27.0.1. Safari, Edge,
Windows, and Linux were not run locally. This library change has no UI path;
the SDK Karma runner exercises the actual packaged validator in real browsers.

The results do not establish the cause or incidence of observed HDS failures.
Correct validation can reject invalid leaves previously accepted in enforced
mode. Report-only policy is preserved. A source revert restores the acceptance
defect. No trust roots, telemetry fields, downloads, or rollout settings change.
