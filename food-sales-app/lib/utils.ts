// lib/utils.ts

/**
 * تحويل القيمة إلى رقم، مع إرجاع 0 إذا كانت القيمة غير صالحة.
 */
export function parseNumber(value: any): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * التحقق من أن القيمة المطلوبة غير فارغة.
 * تُرجع رسالة خطأ إذا كانت فارغة، وإلا تُرجع null.
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `الحقل ${fieldName} مطلوب`;
  }
  return null;
}