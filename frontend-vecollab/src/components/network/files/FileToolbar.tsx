import { useTranslation } from 'next-i18next';
import { ChangeEvent, useRef } from 'react';
import { MdClose, MdCreateNewFolder, MdSearch, MdUploadFile } from 'react-icons/md';

interface Props {
    canUpload: boolean; // in the current folder, with the current permissions
    uploadDisabledHint: string;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onUpload: (files: File[]) => void;
    onCreateFolder: () => void;
}

/**
 * upload and new folder buttons as well as the search field of the file browser
 */
export default function FileToolbar({
    canUpload,
    uploadDisabledHint,
    searchInput,
    onSearchInputChange,
    onUpload,
    onCreateFolder,
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) onUpload(Array.from(event.target.files));
        event.target.value = '';
    };

    return (
        <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
                type="button"
                className={`flex items-center rounded-lg px-3 py-2 text-sm text-white ${
                    canUpload
                        ? 'bg-ve-collab-orange hover:shadow-button-primary cursor-pointer'
                        : 'bg-ve-collab-orange-light cursor-not-allowed'
                }`}
                disabled={!canUpload}
                onClick={() => fileInputRef.current?.click()}
                title={canUpload ? '' : uploadDisabledHint}
            >
                <MdUploadFile className="mr-1.5" size={18} />
                {t('upload')}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onFileInputChange}
            />
            <button
                type="button"
                className={`flex items-center rounded-lg border px-3 py-2 text-sm ${
                    canUpload
                        ? 'border-ve-collab-orange text-slate-900 hover:bg-ve-collab-orange-light cursor-pointer'
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!canUpload}
                onClick={onCreateFolder}
            >
                <MdCreateNewFolder className="mr-1.5" size={18} />
                {t('fileshare_new_folder')}
            </button>

            <div className="grow" />

            <div className="relative w-full sm:w-64">
                <MdSearch
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                />
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => onSearchInputChange(e.target.value)}
                    placeholder={t('fileshare_search_placeholder')}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-8 text-sm focus:outline-none focus:border-ve-collab-blue"
                />
                {searchInput !== '' && (
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                        onClick={() => onSearchInputChange('')}
                        aria-label={t('fileshare_clear_search')}
                    >
                        <MdClose />
                    </button>
                )}
            </div>
        </div>
    );
}
