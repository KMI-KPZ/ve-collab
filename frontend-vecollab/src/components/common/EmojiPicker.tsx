import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { RxFace } from 'react-icons/rx';
import LoadingAnimation from './LoadingAnimation';

const EmojiPickerPanel = dynamic(() => import('./EmojiPickerPanel'), {
    ssr: false,
    loading: () => (
        <div className="p-4 rounded-md bg-white shadow-sm border border-gray-200">
            <LoadingAnimation size="small" />
        </div>
    ),
});

interface Props {
    onSelect: (emoji: string) => void;
    buttonClassName?: string;
    // the placement of the picker, which is positioned absolutely, i.e.
    // relative to the closest positioned ancestor
    pickerClassName?: string;
    perLine?: number;
}

export default function EmojiPicker({
    onSelect,
    buttonClassName = '',
    pickerClassName = '',
    perLine = 9,
}: Props) {
    const { t } = useTranslation('common');

    const ref = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;

        // the picker lives in a shadow root, events from within arrive with
        // the picker element as their target, which is inside of `ref`
        const onPointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={ref} className="flex">
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setIsOpen(!isOpen)}
                title={t('insert_emoji')}
                aria-label={t('insert_emoji')}
                aria-expanded={isOpen}
            >
                <RxFace className="m-auto" />
            </button>
            {isOpen && (
                <div className={`absolute z-20 ${pickerClassName}`}>
                    <EmojiPickerPanel
                        perLine={perLine}
                        onSelect={(emoji) => {
                            setIsOpen(false);
                            onSelect(emoji);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
