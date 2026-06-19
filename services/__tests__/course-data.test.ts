import { calculateDistanceKm } from "../course-data";

describe("course-data utilities", () => {
  describe("calculateDistanceKm", () => {
    it("should return 0 when coordinates are identical", () => {
      const pos = { latitude: 6.9271, longitude: 79.8612 };
      expect(calculateDistanceKm(pos, pos)).toBe(0);
    });

    it("should calculate approximate distance between Colombo and Victoria Golf Digana correctly", () => {
      // Colombo coordinates
      const pos1 = { latitude: 6.9271, longitude: 79.8612 };
      // Victoria Golf (Digana) coordinates from seed.sql
      const pos2 = { latitude: 7.26468, longitude: 80.77403 };

      const distance = calculateDistanceKm(pos1, pos2);
      // Actual straight-line distance is around 107.5 km
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(115);
    });
  });
});
