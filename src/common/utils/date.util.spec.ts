import { DateUtil } from './date.util';

describe('DateUtil', () => {
  const fixedDate = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addHours', () => {
    it('should add hours to a date', () => {
      const result = DateUtil.addHours(fixedDate, 2);
      expect(result.getHours()).toBe(14);
    });

    it('should handle negative hours', () => {
      const result = DateUtil.addHours(fixedDate, -2);
      expect(result.getHours()).toBe(10);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes to a date', () => {
      const result = DateUtil.addMinutes(fixedDate, 30);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle negative minutes', () => {
      const result = DateUtil.addMinutes(fixedDate, -30);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('addDays', () => {
    it('should add days to a date', () => {
      const result = DateUtil.addDays(fixedDate, 5);
      expect(result.getDate()).toBe(20);
    });

    it('should handle negative days', () => {
      const result = DateUtil.addDays(fixedDate, -5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('isExpired', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2024-01-14T12:00:00Z');
      expect(DateUtil.isExpired(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2024-01-16T12:00:00Z');
      expect(DateUtil.isExpired(futureDate)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2024-01-16T12:00:00Z');
      expect(DateUtil.isFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2024-01-14T12:00:00Z');
      expect(DateUtil.isFuture(pastDate)).toBe(false);
    });
  });

  describe('toISOString', () => {
    it('should convert date to ISO string', () => {
      const result = DateUtil.toISOString(fixedDate);
      expect(result).toBe('2024-01-15T12:00:00.000Z');
    });
  });

  describe('fromISOString', () => {
    it('should parse ISO string to date', () => {
      const isoString = '2024-01-15T12:00:00.000Z';
      const result = DateUtil.fromISOString(isoString);
      expect(result.getTime()).toBe(fixedDate.getTime());
    });
  });

  describe('startOfDay', () => {
    it('should return start of day', () => {
      const result = DateUtil.startOfDay(fixedDate);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('should return end of day', () => {
      const result = DateUtil.endOfDay(fixedDate);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('differenceInMinutes', () => {
    it('should calculate difference in minutes', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-15T12:30:00Z');
      const result = DateUtil.differenceInMinutes(date2, date1);
      expect(result).toBe(30);
    });

    it('should handle negative differences', () => {
      const date1 = new Date('2024-01-15T12:30:00Z');
      const date2 = new Date('2024-01-15T12:00:00Z');
      const result = DateUtil.differenceInMinutes(date2, date1);
      expect(result).toBe(-30);
    });
  });

  describe('differenceInHours', () => {
    it('should calculate difference in hours', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-15T15:00:00Z');
      const result = DateUtil.differenceInHours(date2, date1);
      expect(result).toBe(3);
    });
  });

  describe('differenceInDays', () => {
    it('should calculate difference in days', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-18T12:00:00Z');
      const result = DateUtil.differenceInDays(date2, date1);
      expect(result).toBe(3);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-01-15T08:00:00Z');
      const date2 = new Date('2024-01-15T20:00:00Z');
      expect(DateUtil.isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15T12:00:00Z');
      const date2 = new Date('2024-01-16T12:00:00Z');
      expect(DateUtil.isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('now', () => {
    it('should return current date', () => {
      const result = DateUtil.now();
      expect(result.getTime()).toBe(fixedDate.getTime());
    });
  });

  describe('toUTC', () => {
    it('should convert date to UTC', () => {
      const date = new Date('2024-01-15T12:00:00');
      const result = DateUtil.toUTC(date);
      expect(result).toBeInstanceOf(Date);
    });
  });
});
