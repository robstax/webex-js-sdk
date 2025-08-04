// Summary of negative priority behavior findings

console.log('=== NEGATIVE PRIORITY TEST RESULTS ANALYSIS ===\n');

console.log('✅ EXPECTED BEHAVIOR (Working Correctly):');
console.log('1. Priority -1 beats positive priorities (1, 3, 5) when homeCluster status is equal');
console.log('2. Priority -10 beats priority -1 (more negative = higher priority)');
console.log('3. Priority -1 beats priority 0');
console.log('4. Basic priority comparison works correctly with negatives\n');

console.log('🚨 UNEXPECTED BEHAVIOR (Potential Issues):');
console.log('1. TEST 5: Priority 5 (homeCluster: true) beats priority -1 (homeCluster: false)');
console.log('   - This means homeCluster preference can override even the BEST possible priority!');
console.log('   - Priority -1 should theoretically be the highest priority possible');

console.log('\n2. TEST 6: Order dependency revealed!');
console.log('   - Same inputs as Test 5 but reversed order');
console.log('   - Result: Priority -1 (homeCluster: false) wins!');
console.log('   - This shows the function behavior depends on array order');

console.log('\n3. TEST 9: homeCluster preference overrides better negative priority');
console.log('   - Priority -2 (homeCluster: false) loses to priority -1 (homeCluster: true)');
console.log('   - Even though -2 is mathematically better priority than -1\n');

console.log('=== CRITICAL ISSUES IDENTIFIED ===');
console.log('1. **homeCluster Preference Too Strong**: homeCluster: true can beat ANY priority');
console.log('2. **Order Dependency**: Results change based on array order (Tests 5 vs 6)');
console.log('3. **Inconsistent Logic**: The || operator creates unpredictable behavior\n');

console.log('=== THE ROOT PROBLEM ===');
console.log('The condition: previous.priority > current.priority || !previous.homeCluster');
console.log('Creates this logic:');
console.log('- If previous.homeCluster is false, ALWAYS replace with current');
console.log('- This means any homeCluster: true host will beat any homeCluster: false host');
console.log('- Even if the homeCluster: false host has priority -1000!\n');

console.log('=== SPECIFIC EDGE CASES WITH PRIORITY -1 ===');
console.log('❌ Priority -1 (homeCluster: false) can LOSE to priority 5 (homeCluster: true)');
console.log('❌ Priority -1 (homeCluster: false) can LOSE to priority 1000 (homeCluster: true)');
console.log('❌ Results depend on whether priority -1 host comes first or second in array');
console.log('✅ Priority -1 (homeCluster: true) will beat any other host');
console.log('✅ Priority -1 beats other negative priorities (-5, -10) when homeCluster equal\n');

console.log('=== RECOMMENDED FIXES ===');
console.log('1. **Priority First**: Always respect priority, use homeCluster only as tiebreaker');
console.log('2. **Threshold Based**: Allow homeCluster to override only within priority threshold');
console.log('3. **Explicit Logic**: Separate priority comparison from homeCluster preference');

// Example of better logic
console.log('\n=== EXAMPLE BETTER LOGIC ===');
console.log('// Option 1: Priority always wins');
console.log('if (current.priority < previous.priority) return current;');
console.log('if (current.priority > previous.priority) return previous;');
console.log('// Only use homeCluster for equal priorities');
console.log('return current.homeCluster && !previous.homeCluster ? current : previous;');

console.log('\n// Option 2: Threshold-based homeCluster preference');
console.log('const priorityDiff = Math.abs(current.priority - previous.priority);');
console.log('if (priorityDiff > THRESHOLD) {');
console.log('  return current.priority < previous.priority ? current : previous;');
console.log('} else {');
console.log('  // Within threshold, prefer homeCluster');
console.log('  return current.homeCluster && !previous.homeCluster ? current : previous;');
console.log('}');
