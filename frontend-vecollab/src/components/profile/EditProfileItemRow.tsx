import { ChangeEventHandler } from 'react';

interface Props {
    label: string;
    value: string | number | undefined;
    onChange: ChangeEventHandler<HTMLInputElement> | undefined;
    placeholder?: string;
    labelElementWidth?: string; //tailwind width directive
    inputElemenWidth?: string; //tailwind width directive
}

// the row containing a label and an input
// within a reoccuring item such as teaching information
// or work experience
export default function EditProfileItemRow({
    label,
    value,
    onChange,
    placeholder,
    labelElementWidth,
    inputElemenWidth,
}: Props) {
    return (
        <div className="mt-2 flex">
            <div className={'flex items-center' + ' ' + labelElementWidth}>
                <label htmlFor={label} className="px-2 py-2">
                    {label}
                </label>
            </div>
            <div className={inputElemenWidth}>
                <input
                    type="text"
                    name={label}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="border border-gray-500 rounded-lg w-full h-12 p-2"
                />
            </div>
        </div>
    );
}
