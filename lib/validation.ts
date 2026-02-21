export const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const isValidPhone = (phone: string): boolean => {
    // Supports PH Mobile: 09XXXXXXXXX, +639XXXXXXXXX
    // Supports PH Landline: 02-8XXX-XXXX, etc.
    // Generally: allows +, -, spaces, and 7-13 digits.

    // Clean the number for counting digits
    const digits = phone.replace(/\D/g, '');

    // Basic format check (allowing common symbols)
    const flexRe = /^[\d\+\-\s\(\)]{7,20}$/;

    return flexRe.test(phone.trim()) && digits.length >= 7;
};
