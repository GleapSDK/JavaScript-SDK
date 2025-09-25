export const checkPageFilter = (currentUrl, pageFilter, pageFilterType) => {
  // If any parameter is missing, consider the filter passed.
  if (!currentUrl || !pageFilter || !pageFilterType) {
    return true;
  }

  // Helper to remove trailing slashes.
  const removeTrailingSlash = (url) => url.replace(/\/$/, "");

  // Generates a regex from a match string by replacing dynamic segments (e.g., {id}).
  const generateRegex = (match) => {
    if (!match) return null;
    try {
        // Replace dynamic patterns {anything} with a placeholder first
        var dynamicPattern = /{\w+}/g;
        var regexPattern = match.replace(dynamicPattern, '___PLACEHOLDER___');
        
        // Escape special regex characters in the URL pattern
        regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Replace our placeholder with the actual regex pattern
        regexPattern = regexPattern.replace(/___PLACEHOLDER___/g, '[^&?]+');
        var pattern = new RegExp('^' + regexPattern + '$', 'i');
        return pattern;
    } catch (e) {
      return null;
    }
  };

  // Checks if the provided URL matches the given match string.
  const isMatchingUrl = (url, match) => {
    if (!url || !match) return false;
    try {
      // First, a simple substring check.
      if (url.includes(match)) {
        return true;
      }
    } catch (e) {
      // Continue to regex matching.
    }
    const regex = generateRegex(match);
    if (!regex) return false;
    try {
      return regex.test(url);
    } catch (e) {
      return false;
    }
  };

  let matched = false;

  // Check matching based on the provided pageFilterType.
  switch (pageFilterType) {
    case "is":
      matched =
        removeTrailingSlash(currentUrl) === removeTrailingSlash(pageFilter);
      break;
    case "isnot":
      matched = removeTrailingSlash(currentUrl) !== removeTrailingSlash(pageFilter);
      break;
    case "contains":
      matched = isMatchingUrl(currentUrl, pageFilter);
      break;
    case "startswith":
      matched = currentUrl.startsWith(pageFilter);
      break;
    case "endswith":
      matched = currentUrl.endsWith(pageFilter);
      break;
    case "notcontains":
      matched = !isMatchingUrl(currentUrl, pageFilter);
      break;
    default:
      matched = false;
  }

  return matched;
};
