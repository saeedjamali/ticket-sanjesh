/**
 * ForcedColorsWrapper - Component برای حل مشکل Forced Colors Mode
 * 
 * این component برای اطمینان از نمایش صحیح رنگ‌ها در تمام مرورگرها و
 * سیستم‌عامل‌ها طراحی شده است، خاصه برای کاربرانی که از High Contrast Mode
 * استفاده می‌کنند.
 */

import React from 'react';

const ForcedColorsWrapper = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'forced-card';
      case 'card-header':
        return 'forced-card-header';
      case 'table':
        return 'forced-table';
      case 'input':
        return 'forced-input';
      case 'button-blue':
        return 'forced-button-blue';
      case 'button-green':
        return 'forced-button-green';
      case 'text-important':
        return 'forced-text-important';
      case 'text-secondary':
        return 'forced-text-secondary';
      case 'text-muted':
        return 'forced-text-muted';
      default:
        return '';
    }
  };

  const combinedClassName = `${className} ${getVariantClasses()}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

// Export کردن کلاس‌های مختلف برای استفاده مستقیم
export const forcedColorClasses = {
  // Text Colors
  textGray900: 'forced-text-gray-900',
  textGray800: 'forced-text-gray-800',
  textGray700: 'forced-text-gray-700',
  textGray600: 'forced-text-gray-600',
  textGray500: 'forced-text-gray-500',
  textBlue600: 'forced-text-blue-600',
  textBlue700: 'forced-text-blue-700',
  textGreen600: 'forced-text-green-600',
  textGreen700: 'forced-text-green-700',
  textGreen800: 'forced-text-green-800',
  textRed600: 'forced-text-red-600',
  textRed700: 'forced-text-red-700',
  textRed800: 'forced-text-red-800',
  textOrange600: 'forced-text-orange-600',
  textOrange700: 'forced-text-orange-700',
  textOrange800: 'forced-text-orange-800',
  
  // Background Colors
  bgWhite: 'forced-bg-white',
  bgGray50: 'forced-bg-gray-50',
  bgGray100: 'forced-bg-gray-100',
  bgBlue50: 'forced-bg-blue-50',
  bgBlue100: 'forced-bg-blue-100',
  bgGreen50: 'forced-bg-green-50',
  bgGreen100: 'forced-bg-green-100',
  bgRed50: 'forced-bg-red-50',
  bgRed100: 'forced-bg-red-100',
  bgOrange50: 'forced-bg-orange-50',
  bgOrange100: 'forced-bg-orange-100',
  
  // Icon Colors
  iconGray: 'forced-icon-gray',
  iconBlue: 'forced-icon-blue',
  iconGreen: 'forced-icon-green',
  iconRed: 'forced-icon-red',
  iconOrange: 'forced-icon-orange',
  
  // Component Variants
  card: 'forced-card',
  cardHeader: 'forced-card-header',
  table: 'forced-table',
  input: 'forced-input',
  buttonBlue: 'forced-button-blue',
  buttonGreen: 'forced-button-green',
  textImportant: 'forced-text-important',
  textSecondary: 'forced-text-secondary',
  textMuted: 'forced-text-muted'
};

// Hook برای استفاده آسان‌تر
export const useForcedColors = () => {
  const applyClass = (tailwindClass) => {
    const classMap = {
      'text-gray-900': forcedColorClasses.textGray900,
      'text-gray-800': forcedColorClasses.textGray800,
      'text-gray-700': forcedColorClasses.textGray700,
      'text-gray-600': forcedColorClasses.textGray600,
      'text-gray-500': forcedColorClasses.textGray500,
      'text-blue-600': forcedColorClasses.textBlue600,
      'text-blue-700': forcedColorClasses.textBlue700,
      'text-green-600': forcedColorClasses.textGreen600,
      'text-green-700': forcedColorClasses.textGreen700,
      'text-green-800': forcedColorClasses.textGreen800,
      'text-red-600': forcedColorClasses.textRed600,
      'text-red-700': forcedColorClasses.textRed700,
      'text-red-800': forcedColorClasses.textRed800,
      'text-orange-600': forcedColorClasses.textOrange600,
      'text-orange-700': forcedColorClasses.textOrange700,
      'text-orange-800': forcedColorClasses.textOrange800,
      'bg-white': forcedColorClasses.bgWhite,
      'bg-gray-50': forcedColorClasses.bgGray50,
      'bg-gray-100': forcedColorClasses.bgGray100,
      'bg-blue-50': forcedColorClasses.bgBlue50,
      'bg-blue-100': forcedColorClasses.bgBlue100,
      'bg-green-50': forcedColorClasses.bgGreen50,
      'bg-green-100': forcedColorClasses.bgGreen100,
      'bg-red-50': forcedColorClasses.bgRed50,
      'bg-red-100': forcedColorClasses.bgRed100,
      'bg-orange-50': forcedColorClasses.bgOrange50,
      'bg-orange-100': forcedColorClasses.bgOrange100,
    };
    
    return `${tailwindClass} ${classMap[tailwindClass] || ''}`;
  };

  return { applyClass, classes: forcedColorClasses };
};

export default ForcedColorsWrapper;
