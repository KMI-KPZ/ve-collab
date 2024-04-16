import { IoMdClose } from 'react-icons/io';

interface Props {
    onClose: () => void;
    children: JSX.Element;
}

/*
render a dialog modal with variable content
both the "X" in top right corner and clicking anywhere outside the dialog close it.
control structures need to be added from outside:
- onClose: is the callback triggered when the "X" or anywhere outside the modal is clicked
- children: content that is rendered inside the modal
*/
export default function Alert({ onClose, children }: Props) {
    return (
        <div className="fixed inset-0 z-50 items-center" onClick={onClose}>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex bg-white rounded-lg p-2 border shadow">
                <div className='m-2'>{children}</div>
                <div className="m-2">
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <IoMdClose />
                    </button>
                </div>
            </div>
        </div>
    );
}
