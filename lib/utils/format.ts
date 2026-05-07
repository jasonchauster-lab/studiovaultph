export const safeFormatDate = (
    dateStr: string | null | undefined, 
    options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }
): string => {
    if (!dateStr) return 'No Date'
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return 'No Date'
        return d.toLocaleDateString('en-PH', options)
    } catch (e) {
        return 'No Date'
    }
}

export const safeFormatCurrency = (val: any): string => {
    try {
        const num = Number(val || 0)
        return num.toLocaleString('en-PH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })
    } catch (e) {
        return '0'
    }
}
