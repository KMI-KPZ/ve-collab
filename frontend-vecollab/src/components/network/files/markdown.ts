import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
];

/**
 * render (GitHub flavored) markdown for the file preview. Images become links,
 * so that viewing a file doesn't load anything from third parties, and links
 * open in a new tab. The result is sanitized with DOMPurify.
 */
export function renderMarkdown(markdown: string): string {
    const html = marked.parse(markdown, { async: false, gfm: true }) as string;

    // a parsed document is inert, nothing in it is executed or loaded
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('img').forEach((img) => {
        const link = doc.createElement('a');
        link.setAttribute('href', img.getAttribute('src') || '');
        link.textContent = img.getAttribute('alt') || img.getAttribute('src') || '';
        img.replaceWith(link);
    });
    doc.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });

    return DOMPurify.sanitize(doc.body.innerHTML, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
}
