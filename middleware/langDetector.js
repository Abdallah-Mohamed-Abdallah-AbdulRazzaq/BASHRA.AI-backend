/**
 * Language Detection Middleware
 * Detects user language from query parameters or headers
 * Priority: query.lang > headers.lang > headers.accept-language > default ('ar')
 */

const langDetector = (req, res, next) => {
  let lang = 'ar'; // Default language is Arabic

  // Priority 1: Check query parameter
  if (req.query.lang) {
    lang = req.query.lang.toLowerCase().trim();
  }
  // Priority 2: Check custom 'lang' header
  else if (req.headers.lang) {
    lang = req.headers.lang.toLowerCase().trim();
  }
  // Priority 3: Check standard 'Accept-Language' header
  else if (req.headers['accept-language']) {
    const acceptLang = req.headers['accept-language'].split(',')[0].toLowerCase().trim();
    // Extract language code (e.g., 'ar-SA' -> 'ar', 'en-US' -> 'en')
    lang = acceptLang.split('-')[0];
  }

  // Validate language - fallback to Arabic if invalid
  if (!['ar', 'en'].includes(lang)) {
    lang = 'ar';
  }

  // Attach language to request object
  req.lang = lang;

  next();
};

module.exports = langDetector;
