import { useTranslation } from 'next-i18next';
import { FormEvent } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';

interface Props {
    minusCallback?(evt: FormEvent): void;
    plusCallback?(evt: FormEvent): void;
    extendClassName?: string;
}

// renders the plus and minus buttons to add/remove additional input fields
// depending on if a callback function is specified or not
export default function EditProfilePlusMinusButtons({
    minusCallback,
    plusCallback,
    extendClassName,
}: Props) {
    const { t } = useTranslation('common');

    return (
        <div className={'w-full mt-1 flex justify-end' + ' ' + extendClassName}>
            {minusCallback !== undefined && (
                <button onClick={minusCallback} title={t("delete")} className='cursor-pointer'>
                    <RxMinus size={20} />
                </button>
            )}
            {plusCallback !== undefined && (
                <button onClick={plusCallback} title={t("new")} className='cursor-pointer'>
                    <RxPlus size={20} />
                </button>
            )}
        </div>
    );
}
