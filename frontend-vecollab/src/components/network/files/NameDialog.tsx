import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import Dialog from '@/components/profile/Dialog';
import { useTranslation } from 'next-i18next';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { splitName } from './fileUtils';

interface Props {
    isOpen: boolean;
    title: string;
    label: string;
    submitLabel: string;
    initialValue?: string;
    selectStemOnly?: boolean; //pre-select only the stem of a file name (keep the extension)
    maxLength?: number;
    error?: string | null;
    isSubmitting?: boolean;
    onSubmit: (name: string) => void;
    onClose: () => void;
}

/**
 * dialog with a single text input, used for creating folders and
 * renaming files/folders
 */
export default function NameDialog({
    isOpen,
    title,
    label,
    submitLabel,
    initialValue = '',
    selectStemOnly = false,
    maxLength,
    error,
    isSubmitting = false,
    onSubmit,
    onClose,
}: Props) {
    const { t } = useTranslation(['community', 'common']);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // reset and focus the input whenever the dialog is opened
    useEffect(() => {
        if (!isOpen) return;
        setValue(initialValue);
        // wait for the dialog to render before focusing
        const timer = setTimeout(() => {
            const input = inputRef.current;
            if (!input) return;
            input.focus();
            if (selectStemOnly) {
                input.setSelectionRange(0, splitName(initialValue).stem.length);
            } else {
                input.select();
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [isOpen, initialValue, selectStemOnly]);

    const trimmed = value.trim();
    const localError =
        trimmed !== '' && /[\\/\x00-\x1f\x7f]/.test(trimmed)
            ? t('fileshare_error_invalid_name')
            : null;
    const canSubmit = trimmed !== '' && !localError && !isSubmitting && trimmed !== initialValue;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(trimmed);
    };

    return (
        <Dialog isOpen={isOpen} title={title} onClose={onClose}>
            <form onSubmit={handleSubmit} className="w-[min(28rem,80vw)]">
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    maxLength={maxLength}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-ve-collab-blue"
                    disabled={isSubmitting}
                />
                {(localError || error) && (
                    <div className="mt-2 text-sm text-red-700">{localError || error}</div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <ButtonSecondary label={t('common:cancel')} onClick={onClose} />
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`py-2 px-4 rounded-lg text-white ${
                            canSubmit
                                ? 'bg-ve-collab-orange hover:shadow-button-primary cursor-pointer'
                                : 'bg-ve-collab-orange-light cursor-default'
                        }`}
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
