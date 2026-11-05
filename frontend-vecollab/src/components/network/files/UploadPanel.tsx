import { useTranslation } from 'next-i18next';
import { MdCheckCircle, MdClose, MdErrorOutline } from 'react-icons/md';
import { formatBytes } from './fileUtils';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadItem {
    id: string;
    file: File;
    progress: number;
    status: UploadStatus;
    error?: string;
}

interface Props {
    uploads: UploadItem[];
    onClear: () => void;
}

export default function UploadPanel({ uploads, onClear }: Props) {
    const { t } = useTranslation('community');

    if (uploads.length === 0) return null;

    const finished = uploads.every((u) => u.status === 'done' || u.status === 'error');

    return (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                <span className="text-sm font-semibold text-slate-900">
                    {finished ? t('fileshare_uploads_finished') : t('fileshare_uploading')}
                </span>
                {finished && (
                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                        onClick={onClear}
                        aria-label={t('fileshare_close_uploads')}
                    >
                        <MdClose />
                    </button>
                )}
            </div>
            <ul className="max-h-48 overflow-y-auto content-scrollbar">
                {uploads.map((upload) => (
                    <li key={upload.id} className="px-3 py-1.5 text-sm">
                        <div className="flex items-center min-w-0">
                            <span className="truncate grow" title={upload.file.name}>
                                {upload.file.name}
                            </span>
                            <span className="ml-2 text-gray-500 shrink-0">
                                {formatBytes(upload.file.size)}
                            </span>
                            <span className="ml-2 shrink-0">
                                {upload.status === 'done' && (
                                    <MdCheckCircle className="text-green-600" />
                                )}
                                {upload.status === 'error' && (
                                    <MdErrorOutline className="text-red-600" />
                                )}
                            </span>
                        </div>
                        {upload.status === 'error' ? (
                            <div className="text-xs text-red-700">{upload.error}</div>
                        ) : (
                            <div className="mt-1 h-1.5 w-full rounded bg-gray-200">
                                <div
                                    className={`h-1.5 rounded ${
                                        upload.status === 'done'
                                            ? 'bg-green-600'
                                            : 'bg-ve-collab-blue'
                                    }`}
                                    style={{
                                        width: `${Math.round(
                                            (upload.status === 'done' ? 1 : upload.progress) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
