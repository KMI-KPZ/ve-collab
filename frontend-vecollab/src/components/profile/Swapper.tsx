import { FormEvent } from 'react';
import { RxArrowUp, RxArrowDown, RxTrash } from 'react-icons/rx';

interface Props {
    index: number;
    arrayLength: number;
    children: JSX.Element | JSX.Element[];
    swapCallback: (e: FormEvent, firstIndex: number, secondIndex: number) => void;
    deleteCallback: (e: FormEvent, index: number) => void;
}

// provide buttons next to "children" that triggers the callbacks
// for swapping and deleting the items within the lists
export default function Swapper({
    index,
    arrayLength,
    children,
    swapCallback,
    deleteCallback,
}: Props) {
    return (
        <div className="flex">
            {children}
            <div className="flex min-w-[10%] justify-end">
                {index !== 0 && (
                    <button
                        onClick={(e) => {
                            swapCallback(e, index - 1, index);
                        }}
                    >
                        <RxArrowUp size={20} color='gray'/>
                    </button>
                )}
                {/* use same for min-w as for icon size*/}
                <div className="flex items-center min-w-[20px]">
                    {index !== arrayLength - 1 && (
                        <button
                            onClick={(e) => {
                                swapCallback(e, index, index + 1);
                            }}
                        >
                            <RxArrowDown size={20} color='gray'/>
                        </button>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        deleteCallback(e, index);
                    }}
                >
                    <RxTrash size={20} color='gray'/>
                </button>
            </div>
        </div>
    );
}
