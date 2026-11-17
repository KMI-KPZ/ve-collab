import { BackendFileNode } from '@/interfaces/api/apiInterfaces';

/**
 * the reserved system folder that holds the attachments of posts
 */
export const SYSTEM_FOLDER_POST_FILES = 'post_files';

export type PreviewKind =
    | 'text'
    | 'markdown'
    | 'csv'
    | 'image'
    | 'pdf'
    | 'video'
    | 'audio'
    | 'none';

const TEXT_EXTENSIONS = [
    'txt',
    'log',
    'json',
    'xml',
    'yaml',
    'yml',
    'ini',
    'cfg',
    'conf',
    'toml',
    'py',
    'js',
    'jsx',
    'ts',
    'tsx',
    'java',
    'c',
    'h',
    'cpp',
    'hpp',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'sh',
    'bash',
    'sql',
    'r',
    'html',
    'htm',
    'css',
    'scss',
    'tex',
    'bib',
    'srt',
    'vtt',
];

/**
 * files larger than this are not previewed as text (they would freeze the browser)
 */
export const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

/**
 * passive media that is previewed with the browser's own viewers (img, video,
 * audio, pdf)
 */
const PASSIVE_MEDIA_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
];

/**
 * svg can contain scripts, which would run in the platform's origin if the file
 * was opened as a document of its own (e.g. a blob url in a new tab). Inside an
 * <img> they never run, so svg is previewed that way only.
 */
const SVG_TYPE = 'image/svg+xml';

/**
 * what the preview, the icon and the helpers below need to know about a file, so that
 * they work for the nodes of a group's file share as well as for files sent in a chat
 */
export type PreviewableFile = Pick<
    BackendFileNode,
    '_id' | 'type' | 'name' | 'file_id' | 'content_type' | 'size' | 'system'
>;

export function getExtension(name: string): string {
    const index = name.lastIndexOf('.');
    return index === -1 ? '' : name.slice(index + 1).toLowerCase();
}

/**
 * decide how a file can be previewed inside the platform based on its
 * content type and (as a fallback) its extension
 */
export function getPreviewKind(node: PreviewableFile): PreviewKind {
    if (node.type !== 'file') return 'none';

    const contentType = (node.content_type || '').toLowerCase();
    const extension = getExtension(node.name);

    if (contentType === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (contentType === SVG_TYPE) return 'image';
    if (/^(image|video|audio)\//.test(contentType)) {
        if (!PASSIVE_MEDIA_TYPES.includes(contentType)) return 'none';
        return contentType.split('/')[0] as 'image' | 'video' | 'audio';
    }
    if (extension === 'md' || extension === 'markdown' || contentType === 'text/markdown')
        return 'markdown';
    if (extension === 'csv' || extension === 'tsv' || contentType === 'text/csv') return 'csv';
    if (
        contentType.startsWith('text/') ||
        contentType === 'application/json' ||
        contentType === 'application/xml' ||
        contentType === 'application/javascript' ||
        contentType === 'application/x-yaml' ||
        TEXT_EXTENSIONS.includes(extension)
    )
        return 'text';

    return 'none';
}

export function isPreviewable(node: PreviewableFile): boolean {
    return getPreviewKind(node) !== 'none';
}

/**
 * the mime type a downloaded file gets for its media preview. It is always set
 * explicitly from the allowlist above instead of taking the type the server
 * sends along (which for post attachments comes from the uploading client).
 */
export function previewMediaType(node: PreviewableFile): string {
    return getPreviewKind(node) === 'pdf'
        ? 'application/pdf'
        : (node.content_type || '').toLowerCase();
}

export function canOpenInNewTab(node: PreviewableFile): boolean {
    return PASSIVE_MEDIA_TYPES.includes(previewMediaType(node));
}

/**
 * human readable file size
 */
export function formatBytes(bytes: number | undefined | null, decimals = 1): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : decimals)} ${units[index]}`;
}

export function isPostFile(node: BackendFileNode): boolean {
    return node.type === 'file' && node.manually_uploaded === false;
}

export function isSystemFolder(node: BackendFileNode): boolean {
    return node.type === 'folder' && !!node.system;
}

/**
 * post files and the post files folder are managed by the backend and
 * cannot be renamed, moved or deleted from the file share
 */
export function isReadOnly(node: BackendFileNode): boolean {
    return isSystemFolder(node) || isPostFile(node);
}

/**
 * split a file name into stem and extension, used to pre-select only the
 * stem when renaming
 */
export function splitName(name: string): { stem: string; extension: string } {
    const index = name.lastIndexOf('.');
    if (index <= 0) return { stem: name, extension: '' };
    return { stem: name.slice(0, index), extension: name.slice(index) };
}

/**
 * parse csv/tsv text into rows for the table preview
 */
export function parseDelimited(text: string, maxRows = 500): string[][] {
    // guess the delimiter from the first line: tab > semicolon > comma
    const firstLine = text.split('\n', 1)[0];
    const delimiter = firstLine.includes('\t')
        ? '\t'
        : firstLine.includes(';') && !firstLine.includes(',')
        ? ';'
        : ',';
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            row.push(cell);
            cell = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            if (rows.length >= maxRows) return rows;
        } else {
            cell += char;
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}
