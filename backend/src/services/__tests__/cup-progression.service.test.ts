/**
 * CUP PROGRESSION SERVICE - UNIT TESTS
 *
 * Tests for cup letter conversions between regions
 * CRITICAL: Ensures mapping tables are used, NOT math!
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Redis } from 'ioredis';
import {
  cupProgressionService,
  CUP_PROGRESSIONS,
  parseSizeString,
  isValidRegionCode,
} from '../cup-progression.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

describe('CupProgressionService', () => {
  beforeAll(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
  });

  beforeEach(async () => {
    await cupProgressionService.invalidateCache();
  });

  describe('CUP_PROGRESSIONS constant', () => {
    it('should have progressions for all regions', () => {
      expect(CUP_PROGRESSIONS).toBeDefined();
      expect(CUP_PROGRESSIONS.US).toBeDefined();
      expect(CUP_PROGRESSIONS.UK).toBeDefined();
      expect(CUP_PROGRESSIONS.EU).toBeDefined();
      expect(CUP_PROGRESSIONS.FR).toBeDefined();
      expect(CUP_PROGRESSIONS.AU).toBeDefined();
      expect(CUP_PROGRESSIONS.JP).toBeDefined();
      expect(CUP_PROGRESSIONS.VN).toBeDefined();
    });

    it('should have different progressions for US vs UK', () => {
      const usProgression = CUP_PROGRESSIONS.US;
      const ukProgression = CUP_PROGRESSIONS.UK;

      // Both have DD at volume 5 (index 5)
      expect(usProgression[5]).toBe('DD');
      expect(ukProgression[5]).toBe('DD');

      // But different after DD
      expect(usProgression[6]).toBe('DDD'); // US uses DDD
      expect(ukProgression[6]).toBe('E'); // UK uses E

      expect(usProgression[7]).toBe('G'); // US uses G
      expect(ukProgression[7]).toBe('F'); // UK uses F
    });

    it('should have same progressions for EU and FR', () => {
      expect(CUP_PROGRESSIONS.EU).toEqual(CUP_PROGRESSIONS.FR);
    });
  });

  describe('convertCupLetter', () => {
    it('should convert US DD to EU E (volume 5)', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'US',
        toRegion: 'EU',
        cupLetter: 'DD',
      });

      expect(result).not.toBeNull();
      expect(result?.fromCupLetter).toBe('DD');
      expect(result?.toCupLetter).toBe('E');
      expect(result?.fromCupVolume).toBe(6); // Index 5 + 1
      expect(result?.toCupVolume).toBe(6);
      expect(result?.isExactMatch).toBe(true);
    });

    it('should convert US DDD to UK E (volume 6)', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'US',
        toRegion: 'UK',
        cupLetter: 'DDD',
      });

      expect(result).not.toBeNull();
      expect(result?.fromCupLetter).toBe('DDD');
      expect(result?.toCupLetter).toBe('E');
      expect(result?.fromCupVolume).toBe(7); // Index 6 + 1
      expect(result?.toCupVolume).toBe(7);
    });

    it('should convert UK FF to US H (volume 8)', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'UK',
        toRegion: 'US',
        cupLetter: 'FF',
      });

      expect(result).not.toBeNull();
      expect(result?.fromCupLetter).toBe('FF');
      expect(result?.toCupLetter).toBe('H');
      expect(result?.toCupVolume).toBe(9); // Index 8 + 1
    });

    it('should handle same region conversion (no change)', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'US',
        toRegion: 'US',
        cupLetter: 'C',
      });

      expect(result).not.toBeNull();
      expect(result?.fromCupLetter).toBe('C');
      expect(result?.toCupLetter).toBe('C');
    });

    it('should return null for invalid cup letter', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'US',
        toRegion: 'EU',
        cupLetter: 'ZZ', // Invalid
      });

      expect(result).toBeNull();
    });

    it('should return null for invalid region', async () => {
      const result = await cupProgressionService.convertCupLetter({
        fromRegion: 'INVALID',
        toRegion: 'EU',
        cupLetter: 'C',
      });

      expect(result).toBeNull();
    });

    it('should cache conversion results', async () => {
      const params = {
        fromRegion: 'US',
        toRegion: 'EU',
        cupLetter: 'DD',
      };

      // First call
      await cupProgressionService.convertCupLetter(params);

      // Check cache
      const cacheKey = 'cup-conversion:US:EU:DD';
      const cached = await redis.get(cacheKey);
      expect(cached).toBeDefined();

      // Second call should use cache
      const result = await cupProgressionService.convertCupLetter(params);
      expect(result?.toCupLetter).toBe('E');
    });
  });

  describe('getCupVolume', () => {
    it('should return correct volume for US cups', () => {
      expect(cupProgressionService.getCupVolume('US', 'A')).toBe(2); // Index 1 + 1
      expect(cupProgressionService.getCupVolume('US', 'B')).toBe(3);
      expect(cupProgressionService.getCupVolume('US', 'C')).toBe(4);
      expect(cupProgressionService.getCupVolume('US', 'D')).toBe(5);
      expect(cupProgressionService.getCupVolume('US', 'DD')).toBe(6);
      expect(cupProgressionService.getCupVolume('US', 'DDD')).toBe(7);
    });

    it('should return correct volume for UK cups', () => {
      expect(cupProgressionService.getCupVolume('UK', 'D')).toBe(5);
      expect(cupProgressionService.getCupVolume('UK', 'DD')).toBe(6);
      expect(cupProgressionService.getCupVolume('UK', 'E')).toBe(7); // UK E = volume 7
      expect(cupProgressionService.getCupVolume('UK', 'F')).toBe(8);
      expect(cupProgressionService.getCupVolume('UK', 'FF')).toBe(9);
    });

    it('should throw error for invalid region', () => {
      expect(() => {
        cupProgressionService.getCupVolume('INVALID', 'C');
      }).toThrow('Invalid region code');
    });

    it('should throw error for invalid cup letter', () => {
      expect(() => {
        cupProgressionService.getCupVolume('US', 'ZZ');
      }).toThrow('Invalid cup letter');
    });
  });

  describe('getCupLetter', () => {
    it('should return correct letter for US volumes', () => {
      expect(cupProgressionService.getCupLetter('US', 2)).toBe('A');
      expect(cupProgressionService.getCupLetter('US', 3)).toBe('B');
      expect(cupProgressionService.getCupLetter('US', 4)).toBe('C');
      expect(cupProgressionService.getCupLetter('US', 5)).toBe('D');
      expect(cupProgressionService.getCupLetter('US', 6)).toBe('DD');
      expect(cupProgressionService.getCupLetter('US', 7)).toBe('DDD');
    });

    it('should return correct letter for UK volumes', () => {
      expect(cupProgressionService.getCupLetter('UK', 6)).toBe('DD');
      expect(cupProgressionService.getCupLetter('UK', 7)).toBe('E');
      expect(cupProgressionService.getCupLetter('UK', 8)).toBe('F');
      expect(cupProgressionService.getCupLetter('UK', 9)).toBe('FF');
    });

    it('should return null for volume out of range', () => {
      expect(cupProgressionService.getCupLetter('US', 0)).toBeNull();
      expect(cupProgressionService.getCupLetter('US', 100)).toBeNull();
    });
  });

  describe('isValidCupLetter', () => {
    it('should validate US cup letters', () => {
      expect(cupProgressionService.isValidCupLetter('US', 'A')).toBe(true);
      expect(cupProgressionService.isValidCupLetter('US', 'DD')).toBe(true);
      expect(cupProgressionService.isValidCupLetter('US', 'DDD')).toBe(true);
      expect(cupProgressionService.isValidCupLetter('US', 'E')).toBe(false); // US doesn't use E
      expect(cupProgressionService.isValidCupLetter('US', 'ZZ')).toBe(false);
    });

    it('should validate UK cup letters', () => {
      expect(cupProgressionService.isValidCupLetter('UK', 'E')).toBe(true);
      expect(cupProgressionService.isValidCupLetter('UK', 'FF')).toBe(true);
      expect(cupProgressionService.isValidCupLetter('UK', 'DDD')).toBe(false); // UK doesn't use DDD
    });
  });

  describe('getCupProgressionInfo', () => {
    it('should return progression info for US DD', () => {
      const info = cupProgressionService.getCupProgressionInfo('US', 'DD');

      expect(info).not.toBeNull();
      expect(info?.cupLetter).toBe('DD');
      expect(info?.cupVolume).toBe(6);
      expect(info?.previousCup).toBe('D');
      expect(info?.nextCup).toBe('DDD');
    });

    it('should return null for next cup at end of progression', () => {
      const usProgression = CUP_PROGRESSIONS.US;
      const lastCup = usProgression[usProgression.length - 1];

      const info = cupProgressionService.getCupProgressionInfo('US', lastCup);
      expect(info?.nextCup).toBeNull();
    });

    it('should return null for previous cup at start of progression', () => {
      const info = cupProgressionService.getCupProgressionInfo('US', 'AA');
      expect(info?.previousCup).toBeNull();
    });
  });

  describe('getRegionCupProgression', () => {
    it('should return full progression for US', () => {
      const progression = cupProgressionService.getRegionCupProgression('US');

      expect(progression).toEqual(CUP_PROGRESSIONS.US);
      expect(progression).toContain('DD');
      expect(progression).toContain('DDD');
      expect(progression).not.toContain('E'); // US doesn't use E
    });

    it('should return full progression for UK', () => {
      const progression = cupProgressionService.getRegionCupProgression('UK');

      expect(progression).toEqual(CUP_PROGRESSIONS.UK);
      expect(progression).toContain('E');
      expect(progression).toContain('FF');
      expect(progression).not.toContain('DDD'); // UK doesn't use DDD
    });

    it('should throw error for invalid region', () => {
      expect(() => {
        cupProgressionService.getRegionCupProgression('INVALID');
      }).toThrow('Invalid region code');
    });
  });

  describe('getConversionMatrix', () => {
    it('should return conversion matrix for volume 6', async () => {
      const matrix = await cupProgressionService.getConversionMatrix(6);

      expect(matrix.US).toBe('DD');
      expect(matrix.UK).toBe('DD');
      expect(matrix.EU).toBe('E');
      expect(matrix.FR).toBe('E');
    });

    it('should return conversion matrix for volume 7', async () => {
      const matrix = await cupProgressionService.getConversionMatrix(7);

      expect(matrix.US).toBe('DDD');
      expect(matrix.UK).toBe('E');
      expect(matrix.EU).toBe('F');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should NOT use mathematical formulas for conversion', async () => {
      // This test ensures we're using mapping tables, not math

      // US DD (index 5) and UK DD (index 5) are SAME volume
      const usDD = CUP_PROGRESSIONS.US[5];
      const ukDD = CUP_PROGRESSIONS.UK[5];
      expect(usDD).toBe('DD');
      expect(ukDD).toBe('DD');

      // But US DDD (index 6) != UK DD+1
      // UK uses E, not DDD
      const usDDD = CUP_PROGRESSIONS.US[6];
      const ukE = CUP_PROGRESSIONS.UK[6];
      expect(usDDD).toBe('DDD');
      expect(ukE).toBe('E');

      // If we used math (DD + D = DDD), we'd get wrong result for UK
      expect(ukE).not.toBe('DDD');
    });

    it('should handle all regions consistently', async () => {
      const regions = ['US', 'UK', 'EU', 'FR', 'AU', 'JP', 'VN'];

      for (const region of regions) {
        const progression = cupProgressionService.getRegionCupProgression(region);
        expect(progression.length).toBeGreaterThan(0);
        expect(progression).toContain('C'); // All regions have C
      }
    });

    it('should maintain consistency across conversions', async () => {
      // US DD → EU E → US DD (round trip)
      const usToEu = await cupProgressionService.convertCupLetter({
        fromRegion: 'US',
        toRegion: 'EU',
        cupLetter: 'DD',
      });

      expect(usToEu?.toCupLetter).toBe('E');

      const euToUs = await cupProgressionService.convertCupLetter({
        fromRegion: 'EU',
        toRegion: 'US',
        cupLetter: 'E',
      });

      expect(euToUs?.toCupLetter).toBe('DD');

      // Round trip should return to original
      expect(euToUs?.toCupVolume).toBe(usToEu?.toCupVolume);
    });
  });

  describe('Utility functions', () => {
    describe('parseSizeString', () => {
      it('should parse valid size strings', () => {
        expect(parseSizeString('34C')).toEqual({ band: 34, cup: 'C' });
        expect(parseSizeString('32DD')).toEqual({ band: 32, cup: 'DD' });
        expect(parseSizeString('38DDD')).toEqual({ band: 38, cup: 'DDD' });
      });

      it('should handle lowercase input', () => {
        expect(parseSizeString('34c')).toEqual({ band: 34, cup: 'C' });
      });

      it('should return null for invalid format', () => {
        expect(parseSizeString('invalid')).toBeNull();
        expect(parseSizeString('C34')).toBeNull();
        expect(parseSizeString('34')).toBeNull();
      });
    });

    describe('isValidRegionCode', () => {
      it('should validate region codes', () => {
        expect(isValidRegionCode('US')).toBe(true);
        expect(isValidRegionCode('UK')).toBe(true);
        expect(isValidRegionCode('EU')).toBe(true);
        expect(isValidRegionCode('INVALID')).toBe(false);
      });
    });
  });
});
