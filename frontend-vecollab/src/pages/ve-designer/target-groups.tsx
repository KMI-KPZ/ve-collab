import React, { useCallback, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import Image from 'next/image';
import trash from '@/images/icons/ve-designer/trash.png';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';

export interface TargetGroup {
    name: string;
    age_min: string;
    age_max: string;
    experience: string;
    academic_course: string;
    languages: string;
}

interface Language {
    language: string;
}

interface FormValues {
    targetGroups: TargetGroup[];
    languages: Language[];
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean =>
    formValues.languages.every((languageObject) => languageObject.language === '') &&
    formValues.targetGroups.every((targetGroup) => {
        return (
            targetGroup.name === '' &&
            targetGroup.age_min === '' &&
            targetGroup.age_max === '' &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.languages === ''
        );
    });

interface Props {
    socket: Socket;
}

TargetGroups.auth = true;
export default function TargetGroups({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/lectures';
    const nextpage = '/ve-designer/learning-goals';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            targetGroups: [{
                name: '',
                age_min: '',
                age_max: '',
                experience: '',
                academic_course: '',
                languages: '',
            }],
            languages: [{ language: '' }],
        },
    });

    const {
        fields: fieldsTg,
        append: appendTg,
        remove: removeTg,
        replace: replaceTg,
    } = useFieldArray({
        name: 'targetGroups',
        control: methods.control,
    });

    const {
        fields: fieldsLang,
        append: appendLang,
        remove: removeLang,
        replace: replaceLang,
    } = useFieldArray({
        name: 'languages',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let data: {[key: string]: any} = {}

            if (plan.audience.length !== 0) {
                replaceTg(plan.audience);
                data.targetGroups = plan.audience
            }
            if (plan.languages.length !== 0) {
                const languages = plan.languages.map(language => ({ language }))
                replaceLang(languages);
                data.languages = languages
            }

            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
            return data
        },
        [replaceLang, replaceTg]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'audience',
                value: data.targetGroups,
            },
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
                    audience: progressState,
                    languages: progressState,
                },
            },
        ];
    };

    const renderTargetGroupsInputs = (): JSX.Element[] => {
        return fieldsTg.map((targetGroup, index) => (
            <div key={targetGroup.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            Bezeichnung
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.name`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder="Name eingeben"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.name?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="age" className="px-2 py-2">
                            Alter
                        </label>
                    </div>
                    <div className="w-3/4 flex">
                        <div>
                            <input
                                type="number"
                                {...methods.register(`targetGroups.${index}.age_min`, {
                                    maxLength: {
                                        value: 4,
                                        message: 'Bitte geben sie eine realistische Zahl ein',
                                    },
                                    pattern: {
                                        value: /^\d+$/,
                                        message: 'Bitte nur ganze postive Zahlen',
                                    },
                                })}
                                placeholder="von"
                                className="border border-gray-400 rounded-lg w-1/2 p-2 mr-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.age_min?.message}
                            </p>
                        </div>
                        <div>
                            <input
                                type="number"
                                {...methods.register(`targetGroups.${index}.age_max`, {
                                    maxLength: {
                                        value: 4,
                                        message: 'Bitte geben sie eine realistische Zahl ein',
                                    },
                                    pattern: {
                                        value: /^\d+$/,
                                        message: 'Bitte nur ganze postive Zahlen',
                                    },
                                })}
                                placeholder="bis"
                                className="border border-gray-400 rounded-lg w-1/2 p-2 ml-2"
                            />
                            <p className="text-red-600 pt-2">
                                {methods.formState.errors?.targetGroups?.[index]?.age_max?.message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="experience" className="px-2 py-2">
                            VE-Projektrelevante Erfahrungen
                        </label>
                    </div>
                    <div className="w-3/4">
                        <textarea
                            rows={3}
                            {...methods.register(`targetGroups.${index}.experience`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder=" z.B. Sprachkenntnisse, bisherige Seminare zum Thema, etc."
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.experience?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="academic_course" className="px-2 py-2">
                            Studiengang
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.academic_course`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder="Studiengang eingeben, mehrere durch Komma trennen"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {
                                methods.formState.errors?.targetGroups?.[index]?.academic_course
                                    ?.message
                            }
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="languages" className="px-2 py-2">
                            Sprachen
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`targetGroups.${index}.languages`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder="mehrere durch Komma trennen"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.targetGroups?.[index]?.languages?.message}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => removeTg(index)}
                        src={trash}
                        width={20}
                        height={20}
                        alt="deleteStep"
                    ></Image>
                </div>
            </div>
        ));
    };

    const renderLanguagesInputs = (): JSX.Element[] => {
        return fieldsLang.map((language, index) => (
            <div key={language.id}>
                <div className="flex items-center w-full">
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
                    <button type="button" onClick={() => removeLang(index)}>
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
            socket={socket}
            title="Zielgruppen & Sprachen"
            subtitle="An welche Zielgruppen richtet sich der VE?"
            description={[
                'Dieses Feld ist optional und kann auch zu einem späteren Zeitpunkt ausgefüllt werden, da ihr eure Zielgruppe unter Umständen zum Zeitpunkt der VE-Planung noch nicht genau kennt (z. B. Alter der Teilnehmenden, Sprachen).',
                'Das Erfragen der Erstsprachen und weiterer Sprachen der Teilnehmenden kann bei der Findung einer Lingua Franca bzw. eines multilingualen Settings von Bedeutung sein.',
            ]}
            tooltip={{
                text: 'Es ist wichtig, sich mit der Zielgruppe zu beschäftigen, um Lehr-/Lernziele und Inhalte des VEs optimal an die Lernenden anzupassen. Die Zielgruppe ist noch nicht bekannt? Dieses Feld kann auch zu einem späteren Zeitpunkt ausgefüllt werden',
                link: '',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'rounded shadow px-4 mb-6 w-full lg:w-2/3'}>
                <div className="divide-y">{renderTargetGroupsInputs()}</div>
                <div className="flex justify-center">
                    <button
                        className="p-2 m-2 bg-white rounded-full shadow"
                        type="button"
                        onClick={() => {
                            appendTg({
                                name: '',
                                age_min: '',
                                age_max: '',
                                experience: '',
                                academic_course: '',
                                languages: '',
                            });
                        }}
                    >
                        <RxPlus size={24} />
                    </button>
                </div>
            </div>

            <div className="">
                <div className="text-xl text-slate-600">
                    In welchen Sprachen findet der VE (hauptsächlich) statt?
                </div>
                <div className="mb-8">
                    <p className="mb-2">
                        Berücksichtigt bei eurer Entscheidung die sprachliche Vielfalt in euren
                        Lernendengruppen und besprecht, wie ihr dieses Potenzial für den VE nutzen
                        könnt.
                    </p>
                    <p className="mb-2">
                        Dieses Feld ist optional und kann auch zu einem späteren Zeitpunkt
                        ausgefüllt werden.
                    </p>
                </div>
                <div className="mt-2 items-center">{renderLanguagesInputs()}</div>
                <button
                    className="p-2 m-2 bg-white rounded-full shadow"
                    type="button"
                    onClick={() => {
                        appendLang({
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
