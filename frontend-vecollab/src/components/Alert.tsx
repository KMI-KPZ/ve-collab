import { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

export type AlertTypes = 'info'|'warning'|'error'

export type AlertState = { open: false }|{ open?: true, type?: AlertTypes, message: string }

interface Props {
    message: string|JSX.Element;
    type?: AlertTypes
    onClose?: () => void;

    /** autoclose alert in x ms. This triggers also the onClose callback */
    autoclose?: number;
}

// interface PropsExt extends Props {
//     children: JSX.Element
// }

/*
TODO: add type: success/info/warning/error
render a dialog modal with variable content
both the "X" in top right corner and clicking anywhere outside the dialog close it.
control structures need to be added from outside:
- onClose: is the callback triggered when the "X" or anywhere outside the modal is clicked
- children: content that is rendered inside the modal
*/
export default function Alert({ type, autoclose, onClose, message}: Props) {

    const [open, setOpen] = useState(true);

    // TODO handle type

    useEffect(() => {
        if (autoclose) {
            setTimeout(() => {
                setOpen(false)
                if (onClose) onClose()
            }, autoclose);
        }
    }, [autoclose, onClose])

    return (
        <>
            {open ? (
                <div className="fixed inset-0 z-50 items-center" onClick={onClose}>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 flex bg-ve-collab-blue/75 text-white rounded-xl p-2 border border-ve-collab-blue shadow-md shadow-white/25">
                        <div className='m-2 font-bold'>{message}</div>
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
            ) : (
                <></>
            )}
        </>
    );
}
