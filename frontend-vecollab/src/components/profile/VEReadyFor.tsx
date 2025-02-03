import { useTranslation } from 'next-i18next';
import { MdCheck } from 'react-icons/md';

interface Props {
    ve_ready: boolean;
}

export default function VEReadyFor({ ve_ready }: Props) {
    const { t } = useTranslation(['community', 'common']);

    return (
        <>
            {ve_ready ? (
                <div className="">
                    <span className="w-fit bg-green-500 rounded-full shadow shadow-green-500 p-1 mr-2 text-white text-center">
                        <MdCheck className="inline-block mb-1 mx-1" />
                    </span>
                    {t('ve_ready_true')}
                </div>
            ) : (
                <div className="text-red-600">
                    <span className="inline-block w-[10px] h-[10px] rounded-full bg-red-600 shadow shadow-red-600 mr-2"></span>
                    {t('ve_ready_false')}
                </div>
            )}
        </>
    );
}
