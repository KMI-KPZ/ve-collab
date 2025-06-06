import { useEffect, useRef, useState } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';

interface Props {
    options:
        | {
              value: string;
              label: string | JSX.Element;
              title?: string;
              liClasses?: string;
              icon?: JSX.Element;
          }[]
        | JSX.Element[];
    icon?: JSX.Element;
    wrapperClassNames?: string;
    ulClasses?: string;
    onSelect?: (value: string) => void;
    isNoAuthPreview?: boolean;
}

export default function Dropdown({
    options,
    icon = <HiDotsHorizontal />,
    wrapperClassNames = '',
    ulClasses = '',
    onSelect,
    isNoAuthPreview = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<null | HTMLDivElement>(null);

    // detect a click outside of element
    function useClickOutside(ref: { current: null | HTMLDivElement }, onClickOutside: () => void) {
        useEffect(() => {
            function handleClickOutside(event: { target: any }) {
                if (ref.current && !ref.current.contains(event.target)) {
                    onClickOutside();
                }
            }
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [ref, onClickOutside]);
    }

    useClickOutside(wrapperRef, () => {
        setOpen(false);
    });

    const _handleSelect = (value: string) => {
        if (onSelect) onSelect(value);
        setOpen(false);
    };

    return (
        <div className={`${wrapperClassNames} inline relative`} ref={wrapperRef}>
            <button
                className="p-2 cursor-pointer"
                type="button"
                onClick={() => setOpen(!open)}
                disabled={isNoAuthPreview}
            >
                {icon}
            </button>

            {open && (
                <ul
                    className={`${ulClasses} absolute z-40 right-0 left-auto p-2 rounded-md bg-white shadow-sm border border-gray-200`}
                >
                    {options.map((element, i) => {
                        return 'value' in element ? (
                            <li
                                key={i}
                                title={element.title}
                                onClick={() => _handleSelect(element.value)}
                                className={`flex px-2 py-1 items-center hover:cursor-pointer hover:bg-ve-collab-blue-light rounded-lg ${element.liClasses}`}
                            >
                                {typeof element.label === 'string' ? (
                                    <>
                                        {element.icon}
                                        <span className="mx-2 truncate">{element.label}</span>
                                    </>
                                ) : (
                                    element.label
                                )}
                            </li>
                        ) : (
                            element
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
