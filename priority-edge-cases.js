// Demonstrating cases where higher priority numbers are returned over lower ones

const filterFunction = (filteredHosts) => {
  return filteredHosts.reduce(
    (previous, current) =>
      previous.priority > current.priority || !previous.homeCluster ? current : previous,
    {}
  );
};

console.log('=== CASES WHERE HIGHER PRIORITY NUMBERS WIN ===\n');

// Case 1: homeCluster preference overrides priority
console.log('Case 1: homeCluster preference overrides better priority');
const case1 = [
  {
    host: 'host1.example.com',
    priority: 1, // BEST priority
    homeCluster: false,
  },
  {
    host: 'host2.example.com',
    priority: 5, // WORSE priority
    homeCluster: true, // But has homeCluster!
  },
];

const result1 = filterFunction(case1);
console.log('Input:', JSON.stringify(case1, null, 2));
console.log('Result:', JSON.stringify(result1, null, 2));
console.log(
  `Winner: priority ${result1.priority} (${
    result1.homeCluster ? 'homeCluster' : 'not homeCluster'
  }) beats priority 1!\n`
);

// Case 2: Multiple hosts, homeCluster preference wins
console.log('Case 2: homeCluster wins over multiple better priorities');
const case2 = [
  {
    host: 'host1.example.com',
    priority: 1, // BEST priority
    homeCluster: false,
  },
  {
    host: 'host2.example.com',
    priority: 2, // SECOND BEST priority
    homeCluster: false,
  },
  {
    host: 'host3.example.com',
    priority: 4, // WORSE priority
    homeCluster: true, // But has homeCluster!
  },
];

const result2 = filterFunction(case2);
console.log('Input:', JSON.stringify(case2, null, 2));
console.log('Result:', JSON.stringify(result2, null, 2));
console.log(`Winner: priority ${result2.priority} (homeCluster) beats priorities 1 and 2!\n`);

// Case 3: From the test results - Test 8 unexpected behavior
console.log('Case 3: From Test 8 - Unexpected behavior');
const case3 = [
  {
    host: 'host1.example.com',
    priority: 5,
    homeCluster: true,
  },
  {
    host: 'host2.example.com',
    priority: 1, // BEST priority
    homeCluster: false,
  },
  {
    host: 'host3.example.com',
    priority: 3, // MIDDLE priority
    homeCluster: true,
  },
];

const result3 = filterFunction(case3);
console.log('Input:', JSON.stringify(case3, null, 2));
console.log('Result:', JSON.stringify(result3, null, 2));
console.log(`Winner: priority ${result3.priority} beats priority 1!\n`);

console.log('=== ANALYSIS ===');
console.log("The condition 'previous.priority > current.priority || !previous.homeCluster'");
console.log('means current wins if:');
console.log('1. current has lower priority number (better priority), OR');
console.log("2. previous doesn't have homeCluster (regardless of priority)");
console.log('\nThis means homeCluster hosts will ALWAYS beat non-homeCluster hosts,');
console.log('even if the non-homeCluster host has much better priority!');
