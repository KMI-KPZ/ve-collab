import { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

/**
 * Alert Component, can be used in different ways. Examples:
 *
 * 1)
 * <Alert message={"Foo Bar!"} autoclose={2000} onClose={() => ...} ... />
 *
 * 2)
 * <Alert><div>Foo Bar!</div></Alert>
 *
 * 3)
 * const alertState: AlertState = {message: "Foo Bar"}
 * <Alert state={alertState} />
 *
 */

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
export default function Alert({state, open=true, type='info', children, message, autoclose, onClose}: AlertState|AlertStateState) {

    const typedStyles = {
        info: 'bg-ve-collab-blue/85 border-ve-collab-blue',
        warning: 'bg-ve-collab-orange/85 border-ve-collab-orange',
        error: 'bg-red-500/85 border-red-500'
    }

    const {
        open: _open,
        type: _type,
        children: _children,
        message: _message,
        autoclose: _autoclose,
        onClose: _onClose
    } = state || {open, type, children, message, autoclose, onClose}

    const [iamOpen, setIamOpen] = useState(typeof _open !== 'undefined' ? _open : true)

    useEffect(() => {
        if (typeof _open !== 'undefined') setIamOpen(_open)
        if (_autoclose) {
            setTimeout(() => {
                setIamOpen(false)
                if (_onClose) _onClose()
            }, _autoclose);
        }
    }, [_open, _autoclose, _onClose])

    const handleClose = () => {
        setIamOpen(false)
        if (_onClose) _onClose()

    }

    if (!_message && !_children) return (<></>)

    if (!iamOpen) return (<></>)

    return (
        <div className="fixed inset-0 z-50 items-center" onClick={handleClose}>
            <div className={`${typedStyles[_type||'info']} absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 flex text-white rounded-xl p-2 border shadow-md shadow-white/25`}>
                <div className='m-2 font-bold'>{_children ? _children : _message}</div>
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