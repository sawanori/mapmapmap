import { describe, it, expect } from 'vitest';
import { getDistanceFromLatLonInKm } from './geo';

describe('getDistanceFromLatLonInKm', () => {
  it('should return 0 for the same point', () => {
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6812, 139.7671);
    expect(distance).toBe(0);
  });

  it('should calculate distance between Tokyo Station and Shibuya Station correctly', () => {
    // Tokyo Station: 35.6812, 139.7671
    // Shibuya Station: 35.6580, 139.7016
    // Expected distance: approximately 6.4 km
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6580, 139.7016);
    expect(distance).toBeGreaterThan(6.0);
    expect(distance).toBeLessThan(7.0);
  });

  it('should calculate distance between Tokyo Station and Shinjuku Station correctly', () => {
    // Tokyo Station: 35.6812, 139.7671
    // Shinjuku Station: 35.6896, 139.7006
    // Expected distance: approximately 6.0 km
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6896, 139.7006);
    expect(distance).toBeGreaterThan(5.5);
    expect(distance).toBeLessThan(7.0);
  });

  it('should return a short distance for nearby points', () => {
    // Two points approximately 500 meters apart
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6850, 139.7671);
    expect(distance).toBeGreaterThan(0.3);
    expect(distance).toBeLessThan(0.6);
  });

  it('should be symmetric (distance A->B equals B->A)', () => {
    const distAB = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6580, 139.7016);
    const distBA = getDistanceFromLatLonInKm(35.6580, 139.7016, 35.6812, 139.7671);
    expect(distAB).toBeCloseTo(distBA, 10);
  });

  it('should handle extreme latitudes', () => {
    // North Pole to a nearby point
    const distance = getDistanceFromLatLonInKm(90, 0, 89, 0);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it('should handle points crossing the international date line', () => {
    // Points on either side of 180 degrees longitude
    const distance = getDistanceFromLatLonInKm(0, 179, 0, -179);
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(225);
  });

  it('should correctly identify points within 3km radius', () => {
    // A point approximately 1km from Tokyo Station
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6900, 139.7671);
    expect(distance).toBeLessThanOrEqual(3.0);
  });

  it('should correctly identify points outside 3km radius', () => {
    // Shibuya is about 6.4km from Tokyo Station
    const distance = getDistanceFromLatLonInKm(35.6812, 139.7671, 35.6580, 139.7016);
    expect(distance).toBeGreaterThan(3.0);
  });
});
