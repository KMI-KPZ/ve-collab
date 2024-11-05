import React from 'react';
import { RxCross1 } from 'react-icons/rx';

interface Props {
    isOpen: boolean;
    title: string|React.ReactNode;
    onClose: () => void;
    children: JSX.Element | JSX.Element[];
}

/*
render a dialog modal with variable content
both the "X" in top right corner and clicking anywhere outside the dialog close it.
control structures need to be added from outside:
- isOpen: controls to state if the dialog is rendered or not
- onClose: is the callback triggered when the "X" or anywhere outside the modal is clicked
  it should set isOpen to false to hide the modal.
- title: if self explanatory - a simple title in bold font
- children: content that is rendered inside the modal
*/
export default function Dialog({ isOpen, title, onClose, children }: Props) {
    return (
        <>
            {isOpen ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
                    <div className="relative bg-white rounded-lg p-6 m-6 max-w-screen-xl">
                        <div className="flex justify-between items-center mb-4">
                            {typeof title === 'string' && (
                                <h2 className="text-xl font-bold">{title}</h2>
                            )}
                            {React.isValidElement(title) && <>{title}</>}
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                <RxCross1 />
                            </button>
                        </div>
                        {children}
                    </div>
                </div>
            ) : (
                <></>
            )}
        </>
    );
}
