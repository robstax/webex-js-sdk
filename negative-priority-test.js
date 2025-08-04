// Test cases for filterFunction with priority = -1
// Function: filteredHosts.reduce((previous, current) =>
//   previous.priority > current.priority || !previous.homeCluster ? current : previous, {})

const filterFunction = (filteredHosts) => {
  return filteredHosts.reduce(
    (previous, current) =>
      previous.priority > current.priority || !previous.homeCluster ? current : previous,
    {}
  );
};

const negativeTestCases = [
  // Case 1: Single host with priority -1
  {
    name: 'Single host with priority -1 and homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
    ],
    description: 'Should return the only host with priority -1',
  },
  {
    name: 'Single host with priority -1 and homeCluster false',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
    ],
    description: 'Should return the only host with priority -1 even if homeCluster is false',
  },

  // Case 2: Priority -1 vs positive priorities
  {
    name: 'Priority -1 vs priority 1, both homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
    ],
    description: 'Priority -1 should win over priority 1 when both have homeCluster true',
  },
  {
    name: 'Priority -1 vs priority 1, both homeCluster false',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
    ],
    description: 'Priority -1 should win over priority 1 when both have homeCluster false',
  },

  // Case 3: Priority -1 with homeCluster false vs higher priority with homeCluster true
  {
    name: 'Priority -1 (homeCluster false) vs priority 5 (homeCluster true)',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
    ],
    description: 'Test if priority -1 can overcome homeCluster preference',
  },
  {
    name: 'Priority 5 (homeCluster true) vs priority -1 (homeCluster false) - order reversed',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
    ],
    description: 'Test if order matters when priority -1 competes with homeCluster',
  },

  // Case 4: Multiple negative priorities
  {
    name: 'Multiple negative priorities',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: -5,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: -10,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
    ],
    description: 'Priority -10 should win (lowest number = highest priority)',
  },

  // Case 5: Mix of negative and positive priorities
  {
    name: 'Mix of negative and positive priorities, all homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
    ],
    description: 'Priority -1 should win over all positive priorities',
  },

  // Case 6: Complex scenario with negative priorities and homeCluster variations
  {
    name: 'Complex: negative priorities with homeCluster variations',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -2,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
      {
        host: 'host4.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host4',
        homeCluster: true,
      },
    ],
    description: 'Priority -2 vs -1 with homeCluster true - should prefer -2',
  },

  // Case 7: Edge case - priority 0
  {
    name: 'Priority 0 vs priority -1',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 0,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: -1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
    ],
    description: 'Priority -1 should win over priority 0',
  },
];

// Run tests
console.log('=== TESTING FILTER FUNCTION WITH PRIORITY -1 ===\n');

negativeTestCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  console.log('Input:', JSON.stringify(testCase.input, null, 2));

  try {
    const result = filterFunction(testCase.input);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Analysis
    if (result.priority !== undefined) {
      console.log(
        `Winner: Host with priority ${result.priority} and homeCluster ${result.homeCluster}`
      );
    }
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('---'.repeat(25));
  console.log();
});

// Special analysis for edge cases
console.log('=== ANALYSIS OF NEGATIVE PRIORITY BEHAVIOR ===');
console.log('With negative priorities:');
console.log("1. -1 is 'higher priority' than any positive number");
console.log("2. -10 is 'higher priority' than -1");
console.log('3. The homeCluster preference should still apply');
console.log('4. But priority comparison should work correctly with negatives');

export {negativeTestCases, filterFunction};
