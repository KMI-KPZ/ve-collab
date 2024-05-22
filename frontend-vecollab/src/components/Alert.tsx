import { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

export type AlertTypes = 'info'|'warning'|'error'

export type AlertState = AlertStateClose|AlertStateMessage|AlertStateChildren

interface AlertStateClose extends AlertNever {
    state?: never,
    open: false
}
interface AlertStateChildren extends AlertBase {
    state?: never,
    children?: never,
    message: string
}
interface AlertStateMessage extends AlertBase {
    state?: never,
    children: JSX.Element,
    message?: never
}

interface AlertStateState extends AlertNever {
    state: AlertState,
    open?: never,
}

interface AlertBase {
    state?: never,
    open?: boolean,
    type?: AlertTypes,
    autoclose?: number
    onClose?: () => void,
}

interface AlertNever {
    type?: never,
    children?: never,
    message?: never,
    onClose?: never,
    autoclose?: never
}

/*
TODO: add type: success/info/warning/error
*/
export default function Alert({state, open=true, type, children, message, autoclose, onClose}: AlertState|AlertStateState) {

    const [iamOpen, setIamOpen] = useState(typeof open !== 'undefined' ? open : true);

    useEffect(() => {
        if (typeof open !== 'undefined') setIamOpen(open)
        if (autoclose) {
            setTimeout(() => {
                setIamOpen(false)
                if (onClose) onClose()
            }, autoclose);
        }
    }, [open, autoclose, onClose])

    const handleClose = () => {
        setIamOpen(false)
        if (onClose) onClose()
    }

    if (!message && !children) return (<></>)

    if (!iamOpen) return (<></>)

    return (
        <div className="fixed inset-0 z-50 items-center" onClick={handleClose}>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 flex bg-ve-collab-blue/75 text-white rounded-xl p-2 border border-ve-collab-blue shadow-md shadow-white/25">
                <div className='m-2 font-bold'>{children ? children : message}</div>
                <div className="m-2 ml-auto">
                    <button
                        className="text-white hover:text-gray-200"
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        <IoMdClose />
                    </button>
                </div>
            </div>
        </div>
    );
}