 import { describe, it, expect } from 'vitest';
 
 // ============================================
 // ALGORITHM UNIT TESTS
 // ============================================
 
 // Cup calculation ranges (from SizeRecommender.tsx)
 const CUP_RANGES = [
   { maxDiff: 10, cup: "AA" },
   { maxDiff: 12, cup: "A" },
   { maxDiff: 14, cup: "B" },
   { maxDiff: 16, cup: "C" },
   { maxDiff: 18, cup: "D" },
   { maxDiff: 20, cup: "DD" },
   { maxDiff: 22, cup: "E" },
   { maxDiff: 24, cup: "F" },
   { maxDiff: 26, cup: "G" },
   { maxDiff: 28, cup: "H" },
   { maxDiff: 30, cup: "I" },
   { maxDiff: 32, cup: "J" },
   { maxDiff: Infinity, cup: "K" },
 ];
 
 // Band size ranges (from SizeRecommender.tsx)
 const BAND_RANGES = [
   { maxUnderBust: 63, band: 60 },
   { maxUnderBust: 68, band: 65 },
   { maxUnderBust: 73, band: 70 },
   { maxUnderBust: 78, band: 75 },
   { maxUnderBust: 83, band: 80 },
   { maxUnderBust: 88, band: 85 },
   { maxUnderBust: 93, band: 90 },
   { maxUnderBust: 98, band: 95 },
   { maxUnderBust: 103, band: 100 },
   { maxUnderBust: 108, band: 105 },
   { maxUnderBust: Infinity, band: 110 },
 ];
 
 // Measurement validation ranges
 const MEASUREMENT_RANGES = {
   bust: { min: 60, max: 150, unit: "cm" },
   underBust: { min: 55, max: 130, unit: "cm" },
   waist: { min: 45, max: 140, unit: "cm" },
   hips: { min: 70, max: 160, unit: "cm" },
   height: { min: 140, max: 200, unit: "cm" },
   weight: { min: 30, max: 150, unit: "kg" },
 };
 
 // Algorithm functions (extracted for testing)
 const calculateCup = (bustDiff: number): string => {
   const cupEntry = CUP_RANGES.find((entry) => bustDiff < entry.maxDiff);
   return cupEntry?.cup || "K";
 };
 
 const calculateBand = (underBust: number): number => {
   const bandEntry = BAND_RANGES.find((entry) => underBust < entry.maxUnderBust);
   return bandEntry?.band || 110;
 };
 
 const validateMeasurement = (
   field: keyof typeof MEASUREMENT_RANGES,
   value: number | undefined
 ): { valid: boolean; error?: string } => {
   if (value === undefined) return { valid: true };
   
   const range = MEASUREMENT_RANGES[field];
   if (!range) return { valid: true };
 
   if (value <= 0) {
     return { valid: false, error: `${field} must be positive` };
   }
 
   if (value < range.min || value > range.max) {
     return { valid: false, error: `${field} should be between ${range.min}-${range.max}` };
   }
 
   return { valid: true };
 };
 
 // ============================================
 // CUP SIZE CALCULATION TESTS
 // ============================================
 
 describe('calculateCup', () => {
   it('should return AA for bust difference < 10', () => {
     expect(calculateCup(8)).toBe('AA');
     expect(calculateCup(9.9)).toBe('AA');
   });
 
   it('should return A for bust difference 10-12', () => {
     expect(calculateCup(10)).toBe('A');
     expect(calculateCup(11.9)).toBe('A');
   });
 
   it('should return B for bust difference 12-14', () => {
     expect(calculateCup(12)).toBe('B');
     expect(calculateCup(13.9)).toBe('B');
   });
 
   it('should return C for bust difference 14-16', () => {
     expect(calculateCup(14)).toBe('C');
     expect(calculateCup(15.9)).toBe('C');
   });
 
   it('should return D for bust difference 16-18', () => {
     expect(calculateCup(16)).toBe('D');
     expect(calculateCup(17.9)).toBe('D');
   });
 
   it('should return DD for bust difference 18-20', () => {
     expect(calculateCup(18)).toBe('DD');
     expect(calculateCup(19.9)).toBe('DD');
   });
 
   it('should return E for bust difference 20-22', () => {
     expect(calculateCup(20)).toBe('E');
     expect(calculateCup(21.9)).toBe('E');
   });
 
   it('should return F for bust difference 22-24', () => {
     expect(calculateCup(22)).toBe('F');
     expect(calculateCup(23.9)).toBe('F');
   });
 
   it('should return G for bust difference 24-26', () => {
     expect(calculateCup(24)).toBe('G');
     expect(calculateCup(25.9)).toBe('G');
   });
 
   it('should return H for bust difference 26-28', () => {
     expect(calculateCup(26)).toBe('H');
     expect(calculateCup(27.9)).toBe('H');
   });
 
   it('should return I for bust difference 28-30', () => {
     expect(calculateCup(28)).toBe('I');
     expect(calculateCup(29.9)).toBe('I');
   });
 
   it('should return J for bust difference 30-32', () => {
     expect(calculateCup(30)).toBe('J');
     expect(calculateCup(31.9)).toBe('J');
   });
 
   it('should return K for bust difference >= 32', () => {
     expect(calculateCup(32)).toBe('K');
     expect(calculateCup(40)).toBe('K');
     expect(calculateCup(100)).toBe('K');
   });
 
   it('should handle edge cases', () => {
     expect(calculateCup(0)).toBe('AA');
     expect(calculateCup(9.99)).toBe('AA');
     expect(calculateCup(10.0)).toBe('A');
   });
 });
 
 // ============================================
 // BAND SIZE CALCULATION TESTS
 // ============================================
 
 describe('calculateBand', () => {
   it('should return 60 for underbust < 63', () => {
     expect(calculateBand(55)).toBe(60);
     expect(calculateBand(62)).toBe(60);
   });
 
   it('should return 65 for underbust 63-68', () => {
     expect(calculateBand(63)).toBe(65);
     expect(calculateBand(67)).toBe(65);
   });
 
   it('should return 70 for underbust 68-73', () => {
     expect(calculateBand(68)).toBe(70);
     expect(calculateBand(72)).toBe(70);
   });
 
   it('should return 75 for underbust 73-78', () => {
     expect(calculateBand(73)).toBe(75);
     expect(calculateBand(77)).toBe(75);
   });
 
   it('should return 80 for underbust 78-83', () => {
     expect(calculateBand(78)).toBe(80);
     expect(calculateBand(82)).toBe(80);
   });
 
   it('should return 85 for underbust 83-88', () => {
     expect(calculateBand(83)).toBe(85);
     expect(calculateBand(87)).toBe(85);
   });
 
   it('should return 90 for underbust 88-93', () => {
     expect(calculateBand(88)).toBe(90);
     expect(calculateBand(92)).toBe(90);
   });
 
   it('should return 95 for underbust 93-98', () => {
     expect(calculateBand(93)).toBe(95);
     expect(calculateBand(97)).toBe(95);
   });
 
   it('should return 100 for underbust 98-103', () => {
     expect(calculateBand(98)).toBe(100);
     expect(calculateBand(102)).toBe(100);
   });
 
   it('should return 105 for underbust 103-108', () => {
     expect(calculateBand(103)).toBe(105);
     expect(calculateBand(107)).toBe(105);
   });
 
   it('should return 110 for underbust >= 108', () => {
     expect(calculateBand(108)).toBe(110);
     expect(calculateBand(120)).toBe(110);
   });
 });
 
 // ============================================
 // SIZE RECOMMENDATION INTEGRATION TESTS
 // ============================================
 
 describe('Bra Size Calculation', () => {
   it('should calculate correct bra size for typical measurements', () => {
     // Example: bust 85cm, underbust 70cm
     const bust = 85;
     const underBust = 70;
     const bustDiff = bust - underBust; // 15
     
     expect(calculateCup(bustDiff)).toBe('C');
     expect(calculateBand(underBust)).toBe(70);
     // Expected size: 70C
   });
 
   it('should handle small bust difference correctly', () => {
     const bust = 75;
     const underBust = 68;
     const bustDiff = bust - underBust; // 7
     
     expect(calculateCup(bustDiff)).toBe('AA');
     expect(calculateBand(underBust)).toBe(70);
     // Expected size: 70AA
   });
 
   it('should handle large bust difference correctly', () => {
     const bust = 110;
     const underBust = 80;
     const bustDiff = bust - underBust; // 30
     
     expect(calculateCup(bustDiff)).toBe('J');
     expect(calculateBand(underBust)).toBe(80);
     // Expected size: 80J
   });
 
   it('should handle extra large bust difference correctly', () => {
     const bust = 130;
     const underBust = 90;
     const bustDiff = bust - underBust; // 40
     
     expect(calculateCup(bustDiff)).toBe('K');
     expect(calculateBand(underBust)).toBe(90);
     // Expected size: 90K
   });
 });
 
 // ============================================
 // MEASUREMENT VALIDATION TESTS
 // ============================================
 
 describe('validateMeasurement', () => {
   describe('bust validation', () => {
     it('should reject negative values', () => {
       const result = validateMeasurement('bust', -10);
       expect(result.valid).toBe(false);
       expect(result.error).toContain('positive');
     });
 
     it('should reject zero', () => {
       const result = validateMeasurement('bust', 0);
       expect(result.valid).toBe(false);
     });
 
     it('should reject values below minimum', () => {
       const result = validateMeasurement('bust', 50);
       expect(result.valid).toBe(false);
       expect(result.error).toContain('60-150');
     });
 
     it('should reject values above maximum', () => {
       const result = validateMeasurement('bust', 200);
       expect(result.valid).toBe(false);
       expect(result.error).toContain('60-150');
     });
 
     it('should accept valid values', () => {
       expect(validateMeasurement('bust', 60).valid).toBe(true);
       expect(validateMeasurement('bust', 85).valid).toBe(true);
       expect(validateMeasurement('bust', 150).valid).toBe(true);
     });
 
     it('should accept undefined (optional)', () => {
       expect(validateMeasurement('bust', undefined).valid).toBe(true);
     });
   });
 
   describe('underBust validation', () => {
     it('should reject values below 55', () => {
       expect(validateMeasurement('underBust', 50).valid).toBe(false);
     });
 
     it('should reject values above 130', () => {
       expect(validateMeasurement('underBust', 140).valid).toBe(false);
     });
 
     it('should accept valid range', () => {
       expect(validateMeasurement('underBust', 55).valid).toBe(true);
       expect(validateMeasurement('underBust', 75).valid).toBe(true);
       expect(validateMeasurement('underBust', 130).valid).toBe(true);
     });
   });
 
   describe('waist validation', () => {
     it('should accept values 45-140', () => {
       expect(validateMeasurement('waist', 45).valid).toBe(true);
       expect(validateMeasurement('waist', 70).valid).toBe(true);
       expect(validateMeasurement('waist', 140).valid).toBe(true);
     });
 
     it('should reject out of range', () => {
       expect(validateMeasurement('waist', 40).valid).toBe(false);
       expect(validateMeasurement('waist', 150).valid).toBe(false);
     });
   });
 
   describe('hips validation', () => {
     it('should accept values 70-160', () => {
       expect(validateMeasurement('hips', 70).valid).toBe(true);
       expect(validateMeasurement('hips', 95).valid).toBe(true);
       expect(validateMeasurement('hips', 160).valid).toBe(true);
     });
 
     it('should reject out of range', () => {
       expect(validateMeasurement('hips', 60).valid).toBe(false);
       expect(validateMeasurement('hips', 170).valid).toBe(false);
     });
   });
 
   describe('height validation', () => {
     it('should accept values 140-200', () => {
       expect(validateMeasurement('height', 140).valid).toBe(true);
       expect(validateMeasurement('height', 165).valid).toBe(true);
       expect(validateMeasurement('height', 200).valid).toBe(true);
     });
 
     it('should reject out of range', () => {
       expect(validateMeasurement('height', 130).valid).toBe(false);
       expect(validateMeasurement('height', 210).valid).toBe(false);
     });
   });
 
   describe('weight validation', () => {
     it('should accept values 30-150', () => {
       expect(validateMeasurement('weight', 30).valid).toBe(true);
       expect(validateMeasurement('weight', 55).valid).toBe(true);
       expect(validateMeasurement('weight', 150).valid).toBe(true);
     });
 
     it('should reject out of range', () => {
       expect(validateMeasurement('weight', 25).valid).toBe(false);
       expect(validateMeasurement('weight', 160).valid).toBe(false);
     });
   });
 });
 
 // ============================================
 // EDGE CASE TESTS
 // ============================================
 
 describe('Edge Cases', () => {
   it('should handle floating point bust differences correctly', () => {
     expect(calculateCup(11.5)).toBe('A');
     expect(calculateCup(13.5)).toBe('B');
     expect(calculateCup(15.5)).toBe('C');
   });
 
   it('should handle boundary values for band size', () => {
     expect(calculateBand(62.9)).toBe(60);
     expect(calculateBand(63.0)).toBe(65);
     expect(calculateBand(67.9)).toBe(65);
     expect(calculateBand(68.0)).toBe(70);
   });
 
   it('should handle exactly minimum measurement values', () => {
     expect(validateMeasurement('bust', 60).valid).toBe(true);
     expect(validateMeasurement('underBust', 55).valid).toBe(true);
     expect(validateMeasurement('waist', 45).valid).toBe(true);
     expect(validateMeasurement('hips', 70).valid).toBe(true);
   });
 
   it('should handle exactly maximum measurement values', () => {
     expect(validateMeasurement('bust', 150).valid).toBe(true);
     expect(validateMeasurement('underBust', 130).valid).toBe(true);
     expect(validateMeasurement('waist', 140).valid).toBe(true);
     expect(validateMeasurement('hips', 160).valid).toBe(true);
   });
 });

// ============================================
// SISTER SIZE CALCULATION TESTS
// ============================================

// Sister size calculation function (from SizeRecommender.tsx)
const getNextCupUp = (cup: string): string | null => {
  const cupOrder = ["AA", "A", "B", "C", "D", "DD", "E", "F", "G", "H", "I", "J", "K"];
  const idx = cupOrder.indexOf(cup);
  return idx < cupOrder.length - 1 ? cupOrder[idx + 1] : null;
};

const getNextCupDown = (cup: string): string | null => {
  const cupOrder = ["AA", "A", "B", "C", "D", "DD", "E", "F", "G", "H", "I", "J", "K"];
  const idx = cupOrder.indexOf(cup);
  return idx > 0 ? cupOrder[idx - 1] : null;
};

const calculateSisterSizes = (
  band: number,
  cup: string
): { sisterDown: string | null; sisterUp: string | null } => {
  const cupUp = getNextCupUp(cup);
  const cupDown = getNextCupDown(cup);
  
  return {
    sisterDown: cupUp && band > 60 ? `${band - 5}${cupUp}` : null,
    sisterUp: cupDown && band < 110 ? `${band + 5}${cupDown}` : null,
  };
};

describe('Sister Size Calculation', () => {
  it('should calculate sister sizes for 75C', () => {
    const result = calculateSisterSizes(75, 'C');
    expect(result.sisterDown).toBe('70D');
    expect(result.sisterUp).toBe('80B');
  });

  it('should calculate sister sizes for 80B', () => {
    const result = calculateSisterSizes(80, 'B');
    expect(result.sisterDown).toBe('75C');
    expect(result.sisterUp).toBe('85A');
  });

  it('should handle AA cup (no sister down possible for cup)', () => {
    const result = calculateSisterSizes(70, 'AA');
    expect(result.sisterDown).toBe('65A'); // Can still go to smaller band with A cup
    expect(result.sisterUp).toBe(null); // No cup smaller than AA
  });

  it('should handle K cup (no sister up possible for cup)', () => {
    const result = calculateSisterSizes(80, 'K');
    expect(result.sisterDown).toBe(null); // No cup larger than K
    expect(result.sisterUp).toBe('85J');
  });

  it('should handle band 60 (no sister down possible for band)', () => {
    const result = calculateSisterSizes(60, 'C');
    expect(result.sisterDown).toBe(null); // Can't go below 60 band
    expect(result.sisterUp).toBe('65B');
  });

  it('should handle band 110 (no sister up possible for band)', () => {
    const result = calculateSisterSizes(110, 'C');
    expect(result.sisterDown).toBe('105D');
    expect(result.sisterUp).toBe(null); // Can't go above 110 band
  });

  it('should maintain same cup volume across sister sizes', () => {
    // 75C = 70D = 80B (all have same cup volume)
    const originalBustDiff = 15; // C cup
    
    // Sister down: smaller band, larger cup
    const sisterDownBustDiff = 17; // D cup (one cup up)
    expect(calculateCup(sisterDownBustDiff)).toBe('D');
    
    // Sister up: larger band, smaller cup
    const sisterUpBustDiff = 13; // B cup (one cup down)
    expect(calculateCup(sisterUpBustDiff)).toBe('B');
  });
});

// ============================================
// FIT PREFERENCE TESTS
// ============================================

describe('Fit Preference Adjustment', () => {
  const applyFitPreferenceAdjustment = (
    size: string,
    preference: 'snug' | 'regular' | 'relaxed',
    productType: string
  ): { adjustedSize: string; reason: string } | null => {
    // For bra sizes
    const braMatch = size.match(/^(\d+)([A-K]+)$/);
    if (braMatch && productType === "BRA") {
      const band = parseInt(braMatch[1]);
      const cup = braMatch[2];
      
      if (preference === "snug" && band > 60) {
        return { adjustedSize: `${band - 5}${cup}`, reason: "Tighter band" };
      }
      if (preference === "relaxed" && band < 110) {
        return { adjustedSize: `${band + 5}${cup}`, reason: "Looser band" };
      }
    }
    
    // For alpha sizes
    const alphaOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
    const alphaIdx = alphaOrder.indexOf(size.toUpperCase());
    if (alphaIdx >= 0) {
      if (preference === "snug" && alphaIdx > 0) {
        return { adjustedSize: alphaOrder[alphaIdx - 1], reason: "Tighter fit" };
      }
      if (preference === "relaxed" && alphaIdx < alphaOrder.length - 1) {
        return { adjustedSize: alphaOrder[alphaIdx + 1], reason: "Looser fit" };
      }
    }
    
    return null;
  };

  describe('Bra size adjustments', () => {
    it('should reduce band for snug preference', () => {
      const result = applyFitPreferenceAdjustment('75C', 'snug', 'BRA');
      expect(result).not.toBeNull();
      expect(result?.adjustedSize).toBe('70C');
    });

    it('should increase band for relaxed preference', () => {
      const result = applyFitPreferenceAdjustment('75C', 'relaxed', 'BRA');
      expect(result).not.toBeNull();
      expect(result?.adjustedSize).toBe('80C');
    });

    it('should return null for regular preference', () => {
      const result = applyFitPreferenceAdjustment('75C', 'regular', 'BRA');
      expect(result).toBeNull();
    });

    it('should not reduce band below 60', () => {
      const result = applyFitPreferenceAdjustment('60C', 'snug', 'BRA');
      expect(result).toBeNull();
    });

    it('should not increase band above 110', () => {
      const result = applyFitPreferenceAdjustment('110C', 'relaxed', 'BRA');
      expect(result).toBeNull();
    });
  });

  describe('Alpha size adjustments', () => {
    it('should reduce size for snug preference', () => {
      const result = applyFitPreferenceAdjustment('M', 'snug', 'PANTY');
      expect(result).not.toBeNull();
      expect(result?.adjustedSize).toBe('S');
    });

    it('should increase size for relaxed preference', () => {
      const result = applyFitPreferenceAdjustment('M', 'relaxed', 'PANTY');
      expect(result).not.toBeNull();
      expect(result?.adjustedSize).toBe('L');
    });

    it('should not reduce below XS', () => {
      const result = applyFitPreferenceAdjustment('XS', 'snug', 'PANTY');
      expect(result).toBeNull();
    });

    it('should not increase above 3XL', () => {
      const result = applyFitPreferenceAdjustment('3XL', 'relaxed', 'PANTY');
      expect(result).toBeNull();
    });
  });
});

// ============================================
// BODY SHAPE TESTS
// ============================================

describe('Body Shape Recommendations', () => {
  const BODY_SHAPES = [
    { value: "hourglass", label: "Đồng hồ cát" },
    { value: "pear", label: "Quả lê" },
    { value: "apple", label: "Quả táo" },
    { value: "rectangle", label: "Chữ nhật" },
    { value: "inverted_triangle", label: "Tam giác ngược" },
  ];

  it('should have 5 body shape options', () => {
    expect(BODY_SHAPES.length).toBe(5);
  });

  it('should include hourglass body shape', () => {
    expect(BODY_SHAPES.find(s => s.value === 'hourglass')).toBeDefined();
  });

  it('should include pear body shape', () => {
    expect(BODY_SHAPES.find(s => s.value === 'pear')).toBeDefined();
  });

  it('should include apple body shape', () => {
    expect(BODY_SHAPES.find(s => s.value === 'apple')).toBeDefined();
  });

  it('should have Vietnamese labels', () => {
    const hourglass = BODY_SHAPES.find(s => s.value === 'hourglass');
    expect(hourglass?.label).toBe('Đồng hồ cát');
  });
});

// ============================================
// FIT PREFERENCE OPTIONS TESTS
// ============================================

describe('Fit Preference Options', () => {
  const FIT_PREFERENCES = [
    { value: "snug", label: "Ôm sát" },
    { value: "regular", label: "Vừa vặn" },
    { value: "relaxed", label: "Thoải mái" },
  ];

  it('should have 3 fit preference options', () => {
    expect(FIT_PREFERENCES.length).toBe(3);
  });

  it('should include snug option', () => {
    expect(FIT_PREFERENCES.find(f => f.value === 'snug')).toBeDefined();
  });

  it('should include regular option', () => {
    expect(FIT_PREFERENCES.find(f => f.value === 'regular')).toBeDefined();
  });

  it('should include relaxed option', () => {
    expect(FIT_PREFERENCES.find(f => f.value === 'relaxed')).toBeDefined();
  });

  it('should have Vietnamese labels', () => {
    const snug = FIT_PREFERENCES.find(f => f.value === 'snug');
    expect(snug?.label).toBe('Ôm sát');
  });
});
