/**
 * Validation Utilities
 * 
 * This utility provides consistent form validation throughout the application
 */

/**
 * Validate an email address
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} Whether the email is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a password
 * 
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validatePassword = (password, options = {}) => {
  const defaultOptions = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  };
  
  const config = { ...defaultOptions, ...options };
  
  const result = {
    isValid: true,
    errors: []
  };
  
  if (!password) {
    result.isValid = false;
    result.errors.push('Password is required');
    return result;
  }
  
  if (password.length < config.minLength) {
    result.isValid = false;
    result.errors.push(`Password must be at least ${config.minLength} characters long`);
  }
  
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Password must contain at least one uppercase letter');
  }
  
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Password must contain at least one lowercase letter');
  }
  
  if (config.requireNumbers && !/\d/.test(password)) {
    result.isValid = false;
    result.errors.push('Password must contain at least one number');
  }
  
  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.isValid = false;
    result.errors.push('Password must contain at least one special character');
  }
  
  return result;
};

/**
 * Validate a phone number
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the input is of correct length for US phone numbers
  return cleaned.length >= 10;
};

/**
 * Validate a date
 * 
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {boolean} Whether the date is valid
 */
export const isValidDate = (date, options = {}) => {
  if (!date) return false;
  
  const defaultOptions = {
    minDate: null,
    maxDate: null
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    
    // Check min date
    if (config.minDate && dateObj < new Date(config.minDate)) {
      return false;
    }
    
    // Check max date
    if (config.maxDate && dateObj > new Date(config.maxDate)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate a URL
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate required fields
 * 
 * @param {Object} data - Form data
 * @param {Array} requiredFields - Required field names
 * @returns {Object} Validation result
 */
export const validateRequiredFields = (data, requiredFields) => {
  const result = {
    isValid: true,
    errors: {}
  };
  
  requiredFields.forEach(field => {
    if (!data[field]) {
      result.isValid = false;
      result.errors[field] = 'This field is required';
    }
  });
  
  return result;
};

/**
 * Validate a form
 * 
 * @param {Object} data - Form data
 * @param {Object} validationRules - Validation rules
 * @returns {Object} Validation result
 */
export const validateForm = (data, validationRules) => {
  const result = {
    isValid: true,
    errors: {}
  };
  
  Object.entries(validationRules).forEach(([field, rules]) => {
    const value = data[field];
    
    // Required validation
    if (rules.required && !value) {
      result.isValid = false;
      result.errors[field] = rules.requiredMessage || 'This field is required';
      return;
    }
    
    // Skip other validations if value is empty and not required
    if (!value && !rules.required) {
      return;
    }
    
    // Email validation
    if (rules.email && !isValidEmail(value)) {
      result.isValid = false;
      result.errors[field] = rules.emailMessage || 'Please enter a valid email address';
    }
    
    // Phone validation
    if (rules.phone && !isValidPhoneNumber(value)) {
      result.isValid = false;
      result.errors[field] = rules.phoneMessage || 'Please enter a valid phone number';
    }
    
    // URL validation
    if (rules.url && !isValidUrl(value)) {
      result.isValid = false;
      result.errors[field] = rules.urlMessage || 'Please enter a valid URL';
    }
    
    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      result.isValid = false;
      result.errors[field] = rules.minLengthMessage || `Must be at least ${rules.minLength} characters`;
    }
    
    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      result.isValid = false;
      result.errors[field] = rules.maxLengthMessage || `Must be no more than ${rules.maxLength} characters`;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      result.isValid = false;
      result.errors[field] = rules.patternMessage || 'Invalid format';
    }
    
    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customValidation = rules.validate(value, data);
      if (customValidation !== true) {
        result.isValid = false;
        result.errors[field] = customValidation || 'Invalid value';
      }
    }
  });
  
  return result;
};
