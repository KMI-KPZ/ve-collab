import { useTranslation } from 'next-i18next';
import React from 'react';

interface PopupProps {
    isOpen: boolean;
    type?: 'unsaved' | 'invalid';
    handleCancel: () => void;
    handleContinue: () => void;
}

export default function PopupSaveData({
    isOpen,
    type = 'unsaved',
    handleContinue,
    handleCancel,
}: PopupProps): JSX.Element {
    const { t } = useTranslation(['designer', 'common']);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 bg-opacity-75 p-4 md:p-8">
                    <div className="relative top-20 bg-white rounded-lg shadow-md mx-auto w-full md:w-1/2">
                        <div className="p-4">
                            {type == 'unsaved' ? (
                                <>
                                    <h5 className="text-xl font-medium mb-4">
                                        {t('unsaved_changes')}
                                    </h5>
                                    <p className="text-gray-700 mb-6">
                                        {t('unsaved_changes_text')}
                                        <br />
                                        {t('common:are_you_sure')}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h5 className="text-xl font-medium mb-4">
                                        {t('invalid_data')}
                                    </h5>
                                    <p className="text-gray-700 mb-6">{t('invalid_data_text')}</p>
                                </>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow-sm bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange cursor-pointer"
                                    onClick={handleCancel}
                                >
                                    {t('common:back')}
                                </button>
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow-sm border border-ve-collab-orange text-ve-collab-orange rounded-full cursor-pointer"
                                    onClick={handleContinue}
                                >
                                    {t('proceed_without_saving')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
