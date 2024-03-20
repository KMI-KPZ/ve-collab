import DOMPurify from 'dompurify'

export const sanitizedText = (text: string): string => {

    const sanitized = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['br', 'div', 'p', 'b', 'i', 'i', 'u', 'strike', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href']
    })

    return sanitized
}