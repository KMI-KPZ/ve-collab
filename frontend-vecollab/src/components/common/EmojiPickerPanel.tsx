import data from '@emoji-mart/data';
import i18nDe from '@emoji-mart/data/i18n/de.json';
import Picker from '@emoji-mart/react';
import { useRouter } from 'next/router';

export interface EmojiPickerPanelProps {
    onSelect: (emoji: string) => void;
    perLine: number;
}

export default function EmojiPickerPanel({ onSelect, perLine }: EmojiPickerPanelProps) {
    const { locale } = useRouter();

    return (
        <Picker
            data={data}
            locale={locale === 'de' ? 'de' : 'en'}
            i18n={locale === 'de' ? i18nDe : undefined}
            onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
            perLine={perLine}
            previewPosition="none"
        />
    );
}
