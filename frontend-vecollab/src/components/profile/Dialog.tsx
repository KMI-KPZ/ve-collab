import { RxCross1 } from 'react-icons/rx';

interface Props {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: JSX.Element | JSX.Element[];
}

export default function Dialog({ isOpen, title, onClose, children }: Props) {
    return (
        <>
            {isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
                    <div className="relative bg-white rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                <RxCross1 />
                            </button>
                        </div>
                        <div>{children}</div>
                    </div>
                </div>
            ) : (
                <></>
            )}
        </>
    );
}
