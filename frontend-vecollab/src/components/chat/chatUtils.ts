import { BackendChatFile, BackendChatFileLimits } from '@/interfaces/api/apiInterfaces';
import { format, isToday, isYesterday } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { PreviewableFile, formatBytes } from '../network/files/fileUtils';

/**
 * the id of the list element of a message, used to jump to it
 */
export const messageElementId = (messageId: string) => `chat-message-${messageId}`;

/**
 * files sent in a chat are shown and previewed with the components of the group file share
 */
export function toPreviewableFile(file: BackendChatFile): PreviewableFile {
    return {
        _id: file.file_id,
        type: 'file',
        name: file.file_name,
        file_id: file.file_id,
        content_type: file.content_type,
        size: file.size,
    };
}

/**
 * the date-fns locale matching the current language
 */
export function useDateLocale() {
    const router = useRouter();
    return router.locale === 'de' ? de : enGB;
}

/**
 * label of the separators between the days of a chat: today, yesterday or the full date
 */
export function useChatDayLabel() {
    const { t } = useTranslation('common');
    const locale = useDateLocale();

    return useCallback(
        (date: Date): string => {
            if (isToday(date)) return t('chat_today');
            if (isYesterday(date)) return t('chat_yesterday');
            return format(date, 'EEEE, d. MMMM yyyy', { locale });
        },
        [t, locale]
    );
}

/**
 * translate an error reason of sending files into a message, filling in the limits
 */
export function useChatFileErrorMessage(limits: BackendChatFileLimits | null) {
    const { t } = useTranslation('common');

    return useCallback(
        (reason?: string): string => {
            switch (reason) {
                case 'file_too_large':
                    return t('chat_error_file_too_large', {
                        size: formatBytes(limits?.max_message_files_bytes),
                    });
                case 'maximum_files_exceeded':
                    return t('chat_error_maximum_files_exceeded', {
                        count: limits?.max_files_per_message,
                    });
                case 'storage_quota_exceeded':
                    return t('chat_error_storage_quota_exceeded', {
                        quota: formatBytes(limits?.max_room_storage_bytes),
                    });
                case 'invalid_name':
                    return t('chat_error_invalid_name');
                default:
                    return t('chat_error_generic');
            }
        },
        [t, limits]
    );
}
