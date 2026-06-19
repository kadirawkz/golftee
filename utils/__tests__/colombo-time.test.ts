import { getColomboDateKey, getColomboMinutes, parseDateKeyToDate } from "../colombo-time";

describe("colombo-time utilities", () => {
  describe("getColomboDateKey", () => {
    it("should format a date correctly into YYYY-MM-DD in Colombo timezone", () => {
      // 2026-06-19 01:00:00 UTC is 2026-06-19 06:30:00 in Colombo
      const date = new Date(Date.UTC(2026, 5, 19, 1, 0, 0));
      expect(getColomboDateKey(date)).toBe("2026-06-19");
    });

    it("should handle late night UTC dates that are already next day in Colombo", () => {
      // 2026-06-18 20:00:00 UTC is 2026-06-19 01:30:00 in Colombo
      const date = new Date(Date.UTC(2026, 5, 18, 20, 0, 0));
      expect(getColomboDateKey(date)).toBe("2026-06-19");
    });
  });

  describe("getColomboMinutes", () => {
    it("should compute minutes since midnight in Colombo correctly", () => {
      // 2026-06-19 02:00:00 UTC is 07:30:00 in Colombo
      const date = new Date(Date.UTC(2026, 5, 19, 2, 0, 0));
      // 7 hours * 60 + 30 minutes = 450 minutes
      expect(getColomboMinutes(date)).toBe(450);
    });

    it("should handle day wrap minutes since midnight correctly", () => {
      // 2026-06-18 19:30:00 UTC is 2026-06-19 01:00:00 in Colombo
      const date = new Date(Date.UTC(2026, 5, 18, 19, 30, 0));
      // 1 hour * 60 = 60 minutes
      expect(getColomboMinutes(date)).toBe(60);
    });
  });

  describe("parseDateKeyToDate", () => {
    it("should parse date key string into a local Date object", () => {
      const date = parseDateKeyToDate("2026-06-19");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(date.getDate()).toBe(19);
    });
  });
});
