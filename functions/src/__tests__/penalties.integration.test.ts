/**
 * Integration tests for penalty calculation system
 * Tests the complete flow of violation tracking and penalty generation
 */

import { calculateMonthlyViolations } from '../services/penalties';
import { firestore } from '../utils/firestore';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Firestore
jest.mock('../utils/firestore', () => ({
  firestore: {
    collection: jest.fn(),
  },
  runTransaction: jest.fn((callback) => callback({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  })),
}));

jest.mock('../services/settings', () => ({
  getCompanySettings: jest.fn().mockResolvedValue({
    penaltyRules: {
      violationThresholds: {
        absent: 4,
        half_day_absent: 4,
        late: 4,
        early_leave: 4,
      },
      amounts: {
        absent: 20,
        half_day_absent: 15,
        late: 10,
        early_leave: 10,
      },
    },
  }),
}));

describe('Penalty System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMonthlyViolations', () => {
    it('should track absent violations from daily status', async () => {
      const mockAttendanceData = [
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-05')) },
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-10')) },
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-15')) },
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-20')) },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(1); // 4th violation triggers penalty
    });

    it('should track half_day_absent violations separately', async () => {
      const mockAttendanceData = [
        { userId: 'user1', status: 'half_day_absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-05')) },
        { userId: 'user1', status: 'half_day_absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-10')) },
        { userId: 'user1', status: 'half_day_absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-15')) },
        { userId: 'user1', status: 'half_day_absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-20')) },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(1);
    });

    it('should track late violations from check statuses', async () => {
      const mockAttendanceData = [
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-05')),
        },
        {
          userId: 'user1',
          status: 'present',
          check2_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-10')),
        },
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-15')),
        },
        {
          userId: 'user1',
          status: 'present',
          check2_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-20')),
        },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(1); // 4 late violations trigger penalty
    });

    it('should track early_leave violations from check3 status', async () => {
      const mockAttendanceData = [
        {
          userId: 'user1',
          status: 'present',
          check3_status: 'early_leave',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-05')),
        },
        {
          userId: 'user1',
          status: 'present',
          check3_status: 'early_leave',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-10')),
        },
        {
          userId: 'user1',
          status: 'present',
          check3_status: 'early_leave',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-15')),
        },
        {
          userId: 'user1',
          status: 'present',
          check3_status: 'early_leave',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-20')),
        },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(1);
    });

    it('should not trigger penalty if violations are below threshold', async () => {
      const mockAttendanceData = [
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-05')) },
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-10')) },
        { userId: 'user1', status: 'absent', attendanceDate: Timestamp.fromDate(new Date('2025-01-15')) },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(0); // Only 3 violations, threshold is 4
    });

    it('should track multiple violation types separately for same user', async () => {
      const mockAttendanceData = [
        {
          userId: 'user1',
          status: 'absent',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-05')),
        },
        {
          userId: 'user1',
          status: 'absent',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-06')),
        },
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-10')),
        },
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-11')),
        },
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-12')),
        },
        {
          userId: 'user1',
          status: 'present',
          check1_status: 'late',
          attendanceDate: Timestamp.fromDate(new Date('2025-01-13')),
        },
      ];

      const mockSnapshot = {
        docs: mockAttendanceData.map((data) => ({
          data: () => data,
        })),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      });

      const result = await calculateMonthlyViolations({ month: '2025-01' });

      expect(result.processed).toBe(1);
      expect(result.penaltiesCreated).toBe(1); // Only late violations hit threshold (4)
    });
  });
});
