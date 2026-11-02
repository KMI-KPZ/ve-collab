import LoadingAnimation from '@/components/common/LoadingAnimation';
import { BackendFileNode } from '@/interfaces/api/apiInterfaces';
import { fetchAuthenticatedFile } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    MdClose,
    MdDownload,
    MdNavigateBefore,
    MdNavigateNext,
    MdOpenInNew,
    MdWrapText,
} from 'react-icons/md';
import FileIcon from './FileIcon';
import {
    MAX_TEXT_PREVIEW_BYTES,
    canOpenInNewTab,
    formatBytes,
    getPreviewKind,
    parseDelimited,
    previewMediaType,
} from './fileUtils';
import { renderMarkdown } from './markdown';

interface Props {
    node: BackendFileNode | null;
    siblings?: BackendFileNode[];
    onSelect?: (node: BackendFileNode) => void;
    onDownload: (node: BackendFileNode) => void;
    onClose: () => void;
}

type LoadedContent =
    | { kind: 'text' | 'markdown' | 'csv'; text: string }
    | { kind: 'image' | 'pdf' | 'video' | 'audio'; url: string }
    | { kind: 'none' };

/**
 * in-platform reading view for files: text/code, markdown, csv, images,
 * pdf (browser's native viewer), audio and video. Everything else offers
 * a download.
 */
export default function FilePreviewDialog({
    node,
    siblings = [],
    onSelect,
    onDownload,
    onClose,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const [content, setContent] = useState<LoadedContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [wrap, setWrap] = useState(true);
    const [showRawMarkdown, setShowRawMarkdown] = useState(false);

    const kind = node ? getPreviewKind(node) : 'none';

    const index = node ? siblings.findIndex((s) => s._id === node._id) : -1;
    const previous = index > 0 ? siblings[index - 1] : null;
    const next = index !== -1 && index < siblings.length - 1 ? siblings[index + 1] : null;

    // load the file content whenever another node is previewed
    useEffect(() => {
        setContent(null);
        setError(null);
        setShowRawMarkdown(false);
        if (!node || !session || kind === 'none') return;

        let objectUrl: string | null = null;
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const response = await fetchAuthenticatedFile(
                    `/uploads/${node.file_id}`,
                    session.accessToken
                );
                if (!response.ok) {
                    throw new Error(
                        response.status === 403 ? 'insufficient_permission' : 'load_failed'
                    );
                }
                if (kind === 'text' || kind === 'markdown' || kind === 'csv') {
                    if ((node.size || 0) > MAX_TEXT_PREVIEW_BYTES) {
                        throw new Error('too_large');
                    }
                    const text = await response.text();
                    if (!cancelled) setContent({ kind, text });
                } else {
                    // the type comes from the allowlist, never from the response: the
                    // blob url belongs to the platform's origin, so it must not be
                    // something a browser renders as an active document (html, svg, ...)
                    const blob = new Blob([await response.blob()], {
                        type: previewMediaType(node),
                    });
                    objectUrl = URL.createObjectURL(blob);
                    if (!cancelled) setContent({ kind, url: objectUrl });
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(
                        e?.message === 'too_large'
                            ? t('fileshare_preview_too_large', {
                                  size: formatBytes(MAX_TEXT_PREVIEW_BYTES),
                              })
                            : e?.message === 'insufficient_permission'
                            ? t('fileshare_error_insufficient_permission')
                            : t('fileshare_preview_failed')
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node?._id, session?.accessToken]);

    // keyboard: escape closes, arrows navigate
    const handleKey = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            else if (event.key === 'ArrowLeft' && previous && onSelect) onSelect(previous);
            else if (event.key === 'ArrowRight' && next && onSelect) onSelect(next);
        },
        [onClose, onSelect, previous, next]
    );
    useEffect(() => {
        if (!node) return;
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [node, handleKey]);

    const markdownHtml = useMemo(
        () => (content && content.kind === 'markdown' ? renderMarkdown(content.text) : ''),
        [content]
    );
    const csvRows = useMemo(
        () => (content && content.kind === 'csv' ? parseDelimited(content.text) : []),
        [content]
    );

    if (!node) return null;

    const openInNewTab = () => {
        if (content && 'url' in content && canOpenInNewTab(node)) {
            window.open(content.url, '_blank', 'noopener');
        }
    };

    const renderBody = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-white/90">
                    <FileIcon node={node} size={64} className="mb-4 opacity-80" />
                    <div className="mb-4">{error}</div>
                    <button
                        type="button"
                        className="flex items-center rounded-lg bg-ve-collab-orange px-4 py-2 text-white cursor-pointer"
                        onClick={() => onDownload(node)}
                    >
                        <MdDownload className="mr-2" /> {t('fileshare_download')}
                    </button>
                </div>
            );
        }
        if (kind === 'none') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-white/90">
                    <FileIcon node={node} size={64} className="mb-4 opacity-80" />
                    <div className="mb-4">{t('fileshare_no_preview')}</div>
                    <button
                        type="button"
                        className="flex items-center rounded-lg bg-ve-collab-orange px-4 py-2 text-white cursor-pointer"
                        onClick={() => onDownload(node)}
                    >
                        <MdDownload className="mr-2" /> {t('fileshare_download')}
                    </button>
                </div>
            );
        }
        if (loading || !content) {
            return (
                <div className="flex items-center justify-center h-full">
                    <LoadingAnimation />
                </div>
            );
        }

        switch (content.kind) {
            case 'image':
                return (
                    <div className="flex items-center justify-center h-full p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={content.url}
                            alt={node.name}
                            className="max-h-full max-w-full object-contain rounded shadow-lg"
                        />
                    </div>
                );
            case 'pdf':
                return (
                    <iframe
                        src={content.url}
                        title={node.name}
                        className="w-full h-full bg-white rounded"
                    />
                );
            case 'video':
                return (
                    <div className="flex items-center justify-center h-full p-4">
                        <video
                            src={content.url}
                            controls
                            className="max-h-full max-w-full rounded shadow-lg"
                        />
                    </div>
                );
            case 'audio':
                return (
                    <div className="flex flex-col items-center justify-center h-full p-4">
                        <FileIcon node={node} size={64} className="mb-6 opacity-80" />
                        <audio src={content.url} controls className="w-full max-w-xl" />
                    </div>
                );
            case 'markdown':
                return (
                    <div className="h-full overflow-auto content-scrollbar bg-white rounded">
                        {showRawMarkdown ? (
                            <pre className="p-6 font-mono text-sm whitespace-pre-wrap break-words">
                                {content.text}
                            </pre>
                        ) : (
                            <div
                                className="markdown-preview max-w-3xl mx-auto p-6"
                                dangerouslySetInnerHTML={{ __html: markdownHtml }}
                            />
                        )}
                    </div>
                );
            case 'csv':
                return (
                    <div className="h-full overflow-auto content-scrollbar bg-white rounded p-2">
                        <table className="text-sm border-collapse">
                            <thead>
                                {csvRows.length > 0 && (
                                    <tr>
                                        {csvRows[0].map((cell, c) => (
                                            <th
                                                key={c}
                                                className="sticky top-0 bg-gray-100 border border-gray-200 px-2 py-1 text-left font-semibold whitespace-nowrap"
                                            >
                                                {cell}
                                            </th>
                                        ))}
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {csvRows.slice(1).map((row, r) => (
                                    <tr key={r} className="odd:bg-white even:bg-gray-50">
                                        {row.map((cell, c) => (
                                            <td
                                                key={c}
                                                className="border border-gray-200 px-2 py-1 whitespace-nowrap"
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'text':
                return (
                    <div className="h-full overflow-auto content-scrollbar bg-white rounded">
                        <pre
                            className={`p-6 font-mono text-sm ${
                                wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                            }`}
                        >
                            {content.text}
                        </pre>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-neutral-800/90"
            role="dialog"
            aria-modal="true"
        >
            {/* header */}
            <div className="flex items-center gap-2 px-4 py-2 text-white shrink-0">
                <FileIcon node={node} className="shrink-0" />
                <div className="min-w-0 grow">
                    <div className="truncate font-semibold" title={node.name}>
                        {node.name}
                    </div>
                    <div className="text-xs text-white/60">
                        {formatBytes(node.size)}
                        {node.content_type ? ` · ${node.content_type}` : ''}
                    </div>
                </div>
                {kind === 'text' && content && (
                    <button
                        type="button"
                        className={`p-2 rounded hover:bg-white/10 cursor-pointer ${
                            wrap ? 'text-white' : 'text-white/50'
                        }`}
                        onClick={() => setWrap(!wrap)}
                        title={t('fileshare_toggle_wrap')}
                    >
                        <MdWrapText size={22} />
                    </button>
                )}
                {kind === 'markdown' && content && (
                    <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border border-white/30 hover:bg-white/10 cursor-pointer"
                        onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                    >
                        {showRawMarkdown
                            ? t('fileshare_show_rendered')
                            : t('fileshare_show_source')}
                    </button>
                )}
                {content && 'url' in content && canOpenInNewTab(node) && (
                    <button
                        type="button"
                        className="p-2 rounded hover:bg-white/10 cursor-pointer"
                        onClick={openInNewTab}
                        title={t('fileshare_open_new_tab')}
                    >
                        <MdOpenInNew size={22} />
                    </button>
                )}
                <button
                    type="button"
                    className="p-2 rounded hover:bg-white/10 cursor-pointer"
                    onClick={() => onDownload(node)}
                    title={t('fileshare_download')}
                >
                    <MdDownload size={22} />
                </button>
                <button
                    type="button"
                    className="p-2 rounded hover:bg-white/10 cursor-pointer"
                    onClick={onClose}
                    title={t('common:close')}
                    aria-label={t('common:close')}
                >
                    <MdClose size={24} />
                </button>
            </div>

            {/* body */}
            <div className="relative grow min-h-0 px-4 pb-4">
                {previous && onSelect && (
                    <button
                        type="button"
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                        onClick={() => onSelect(previous)}
                        title={previous.name}
                    >
                        <MdNavigateBefore size={28} />
                    </button>
                )}
                {next && onSelect && (
                    <button
                        type="button"
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                        onClick={() => onSelect(next)}
                        title={next.name}
                    >
                        <MdNavigateNext size={28} />
                    </button>
                )}
                <div className="h-full mx-8">{renderBody()}</div>
            </div>
        </div>
    );
}
