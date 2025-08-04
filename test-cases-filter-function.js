// Test cases for filterFunction
// Function: filteredHosts.reduce((previous, current) =>
//   previous.priority > current.priority || !previous.homeCluster ? current : previous, {})

const testCases = [
  // Case 1: Empty array
  {
    name: 'Empty array',
    input: [],
    description: 'Should return empty object when no hosts provided',
  },

  // Case 2: Single element cases
  {
    name: 'Single host with homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
    ],
    description: 'Should return the only host available',
  },
  {
    name: 'Single host with homeCluster false',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
    ],
    description: 'Should return the only host available even if homeCluster is false',
  },

  // Case 3: Two elements - priority comparison
  {
    name: 'Two hosts, different priorities, both homeCluster true',
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
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
    ],
    description: 'Should return host with lower priority number (higher actual priority)',
  },
  {
    name: 'Two hosts, different priorities, both homeCluster false',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
    ],
    description: "Should return host with lower priority number when homeCluster doesn't matter",
  },

  // Case 4: Two elements - homeCluster preference
  {
    name: 'Two hosts, same priority, one homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
    ],
    description: 'Should prefer homeCluster true when priorities are equal',
  },
  {
    name: 'Two hosts, homeCluster true has higher priority number',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 2,
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
    description: 'Should choose lower priority number over homeCluster preference',
  },

  // Case 5: Three elements - mixed scenarios
  {
    name: 'Three hosts, clear priority winner',
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
        priority: 1,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
    ],
    description: 'Should return host with priority 1 (highest actual priority)',
  },
  {
    name: 'Three hosts, homeCluster preference matters',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
    ],
    description: 'Should return first host with priority 3 and homeCluster true',
  },

  // Case 6: Four elements
  {
    name: 'Four hosts, complex priority and homeCluster mix',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 4,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: false,
      },
      {
        host: 'host4.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host4',
        homeCluster: false,
      },
    ],
    description: 'Should return host2 (priority 2 with homeCluster true)',
  },

  // Case 7: Five elements (maximum)
  {
    name: 'Five hosts, all different priorities',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 5,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: false,
      },
      {
        host: 'host4.example.com',
        ttl: -1,
        priority: 4,
        id: 'urn:TEAM:us-east-1:host4',
        homeCluster: true,
      },
      {
        host: 'host5.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host5',
        homeCluster: false,
      },
    ],
    description: 'Should return host3 (priority 1 - highest actual priority)',
  },
  {
    name: 'Five hosts, multiple same priorities with homeCluster variations',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
      {
        host: 'host4.example.com',
        ttl: -1,
        priority: 1,
        id: 'urn:TEAM:us-east-1:host4',
        homeCluster: false,
      },
      {
        host: 'host5.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host5',
        homeCluster: true,
      },
    ],
    description: 'Should return host4 (priority 1 wins over everything)',
  },

  // Edge cases
  {
    name: 'All hosts have same priority and homeCluster false',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: false,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: false,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 3,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: false,
      },
    ],
    description: 'Should return first host when all are equivalent',
  },
  {
    name: 'All hosts have same priority and homeCluster true',
    input: [
      {
        host: 'host1.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host1',
        homeCluster: true,
      },
      {
        host: 'host2.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host2',
        homeCluster: true,
      },
      {
        host: 'host3.example.com',
        ttl: -1,
        priority: 2,
        id: 'urn:TEAM:us-east-1:host3',
        homeCluster: true,
      },
    ],
    description: 'Should return first host when all are equivalent with homeCluster true',
  },
];

// Function to test
const filterFunction = (filteredHosts) => {
  return filteredHosts.reduce(
    (previous, current) =>
      previous.priority > current.priority || !previous.homeCluster ? current : previous,
    {}
  );
};

// Run tests
console.log('Running filter function tests...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  console.log('Input:', JSON.stringify(testCase.input, null, 2));

  try {
    const result = filterFunction(testCase.input);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('---'.repeat(20));
  console.log();
});

export {testCases, filterFunction};
