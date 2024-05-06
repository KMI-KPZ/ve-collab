import { IoMdClose } from 'react-icons/io';

interface Props {
    onClose: () => void;
    children: string|JSX.Element;
    // TODO may use pro message instead children
}

/*
TODO: add type: success/info/warning/error
render a dialog modal with variable content
both the "X" in top right corner and clicking anywhere outside the dialog close it.
control structures need to be added from outside:
- onClose: is the callback triggered when the "X" or anywhere outside the modal is clicked
- children: content that is rendered inside the modal
*/
export default function Alert({ onClose, children }: Props) {
    return (
        <div className="fixed inset-0 z-50 items-center" onClick={onClose}>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 flex bg-ve-collab-blue/75 text-white rounded-lg p-2 border border-ve-collab-blue shadow-sm">
                <div className='m-2 font-bold'>{children}</div>
                <div className="m-2 ml-auto">
                    <button
                        className="text-white hover:text-gray-200"
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
