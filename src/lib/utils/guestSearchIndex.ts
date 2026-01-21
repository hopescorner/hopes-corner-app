/**
 * Pre-computes searchable tokens and provides O(1) index lookups
 */

// Type definitions - minimal interface for search functionality
export interface SearchGuest {
  id: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  name?: string;
}

export interface NameParts {
  firstName: string;
  lastName: string;
  preferredName: string;
  firstTokens: string[];
  lastTokens: string[];
  prefTokens: string[];
  allTokens: string[];
  initials: string[];
  fullName: string;
  fullNameNoSpaces: string;
  preferredNameNoSpaces: string;
  searchableText: string;
}

export interface IndexEntry<T extends SearchGuest = SearchGuest> {
  guest: T;
  parts: NameParts;
}

export interface SearchIndex<T extends SearchGuest = SearchGuest> {
  byId: Map<string, IndexEntry<T>>;
  byFirstChar: Map<string, IndexEntry<T>[]>;
  byInitials: Map<string, IndexEntry<T>[]>;
  guests: T[];
}

// Memoization cache for extracted name parts
const namePartsCache = new Map<string, NameParts>();
const MAX_CACHE_SIZE = 5000;

/**
 * Clear the name parts cache (useful for testing)
 */
export const clearNamePartsCache = (): void => {
  namePartsCache.clear();
};

/**
 * Extract and cache name parts for a guest
 * @param firstName
 * @param lastName
 * @param preferredName
 * @returns Cached name parts
 */
export const getCachedNameParts = (firstName = '', lastName = '', preferredName = ''): NameParts => {
  const cacheKey = `${firstName}|${lastName}|${preferredName}`;

  if (namePartsCache.has(cacheKey)) {
    return namePartsCache.get(cacheKey)!;
  }

  // Evict oldest entries if cache is full
  if (namePartsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = namePartsCache.keys().next().value;
    if (firstKey) {
      namePartsCache.delete(firstKey);
    }
  }

  const firstNorm = (firstName || '').trim().toLowerCase();
  const lastNorm = (lastName || '').trim().toLowerCase();
  const prefNorm = (preferredName || '').trim().toLowerCase();

  // Split names into tokens (handles middle names)
  const firstTokens = firstNorm.split(/\s+/).filter(Boolean);
  const lastTokens = lastNorm.split(/\s+/).filter(Boolean);
  const prefTokens = prefNorm.split(/\s+/).filter(Boolean);

  // All searchable tokens
  const allTokens = [...new Set([...firstTokens, ...lastTokens, ...prefTokens])];

  // Generate initials (e.g., "John Michael Smith" -> "jms", "js")
  const initials = new Set<string>();

  // First + Last initials
  if (firstTokens[0] && lastTokens[0]) {
    initials.add(firstTokens[0][0] + lastTokens[0][0]);
  }

  // All first name tokens + last name initial
  if (firstTokens.length > 0 && lastTokens[0]) {
    const allFirstInitials = firstTokens.map(t => t[0]).join('');
    initials.add(allFirstInitials + lastTokens[0][0]);
  }

  // Full initials from all tokens
  if (allTokens.length >= 2) {
    initials.add(allTokens.map(t => t[0]).join(''));
  }

  // Preferred name initials
  if (prefTokens.length >= 2) {
    initials.add(prefTokens.map(t => t[0]).join(''));
  }

  const result = {
    firstName: firstNorm,
    lastName: lastNorm,
    preferredName: prefNorm,
    firstTokens,
    lastTokens,
    prefTokens,
    allTokens,
    initials: Array.from(initials),
    fullName: `${firstNorm} ${lastNorm}`.trim(),
    fullNameNoSpaces: `${firstNorm}${lastNorm}`.replace(/\s+/g, ''),
    preferredNameNoSpaces: prefNorm.replace(/\s+/g, ''),
    searchableText: [...allTokens, prefNorm].filter(Boolean).join(' '),
  };

  namePartsCache.set(cacheKey, result);
  return result;
};

/**
 * Create a search index for a list of guests
 * This pre-computes all searchable data for faster lookups
/**
 * Create a search index for a list of guests
 * This pre-computes all searchable data for faster lookups
 * @param guests - Array of guest objects
 * @returns Search index with lookup structures
 */
export const createSearchIndex = <T extends SearchGuest>(guests: T[]): SearchIndex<T> => {
  if (!guests || guests.length === 0) {
    return {
      byId: new Map(),
      byFirstChar: new Map(),
      byInitials: new Map(),
      guests: [],
    };
  }

  const byId = new Map<string, IndexEntry<T>>();
  const byFirstChar = new Map<string, IndexEntry<T>[]>();
  const byInitials = new Map<string, IndexEntry<T>[]>();

  for (const guest of guests) {
    const parts = getCachedNameParts(
      guest.firstName,
      guest.lastName,
      guest.preferredName
    );

    const indexEntry: IndexEntry<T> = {
      guest,
      parts,
    };

    byId.set(guest.id, indexEntry);

    // Index by first character of each token
    for (const token of parts.allTokens) {
      if (token.length > 0) {
        const firstChar = token[0];
        if (!byFirstChar.has(firstChar)) {
          byFirstChar.set(firstChar, []);
        }
        byFirstChar.get(firstChar)!.push(indexEntry);
      }
    }

    // Index by initials
    for (const initial of parts.initials) {
      if (!byInitials.has(initial)) {
        byInitials.set(initial, []);
      }
      byInitials.get(initial)!.push(indexEntry);
    }
  }

  return {
    byId,
    byFirstChar,
    byInitials,
    guests,
  };
};

/**
 * Score how well a query matches a guest's name parts
 * Lower score = better match, 99 = no match
 * @param query - Normalized search query
 * @param parts - Pre-computed name parts
 * @returns Match score
 */
export const scoreMatch = (query: string, parts: NameParts): number => {
  const { allTokens, fullName, preferredName, initials } = parts;
  const queryTokens = query.split(/\s+/).filter((t: string) => t.length > 0);

  if (queryTokens.length === 0) return 99;

  // Check initials match first (very fast)
  const queryNoSpaces = query.replace(/\s+/g, '');
  if (queryNoSpaces.length >= 2 && queryNoSpaces.length <= 5) {
    if (initials.includes(queryNoSpaces)) {
      return -2; // Best possible match - exact initials
    }
    // Partial initials match
    if (initials.some(i => i.startsWith(queryNoSpaces))) {
      return -1;
    }
  }

  // Exact full name match
  if (fullName === query) return -1;
  if (preferredName && preferredName === query) return -1;

  // Space-insensitive full name match (e.g., "wen xing gao" matching "wenxing gao")
  const fullNameNoSpaces = parts.fullNameNoSpaces;
  const prefNameNoSpaces = parts.preferredNameNoSpaces;
  if (queryNoSpaces === fullNameNoSpaces) return -1;
  if (prefNameNoSpaces && queryNoSpaces === prefNameNoSpaces) return -1;

  // Single token search
  if (queryTokens.length === 1) {
    const token = queryTokens[0];

    // Exact token match
    if (allTokens.includes(token)) return 0;
    if (preferredName === token) return 0;

    // Prefix match on any token
    if (allTokens.some(t => t.startsWith(token))) return 1;
    if (preferredName && preferredName.startsWith(token)) return 1;

    // Contains match (min 3 chars for substring)
    if (token.length >= 3) {
      if (allTokens.some(t => t.includes(token))) return 2;
      if (preferredName && preferredName.includes(token)) return 2;
    }

    return 99;
  }

  // Multi-token search
  const queryStr = queryTokens.join(' ');

  // Exact sequential match
  if (fullName.startsWith(queryStr)) return 0;
  if (preferredName && preferredName.startsWith(queryStr)) return 0;

  // Check if query tokens match name tokens in sequence
  for (let i = 0; i <= allTokens.length - queryTokens.length; i++) {
    const window = allTokens.slice(i, i + queryTokens.length);
    const windowStr = window.join(' ');

    if (windowStr === queryStr) return 0;
    if (windowStr.startsWith(queryStr)) return 1;

    // Check prefix match for each token pair
    const allPrefixMatch = queryTokens.every((qt, idx) =>
      window[idx] && window[idx].startsWith(qt)
    );
    if (allPrefixMatch) return 1;
  }

  // Check if all query tokens match name tokens in any order
  const allTokensMatch = queryTokens.every(qt =>
    allTokens.some(nt => nt === qt || nt.startsWith(qt))
  );
  if (allTokensMatch) return 1;

  // Substring in full name
  if (fullName.includes(queryStr)) return 3;
  if (preferredName && preferredName.includes(queryStr)) return 3;

  return 99;
};

interface SearchOptions {
  maxResults?: number;
  earlyTerminationThreshold?: number;
}

/**
 * Fast search using pre-built index
 * @param query - Search query
 * @param index - Search index from createSearchIndex
 * @param options - Search options
 * @returns Matching guests sorted by relevance
 */
export const searchWithIndex = <T extends SearchGuest>(query: string, index: SearchIndex<T>, options: SearchOptions = {}): T[] => {
  const {
    maxResults = 100,
    earlyTerminationThreshold = 20, // Stop searching after this many exact matches
  } = options;

  if (!query || !index || !index.guests) return [];

  const queryNorm = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!queryNorm) return [];

  const queryTokens = queryNorm.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return [];

  // For initials-only queries, use the initials index
  const queryNoSpaces = queryNorm.replace(/\s+/g, '');
  if (queryNoSpaces.length >= 2 && queryNoSpaces.length <= 4 && /^[a-z]+$/.test(queryNoSpaces)) {
    const initialsMatches = index.byInitials.get(queryNoSpaces);
    if (initialsMatches && initialsMatches.length > 0) {
      // Return initials matches directly
      const scored = initialsMatches.map(entry => ({
        guest: entry.guest,
        score: -2,
      }));
      return scored
        .sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          const aName = a.guest.preferredName || a.guest.name || '';
          const bName = b.guest.preferredName || b.guest.name || '';
          return aName.localeCompare(bName);
        })
        .slice(0, maxResults)
        .map(s => s.guest);
    }
  }

  // Get candidate entries based on first character of first query token
  const firstChar = queryTokens[0][0];
  let candidates: IndexEntry<T>[];

  if (index.byFirstChar.has(firstChar)) {
    candidates = index.byFirstChar.get(firstChar) || [];
  } else {
    // Fallback: search all guests
    candidates = Array.from(index.byId.values());
  }

  // Score and filter candidates
  const scored = [];
  let exactMatchCount = 0;

  for (const entry of candidates) {
    const score = scoreMatch(queryNorm, entry.parts);

    if (score < 99) {
      scored.push({
        guest: entry.guest,
        score,
      });

      // Track exact/near-exact matches for early termination
      if (score <= 1) {
        exactMatchCount++;
        if (exactMatchCount >= earlyTerminationThreshold && scored.length >= maxResults) {
          break;
        }
      }
    }
  }

  // If we didn't find matches with first char optimization, search all
  if (scored.length === 0 && candidates !== Array.from(index.byId.values())) {
    for (const entry of index.byId.values()) {
      const score = scoreMatch(queryNorm, entry.parts);
      if (score < 99) {
        scored.push({
          guest: entry.guest,
          score,
        });
      }
    }
  }

  // Sort by score, then alphabetically
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const aName = a.guest.preferredName || a.guest.name || '';
    const bName = b.guest.preferredName || b.guest.name || '';
    return aName.localeCompare(bName);
  });

  // Deduplicate and limit results
  const seen = new Set();
  const results = [];

  for (const item of scored) {
    if (!seen.has(item.guest.id)) {
      seen.add(item.guest.id);
      results.push(item.guest);
      if (results.length >= maxResults) break;
    }
  }

  return results;
};

export default {
  createSearchIndex,
  searchWithIndex,
  scoreMatch,
  getCachedNameParts,
  clearNamePartsCache,
};
