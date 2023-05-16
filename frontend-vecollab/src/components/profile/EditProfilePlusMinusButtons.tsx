import { FormEvent } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';

interface Props {
    minusCallback(evt: FormEvent): void;
    plusCallback(evt: FormEvent): void;
    extendClassName?: string;
}

// renders the plus and minus buttons to add/remove additional input fields
export default function EditProfilePlusMinusButtons({
    minusCallback,
    plusCallback,
    extendClassName,
}: Props) {
    return (
        <div className={'w-full mt-1 flex justify-end' + ' ' + extendClassName}>
            <button onClick={minusCallback}>
                <RxMinus size={20} />
            </button>
            <button onClick={plusCallback}>
                <RxPlus size={20} />
            </button>
        </div>
    );
}
