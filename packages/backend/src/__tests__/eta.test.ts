import { describe, it, expect } from 'vitest';
import { calculateETA, haversineDistance, formatETA, calculateBearing } from '../services/etaService';

describe('ETA Service', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between Mumbai and Delhi (~1150km straight line)', () => {
      const dist = haversineDistance(19.0760, 72.8777, 28.6139, 77.2090);
      expect(dist).toBeGreaterThan(1100);
      expect(dist).toBeLessThan(1200);
    });

    it('should return ~0 for same coordinates', () => {
      const dist = haversineDistance(19.0760, 72.8777, 19.0760, 72.8777);
      expect(dist).toBeLessThan(0.001);
    });

    it('should calculate short urban distance correctly', () => {
      // ~1.1 km in Andheri area
      const dist = haversineDistance(19.1197, 72.8464, 19.1100, 72.8520);
      expect(dist).toBeGreaterThan(0.5);
      expect(dist).toBeLessThan(2);
    });
  });

  describe('calculateETA', () => {
    it('should return valid ETA result', () => {
      const eta = calculateETA(19.1197, 72.8464, 19.0607, 72.8700);
      expect(eta.distanceKm).toBeGreaterThan(0);
      expect(eta.minutes).toBeGreaterThan(0);
      expect(new Date(eta.arrivalTime).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return minimum 1 minute for very close points', () => {
      const eta = calculateETA(19.1197, 72.8464, 19.1198, 72.8465);
      expect(eta.minutes).toBeGreaterThanOrEqual(1);
    });

    it('should factor in higher speed for faster ETA', () => {
      const slowETA = calculateETA(19.0, 72.8, 19.1, 72.9, 20);
      const fastETA = calculateETA(19.0, 72.8, 19.1, 72.9, 60);
      expect(slowETA.minutes).toBeGreaterThan(fastETA.minutes);
    });

    it('should apply road factor (road > straight line)', () => {
      const straightLine = haversineDistance(19.0, 72.8, 19.1, 72.9);
      const eta = calculateETA(19.0, 72.8, 19.1, 72.9);
      // Road distance should be ~30% more
      expect(eta.distanceKm).toBeGreaterThan(straightLine);
    });
  });

  describe('formatETA', () => {
    it('should return "Arriving now" for <= 2 minutes', () => {
      const eta = { distanceKm: 0.2, minutes: 1, arrivalTime: new Date().toISOString() };
      expect(formatETA(eta)).toBe('Arriving now');
    });

    it('should return "X min" for <= 10 minutes', () => {
      const eta = { distanceKm: 1, minutes: 8, arrivalTime: new Date().toISOString() };
      expect(formatETA(eta)).toBe('8 min');
    });

    it('should return time format for > 10 minutes', () => {
      const futureTime = new Date(Date.now() + 20 * 60 * 1000);
      const eta = { distanceKm: 5, minutes: 20, arrivalTime: futureTime.toISOString() };
      const result = formatETA(eta);
      expect(result).toMatch(/\d+:\d+ [AP]M/);
    });
  });

  describe('calculateBearing', () => {
    it('should return 0 degrees for due north', () => {
      // Moving north (increasing latitude, same longitude)
      const bearing = calculateBearing(19.0, 72.8, 20.0, 72.8);
      expect(bearing).toBe(0);
    });

    it('should return ~90 degrees for due east', () => {
      // Moving east (same latitude, increasing longitude)
      const bearing = calculateBearing(19.0, 72.0, 19.0, 73.0);
      expect(bearing).toBeGreaterThan(85);
      expect(bearing).toBeLessThan(95);
    });

    it('should return a value between 0 and 360', () => {
      const bearing = calculateBearing(19.0, 72.8, 28.6, 77.2);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });
});
