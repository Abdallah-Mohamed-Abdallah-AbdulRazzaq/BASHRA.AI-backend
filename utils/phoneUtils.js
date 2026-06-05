const { parsePhoneNumberFromString } = require('libphonenumber-js');

// Function to format the phone number
const formatPhoneNumber = (phone) => {
  if (!phone) return null; // guard against undefined/null
  const phoneStr = String(phone).trim();
  if (!phoneStr) return null;
  const phoneNumber = parsePhoneNumberFromString(phoneStr, "EG"); // "EG" for Egypt
  return phoneNumber ? phoneNumber.formatInternational() : null;
};

// Function to validate phone number
const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  const phoneStr = String(phone).trim();
  if (!phoneStr) return false;
  const phoneNumber = parsePhoneNumberFromString(phoneStr, "EG"); // "EG" for Egypt
  return phoneNumber ? phoneNumber.isValid() : false;
};

module.exports = { formatPhoneNumber, isValidPhoneNumber };
