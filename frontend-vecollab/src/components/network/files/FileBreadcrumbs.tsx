import { BackendFilePathSnippet } from '@/interfaces/api/apiInterfaces';
import { useTranslation } from 'next-i18next';
import { Fragment } from 'react';
import { MdChevronRight, MdHome } from 'react-icons/md';
import { SYSTEM_FOLDER_POST_FILES } from './fileUtils';

interface Props {
    path: BackendFilePathSnippet[];
    onNavigate: (folderId: string | null) => void;
}

export default function FileBreadcrumbs({ path, onNavigate }: Props) {
    const { t } = useTranslation('community');

    const label = (snippet: BackendFilePathSnippet) =>
        snippet.system === SYSTEM_FOLDER_POST_FILES
            ? t('fileshare_post_files_folder')
            : snippet.name;

    return (
        <nav
            className="flex items-center flex-wrap text-sm text-gray-600 min-w-0"
            aria-label="breadcrumb"
        >
            <button
                type="button"
                className={`flex items-center rounded px-1 py-0.5 cursor-pointer hover:bg-gray-100 ${
                    path.length === 0 ? 'font-semibold text-slate-900' : ''
                }`}
                onClick={() => onNavigate(null)}
            >
                <MdHome className="mr-1" />
                {t('fileshare')}
            </button>
            {path.map((snippet, index) => {
                const isLast = index === path.length - 1;
                return (
                    <Fragment key={snippet._id}>
                        <MdChevronRight className="text-gray-400 shrink-0" />
                        {isLast ? (
                            <span className="px-1 py-0.5 font-semibold text-slate-900 truncate max-w-[16rem]">
                                {label(snippet)}
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="rounded px-1 py-0.5 cursor-pointer hover:bg-gray-100 truncate max-w-[16rem]"
                                onClick={() => onNavigate(snippet._id)}
                            >
                                {label(snippet)}
                            </button>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
