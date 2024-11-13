import { useTranslation } from 'next-i18next';
import { GiSadCrab } from 'react-icons/gi';

export default function GeneralError() {
    const { t } = useTranslation('common');

    return (
        <div className="flex items-center">
            <GiSadCrab size={60} className="m-4" />
            {/* TODO
                - name
                - error code
                - melden an: ...
                */}
            <div className="text-xl text-slate-900">{t('generic_error')}</div>
        </div>
    );
}
