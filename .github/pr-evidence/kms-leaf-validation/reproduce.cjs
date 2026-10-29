const fs = require('fs');
const path = require('path');
const Module = require('module');
const {createHash} = require('crypto');
const {execFileSync} = require('child_process');

const worktree = process.argv[2] || process.cwd();
const output = path.join(__dirname, 'final-reference');
fs.mkdirSync(output, {recursive: true});
const requireSDK = Module.createRequire(path.join(worktree, 'package.json'));
const babel = requireSDK('@babel/core');
const sinon = requireSDK('sinon');
const relativeValidator = 'packages/@webex/internal-plugin-encryption/src/kms-certificate-validation.js';
const validatorPath = path.join(worktree, relativeValidator);
const base = '77dbe986d6afe944525aa9dbdd3428294469aa77';

function loadSource(filename, source = fs.readFileSync(filename, 'utf8')) {
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(babel.transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: [requireSDK.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code, filename);
  return loaded.exports;
}

const fixturePath = path.join(worktree, 'packages/@webex/internal-plugin-encryption/test/fixtures/certificate-diagnostics.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const {unrelatedCaroots, certificateChainCases} = loadSource(path.join(worktree, 'packages/@webex/internal-plugin-encryption/test/fixtures/kms-certificate.js'));
const candidateSource = fs.readFileSync(validatorPath, 'utf8');
const originalSource = execFileSync('git', ['show', `${base}:${relativeValidator}`], {cwd: worktree, encoding: 'utf8'});
const validators = {
  original: loadSource(validatorPath, originalSource).default,
  fixed: loadSource(validatorPath, candidateSource).default,
};
const leaf = fixture.key.x5c[0];
const corruptSignature = (value) => {
  const bytes = Buffer.from(value, 'base64');
  bytes[bytes.length - 1] = (bytes[bytes.length - 1] + 1) % 256;
  return bytes.toString('base64');
};
const badLeaf = corruptSignature(leaf);
const cases = certificateChainCases.map(({name, key, roots, valid, date}) => ({
  name, key, x5c: key.x5c, roots, expected: valid ? 'accepted' : 'rejected', time: date?.slice(0, 10),
}));

function writePem(name, value) {
  const filename = path.join(output, name);
  fs.writeFileSync(filename, `-----BEGIN CERTIFICATE-----\n${value.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`);
  return filename;
}

async function main() {
  const results = [];
  for (const test of cases) {
    const row = {case: test.name, expected: test.expected, time: `${test.time || '2030-01-01'}T00:00:00Z`};
    for (const [name, validate] of Object.entries(validators)) {
      const key = Object.freeze({...test.key, x5c: Object.freeze([...(test.x5c || fixture.key.x5c)])});
      const roots = Object.freeze([...(test.roots || [fixture.root])]);
      const clock = sinon.useFakeTimers({now: new Date(row.time).getTime(), toFake: ['Date']});
      try {
        const returned = await validate({caroots: roots})(key);
        row[name] = {result: 'accepted', returnedOriginalKey: returned === key};
      } catch (error) {
        row[name] = {result: 'rejected', message: error.message};
      } finally {
        clock.restore();
      }
    }
    results.push(row);
  }
  const leafFile = writePem('leaf.pem', leaf);
  const badLeafFile = writePem('bad-leaf.pem', badLeaf);
  const rootFile = writePem('root.pem', fixture.root);
  const intermediateFile = writePem('intermediate.pem', fixture.intermediate);
  const reference = [];
  for (const [name, file, time] of [
    ['valid', leafFile, '2030-01-01'],
    ['expired leaf', leafFile, '2036-01-01'],
    ['future leaf', leafFile, '2024-01-01'],
    ['invalid leaf signature', badLeafFile, '2030-01-01'],
  ]) {
    const args = ['verify', '-attime', String(Date.parse(time) / 1000), '-CAfile', rootFile, '-untrusted', intermediateFile, file];
    try {
      reference.push({case: name, result: 'accepted', executable: '/usr/bin/openssl', args, output: execFileSync('/usr/bin/openssl', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim()});
    } catch (error) {
      reference.push({case: name, result: 'rejected', executable: '/usr/bin/openssl', args, exitCode: error.status, output: `${error.stdout || ''}${error.stderr || ''}`.trim()});
    }
  }
  const report = {
    node: process.version,
    base,
    fixedSourceSHA256: createHash('sha256').update(candidateSource).digest('hex'),
    fixtureSHA256: createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex'),
    pkijsVersion: JSON.parse(fs.readFileSync(path.join(worktree, 'node_modules/pkijs/package.json'))).version,
    note: 'Validators are compiled in memory from the recorded base and final fixed source. No SDK source file is changed. Both use the same installed dependencies, certificate bytes, roots, and fake validation times. Trust-store equality cases are not compared with system openssl because anchor semantics can differ.',
    results,
    reference,
  };
  fs.writeFileSync(path.join(output, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    resultsFile: path.join(output, 'results.json'),
    originalUnexpectedResults: results.filter(row => row.original.result !== row.expected).map(row => row.case),
    fixedUnexpectedResults: results.filter(row => row.fixed.result !== row.expected).map(row => row.case),
    reference: reference.map(({case: name, result}) => ({case: name, result})),
  }, null, 2));
}

main().catch(error => {console.error(error); process.exitCode = 1;});
