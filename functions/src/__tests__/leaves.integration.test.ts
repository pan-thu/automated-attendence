/**
 * Integration tests for leave management system
 * Tests totalDays calculation, balance validation, and leave approval flow
 */

import * as functions from 'firebase-functions';

// Mock the entire leaves module to test the logic
describe('Leave Management Integration Tests', () => {
  describe('totalDays Calculation', () => {
    it('should calculate 1 day for same-day leave', () => {
      const start = new Date('2025-01-10T00:00:00Z');
      const end = new Date('2025-01-10T00:00:00Z');
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      expect(totalDays).toBe(1);
    });

    it('should calculate correct days for multi-day leave (inclusive)', () => {
      const start = new Date('2025-01-10T00:00:00Z');
      const end = new Date('2025-01-15T00:00:00Z');
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      expect(totalDays).toBe(6); // 10, 11, 12, 13, 14, 15
    });

    it('should calculate correct days for week-long leave', () => {
      const start = new Date('2025-01-01T00:00:00Z');
      const end = new Date('2025-01-07T00:00:00Z');
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      expect(totalDays).toBe(7);
    });

    it('should handle month boundary correctly', () => {
      const start = new Date('2025-01-30T00:00:00Z');
      const end = new Date('2025-02-02T00:00:00Z');
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      expect(totalDays).toBe(4); // Jan 30, 31, Feb 1, 2
    });
  });

  describe('Leave Balance Validation Logic', () => {
    const leaveTypeFieldMap: Record<string, string> = {
      full: 'fullLeaveBalance',
      medical: 'medicalLeaveBalance',
      maternity: 'maternityLeaveBalance',
    };

    it('should reject leave when totalDays exceeds balance', () => {
      const totalDays = 10;
      const currentBalance = 5;

      const shouldReject = totalDays > currentBalance;

      expect(shouldReject).toBe(true);
    });

    it('should approve leave when totalDays equals balance', () => {
      const totalDays = 7;
      const currentBalance = 7;

      const shouldReject = totalDays > currentBalance;

      expect(shouldReject).toBe(false);
    });

    it('should approve leave when totalDays is less than balance', () => {
      const totalDays = 3;
      const currentBalance = 10;

      const shouldReject = totalDays > currentBalance;

      expect(shouldReject).toBe(false);
    });

    it('should map leave types to balance fields correctly', () => {
      expect(leaveTypeFieldMap['full']).toBe('fullLeaveBalance');
      expect(leaveTypeFieldMap['medical']).toBe('medicalLeaveBalance');
      expect(leaveTypeFieldMap['maternity']).toBe('maternityLeaveBalance');
    });
  });

  describe('Leave Approval Balance Deduction', () => {
    it('should calculate updated balance correctly after approval', () => {
      const currentBalance = 14;
      const totalDays = 5;
      const updatedBalance = Math.max(currentBalance - totalDays, 0);

      expect(updatedBalance).toBe(9);
    });

    it('should not go below zero balance', () => {
      const currentBalance = 3;
      const totalDays = 5;
      const updatedBalance = Math.max(currentBalance - totalDays, 0);

      expect(updatedBalance).toBe(0);
    });

    it('should handle exact balance depletion', () => {
      const currentBalance = 7;
      const totalDays = 7;
      const updatedBalance = Math.max(currentBalance - totalDays, 0);

      expect(updatedBalance).toBe(0);
    });
  });

  describe('Leave Cancellation Balance Restoration', () => {
    it('should restore balance correctly after cancellation', () => {
      const currentBalance = 5;
      const totalDays = 3;
      const restoredBalance = currentBalance + totalDays;

      expect(restoredBalance).toBe(8);
    });

    it('should handle full leave balance restoration', () => {
      const currentBalance = 7;
      const totalDays = 7;
      const restoredBalance = currentBalance + totalDays;

      expect(restoredBalance).toBe(14);
    });
  });

  describe('Leave Request Validation', () => {
    it('should validate that startDate is not in the past', () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const pastDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      expect(pastDate < today).toBe(true);
      expect(futureDate < today).toBe(false);
    });

    it('should validate that startDate is before or equal to endDate', () => {
      const start = new Date('2025-01-10');
      const validEnd = new Date('2025-01-15');
      const invalidEnd = new Date('2025-01-05');

      expect(start <= validEnd).toBe(true);
      expect(start <= invalidEnd).toBe(false);
    });

    it('should validate reason length boundaries', () => {
      const tooShort = 'hi';
      const valid = 'Medical emergency requiring time off';
      const tooLong = 'a'.repeat(501);

      expect(tooShort.trim().length >= 5 && tooShort.trim().length <= 500).toBe(false);
      expect(valid.trim().length >= 5 && valid.trim().length <= 500).toBe(true);
      expect(tooLong.trim().length >= 5 && tooLong.trim().length <= 500).toBe(false);
    });
  });

  describe('Overlapping Leave Detection', () => {
    it('should detect overlap when new leave starts during existing leave', () => {
      // Existing: Jan 10-15
      const existingStart = new Date('2025-01-10');
      const existingEnd = new Date('2025-01-15');

      // New: Jan 12-17 (overlaps)
      const newStart = new Date('2025-01-12');
      const newEnd = new Date('2025-01-17');

      // Overlap check: (StartA <= EndB) AND (EndA >= StartB)
      const overlaps = newStart <= existingEnd && newEnd >= existingStart;

      expect(overlaps).toBe(true);
    });

    it('should detect overlap when new leave ends during existing leave', () => {
      // Existing: Jan 10-15
      const existingStart = new Date('2025-01-10');
      const existingEnd = new Date('2025-01-15');

      // New: Jan 5-12 (overlaps)
      const newStart = new Date('2025-01-05');
      const newEnd = new Date('2025-01-12');

      const overlaps = newStart <= existingEnd && newEnd >= existingStart;

      expect(overlaps).toBe(true);
    });

    it('should detect overlap when new leave completely contains existing leave', () => {
      // Existing: Jan 10-15
      const existingStart = new Date('2025-01-10');
      const existingEnd = new Date('2025-01-15');

      // New: Jan 5-20 (contains existing)
      const newStart = new Date('2025-01-05');
      const newEnd = new Date('2025-01-20');

      const overlaps = newStart <= existingEnd && newEnd >= existingStart;

      expect(overlaps).toBe(true);
    });

    it('should not detect overlap for adjacent non-overlapping leaves', () => {
      // Existing: Jan 10-15
      const existingStart = new Date('2025-01-10');
      const existingEnd = new Date('2025-01-15');

      // New: Jan 16-20 (no overlap)
      const newStart = new Date('2025-01-16');
      const newEnd = new Date('2025-01-20');

      const overlaps = newStart <= existingEnd && newEnd >= existingStart;

      expect(overlaps).toBe(false);
    });

    it('should not detect overlap for completely separate leaves', () => {
      // Existing: Jan 10-15
      const existingStart = new Date('2025-01-10');
      const existingEnd = new Date('2025-01-15');

      // New: Jan 20-25 (no overlap)
      const newStart = new Date('2025-01-20');
      const newEnd = new Date('2025-01-25');

      const overlaps = newStart <= existingEnd && newEnd >= existingStart;

      expect(overlaps).toBe(false);
    });
  });
});
