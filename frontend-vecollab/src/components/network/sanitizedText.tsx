import DOMPurify from 'dompurify'

// the markup of the rich text editor of posts and comments, keep in line with
// `RICH_TEXT_TAGS` in the backend (util.py), which sanitizes before storing
export const sanitizedText = (text: string): string => {

    const sanitized = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['br', 'div', 'p', 'b', 'i', 'u', 'strike', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href']
    })

    return sanitized
}
