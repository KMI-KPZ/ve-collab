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
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const TargetGroupsFormSchema = z.object({
    targetGroups: z
        .object({
            name: z.string().max(300, 'Ein gültiger Name darf maximal 300 Buchstaben lang sein.'),
            age_min: z
                .number({
                    invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
                })
                .int('Bitte geben sie eine ganze Zahl ein.')
                .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
                .lte(150, 'Bitte geben sie eine realistische Zahl ein.'),
            age_max: z
                .number({
                    invalid_type_error: 'Bitte geben sie eine ganze Zahl ein.',
                })
                .int('Bitte geben sie eine ganze Zahl ein.')
                .gte(0, 'Bitte geben sie eine positive ganze Zahl ein.')
                .lte(150, 'Bitte geben sie eine realistische Zahl ein.'),
            experience: z
                .string()
                .max(800, 'Ein gültiger Name darf maximal 800 Buchstaben lang sein.'),
            // TODO string array
            academic_course: z
                .string()
                .max(400, 'Ein gültiger Name darf maximal 400 Buchstaben lang sein.'),
            // TODO string array
            languages: z
                .string()
                .max(400, 'Ein gültiger Name darf maximal 400 Buchstaben lang sein.'),
        })
        .refine((data) => data.age_min <= data.age_max, {
            message: 'Das Mindestalter muss kleiner oder gleich dem Höchstalter sein.',
            path: ['age_max'], // This will show the error message at the age_min field
        })
        .array(),
    languages: z
        .object({
            language: z
                .string()
                .max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
        })
        .array(),
});

export interface TargetGroup {
    name: string;
    age_min: number;
    age_max: number;
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
            targetGroup.age_min === 0 &&
            targetGroup.age_max === 0 &&
            targetGroup.experience === '' &&
            targetGroup.academic_course === '' &&
            targetGroup.languages === ''
        );
    });

interface Props {
    socket: Socket;
}

const emptyTG = {
    name: '',
    age_min: 0,
    age_max: 0,
    experience: '',
    academic_course: '',
    languages: '',
};
const emptyLanguage = { language: '' };

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
        resolver: zodResolver(TargetGroupsFormSchema),
        defaultValues: {
            targetGroups: [emptyTG],
            languages: [emptyLanguage],
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
            const targetGroups = plan.audience.length > 0 ? plan.audience : [emptyTG];
            replaceTg(targetGroups);

            const languages =
                plan.languages.length > 0
                    ? plan.languages.map((language) => ({ language }))
                    : [emptyLanguage];
            replaceLang(languages);

            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
            return { targetGroups, languages };
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

    const handleRemoveTg = (index: number) =>
        fieldsTg.length > 1 ? removeTg(index) : replaceTg(emptyTG);

    const handleRemoveLang = (index: number) =>
        fieldsLang.length > 1 ? removeLang(index) : replaceLang(emptyLanguage);

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
                            {...methods.register(`targetGroups.${index}.name`)}
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
                                    valueAsNumber: true,
                                })}
                                placeholder="von"
                                className="border border-gray-400 rounded-lg w-1/2 p-2 mr-2"
                            />
                            <p className="text-red-600 pt-2 mr-4">
                                {methods.formState.errors?.targetGroups?.[index]?.age_min?.message}
                            </p>
                        </div>
                        <div>
                            <input
                                type="number"
                                {...methods.register(`targetGroups.${index}.age_max`, {
                                    valueAsNumber: true,
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
                            {...methods.register(`targetGroups.${index}.experience`)}
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
                            {...methods.register(`targetGroups.${index}.academic_course`)}
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
                            {...methods.register(`targetGroups.${index}.languages`)}
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
                        onClick={() => handleRemoveTg(index)}
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
                <div className="flex my-2 items-center w-full">
                    <input
                        type="text"
                        placeholder="Sprache eingeben"
                        className="border border-gray-300 rounded-lg w-1/2 p-2 mr-2"
                        {...methods.register(`languages.${index}.language`)}
                    />
                    <button type="button" onClick={() => handleRemoveLang(index)}>
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
                            appendTg(emptyTG);
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
                        appendLang(emptyLanguage);
                    }}
                >
                    <RxPlus size={20} />
                </button>
            </div>
        </Wrapper>
    );
}
