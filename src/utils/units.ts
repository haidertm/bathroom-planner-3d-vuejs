// src/utils/units.ts - Unit conversion utilities

/**
 * Convert centimeters to meters
 * @param cm - Value in centimeters
 * @returns Value in meters
 */
export const cmToMeters = (cm: number): number => {
  return cm / 100;
};

/**
 * Convert meters to centimeters
 * @param meters - Value in meters
 * @returns Value in centimeters
 */
export const metersToCm = (meters: number): number => {
  return meters * 100;
};

/**
 * Convert millimeters to centimeters
 * @param mm - Value in millimeters
 * @returns Value in centimeters
 */
export const mmToCm = (mm: number): number => {
  return mm / 10;
};

/**
 * Convert centimeters to millimeters
 * @param cm - Value in centimeters
 * @returns Value in millimeters
 */
export const cmToMm = (cm: number): number => {
  return cm * 10;
};

/**
 * Convert inches to centimeters
 * @param inches - Value in inches
 * @returns Value in centimeters
 */
export const inchesToCm = (inches: number): number => {
  return inches * 2.54;
};

/**
 * Convert centimeters to inches
 * @param cm - Value in centimeters
 * @returns Value in inches
 */
export const cmToInches = (cm: number): number => {
  return cm / 2.54;
};

/**
 * Convert feet to centimeters
 * @param feet - Value in feet
 * @returns Value in centimeters
 */
export const feetToCm = (feet: number): number => {
  return feet * 30.48;
};

/**
 * Convert centimeters to feet
 * @param cm - Value in centimeters
 * @returns Value in feet
 */
export const cmToFeet = (cm: number): number => {
  return cm / 30.48;
};

/**
 * Format centimeters for display
 * @param cm - Value in centimeters
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with "cm" suffix
 */
export const formatCm = (cm: number, decimals: number = 0): string => {
  return `${cm.toFixed(decimals)}cm`;
};

/**
 * Format meters for display
 * @param meters - Value in meters
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with "m" suffix
 */
export const formatMeters = (meters: number, decimals: number = 1): string => {
  return `${meters.toFixed(decimals)}m`;
};
