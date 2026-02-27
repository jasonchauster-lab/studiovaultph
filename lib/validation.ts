export const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const isValidPhone = (phone: string): boolean => {
    // PH Mobile: 09XXXXXXXXX (11 digits) OR +639XXXXXXXXX (12 digits after +)
    const trimmed = phone.trim().replace(/[\s\-\(\)]/g, '');
    // Accepts 09XXXXXXXXX or +639XXXXXXXXX
    return /^(09\d{9}|\+639\d{9})$/.test(trimmed);
};

export const phoneErrorMessage = 'Please enter a valid PH mobile number (e.g. 09171234567 or +63917 123 4567).';
