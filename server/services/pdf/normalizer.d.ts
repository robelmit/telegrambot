import { EfaydaData } from '../../types';
import { DataNormalizer } from './types';
export declare class DataNormalizerImpl implements DataNormalizer {
    /**
     * Normalize phone number to standard Ethiopian format
     */
    normalizePhoneNumber(phone: string): string;
    /**
     * Normalize date to standard format
     * Returns both Ethiopian and Gregorian calendar dates
     */
    normalizeDate(date: string): {
        ethiopian: string;
        gregorian: string;
    };
    /**
     * Convert Ethiopian date to Gregorian (approximate)
     */
    private ethiopianToGregorian;
    /**
     * Convert Gregorian date to Ethiopian (approximate)
     */
    private gregorianToEthiopian;
    /**
     * Normalize address components
     */
    normalizeAddress(region: string, city: string, subcity: string): {
        region: string;
        city: string;
        subcity: string;
    };
    /**
     * Normalize name (extract Amharic and English versions)
     */
    normalizeName(name: string): {
        amharic: string;
        english: string;
    };
    /**
     * Normalize English name (proper case)
     */
    private normalizeEnglishName;
    /**
     * Normalize general text
     */
    private normalizeText;
    /**
     * Normalize complete EfaydaData object
     */
    normalizeEfaydaData(data: Partial<EfaydaData>): EfaydaData;
}
export declare const dataNormalizer: DataNormalizerImpl;
export default dataNormalizer;
//# sourceMappingURL=normalizer.d.ts.map