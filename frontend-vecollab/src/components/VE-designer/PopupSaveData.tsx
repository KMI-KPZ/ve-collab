import { useTranslation } from 'next-i18next';
import React from 'react';

interface PopupProps {
    isOpen: boolean;
    type?: "unsaved"|"invalid"
    handleCancel: () => void;
    handleContinue: () => void;
}

export default function PopupSaveData({
    isOpen,
    type="unsaved",
    handleContinue,
    handleCancel,
}: PopupProps): JSX.Element {
    const { t } = useTranslation('common');

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 p-4 md:p-8">
                    <div className="relative bg-white rounded-lg shadow-md mx-auto w-full md:w-1/2">
                        <div className="p-4">
                            {type == "unsaved" ? (
                                <>
                                    <h5 className="text-xl font-medium mb-4">{t("designer_wrapper_unsaved_changes")}</h5>
                                    <p className="text-gray-700 mb-6">
                                        {t("designer_wrapper_unsaved_changes_text")}
                                        <br />
                                        {t("are_you_sure")}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h5 className="text-xl font-medium mb-4">{t("designer_wrapper_invalid_data")}</h5>
                                    <p className="text-gray-700 mb-6">
                                        {t("designer_wrapper_invalid_data_text")}
                                    </p>
                                </>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                                    onClick={handleCancel}
                                >
                                    {t("back")}
                                </button>
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
                                    onClick={handleContinue}
                                >
                                    {t("proceed_without_saving")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
