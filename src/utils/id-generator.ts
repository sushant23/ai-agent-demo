// ID Generation utility

export class IdGenerator {
  private static counter = 0;

  /**
   * Generates a unique ID with timestamp and counter
   */
  static generate(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.counter).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${timestamp}-${counter}-${random}`;
  }

  /**
   * Generates a recommendation-specific ID
   */
  static generateRecommendationId(): string {
    return `rec_${this.generate()}`;
  }

  /**
   * Generates a UUID-like string (not cryptographically secure)
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}