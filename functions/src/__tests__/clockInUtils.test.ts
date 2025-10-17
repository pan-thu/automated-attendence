import { determineCheckOutcome, computeDailyStatus } from '../services/clockInUtils';

describe('determineCheckOutcome', () => {
  const window = {
    label: 'Test Window',
    start: '09:00',
    end: '09:30',
  };
  const graceMinutes = 15;

  describe('Check1 and Check2 (Morning/Lunch) - Late Arrival Detection', () => {
    it('should return null if clock-in is before window start', () => {
      const result = determineCheckOutcome('2025-01-01T08:45:00Z', 'check1', window, graceMinutes);
      expect(result).toBeNull();
    });

    it('should return on_time if clock-in is within window', () => {
      const result = determineCheckOutcome('2025-01-01T09:15:00Z', 'check1', window, graceMinutes);
      expect(result).toEqual({
        slot: 'check1',
        status: 'on_time',
      });
    });

    it('should return late if clock-in is within grace period after window end', () => {
      const result = determineCheckOutcome('2025-01-01T09:40:00Z', 'check2', window, graceMinutes);
      expect(result).toEqual({
        slot: 'check2',
        status: 'late',
        lateByMinutes: 10,
      });
    });

    it('should return null if clock-in is after grace period', () => {
      const result = determineCheckOutcome('2025-01-01T09:50:00Z', 'check1', window, graceMinutes);
      expect(result).toBeNull();
    });
  });

  describe('Check3 (Evening) - Early Leave Detection', () => {
    const check3Window = {
      label: 'Evening Check-Out',
      start: '17:00',
      end: '17:30',
    };

    it('should return null if check-out is too early (before grace period)', () => {
      const result = determineCheckOutcome('2025-01-01T16:30:00Z', 'check3', check3Window, graceMinutes);
      expect(result).toBeNull();
    });

    it('should return early_leave if check-out is within early grace period', () => {
      const result = determineCheckOutcome('2025-01-01T16:50:00Z', 'check3', check3Window, graceMinutes);
      expect(result).toEqual({
        slot: 'check3',
        status: 'early_leave',
        lateByMinutes: 10,
      });
    });

    it('should return on_time if check-out is within normal window', () => {
      const result = determineCheckOutcome('2025-01-01T17:15:00Z', 'check3', check3Window, graceMinutes);
      expect(result).toEqual({
        slot: 'check3',
        status: 'on_time',
      });
    });

    it('should return late if check-out is after window end but within late grace', () => {
      const result = determineCheckOutcome('2025-01-01T17:40:00Z', 'check3', check3Window, graceMinutes);
      expect(result).toEqual({
        slot: 'check3',
        status: 'late',
        lateByMinutes: 10,
      });
    });

    it('should return null if check-out is too late (after grace period)', () => {
      const result = determineCheckOutcome('2025-01-01T18:00:00Z', 'check3', check3Window, graceMinutes);
      expect(result).toBeNull();
    });
  });

  describe('Boundary Cases', () => {
    it('should handle exact window start time as on_time', () => {
      const result = determineCheckOutcome('2025-01-01T09:00:00Z', 'check1', window, graceMinutes);
      expect(result).toEqual({
        slot: 'check1',
        status: 'on_time',
      });
    });

    it('should handle exact window end time as on_time', () => {
      const result = determineCheckOutcome('2025-01-01T09:30:00Z', 'check2', window, graceMinutes);
      expect(result).toEqual({
        slot: 'check2',
        status: 'on_time',
      });
    });

    it('should handle exact grace period boundary as late', () => {
      const result = determineCheckOutcome('2025-01-01T09:45:00Z', 'check1', window, graceMinutes);
      expect(result).toEqual({
        slot: 'check1',
        status: 'late',
        lateByMinutes: 15,
      });
    });
  });
});

describe('computeDailyStatus', () => {
  it('should return absent when no checks completed', () => {
    const result = computeDailyStatus({});
    expect(result).toBe('absent');
  });

  it('should return absent when only 1 check completed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
    });
    expect(result).toBe('absent');
  });

  it('should return half_day_absent when exactly 2 checks completed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
      check2: 'late',
    });
    expect(result).toBe('half_day_absent');
  });

  it('should return present when all 3 checks completed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
      check2: 'on_time',
      check3: 'on_time',
    });
    expect(result).toBe('present');
  });

  it('should not count missed checks as completed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
      check2: 'missed',
      check3: 'on_time',
    });
    expect(result).toBe('half_day_absent');
  });

  it('should count late checks as completed', () => {
    const result = computeDailyStatus({
      check1: 'late',
      check2: 'late',
      check3: 'late',
    });
    expect(result).toBe('present');
  });

  it('should count early_leave as completed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
      check2: 'on_time',
      check3: 'early_leave',
    });
    expect(result).toBe('present');
  });

  it('should return in_progress when only 1 check with 2 missed', () => {
    const result = computeDailyStatus({
      check1: 'on_time',
      check2: 'missed',
      check3: 'missed',
    });
    expect(result).toBe('in_progress');
  });
});
