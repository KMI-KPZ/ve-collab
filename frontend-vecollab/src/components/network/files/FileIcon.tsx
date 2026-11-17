import {
    MdFolder,
    MdFolderSpecial,
    MdInsertDriveFile,
    MdImage,
    MdPictureAsPdf,
    MdVideoFile,
    MdAudioFile,
    MdDescription,
    MdTableChart,
    MdSlideshow,
    MdFolderZip,
    MdCode,
} from 'react-icons/md';
import { PreviewableFile, getExtension } from './fileUtils';

interface Props {
    node: PreviewableFile;
    size?: number;
    className?: string;
}

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx', 'ods', 'csv', 'tsv'];
const PRESENTATION_EXTENSIONS = ['ppt', 'pptx', 'odp', 'key'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'tex'];
const CODE_EXTENSIONS = [
    'js',
    'ts',
    'tsx',
    'jsx',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'sh',
    'sql',
    'json',
    'xml',
    'yaml',
    'yml',
    'html',
    'css',
];

export default function FileIcon({ node, size = 22, className = '' }: Props) {
    if (node.type === 'folder') {
        return node.system ? (
            <MdFolderSpecial size={size} className={`text-ve-collab-blue ${className}`} />
        ) : (
            <MdFolder size={size} className={`text-ve-collab-orange ${className}`} />
        );
    }

    const contentType = (node.content_type || '').toLowerCase();
    const extension = getExtension(node.name);

    if (contentType === 'application/pdf' || extension === 'pdf')
        return <MdPictureAsPdf size={size} className={`text-red-600 ${className}`} />;
    if (contentType.startsWith('image/'))
        return <MdImage size={size} className={`text-emerald-600 ${className}`} />;
    if (contentType.startsWith('video/'))
        return <MdVideoFile size={size} className={`text-purple-600 ${className}`} />;
    if (contentType.startsWith('audio/'))
        return <MdAudioFile size={size} className={`text-purple-600 ${className}`} />;
    if (ARCHIVE_EXTENSIONS.includes(extension))
        return <MdFolderZip size={size} className={`text-amber-700 ${className}`} />;
    if (SPREADSHEET_EXTENSIONS.includes(extension))
        return <MdTableChart size={size} className={`text-green-700 ${className}`} />;
    if (PRESENTATION_EXTENSIONS.includes(extension))
        return <MdSlideshow size={size} className={`text-orange-600 ${className}`} />;
    if (CODE_EXTENSIONS.includes(extension))
        return <MdCode size={size} className={`text-slate-600 ${className}`} />;
    if (DOCUMENT_EXTENSIONS.includes(extension) || contentType.startsWith('text/'))
        return <MdDescription size={size} className={`text-blue-700 ${className}`} />;

    return <MdInsertDriveFile size={size} className={`text-gray-500 ${className}`} />;
}
