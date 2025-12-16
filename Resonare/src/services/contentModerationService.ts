/**
 * Content Moderation Service
 * 
 * Provides basic profanity filtering and content moderation for user-generated content.
 * This service can be extended to use more sophisticated filtering libraries like 'bad-words'.
 * 
 * To install a more comprehensive filter:
 * npm install bad-words
 * 
 * Then uncomment the bad-words import and modify the filterProfanity method.
 */


import { Filter } from 'bad-words';
const filter = new Filter();

/**
 * Basic list of words to filter (minimal list for demonstration)
 * In production, you should use a comprehensive library like 'bad-words'
 */
const BLOCKED_WORDS: string[] = [
  // This is a minimal placeholder list
  // The actual filtering should be done with a proper profanity library
];

/**
 * Characters that are commonly used to evade filters
 */
const EVASION_MAP: Record<string, string[]> = {
  'a': ['@', '4'],
  'e': ['3'],
  'i': ['1', '!'],
  'o': ['0'],
  's': ['$', '5'],
  't': ['7'],
};

interface ModerationResult {
  isClean: boolean;
  filteredText: string;
  flaggedWords: string[];
  reason?: string;
}

class ContentModerationService {
  /**
   * Check if text contains potentially objectionable content
   */
  checkContent(text: string): ModerationResult {
    if (!text || text.trim().length === 0) {
      return {
        isClean: true,
        filteredText: text,
        flaggedWords: [],
      };
    }

    const normalizedText = this.normalizeText(text);
    const flaggedWords: string[] = [];

    // Check against blocked words
    for (const word of BLOCKED_WORDS) {
      if (normalizedText.toLowerCase().includes(word.toLowerCase())) {
        flaggedWords.push(word);
      }
    }

    // If using bad-words library, uncomment this:
     if (filter.isProfane(text)) {
       return {
         isClean: false,
         filteredText: filter.clean(text),
         flaggedWords: ['[filtered]'],
         reason: 'Contains profanity or objectionable content',
       };
     }

    return {
      isClean: flaggedWords.length === 0,
      filteredText: flaggedWords.length > 0 ? this.filterText(text, flaggedWords) : text,
      flaggedWords,
      reason: flaggedWords.length > 0 ? 'Contains potentially objectionable words' : undefined,
    };
  }

  /**
   * Filter profanity from text
   */
  filterProfanity(text: string): string {
    if (!text) return text;

    // Using bad-words library for profanity filtering
    return filter.clean(text);
  }

  /**
   * Check if text is clean (no profanity)
   */
  isClean(text: string): boolean {
    return this.checkContent(text).isClean;
  }

  /**
   * Normalize text by replacing common evasion characters
   */
  private normalizeText(text: string): string {
    let normalized = text.toLowerCase();
    
    for (const [letter, replacements] of Object.entries(EVASION_MAP)) {
      for (const replacement of replacements) {
        normalized = normalized.replace(new RegExp('\\' + replacement, 'g'), letter);
      }
    }
    
    return normalized;
  }

  /**
   * Replace flagged words with asterisks
   */
  private filterText(text: string, flaggedWords: string[]): string {
    let filtered = text;
    for (const word of flaggedWords) {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
    return filtered;
  }

  /**
   * Validate username (no profanity, proper format)
   */
  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username || username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' };
    }

    if (username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }

    if (username.length > 30) {
      return { isValid: false, error: 'Username must be less than 30 characters' };
    }

    // Only allow alphanumeric, underscores, and periods
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and periods' };
    }

    const contentCheck = this.checkContent(username);
    if (!contentCheck.isClean) {
      return { isValid: false, error: 'Username contains inappropriate content' };
    }

    return { isValid: true };
  }

  /**
   * Validate bio (length and content check)
   */
  validateBio(bio: string): { isValid: boolean; error?: string; filteredBio?: string } {
    if (!bio || bio.trim().length === 0) {
      return { isValid: true }; // Bio is optional
    }

    if (bio.length > 500) {
      return { isValid: false, error: 'Bio must be less than 500 characters' };
    }

    const contentCheck = this.checkContent(bio);
    if (!contentCheck.isClean) {
      return { 
        isValid: false, 
        error: 'Bio contains inappropriate content',
        filteredBio: contentCheck.filteredText,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate review text (length and content check)
   */
  validateReview(review: string): { isValid: boolean; error?: string; filteredReview?: string } {
    if (!review || review.trim().length === 0) {
      return { isValid: true }; // Review text is optional
    }

    if (review.length > 2000) {
      return { isValid: false, error: 'Review must be less than 2000 characters' };
    }

    const contentCheck = this.checkContent(review);
    if (!contentCheck.isClean) {
      return { 
        isValid: false, 
        error: 'Review contains inappropriate content',
        filteredReview: contentCheck.filteredText,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate diary entry notes (length and content check)
   */
  validateDiaryNotes(notes: string): { isValid: boolean; error?: string; filteredNotes?: string } {
    if (!notes || notes.trim().length === 0) {
      return { isValid: true }; // Notes are optional
    }

    if (notes.length > 1000) {
      return { isValid: false, error: 'Notes must be less than 1000 characters' };
    }

    const contentCheck = this.checkContent(notes);
    if (!contentCheck.isClean) {
      return { 
        isValid: false, 
        error: 'Notes contain inappropriate content',
        filteredNotes: contentCheck.filteredText,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate comment text (length and content check)
   */
  validateComment(comment: string): { isValid: boolean; error?: string; filteredComment?: string } {
    if (!comment || comment.trim().length === 0) {
      return { isValid: false, error: 'Comment cannot be empty' };
    }

    if (comment.length > 280) {
      return { isValid: false, error: 'Comment must be less than 280 characters' };
    }

    const contentCheck = this.checkContent(comment);
    if (!contentCheck.isClean) {
      return { 
        isValid: false, 
        error: 'Comment contains inappropriate content',
        filteredComment: contentCheck.filteredText,
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();
