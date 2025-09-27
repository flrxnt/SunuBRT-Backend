export class DateUtil {
  /**
   * Add hours to a date
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Add minutes to a date
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Check if a date is expired (past current time)
   */
  static isExpired(date: Date): boolean {
    return new Date() > date;
  }

  /**
   * Check if a date is in the future
   */
  static isFuture(date: Date): boolean {
    return new Date() < date;
  }

  /**
   * Format date to ISO string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse ISO string to date
   */
  static fromISOString(isoString: string): Date {
    return new Date(isoString);
  }

  /**
   * Get the start of day for a given date
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get the end of day for a given date
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Calculate difference in minutes between two dates
   */
  static differenceInMinutes(dateLeft: Date, dateRight: Date): number {
    return Math.floor((dateLeft.getTime() - dateRight.getTime()) / (1000 * 60));
  }

  /**
   * Calculate difference in hours between two dates
   */
  static differenceInHours(dateLeft: Date, dateRight: Date): number {
    return Math.floor(this.differenceInMinutes(dateLeft, dateRight) / 60);
  }

  /**
   * Calculate difference in days between two dates
   */
  static differenceInDays(dateLeft: Date, dateRight: Date): number {
    return Math.floor(this.differenceInHours(dateLeft, dateRight) / 24);
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(dateLeft: Date, dateRight: Date): boolean {
    return (
      dateLeft.getFullYear() === dateRight.getFullYear() &&
      dateLeft.getMonth() === dateRight.getMonth() &&
      dateLeft.getDate() === dateRight.getDate()
    );
  }

  /**
   * Get current timestamp
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Convert date to UTC
   */
  static toUTC(date: Date): Date {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  }
}
