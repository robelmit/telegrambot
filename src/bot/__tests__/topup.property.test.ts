import * as fc from 'fast-check';
import { TOPUP_AMOUNTS, TopupAmount } from '../../types';

describe('Top-up Amount Property Tests', () => {
  /**
   * Property 20: Top-up Amount Options
   * There should be exactly 8 top-up amount options.
   */
  describe('Property 20: Top-up Amount Options', () => {
    it('should have exactly 8 top-up amount options', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            expect(TOPUP_AMOUNTS.length).toBe(8);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have amounts in ascending order', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            for (let i = 1; i < TOPUP_AMOUNTS.length; i++) {
              expect(TOPUP_AMOUNTS[i]).toBeGreaterThan(TOPUP_AMOUNTS[i - 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have minimum amount of 100 ETB', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            expect(TOPUP_AMOUNTS[0]).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have maximum amount of 1000 ETB', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            expect(TOPUP_AMOUNTS[TOPUP_AMOUNTS.length - 1]).toBe(1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have all amounts as positive integers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...TOPUP_AMOUNTS),
          (amount) => {
            expect(Number.isInteger(amount)).toBe(true);
            expect(amount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should contain the expected amounts', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const expectedAmounts = [100, 200, 300, 400, 500, 600, 800, 1000];
            expect(TOPUP_AMOUNTS).toEqual(expectedAmounts);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have unique amounts', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const uniqueAmounts = new Set(TOPUP_AMOUNTS);
            expect(uniqueAmounts.size).toBe(TOPUP_AMOUNTS.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
