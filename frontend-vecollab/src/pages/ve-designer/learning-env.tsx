import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { Tooltip } from '@/components/common/Tooltip';
import Link from 'next/link';
import { PiBookOpenText } from 'react-icons/pi';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { RxPlus, RxTrash } from 'react-icons/rx';
import { Socket } from 'socket.io-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { LearningEnvFormSchema } from '../../zod-schemas/learningEnvSchema';

interface FormValues {
    learningEnv: string;
    courseFormat: string;
    usePhysicalMobility: boolean;
    physicalMobilities: PhysicalMobility[];
}

export interface PhysicalMobility {
    location: string;
    timestamp_from: string;
    timestamp_to: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return (
        formValues.learningEnv === '' &&
        formValues.courseFormat === '' &&
        formValues.physicalMobilities.every((mobility) => {
            return (
                mobility.location === '' &&
                mobility.timestamp_from === '' &&
                mobility.timestamp_to === ''
            );
        })
    );
};

interface Props {
    socket: Socket;
}

const emptyPysicalMobility: PhysicalMobility = {
    location: '',
    timestamp_from: '',
    timestamp_to: '',
};

Methodology.auth = true;
export default function Methodology({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/learning-goals';
    const nextpage = '/ve-designer/methodology';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(LearningEnvFormSchema),
        defaultValues: {
            learningEnv: '',
            courseFormat: '',
            usePhysicalMobility: false,
            physicalMobilities: [emptyPysicalMobility],
        },
    });

    const { fields, append, remove, update, replace } = useFieldArray({
        name: 'physicalMobilities',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let data: { [key: string]: any } = {};
            if (plan.learning_env !== null) {
                methods.setValue('learningEnv', plan.learning_env);
                data.learningEnv = plan.learning_env;
            }
            if (plan.realization !== null) {
                methods.setValue('courseFormat', plan.realization);
                data.courseFormat = plan.realization;
            }
            if (plan.physical_mobility !== null) {
                methods.setValue('usePhysicalMobility', plan.physical_mobility);
                data.usePhysicalMobility = plan.physical_mobility;
            }
            if (plan.physical_mobilities?.length > 0) {
                data.physicalMobilities = plan.physical_mobilities.map((physicalMobilityObject) => {
                    return Object.assign({}, physicalMobilityObject, {
                        location: physicalMobilityObject.location,
                        timestamp_from: physicalMobilityObject.timestamp_from
                            ? physicalMobilityObject.timestamp_from.split('T')[0]
                            : '',
                        timestamp_to: physicalMobilityObject.timestamp_to
                            ? physicalMobilityObject.timestamp_to.split('T')[0]
                            : '',
                    });
                });
                replace(data.physicalMobilities);
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }

            return data;
        },
        [methods, replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'learning_env',
                value: data.learningEnv,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'realization',
                value: data.courseFormat,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'physical_mobility',
                value: data.usePhysicalMobility,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'physical_mobilities',
                value: data.physicalMobilities,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    learning_env: progressState,
                    realization: progressState,
                },
            },
        ];
    };

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, emptyPysicalMobility);
        }
    };

    const renderMobilitiesInputs = (): JSX.Element[] => {
        return fields.map((mobility, index) => (
            <div key={mobility.id} className="flex py-4 w-full ">
                <div className="w-full">
                    <div className="flex items-center justify-start pb-2">
                        <p className="mr-4">Ort:</p>
                        <input
                            type="text"
                            placeholder="Ort eingeben"
                            className="border border-gray-400 rounded-lg p-2 w-full"
                            {...methods.register(`physicalMobilities.${index}.location`)}
                        />
                    </div>
                    <p className="flex justify-center text-red-600 pb-2">
                        {methods.formState.errors?.physicalMobilities?.[index]?.location?.message}
                    </p>
                    <div className="flex justify-between">
                        <div className="flex items-center">
                            <p className="mr-4">von:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_from`)}
                                className="border border-gray-400 rounded-lg p-2 mr-2"
                            />
                        </div>
                        <div className="flex items-center">
                            <p className="mr-4">bis:</p>
                            <input
                                type="date"
                                {...methods.register(`physicalMobilities.${index}.timestamp_to`)}
                                className="border border-gray-400 rounded-lg p-2 ml-2"
                            />
                        </div>
                    </div>
                    <p className="flex justify-center text-red-600 pt-2">
                        {
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_from
                                ?.message
                        }
                    </p>
                    <p className="flex justify-center text-red-600 pt-2">
                        {
                            methods.formState.errors?.physicalMobilities?.[index]?.timestamp_to
                                ?.message
                        }
                    </p>
                </div>

                <button className="ml-3" type="button" onClick={() => handleDelete(index)}>
                    <RxTrash size={20} />
                </button>
            </div>
        ));
    };

    function radioBooleanInput(control: any, name: any): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">Ja</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    className="border border-gray-400 rounded-lg p-2"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(true)} // send value to hook form
                                    checked={value === true}
                                />
                            </div>
                        </div>
                        <div className="flex my-1">
                            <div>
                                <label className="px-2 py-2">Nein</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => onChange(false)} // send value to hook form
                                    checked={value === false}
                                />
                            </div>
                        </div>
                    </>
                )}
            />
        );
    }

    return (
        <Wrapper
            socket={socket}
            title="Digitale Lernumgebung"
            subtitle="In welcher digitalen Lernumgebung findet der VE statt?"
            description="Bitte gebt an, welche gemeinsame Lernplattform euren Teilnehmenden zur Verfügung steht, z. B. eine gemeinsame Projektseite oder ein gemeinsames Padlet, oder welche eigene Plattform die beteiligten Partner*innen jeweils nutzen. Nennt ggf. außerdem die für euer Projekt wichtigsten digitalen Tools, wie z. B. das verwendete Videokonferenzsystem oder virtuelle Welten."
            tooltip={{
                text: 'Mehr zu LMS findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="mt-4">
                <textarea
                    rows={3}
                    placeholder="Lernumgebung beschreiben"
                    className="border border-gray-300 rounded-lg p-2 w-full lg:w-1/2"
                    {...methods.register('learningEnv')}
                />
                <p className="text-red-600 pt-2">
                    {methods.formState.errors?.learningEnv?.message}
                </p>
            </div>

            <div className="mt-4">
                <div
                    className={'flex justify-between items-center text-slate-600 text-xl relative'}
                >
                    In welchem Format / welchen Formaten wird der VE umgesetzt?
                    <Tooltip tooltipsText="Mehr zu Formaten findest du hier in den Selbstlernmaterialien …">
                        <Link
                            target="_blank"
                            href={
                                '/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge'
                            }
                            className="rounded-full shadow hover:bg-gray-50 p-2 mx-2"
                        >
                            <PiBookOpenText size={30} color="#00748f" />
                        </Link>
                    </Tooltip>
                </div>
                <p className="mb-8">
                    Haltet an dieser Stelle fest, ob die kollaborativen Anteile des VE
                    ausschließlich synchron (z. B. per Videokonferenz) oder asynchron (z. B. per
                    E-Mail, Padlet etc.) stattfinden oder sowohl synchrone als auch asynchrone
                    Phasen geplant sind.
                </p>
                <div className="w-full lg:w-1/2">
                    <div className="flex items-center">
                        <label htmlFor="courseFormat" className="mr-2">
                            Format:
                        </label>
                        <select
                            placeholder="Auswählen..."
                            className="bg-white border border-gray-400 rounded-lg p-2 w-1/3"
                            {...methods.register(`courseFormat`)}
                        >
                            <option value="synchron">synchron</option>
                            <option value="asynchron">asynchron</option>
                            <option value="asynchron und synchron">asynchron und synchron</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex w-full lg:w-2/3 items-center">
                    <p className="">
                        Wird der VE durch eine physische Mobilität ergänzt / begleitet?
                    </p>
                    <div className="flex w-40 justify-end gap-x-5">
                        {radioBooleanInput(methods.control, `usePhysicalMobility`)}
                    </div>
                </div>
                {methods.watch('usePhysicalMobility') && (
                    <div className="mt-4 rounded shadow p-2 w-full lg:w-2/3">
                        <div className="divide-y my-2">{renderMobilitiesInputs()}</div>
                        <div className="flex justify-center">
                            <button
                                className="p-4 bg-white rounded-full shadow hover:bg-slate-50"
                                type="button"
                                onClick={() => {
                                    append(emptyPysicalMobility);
                                }}
                            >
                                <RxPlus size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Wrapper>
    );
}
