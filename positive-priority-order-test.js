// Testing order dependency with ONLY positive priority values

const filterFunction = (filteredHosts) => {
  return filteredHosts.reduce(
    (previous, current) =>
      previous.priority > current.priority || !previous.homeCluster ? current : previous,
    {}
  );
};

console.log('=== TESTING ORDER DEPENDENCY WITH POSITIVE PRIORITIES ONLY ===\n');

// Test Case 1: Order A vs Order B - same priorities, different homeCluster
console.log('Test 1A: [priority 1 homeCluster:false, priority 5 homeCluster:true]');
const test1A = [
  {
    host: 'host1.example.com',
    priority: 1, // BETTER priority
    homeCluster: false,
  },
  {
    host: 'host2.example.com',
    priority: 5, // WORSE priority
    homeCluster: true,
  },
];
const result1A = filterFunction(test1A);
console.log('Result:', JSON.stringify(result1A, null, 2));
console.log(`Winner: priority ${result1A.priority} (homeCluster: ${result1A.homeCluster})\n`);

console.log(
  'Test 1B: [priority 5 homeCluster:true, priority 1 homeCluster:false] - REVERSED ORDER'
);
const test1B = [
  {
    host: 'host1.example.com',
    priority: 5, // WORSE priority
    homeCluster: true,
  },
  {
    host: 'host2.example.com',
    priority: 1, // BETTER priority
    homeCluster: false,
  },
];
const result1B = filterFunction(test1B);
console.log('Result:', JSON.stringify(result1B, null, 2));
console.log(`Winner: priority ${result1B.priority} (homeCluster: ${result1B.homeCluster})\n`);

console.log('🔍 COMPARISON:');
console.log(`Test 1A winner: priority ${result1A.priority} (homeCluster: ${result1A.homeCluster})`);
console.log(`Test 1B winner: priority ${result1B.priority} (homeCluster: ${result1B.homeCluster})`);
console.log(
  `Same inputs, different order: ${
    result1A.priority === result1B.priority ? '✅ CONSISTENT' : '❌ ORDER DEPENDENT'
  }\n`
);

// Test Case 2: More extreme difference
console.log('Test 2A: [priority 1 homeCluster:false, priority 100 homeCluster:true]');
const test2A = [
  {
    host: 'host1.example.com',
    priority: 1, // MUCH BETTER priority
    homeCluster: false,
  },
  {
    host: 'host2.example.com',
    priority: 100, // MUCH WORSE priority
    homeCluster: true,
  },
];
const result2A = filterFunction(test2A);
console.log('Result:', JSON.stringify(result2A, null, 2));
console.log(`Winner: priority ${result2A.priority} (homeCluster: ${result2A.homeCluster})\n`);

console.log(
  'Test 2B: [priority 100 homeCluster:true, priority 1 homeCluster:false] - REVERSED ORDER'
);
const test2B = [
  {
    host: 'host1.example.com',
    priority: 100, // MUCH WORSE priority
    homeCluster: true,
  },
  {
    host: 'host2.example.com',
    priority: 1, // MUCH BETTER priority
    homeCluster: false,
  },
];
const result2B = filterFunction(test2B);
console.log('Result:', JSON.stringify(result2B, null, 2));
console.log(`Winner: priority ${result2B.priority} (homeCluster: ${result2B.homeCluster})\n`);

console.log('🔍 COMPARISON:');
console.log(`Test 2A winner: priority ${result2A.priority} (homeCluster: ${result2A.homeCluster})`);
console.log(`Test 2B winner: priority ${result2B.priority} (homeCluster: ${result2B.homeCluster})`);
console.log(
  `Same inputs, different order: ${
    result2A.priority === result2B.priority ? '✅ CONSISTENT' : '❌ ORDER DEPENDENT'
  }\n`
);

// Test Case 3: Three hosts to see accumulation behavior
console.log(
  'Test 3A: [priority 2 homeCluster:false, priority 1 homeCluster:false, priority 5 homeCluster:true]'
);
const test3A = [
  {
    host: 'host1.example.com',
    priority: 2,
    homeCluster: false,
  },
  {
    host: 'host2.example.com',
    priority: 1, // BEST priority
    homeCluster: false,
  },
  {
    host: 'host3.example.com',
    priority: 5, // WORST priority
    homeCluster: true,
  },
];
const result3A = filterFunction(test3A);
console.log('Result:', JSON.stringify(result3A, null, 2));
console.log(`Winner: priority ${result3A.priority} (homeCluster: ${result3A.homeCluster})\n`);

console.log(
  'Test 3B: [priority 5 homeCluster:true, priority 1 homeCluster:false, priority 2 homeCluster:false] - DIFFERENT ORDER'
);
const test3B = [
  {
    host: 'host1.example.com',
    priority: 5, // WORST priority
    homeCluster: true,
  },
  {
    host: 'host2.example.com',
    priority: 1, // BEST priority
    homeCluster: false,
  },
  {
    host: 'host3.example.com',
    priority: 2,
    homeCluster: false,
  },
];
const result3B = filterFunction(test3B);
console.log('Result:', JSON.stringify(result3B, null, 2));
console.log(`Winner: priority ${result3B.priority} (homeCluster: ${result3B.homeCluster})\n`);

console.log('🔍 COMPARISON:');
console.log(`Test 3A winner: priority ${result3A.priority} (homeCluster: ${result3A.homeCluster})`);
console.log(`Test 3B winner: priority ${result3B.priority} (homeCluster: ${result3B.homeCluster})`);
console.log(
  `Same inputs, different order: ${
    result3A.priority === result3B.priority ? '✅ CONSISTENT' : '❌ ORDER DEPENDENT'
  }\n`
);

console.log('=== CONCLUSION ===');
console.log('Order dependency exists with positive priorities when:');
console.log('- homeCluster: true host has worse priority than homeCluster: false host');
console.log('- The reduce() function processes them in different orders');
console.log('- The || !previous.homeCluster condition creates unpredictable behavior');
