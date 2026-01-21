/**
 * Flexible name search utility for guests with middle names
 * Handles cases where middle names may be part of firstName field
 * 
 * Use pre-computed search index for O(1) lookups
 */

import { createSearchIndex, searchWithIndex, getCachedNameParts, SearchIndex, SearchGuest } from './guestSearchIndex';

// Cache for the search index with content-aware invalidation
// Using 'any' for the cache to support different guest types
let cachedIndex: SearchIndex<any> | null = null;
let cachedGuestsRef: any[] | null = null;
let cachedGuestCount = 0;
let cachedGuestIdSet = new Set<string>();

/**
 * Get or create the search index for a guests list
 * Uses both reference equality and content-based comparison to detect when guests array changes
 * This prevents stale cache issues when guests are added/modified but array reference doesn't change
 * @param guests - Array of guest objects
 * @returns Search index
 */
const getSearchIndex = <T extends SearchGuest>(guests: T[]): SearchIndex<T> => {
  // Quick check: if reference is the same AND guest count matches, likely still valid
  const currentGuestCount = guests.length;
  const isSameRef = cachedGuestsRef === guests;
  const isSameCount = cachedGuestCount === currentGuestCount;

  // If reference and count are the same, check if guest IDs match (content validation)
  if (isSameRef && isSameCount && cachedIndex) {
    // Build current ID set for comparison
    const currentIdSet = new Set(guests.map(g => g.id));

    // Check if all cached IDs are still present
    let allIdsMatch = currentIdSet.size === cachedGuestIdSet.size;
    if (allIdsMatch) {
      for (const id of cachedGuestIdSet) {
        if (!currentIdSet.has(id)) {
          allIdsMatch = false;
          break;
        }
      }
    }

    // If IDs match, cache is still valid
    if (allIdsMatch) {
      return cachedIndex as SearchIndex<T>;
    }

    // IDs don't match - cache is stale, rebuild below
    console.log('[Search Index] Cache invalidated: guest ID mismatch detected');
  }

  // Create new index
  console.log('[Search Index] Building new search index for', currentGuestCount, 'guests');
  cachedIndex = createSearchIndex(guests);
  cachedGuestsRef = guests;
  cachedGuestCount = currentGuestCount;
  cachedGuestIdSet = new Set(guests.map(g => g.id));

  return cachedIndex as SearchIndex<T>;
};

/**
 * Clear the search index cache (useful for testing)
 */
export const clearSearchIndexCache = (): void => {
  cachedIndex = null;
  cachedGuestsRef = null;
};

/**
 * Extract and normalize all name parts including potential middle names
 * Splits firstName if it contains spaces (indicating middle names)
 * @param {string} firstName - First name (may contain middle names)
 * @param {string} lastName - Last name
 * @returns {Object} Object with normalized name parts and tokens
 */
export const extractNameParts = (firstName = "", lastName = "") => {
  // Use optimized cached version
  const cached = getCachedNameParts(firstName, lastName, "");

  return {
    firstName: cached.firstName,
    lastName: cached.lastName,
    firstNameParts: cached.firstTokens,
    allTokens: cached.allTokens,
    fullName: cached.fullName,
    fullNameNoSpaces: cached.fullNameNoSpaces,
  };
};

interface ExtractedNameParts {
  firstName: string;
  lastName: string;
  firstNameParts: string[];
  allTokens: string[];
  fullName: string;
  fullNameNoSpaces: string;
}

/**
 * Check if a search query matches any combination of name parts
 * @param query - Normalized search query
 * @param nameParts - Result from extractNameParts
 * @returns Rank score (lower is better match, 99 = no match)
 */
export const scoreNameMatch = (query: string, nameParts: ExtractedNameParts): number => {
  const { allTokens, fullName } = nameParts;
  const queryTokens = query.split(/\s+/).filter((t: string) => t.length > 0);

  if (queryTokens.length === 0) return 99;

  // Exact full name match
  if (fullName === query) return -1;

  // Space-insensitive full name match
  const queryNoSpaces = query.replace(/\s+/g, '');
  if (nameParts.fullNameNoSpaces === queryNoSpaces) return -1;

  // Single token searches
  if (queryTokens.length === 1) {
    const token = queryTokens[0];

    // Exact match with any single name part
    if (allTokens.some((part) => part === token)) return 0;

    // Start with any name part
    if (allTokens.some((part) => part.startsWith(token))) return 1;

    // Contains substring in any name part (minimum 3 chars)
    if (
      token.length >= 3 &&
      allTokens.some((part) => part.includes(token))
    ) {
      return 2;
    }
  }

  // Multiple token searches - check all combinations
  if (queryTokens.length >= 2) {
    const queryStr = queryTokens.join(" ");

    // Check if any combination of sequential tokens matches query tokens
    for (let i = 0; i <= allTokens.length - queryTokens.length; i++) {
      const tokenWindow = allTokens.slice(i, i + queryTokens.length);
      const windowStr = tokenWindow.join(" ");

      // Exact match of sequential tokens
      if (windowStr === queryStr) return 0;

      // Starting match of sequential tokens
      if (windowStr.startsWith(queryStr)) return 1;

      // Substring match (minimum 3 chars for each token)
      if (
        queryTokens.every((t) => t.length >= 3) &&
        tokenWindow.every((part) => part !== "") &&
        queryTokens.every((qt, idx) => tokenWindow[idx].includes(qt))
      ) {
        return 2;
      }
    }

    // Check if all query tokens match name tokens in any order (exact matches)
    // This allows "Qwin Qi" to match "Qi Qwin Chen"
    const queryTokenSet = new Set(queryTokens);
    const allTokenSet = new Set(allTokens);
    const exactMatches = [...queryTokenSet].filter(qt => allTokenSet.has(qt));
    if (exactMatches.length === queryTokens.length) {
      return 0; // All query tokens exactly match name parts (any order)
    }

    // Check if all query tokens start with name tokens in any order
    // This allows partial matches like "Qw Q" to match "Qi Qwin Chen"
    const allQueryTokensMatch = queryTokens.every(qt =>
      allTokens.some(nt => nt.startsWith(qt))
    );
    if (allQueryTokensMatch) {
      return 1; // All query tokens prefix-match name parts (any order)
    }

    // Check for partial prefix matches on individual tokens (non-sequential)
    // This allows "Xio H" to match firstName: "Xio Gua", lastName: "H"
    // even though they're not sequential
    let allTokensMatch = true;
    let lastFoundIndex = -1;
    for (const qt of queryTokens) {
      let found = false;
      for (let i = lastFoundIndex + 1; i < allTokens.length; i++) {
        if (allTokens[i].startsWith(qt)) {
          found = true;
          lastFoundIndex = i;
          break;
        }
      }
      if (!found) {
        allTokensMatch = false;
        break;
      }
    }
    if (allTokensMatch) return 1;

    // Check if query tokens match in any order (loose match)
    // This allows "Yuan Ping" to match "Ping Xing Yuan"
    const fullQueryStr = queryStr.replace(/\s+/g, "");
    const fullTokenStr = allTokens.join(" ").replace(/\s+/g, "");

    if (fullTokenStr.includes(fullQueryStr)) {
      return 3;
    }

    // Check for partial matches in full name
    if (fullName.includes(queryStr)) {
      return 3;
    }
  }

  return 99; // No match
};

/**
 * Filter and rank guests by flexible name search
 * Use pre-computed search index for fast lookups
 * 
 * @param searchQuery - Raw search query
/**
 * Filter and rank guests by flexible name search
 * Use pre-computed search index for fast lookups
 * 
 * @param searchQuery - Raw search query
 * @param guests - Array of guest objects
 * @returns Sorted array of guests matching the query (deduplicated)
 */
export const flexibleNameSearch = <T extends SearchGuest>(searchQuery: string, guests: T[]): T[] => {
  const queryRaw = searchQuery.trim();
  if (!queryRaw) return [];
  if (!guests || guests.length === 0) return [];

  const query = queryRaw.toLowerCase().replace(/\s+/g, " ");
  const queryTokens = query.split(" ").filter((t: string) => t.length > 0);

  if (queryTokens.length === 0) return [];

  // Use optimized index-based search for larger guest lists
  if (guests.length >= 50) {
    const index = getSearchIndex(guests);
    return searchWithIndex(queryRaw, index, {
      maxResults: 100,
      earlyTerminationThreshold: 20,
    });
  }

  // For smaller lists, use the original algorithm (simpler, no index overhead)
  const guestMap = new Map<string, T>();

  const scored = guests
    .map((guest: T) => {
      const nameParts = extractNameParts(guest.firstName, guest.lastName);
      const preferredName = (guest.preferredName || "").trim().toLowerCase();

      let rank = 99;
      let label: string = guest.preferredName || guest.name || nameParts.fullName || "Unknown";

      // Check preferred name first (highest priority)
      if (preferredName) {
        if (preferredName === query) {
          rank = -1;
          label = guest.preferredName || label;
        } else if (preferredName.startsWith(query)) {
          rank = Math.min(rank, 0);
          label = guest.preferredName || label;
        } else if (query.length >= 3 && preferredName.includes(query)) {
          rank = Math.min(rank, 1);
          label = guest.preferredName || label;
        }
      }

      // Check firstName + lastName combination
      const nameScore = scoreNameMatch(query, nameParts);
      if (nameScore < rank) {
        rank = nameScore;
        label = guest.name || nameParts.fullName;
      }

      return {
        guest,
        rank,
        label,
        score: nameScore,
      };
    })
    .filter((item) => item.rank < 99)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.label.localeCompare(b.label);
    });

  // Deduplicate: keep only the first occurrence of each guest by ID
  for (const item of scored) {
    if (!guestMap.has(item.guest.id)) {
      guestMap.set(item.guest.id, item.guest);
    }
  }

  return Array.from(guestMap.values());
};

/**
 * Get all searchable name tokens for a guest
 * Useful for debugging and understanding what parts are searchable
 * @param guest - Guest object
 * @returns Array of searchable tokens
 */
export const getSearchableTokens = (guest: SearchGuest): string[] => {
  const nameParts = extractNameParts(guest.firstName, guest.lastName);
  const tokens = new Set([
    ...nameParts.allTokens,
    guest.preferredName?.toLowerCase().trim(),
  ]);
  return Array.from(tokens).filter((t): t is string => typeof t === 'string' && t.length > 0);
};
