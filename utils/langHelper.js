/**
 * Language Helper Utilities
 * Provides functions to handle multilingual data
 */

/**
 * Get localized field value from object
 * @param {Object} obj - The object containing multilingual fields
 * @param {String} field - The base field name (without _ar or _en suffix)
 * @param {String} lang - Language code ('ar' or 'en')
 * @returns {*} The localized field value
 * 
 * Example:
 * getLocalizedField(tip, 'title', 'ar') -> returns tip.title_ar
 * getLocalizedField(tip, 'title', 'en') -> returns tip.title_en
 */
const getLocalizedField = (obj, field, lang = 'ar') => {
  if (!obj) return null;
  
  const suffix = lang === 'ar' ? '_ar' : '_en';
  const localizedField = `${field}${suffix}`;
  
  return obj[localizedField] !== undefined ? obj[localizedField] : obj[field];
};

/**
 * Filter object to return only fields for the specified language
 * Converts language-specific fields (e.g., title_ar, title_en) to base field names (e.g., title)
 * based on the specified language
 * @param {Object|Array} data - Object or array of objects to filter
 * @param {String} lang - Language code ('ar' or 'en')
 * @returns {Object|Array} Filtered data with base field names
 * 
 * Example:
 * Input: { title_ar: 'عنوان', title_en: 'Title', description_ar: 'وصف', description_en: 'Description' }
 * filterByLanguage(input, 'ar') -> { title: 'عنوان', description: 'وصف' }
 * filterByLanguage(input, 'en') -> { title: 'Title', description: 'Description' }
 */
const filterByLanguage = (data, lang = 'ar') => {
  if (!data) return data;
  
  // If it's an array, apply to each item
  if (Array.isArray(data)) {
    return data.map(item => filterByLanguage(item, lang));
  }
  
  // If it's not an object, return as is
  if (typeof data !== 'object') return data;
  
  // Clone the object to avoid mutation
  const filtered = { ...data };
  
  const suffix = lang === 'ar' ? '_ar' : '_en';
  const opposingSuffix = lang === 'ar' ? '_en' : '_ar';
  
  // List of multilingual fields to handle
  const multilingualFields = ['title', 'description', 'sub_title', 'message', 'content'];
  
  // Process each multilingual field
  multilingualFields.forEach(field => {
    const localizedField = `${field}${suffix}`;
    const opposingField = `${field}${opposingSuffix}`;
    
    // If the localized field exists, copy it to the base field name
    if (filtered[localizedField] !== undefined) {
      filtered[field] = filtered[localizedField];
      delete filtered[localizedField];
    }
    
    // Remove the opposing language field
    if (filtered[opposingField] !== undefined) {
      delete filtered[opposingField];
    }
  });
  
  return filtered;
};

/**
 * Get localized message based on language
 * @param {String} messageAr - Arabic message
 * @param {String} messageEn - English message
 * @param {String} lang - Language code ('ar' or 'en')
 * @returns {String} Localized message
 */
const getLocalizedMessage = (messageAr, messageEn, lang = 'ar') => {
  return lang === 'ar' ? messageAr : messageEn;
};

/**
 * Validate language code
 * @param {String} lang - Language code to validate
 * @returns {Boolean} True if valid, false otherwise
 */
const isValidLanguage = (lang) => {
  return ['ar', 'en'].includes(lang);
};

/**
 * Get default language
 * @returns {String} Default language code ('ar')
 */
const getDefaultLanguage = () => {
  return 'ar';
};

module.exports = {
  getLocalizedField,
  filterByLanguage,
  getLocalizedMessage,
  isValidLanguage,
  getDefaultLanguage
};
