import { MouseEvent, useEffect, useRef, useState } from "react";
import { HiDotsHorizontal } from "react-icons/hi";
import { MdDeleteOutline, MdModeEdit } from "react-icons/md";

interface Props {
    options: { value: string, label: string, icon: JSX.Element }[];
    onSelect: (value: string) => void;
}

export default function MyDropdown({
    options,
    onSelect
}: Props) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<null | HTMLDivElement>(null);

    // detect a click outside of element
    function useClickOutside(ref: { current: null | HTMLDivElement }, onClickOutside: () => void) {
        useEffect(() => {
            function handleClickOutside(event: { target: any; }) {
                if (ref.current && !ref.current.contains(event.target)) {
                    onClickOutside();
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [ref, onClickOutside]);
    }

    useClickOutside(wrapperRef, () => {
        setOpen(false);
    });

    const _handleSelect = (value: string) => {
        onSelect(value)
        setOpen(false)
    }

    return (
        <div className="inline" ref={wrapperRef}>
            <button className="p-2 rounded-full hover:bg-ve-collab-blue-light" onClick={() => setOpen(!open)}><HiDotsHorizontal /></button>

            {open && (
                <ul className="absolute ml-1/2 rounded-lg bg-white p-2 ring ring-ve-collab-orange">
                    {options.map((a, i) => (
                        <li
                            key={i}
                            onClick={() => _handleSelect(a.value)}
                            className="flex items-center hover:cursor-pointer"
                        >
                            {a.icon}
                            <span className="mx-2">{a.label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
