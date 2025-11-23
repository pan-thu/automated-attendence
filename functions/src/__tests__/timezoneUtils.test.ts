import { jest } from '@jest/globals';
import { toZonedTime } from 'date-fns-tz';

// Mock the settings module
jest.mock('../services/settings', () => ({
  getCompanySettings: jest.fn(),
}));

describe('Timezone Utilities', () => {
  let timezoneUtils: any;
  let mockGetCompanySettings: jest.Mock;

  beforeEach(async () => {
    // Clear module cache to ensure fresh imports
    jest.resetModules();

    // Import after resetting modules
    const settingsModule = await import('../services/settings');
    mockGetCompanySettings = settingsModule.getCompanySettings as jest.Mock;

    timezoneUtils = await import('../utils/timezoneUtils');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEffectiveTimezone', () => {
    it('should return company timezone when configured', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'America/New_York',
      });

      const timezone = await timezoneUtils.getEffectiveTimezone();
      expect(timezone).toBe('America/New_York');
    });

    it('should return default timezone when not configured', async () => {
      mockGetCompanySettings.mockResolvedValue({});

      const timezone = await timezoneUtils.getEffectiveTimezone();
      expect(timezone).toBe('Asia/Kolkata');
    });

    it('should return default timezone when settings fetch fails', async () => {
      mockGetCompanySettings.mockRejectedValue(new Error('Failed to fetch'));

      const timezone = await timezoneUtils.getEffectiveTimezone();
      expect(timezone).toBe('Asia/Kolkata');
    });

    it('should return default timezone when timezone is empty string', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: '  ',
      });

      const timezone = await timezoneUtils.getEffectiveTimezone();
      expect(timezone).toBe('Asia/Kolkata');
    });
  });

  describe('getNotificationSlotForTime', () => {
    beforeEach(() => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });
    });

    it('should return check1 slot for morning time (8:30 AM IST)', async () => {
      // 8:30 AM IST = 3:00 AM UTC
      const utcDate = new Date('2024-01-15T03:00:00Z');
      const slot = await timezoneUtils.getNotificationSlotForTime(utcDate);

      expect(slot).toEqual({
        slot: 'check1',
        label: 'morning',
      });
    });

    it('should return check2 slot for midday time (1:30 PM IST)', async () => {
      // 1:30 PM IST = 8:00 AM UTC
      const utcDate = new Date('2024-01-15T08:00:00Z');
      const slot = await timezoneUtils.getNotificationSlotForTime(utcDate);

      expect(slot).toEqual({
        slot: 'check2',
        label: 'midday',
      });
    });

    it('should return check3 slot for evening time (5:30 PM IST)', async () => {
      // 5:30 PM IST = 12:00 PM UTC
      const utcDate = new Date('2024-01-15T12:00:00Z');
      const slot = await timezoneUtils.getNotificationSlotForTime(utcDate);

      expect(slot).toEqual({
        slot: 'check3',
        label: 'evening',
      });
    });

    it('should return null for non-notification times', async () => {
      // 10:00 AM IST = 4:30 AM UTC
      const utcDate = new Date('2024-01-15T04:30:00Z');
      const slot = await timezoneUtils.getNotificationSlotForTime(utcDate);

      expect(slot).toBeNull();
    });

    it('should handle different timezones correctly', async () => {
      // Test with New York timezone (EST/EDT)
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'America/New_York',
      });

      // 8:30 AM EST = 1:30 PM UTC
      const utcDate = new Date('2024-01-15T13:30:00Z');
      const slot = await timezoneUtils.getNotificationSlotForTime(utcDate);

      expect(slot).toEqual({
        slot: 'check1',
        label: 'morning',
      });
    });
  });

  describe('getCompanyTimezoneDateKey', () => {
    it('should return correct date key for IST timezone', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      // 11:30 PM UTC on Jan 14 = 5:00 AM IST on Jan 15
      const utcDate = new Date('2024-01-14T23:30:00Z');
      const dateKey = await timezoneUtils.getCompanyTimezoneDateKey(utcDate);

      expect(dateKey).toBe('2024-01-15');
    });

    it('should return correct date key for Pacific timezone', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'America/Los_Angeles',
      });

      // 2:00 AM UTC on Jan 15 = 6:00 PM PST on Jan 14
      const utcDate = new Date('2024-01-15T02:00:00Z');
      const dateKey = await timezoneUtils.getCompanyTimezoneDateKey(utcDate);

      expect(dateKey).toBe('2024-01-14');
    });
  });

  describe('convertToCompanyTimezone', () => {
    it('should convert UTC to company timezone correctly', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      const utcDate = new Date('2024-01-15T00:00:00Z');
      const companyDate = await timezoneUtils.convertToCompanyTimezone(utcDate);

      // 00:00 UTC = 05:30 IST
      const expectedDate = toZonedTime(utcDate, 'Asia/Kolkata');
      expect(companyDate.getHours()).toBe(expectedDate.getHours());
      expect(companyDate.getMinutes()).toBe(expectedDate.getMinutes());
    });

    it('should use provided timezone over settings', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      const utcDate = new Date('2024-01-15T00:00:00Z');
      const companyDate = await timezoneUtils.convertToCompanyTimezone(
        utcDate,
        'America/New_York'
      );

      // 00:00 UTC = 19:00 EST (previous day)
      const expectedDate = toZonedTime(utcDate, 'America/New_York');
      expect(companyDate.getHours()).toBe(expectedDate.getHours());
    });
  });

  describe('isCompanyTimezoneHour', () => {
    it('should correctly identify matching hours', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      // 3:00 AM UTC = 8:30 AM IST
      const utcDate = new Date('2024-01-15T03:00:00Z');
      const isEightAM = await timezoneUtils.isCompanyTimezoneHour(utcDate, 8);

      expect(isEightAM).toBe(true);
    });

    it('should correctly identify non-matching hours', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      // 3:00 AM UTC = 8:30 AM IST
      const utcDate = new Date('2024-01-15T03:00:00Z');
      const isNineAM = await timezoneUtils.isCompanyTimezoneHour(utcDate, 9);

      expect(isNineAM).toBe(false);
    });
  });

  describe('formatInCompanyTimezone', () => {
    it('should format date correctly in company timezone', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      const utcDate = new Date('2024-01-15T18:30:00Z');
      const formatted = await timezoneUtils.formatInCompanyTimezone(
        utcDate,
        'yyyy-MM-dd HH:mm:ss'
      );

      // 18:30 UTC = 00:00 IST (next day)
      expect(formatted).toBe('2024-01-16 00:00:00');
    });

    it('should handle month formatting correctly', async () => {
      mockGetCompanySettings.mockResolvedValue({
        timezone: 'Asia/Kolkata',
      });

      const utcDate = new Date('2024-01-31T20:00:00Z');
      const formatted = await timezoneUtils.formatInCompanyTimezone(
        utcDate,
        'yyyy-MM'
      );

      // 20:00 UTC on Jan 31 = 01:30 IST on Feb 1
      expect(formatted).toBe('2024-02');
    });
  });
});