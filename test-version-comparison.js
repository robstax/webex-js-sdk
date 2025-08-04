import {isVersionGreaterThan} from './version-comparison.js';

// Test cases to verify the function works correctly
const testCases = [
  {input: 'webex-js-sdk/3.8.1-next.10', expected: false, description: 'same version'},
  {input: 'webex-js-sdk/3.8.1-next.11', expected: true, description: 'higher next number'},
  {input: 'webex-js-sdk/3.8.1-next.9', expected: false, description: 'lower next number'},
  {input: 'webex-js-sdk/3.8.2-next.1', expected: true, description: 'higher patch version'},
  {input: 'webex-js-sdk/3.9.0-next.1', expected: true, description: 'higher minor version'},
  {input: 'webex-js-sdk/4.0.0-next.1', expected: true, description: 'higher major version'},
  {input: 'webex-js-sdk/3.7.9-next.20', expected: false, description: 'lower minor version'},
  {input: 'webex-js-sdk/3.8.0-next.50', expected: false, description: 'lower patch version'},
  {input: 'webex-js-sdk/2.8.1-next.10', expected: false, description: 'lower major version'},
];

testCases.forEach(({input, expected, description}) => {
  const result = isVersionGreaterThan(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${input} (${description}): ${result}`);
});
