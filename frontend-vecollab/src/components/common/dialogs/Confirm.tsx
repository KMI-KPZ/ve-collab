import { useTranslation } from 'next-i18next';
import { MouseEvent, useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';

/**
 * Simple Confirm Component
 *
 * Usage:
 * <ConfirmDialog message="Sure?" handler={proceed => {
 *      if (proceed) {
 *          // yes
 *      }
 * }} />
 */

interface Props {
    message: string;
    callback: (proceed: boolean) => any;
}

export default function ConfirmDialog({ message, callback }: Props) {
    const { t } = useTranslation('common');

    useEffect(() => {
        const keyDownHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                callback(false);
            }
        };

        document.addEventListener('keydown', keyDownHandler);

        return () => {
            document.removeEventListener('keydown', keyDownHandler);
        };
    }, [callback]);

    const handleClick = (e: MouseEvent<HTMLElement>, proceed: boolean) => {
        e.stopPropagation();
        callback(proceed);
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-900/50" onClick={(e) => handleClick(e, false)}>
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-80 rounded-lg p-2 bg-white border border-gray-200 shadow-xs">
                <div className="absolute right-0 top-0 p-2">
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={(e) => handleClick(e, false)}
                        aria-label="Close"
                    >
                        <IoMdClose />
                    </button>
                </div>

                <div className="flex flex-col p-2">
                    <div className="font-bold">{message}</div>
                    <div className="m-auto mt-2">
                        <button
                            className="py-2 px-6 m-2 bg-ve-collab-orange rounded-lg text-white"
                            onClick={(e) => handleClick(e, true)}
                            aria-label="Yes"
                            autoFocus
                        >
                            {t("yes")}
                        </button>
                        <button
                            className="py-2 px-6 m-2 rounded-lg ring-2 ring-inset ring-ve-collab-orange"
                            onClick={(e) => handleClick(e, false)}
                            aria-label="No"
                        >
                            {t("no")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
