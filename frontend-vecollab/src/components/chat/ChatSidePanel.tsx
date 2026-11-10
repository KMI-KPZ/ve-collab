import { useTranslation } from 'next-i18next';
import { ReactNode } from 'react';
import { MdClose } from 'react-icons/md';

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

export default function ChatSidePanel({ title, onClose, children }: Props) {
    const { t } = useTranslation('common');

    return (
        <div className="flex h-full flex-col">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                    title={t('close')}
                    aria-label={t('close')}
                >
                    <MdClose size={18} />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto content-scrollbar">{children}</div>
        </div>
    );
}
