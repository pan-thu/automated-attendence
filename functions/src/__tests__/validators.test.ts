import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  assertTimestampRange,
  assertLatitude,
  assertLongitude,
  assertGeoPoint,
  assertNumber,
  assertTimestamp,
  assertString,
  assertEmail,
} from '../utils/validators';

// Initialize Firebase Admin for testing
if (!admin.apps.length) {
  admin.initializeApp();
}

describe('Validator Tests', () => {
  describe('assertTimestampRange', () => {
    it('should throw if start is null', () => {
      const end = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange(null, end, 'dateRange');
      }).toThrow('dateRange startDate is required');
    });

    it('should throw if end is null', () => {
      const start = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange(start, null, 'dateRange');
      }).toThrow('dateRange endDate is required');
    });

    it('should throw if start is undefined', () => {
      const end = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange(undefined, end, 'dateRange');
      }).toThrow('dateRange startDate is required');
    });

    it('should throw if end is undefined', () => {
      const start = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange(start, undefined, 'dateRange');
      }).toThrow('dateRange endDate is required');
    });

    it('should throw if start is not a Timestamp', () => {
      const end = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange('not a timestamp', end, 'dateRange');
      }).toThrow('dateRange must contain Firestore Timestamps');
    });

    it('should throw if end is not a Timestamp', () => {
      const start = admin.firestore.Timestamp.now();
      expect(() => {
        assertTimestampRange(start, 'not a timestamp', 'dateRange');
      }).toThrow('dateRange must contain Firestore Timestamps');
    });

    it('should throw if start >= end', () => {
      const now = admin.firestore.Timestamp.now();
      const earlier = admin.firestore.Timestamp.fromMillis(now.toMillis() - 10000);

      expect(() => {
        assertTimestampRange(now, earlier, 'dateRange');
      }).toThrow('dateRange start must be before end');
    });

    it('should throw if start === end', () => {
      const now = admin.firestore.Timestamp.now();

      expect(() => {
        assertTimestampRange(now, now, 'dateRange');
      }).toThrow('dateRange start must be before end');
    });

    it('should return valid timestamp range when start < end', () => {
      const now = admin.firestore.Timestamp.now();
      const later = admin.firestore.Timestamp.fromMillis(now.toMillis() + 10000);

      const result = assertTimestampRange(now, later, 'dateRange');

      expect(result.startDate).toBe(now);
      expect(result.endDate).toBe(later);
    });
  });

  describe('assertTimestamp', () => {
    it('should throw if value is null', () => {
      expect(() => {
        assertTimestamp(null, 'timestamp');
      }).toThrow('timestamp is required');
    });

    it('should throw if value is undefined', () => {
      expect(() => {
        assertTimestamp(undefined, 'timestamp');
      }).toThrow('timestamp is required');
    });

    it('should throw if value is not a Timestamp', () => {
      expect(() => {
        assertTimestamp('not a timestamp', 'timestamp');
      }).toThrow('timestamp must be a Firestore Timestamp');
    });

    it('should return valid Timestamp', () => {
      const now = admin.firestore.Timestamp.now();
      const result = assertTimestamp(now, 'timestamp');
      expect(result).toBe(now);
    });
  });

  describe('assertLatitude', () => {
    it('should accept valid latitude 0', () => {
      expect(assertLatitude(0)).toBe(0);
    });

    it('should accept valid latitude 45.5', () => {
      expect(assertLatitude(45.5)).toBe(45.5);
    });

    it('should accept valid latitude -45.5', () => {
      expect(assertLatitude(-45.5)).toBe(-45.5);
    });

    it('should accept valid latitude 90', () => {
      expect(assertLatitude(90)).toBe(90);
    });

    it('should accept valid latitude -90', () => {
      expect(assertLatitude(-90)).toBe(-90);
    });

    it('should reject latitude > 90', () => {
      expect(() => assertLatitude(91)).toThrow('latitude must be at most 90');
    });

    it('should reject latitude < -90', () => {
      expect(() => assertLatitude(-91)).toThrow('latitude must be at least -90');
    });

    it('should reject null latitude', () => {
      expect(() => assertLatitude(null)).toThrow('latitude is required');
    });

    it('should reject undefined latitude', () => {
      expect(() => assertLatitude(undefined)).toThrow('latitude is required');
    });

    it('should reject non-numeric latitude', () => {
      expect(() => assertLatitude('not a number')).toThrow('latitude must be a valid number');
    });
  });

  describe('assertLongitude', () => {
    it('should accept valid longitude 0', () => {
      expect(assertLongitude(0)).toBe(0);
    });

    it('should accept valid longitude 120.5', () => {
      expect(assertLongitude(120.5)).toBe(120.5);
    });

    it('should accept valid longitude -120.5', () => {
      expect(assertLongitude(-120.5)).toBe(-120.5);
    });

    it('should accept valid longitude 180', () => {
      expect(assertLongitude(180)).toBe(180);
    });

    it('should accept valid longitude -180', () => {
      expect(assertLongitude(-180)).toBe(-180);
    });

    it('should reject longitude > 180', () => {
      expect(() => assertLongitude(181)).toThrow('longitude must be at most 180');
    });

    it('should reject longitude < -180', () => {
      expect(() => assertLongitude(-181)).toThrow('longitude must be at least -180');
    });

    it('should reject null longitude', () => {
      expect(() => assertLongitude(null)).toThrow('longitude is required');
    });

    it('should reject undefined longitude', () => {
      expect(() => assertLongitude(undefined)).toThrow('longitude is required');
    });

    it('should reject non-numeric longitude', () => {
      expect(() => assertLongitude('not a number')).toThrow('longitude must be a valid number');
    });
  });

  describe('assertGeoPoint', () => {
    it('should create valid GeoPoint from valid coordinates', () => {
      const geoPoint = assertGeoPoint(45.5, 120.3);
      expect(geoPoint).toBeInstanceOf(admin.firestore.GeoPoint);
      expect(geoPoint.latitude).toBe(45.5);
      expect(geoPoint.longitude).toBe(120.3);
    });

    it('should reject invalid latitude in GeoPoint', () => {
      expect(() => assertGeoPoint(91, 120)).toThrow('latitude must be at most 90');
    });

    it('should reject invalid longitude in GeoPoint', () => {
      expect(() => assertGeoPoint(45, 181)).toThrow('longitude must be at most 180');
    });

    it('should reject null latitude', () => {
      expect(() => assertGeoPoint(null, 120)).toThrow('latitude is required');
    });

    it('should reject null longitude', () => {
      expect(() => assertGeoPoint(45, null)).toThrow('longitude is required');
    });
  });

  describe('assertNumber', () => {
    it('should accept valid positive number', () => {
      expect(assertNumber(42, 'number')).toBe(42);
    });

    it('should accept valid negative number', () => {
      expect(assertNumber(-42, 'number')).toBe(-42);
    });

    it('should accept zero', () => {
      expect(assertNumber(0, 'number')).toBe(0);
    });

    it('should accept decimal number', () => {
      expect(assertNumber(3.14, 'number')).toBe(3.14);
    });

    it('should enforce minimum value', () => {
      expect(() => assertNumber(5, 'number', 10)).toThrow('number must be at least 10');
    });

    it('should accept value at minimum', () => {
      expect(assertNumber(10, 'number', 10)).toBe(10);
    });

    it('should enforce maximum value', () => {
      expect(() => assertNumber(15, 'number', 0, 10)).toThrow('number must be at most 10');
    });

    it('should accept value at maximum', () => {
      expect(assertNumber(10, 'number', 0, 10)).toBe(10);
    });

    it('should reject null', () => {
      expect(() => assertNumber(null, 'number')).toThrow('number is required');
    });

    it('should reject undefined', () => {
      expect(() => assertNumber(undefined, 'number')).toThrow('number is required');
    });

    it('should reject NaN string', () => {
      expect(() => assertNumber('not a number', 'number')).toThrow('number must be a valid number');
    });
  });

  describe('assertString', () => {
    it('should accept valid string', () => {
      expect(assertString('hello', 'text')).toBe('hello');
    });

    it('should trim whitespace', () => {
      expect(assertString('  hello  ', 'text')).toBe('hello');
    });

    it('should enforce minimum length', () => {
      expect(() => assertString('hi', 'text', { min: 5 })).toThrow('text must be at least 5 characters');
    });

    it('should enforce maximum length', () => {
      expect(() => assertString('hello world', 'text', { max: 5 })).toThrow('text must be at most 5 characters');
    });

    it('should enforce pattern match', () => {
      expect(() => assertString('abc123', 'text', { pattern: /^[a-z]+$/ })).toThrow('text is invalid');
    });

    it('should accept pattern match', () => {
      expect(assertString('abc', 'text', { pattern: /^[a-z]+$/ })).toBe('abc');
    });

    it('should reject null when required', () => {
      expect(() => assertString(null, 'text')).toThrow('text is required');
    });

    it('should return empty string for null when optional', () => {
      expect(assertString(null, 'text', { optional: true })).toBe('');
    });

    it('should reject non-string value', () => {
      expect(() => assertString(123, 'text')).toThrow('text must be a string');
    });
  });

  describe('assertEmail', () => {
    it('should accept valid email', () => {
      expect(assertEmail('user@example.com')).toBe('user@example.com');
    });

    it('should normalize email to lowercase', () => {
      expect(assertEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace from email', () => {
      expect(assertEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should accept email with plus sign', () => {
      expect(assertEmail('user+tag@example.com')).toBe('user+tag@example.com');
    });

    it('should accept email with subdomain', () => {
      expect(assertEmail('user@mail.example.com')).toBe('user@mail.example.com');
    });

    it('should reject invalid email format', () => {
      expect(() => assertEmail('not-an-email')).toThrow('email is invalid');
    });

    it('should reject email without @', () => {
      expect(() => assertEmail('userexample.com')).toThrow('email is invalid');
    });

    it('should reject email without domain', () => {
      expect(() => assertEmail('user@')).toThrow('email is invalid');
    });

    it('should reject email too short', () => {
      expect(() => assertEmail('a@b')).toThrow('email must be at least 5 characters');
    });
  });
});
