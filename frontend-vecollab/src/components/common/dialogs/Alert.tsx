import { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

/**
 * Alert Component, can be used in different ways. Examples:
 *
 * 1)
 * <Alert open={true} message={"Foo Bar!"} autoclose={2000} onClose={() => ...} ... />
 *
 * 2)
 * {true && (<Alert><div>Foo Bar!</div></Alert>)}
 *
 * 3)
 * const [alert, setAlert] = useState<AlertState>({open: false});
 * setAlert({message: "Foo Bar", onClose: () => {setAlert({open: false})}})
 * <Alert state={alertState} />
 *
 */

export type AlertTypes = 'info' | 'success' | 'warning' | 'error';

export type AlertState = AlertStateClose | AlertStateMessage | AlertStateChildren;

interface AlertStateClose extends AlertNever {
    state?: never;
    open: false;
}
interface AlertStateChildren extends AlertBase {
    state?: never;
    children?: never;
    message: string;
}
interface AlertStateMessage extends AlertBase {
    state?: never;
    children: JSX.Element;
    message?: never;
}

interface AlertStateState extends AlertNever {
    state: AlertState;
    open?: never;
}

interface AlertBase {
    state?: never;
    open?: boolean;
    type?: AlertTypes;
    autoclose?: number;
    onClose?: (() => void) | void;
    // TODDO may introduce option to pass setState ?
    // setState?: Dispatch<SetStateAction<AlertState>>
}

interface AlertNever {
    type?: never;
    children?: never;
    message?: never;
    onClose?: never;
    autoclose?: never;
}

export default function Alert({
    state,
    open = true,
    type = 'info',
    children,
    message,
    autoclose,
    onClose,
}: AlertState | AlertStateState) {
    // [#159642]/[.90]
    const typedStyles = {
        info: 'bg-gray-100/[.90] border-gray-300',
        success: 'bg-[rgba(112,206,162,0.9)] border-green-700',
        warning: 'bg-ve-collab-orange/[.90] border-orange-700',
        error: 'bg-red-500/[.90] border-red-700',
    };

    const {
        open: _open,
        type: _type,
        children: _children,
        message: _message,
        autoclose: _autoclose,
        onClose: _onClose,
    } = state || { open, type, children, message, autoclose, onClose };

    const [iamOpen, setIamOpen] = useState(false);

    useEffect(() => {
        setIamOpen(typeof _open !== 'undefined' ? _open : true);
        if (_autoclose) {
            setTimeout(() => {
                setIamOpen(false);
                if (_onClose) _onClose();
            }, _autoclose);
        }
    }, [_open, _autoclose, _onClose]);

    const handleClose = () => {
        setIamOpen(false);
        if (_onClose) _onClose();
    };

    if (!_message && !_children) return <></>;

    if (!iamOpen) return <></>;

    return (
        <div className="fixed inset-x-0 bottom-0 w-full z-50 items-center" style={{ color: 'red' }}>
            <div
                className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-80 flex rounded-xl p-2 border-2 shadow-white/25 text-slate-900 ${
                    typedStyles[_type || 'info']
                }`}
            >
                <div className="m-2 font-bold">{_children ? _children : _message}</div>
                <div className="m-2 ml-auto">
                    <button
                        className="relative -top-[28px] -right-[28px] text-black top bg-white rounded-full shadow-sm border border-gray-200 cursor-pointer p-2 hover:bg-slate-50"
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
