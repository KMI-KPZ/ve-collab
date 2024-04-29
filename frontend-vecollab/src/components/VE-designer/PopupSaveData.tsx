import React from 'react';

interface PopupProps {
    isOpen: boolean;
    handleCancel: () => void;
    handleContinue: () => void;
}

export default function PopupSaveData({
    isOpen,
    handleContinue,
    handleCancel,
}: PopupProps): JSX.Element {
    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 p-4 md:p-8">
                    <div className="relative bg-white rounded-lg shadow-md mx-auto w-full md:w-1/2">
                        <div className="p-4">
                            <h5 className="text-xl font-medium mb-4">Bist du sicher?</h5>
                            <p className="text-gray-700 mb-6">
                                Deine Änderungen auf der aktuellen Seite werden nicht gespeichert.
                                Bitte vervollständige oder korregiere deine Daten.
                            </p>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="text-white bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                    onClick={handleContinue}
                                >
                                    Weiter ohne speichern
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
