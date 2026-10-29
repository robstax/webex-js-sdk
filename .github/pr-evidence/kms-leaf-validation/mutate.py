from pathlib import Path
import hashlib
import json
import os
import re
import subprocess
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
out = Path(__file__).parent
source_file = root / 'packages/@webex/internal-plugin-encryption/src/kms-certificate-validation.js'
original = source_file.read_text()
(out / 'verified-source-before-mutations.js').write_text(original)
env = dict(os.environ)
env['FORCE_COLOR'] = '0'
command = ['yarn', 'workspace', '@webex/internal-plugin-encryption', 'test:unit', '--targets', 'kms-certificate-chain.ts']

mutations = [
    ('select-last-input-certificate',
     'const [leaf, ...issuers] = certificates;',
     'const leaf = certificates[certificates.length - 1]; const issuers = certificates.slice(0, -1);',
     'rejects expired leaf with valid intermediate'),
    ('place-leaf-first',
     '[...issuers.filter((certificate) => !isLeaf(certificate)), leaf]',
     '[leaf, ...issuers.filter((certificate) => !isLeaf(certificate))]',
     'accepts leaf and intermediate'),
    ('omit-supplied-duplicate-filter',
     'issuers.filter((certificate) => !isLeaf(certificate))',
     'issuers',
     'accepts valid duplicated leaf'),
    ('omit-trust-store-duplicate-filter',
     'trustedCerts.filter((certificate) => !isLeaf(certificate))',
     'trustedCerts',
     'accepts valid leaf in trust store position 0'),
    ('compare-full-certificate-for-duplicate-filter',
     'const isLeaf = (certificate) => leafTBS.equals(Buffer.from(certificate.tbsView));',
     'const isLeaf = (certificate) => Buffer.from(leaf.toSchema().toBER(false)).equals(Buffer.from(certificate.toSchema().toBER(false)));',
     'accepts valid leaf followed by invalid duplicate TBS'),
    ('compare-issuer-TBS-instead-of-leaf',
     'const leafTBS = Buffer.from(leaf.tbsView);',
     'const leafTBS = Buffer.from(issuers[0].tbsView);',
     'accepts leaf and intermediate'),
    ('remove-configured-trust',
     'const trustedCerts = caroots.map(decodeCert);',
     'const trustedCerts = [];',
     'accepts leaf and intermediate'),
    ('disable-self-issued-anchor-handling',
     'leaf.subject.isEqual(leaf.issuer) &&',
     'false &&',
     'accepts valid explicitly trusted self-issued CA with extra certificates'),
    ('allow-self-issued-handling-for-issued-leaf',
     'leaf.subject.isEqual(leaf.issuer) &&',
     'true &&',
     'accepts valid leaf in trust store position 0'),
    ('trust-self-issued-TBS-without-signature-match',
     'Buffer.from(leaf.toSchema().toBER(false)).equals(\n        Buffer.from(certificate.toSchema().toBER(false))\n      )',
     'isLeaf(certificate)',
     'rejects invalid self-issued leaf signature matching trusted TBS'),
    ('keep-extra-trust-with-self-issued-leaf',
     'trustedCerts: trustedSelfIssued\n      ? [leaf]',
     'trustedCerts: trustedSelfIssued\n      ? trustedCerts',
     'accepts valid explicitly trusted self-issued CA with extra certificates'),
    ('keep-extra-inputs-with-self-issued-leaf',
     'certs: trustedSelfIssued\n      ? [leaf]',
     'certs: trustedSelfIssued\n      ? [...issuers, leaf]',
     'accepts valid explicitly trusted self-issued CA with extra certificates'),
    ('ignore-engine-rejection',
     'if (!result) {',
     'if (false) {',
     'preserves an engine failure even when its path starts with the intended leaf'),
    ('omit-selected-leaf-guard',
     'if (certificatePath?.[0] !== leaf) {',
     'if (false) {',
     'rejects a successful engine result with a different leaf'),
    ('invert-selected-leaf-guard',
     'if (certificatePath?.[0] !== leaf) {',
     'if (certificatePath?.[0] === leaf) {',
     'accepts leaf and intermediate'),
]

results = []
try:
    for name, before, after, expected in mutations:
        assert original.count(before) == 1, (name, original.count(before))
        source_file.write_text(original.replace(before, after, 1))
        run = subprocess.run(command, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=45)
        (out / f'mutation-{name}.log').write_text(run.stdout)
        failed = re.findall(r'^\s*✕\s+(.+?)(?:\s+\(\d+\s*ms\))?$', run.stdout, flags=re.MULTILINE)
        caught = run.returncode != 0 and any(expected in title for title in failed)
        row = {'mutation': name, 'exitCode': run.returncode, 'expectedFailingCase': expected, 'failedTests': failed, 'caughtForExpectedReason': caught}
        results.append(row)
        print(json.dumps({'mutation': name, 'caught': caught, 'failedTestCount': len(failed)}), flush=True)
        assert caught, name
finally:
    source_file.write_text(original)
    report = {'sourceSHA256': hashlib.sha256(original.encode()).hexdigest(), 'restored': source_file.read_text() == original, 'results': results}
    (out / 'mutation-results.json').write_text(json.dumps(report, indent=2) + '\n')

print(f'All {len(results)} mutations were detected. Source restored.', flush=True)
