import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

interface Props {
    reportedItemId: string;
    reportedItemType: 'post' | 'comment' | 'plan' | 'profile' | 'group' | 'message';
    closeCallback: () => void;
}

export default function ReportDialog({ reportedItemId, reportedItemType, closeCallback }: Props) {
    const { t } = useTranslation('common');
    const { data: session } = useSession();

    const [reason, setReason] = useState<string>('');

    useEffect(() => {
        const keyDownHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeCallback();
            }
        };

        document.addEventListener('keydown', keyDownHandler);

        return () => {
            document.removeEventListener('keydown', keyDownHandler);
        };
    }, [closeCallback]);

    const handleSubmit = async (e: MouseEvent<HTMLElement>, execute: boolean) => {
        e.stopPropagation();

        if (execute) {
            await fetchPOST(
                '/report/submit',
                {
                    type: reportedItemType,
                    item: reportedItemId,
                    reason: reason,
                },
                session?.accessToken
            );
        }

        closeCallback();
    };

    return (
        <div className="fixed inset-0 z-40 bg-gray-900/50">
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 md:w-[28rem] sm:w-80 rounded-lg p-2 bg-white border shadow-sm">
                <div className="absolute right-0 top-0 p-2">
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={(e) => handleSubmit(e, false)}
                    >
                        <IoMdClose />
                    </button>
                </div>
                <div className="flex flex-col p-2">
                    <div className="font-bold">
                        {t('report.report_dialog_title', { type: t('report.report_types.post') })}
                    </div>
                    {reportedItemType === 'post' && (
                        <div className="my-2">
                            <p className="mb-2">
                                {t('report.report_description', {
                                    type: t('report.report_types.post'),
                                })}
                            </p>
                            <textarea
                                rows={3}
                                value={reason}
                                className="w-full p-2 border rounded-lg"
                                placeholder={t('report.report_reason_placeholder')}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    )}
                    {reportedItemType === 'comment' && <></>}
                    {reportedItemType === 'plan' && <></>}
                    {reportedItemType === 'profile' && <></>}
                    {reportedItemType === 'group' && <></>}
                    {reportedItemType === 'message' && <></>}
                    <div className="flex justify-between mt-2">
                        <button
                            className="py-2 px-6 m-2 rounded-lg ring-2 ring-inset ring-ve-collab-orange"
                            onClick={(e) => handleSubmit(e, false)}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            className="py-2 px-6 m-2 bg-ve-collab-orange rounded-lg text-white"
                            onClick={(e) => handleSubmit(e, true)}
                        >
                            {t('send')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
