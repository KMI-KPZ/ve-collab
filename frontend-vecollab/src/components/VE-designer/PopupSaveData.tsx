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
    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 p-4 md:p-8">
                    <div className="relative bg-white rounded-lg shadow-md mx-auto w-full md:w-1/2">
                        <div className="p-4">
                            {type == "unsaved" ? (
                                <>
                                    <h5 className="text-xl font-medium mb-4">Ungespeicherte Daten</h5>
                                    <p className="text-gray-700 mb-6">
                                        Deine Änderungen auf der aktuellen Seite werden nicht gespeichert und gehen verloren.<br />
                                        Bist du sicher?
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h5 className="text-xl font-medium mb-4">Invalide Daten</h5>
                                    <p className="text-gray-700 mb-6">
                                        Deine Eingaben sind nicht zulässig und können nicht gespeichert werden.
                                    </p>
                                </>
                            )}

                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow bg-ve-collab-orange text-white rounded-full hover:bg-ve-collab-orange"
                                    onClick={handleCancel}
                                >
                                    Zurück
                                </button>
                                <button
                                    type="button"
                                    className="mx-2 px-4 py-2 shadow border border-ve-collab-orange text-ve-collab-orange rounded-full"
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
