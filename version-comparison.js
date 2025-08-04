/**
 * Compares two version strings in format "x.y.z-next.n"
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} - Negative if version1 < version2, 0 if equal, positive if version1 > version2
 */
function compareVersions(version1, version2) {
  const parseVersion = (version) => {
    const [semverPart, nextPart] = version.split('-next.');
    const [major, minor, patch] = semverPart.split('.').map(Number);
    const nextNumber = parseInt(nextPart, 10);

    return {major, minor, patch, nextNumber};
  };

  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  // Compare semantic version parts first
  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }

  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }

  if (v1.patch !== v2.patch) {
    return v1.patch - v2.patch;
  }

  // If semantic versions are equal, compare the next number
  return v1.nextNumber - v2.nextNumber;
}

/**
 * Determines if a version string is greater than the reference version "3.8.1-next.10"
 * @param {string} versionString - Version string in format "prefix/x.y.z-next.n"
 * @returns {boolean} - True if the version is greater than "3.8.1-next.10"
 */
function isVersionGreaterThan(versionString) {
  const referenceVersion = '3.8.1-next.10';

  // Extract version part after the slash
  const versionPart = versionString.split('/')[1];

  if (!versionPart) {
    throw new Error('Invalid version string format');
  }

  return compareVersions(versionPart, referenceVersion) > 0;
}

export {isVersionGreaterThan, compareVersions};
