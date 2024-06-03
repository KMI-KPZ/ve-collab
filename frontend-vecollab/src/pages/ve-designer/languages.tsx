import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

interface Language {
    language: string;
}
interface FormValues {
    languages: Language[];
}

const areAllLanguagesEmpty = (languages: Language[]): boolean => {
    return languages.every((languageObject) => languageObject.language === '');
};

Languages.auth = true;
export default function Languages() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/topics'
    const nextpage = '/ve-designer/evaluation'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            languages: [{ language: '' }],
        },
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.languages.length !== 0) {
            methods.setValue(
                'languages',
                plan.languages.map((element: string) => ({ language: element }))
            );
        }
    }, [methods]);

    const { fields, append, remove } = useFieldArray({
        name: 'languages',
        control: methods.control,
    });

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllLanguagesEmpty(data.languages)) return

        return  [
            {
                plan_id: router.query.plannerId,
                field_name: 'languages',
                value: data.languages.map((element) => element.language),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    languages: ProgressState.completed,
                },
            },
        ]
    };

    const renderLanguagesInputs = (): JSX.Element[] => {
        return fields.map((language, index) => (
            <div key={language.id} className="mt-2 flex flex-col justify-center items-center">
                <div className="flex justify-center items-center w-full">
                    <input
                        type="text"
                        placeholder="Sprache eingeben"
                        className="border border-gray-300 rounded-lg w-1/2 p-2 mr-2"
                        {...methods.register(`languages.${index}.language`, {
                            maxLength: {
                                value: 500,
                                message: 'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?-]*$/i,
                                message: 'Nur folgende Sonderzeichen sind zulässig: _*+\'":,&()!?-',
                            },
                        })}
                    />
                    <button type="button" onClick={() => remove(index)}>
                        <RxMinus size={20} />
                    </button>
                </div>
                {methods.formState.errors?.languages?.[index]?.language?.message && (
                    <p className="text-red-600 pt-2">
                        {methods.formState.errors?.languages?.[index]?.language?.message}
                    </p>
                )}
            </div>
        ));
    };

    return (
        <Wrapper
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            setProgress={setSideMenuStepsProgress}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'text-center font-bold text-4xl mb-2 relative'}>
                In welchen Sprachen findet der VE (hauptsächlich) statt?
                <Tooltip tooltipsText="Mehr zu Sprache(n) im VE findest du hier in den Selbstlernmaterialien …">
                    <Link
                        target="_blank"
                        href={'/learning-material/bottom-bubble/sprachliche%20Aspekte'}
                    >
                        <PiBookOpenText size={30} color="#00748f" />
                    </Link>
                </Tooltip>
            </div>
            <div className={'text-center mb-20'}>optional</div>
            <div className="flex flex-col justify-center">
                {renderLanguagesInputs()}
            </div>
            <div className="flex justify-center mt-4">
                <button
                    className="p-4 bg-white rounded-3xl shadow-2xl"
                    type="button"
                    onClick={() => {
                        append({
                            language: '',
                        });
                    }}
                >
                    <RxPlus size={20} />
                </button>
            </div>
        </Wrapper>
    );
}
