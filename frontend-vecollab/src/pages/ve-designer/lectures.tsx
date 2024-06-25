import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
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

export interface LectureOld {
    name: string;
    lecture_type: string;
    lecture_format: string;
    participants_amount: string;
}

interface FormValues {
    lectures: LectureOld[];
}


interface Props {
    socket: Socket;
}

const emptyLecture = {
    name: '',
    lecture_type: '',
    lecture_format: '',
    participants_amount: '',
}

const isEmptyLecture = (lecture: LectureOld) => {
    return lecture.name === ''
        && lecture.lecture_type === ''
        && lecture.lecture_format === ''
        && (lecture.participants_amount === '' || isNaN(Number(lecture.participants_amount)))
}

Lectures.auth = true;
export default function Lectures({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/institutions';
    const nextpage = '/ve-designer/target-groups';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            lectures: [
                emptyLecture,
            ],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        name: 'lectures',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (plan.lectures.length !== 0) {
                replace(plan.lectures);
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
        },
        [replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const lectures = data.lectures.filter((l: LectureOld) => !isEmptyLecture(l))

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'lectures',
                value: lectures
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    lectures: ProgressState.completed,
                },
            },
        ];
    };

    const handeleRemove = (index: number) => {
        if (fields.length > 1) {
            remove(index)
        } else {
            replace(emptyLecture)
        }
    }

    const renderLecturesInputs = (): JSX.Element[] => {
        return fields.map((lecture, index) => (
            <div key={lecture.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            Name
                        </label>
                    </div>
                    <div className="w-3/4">
                        <input
                            type="text"
                            {...methods.register(`lectures.${index}.name`, {
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
                            {methods.formState.errors?.lectures?.[index]?.name?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="type" className="px-2 py-2">
                            Typ
                        </label>
                    </div>
                    <div className="w-3/4">
                        <select
                            {...methods.register(`lectures.${index}.lecture_type`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder="z.B. Wahl, Wahlpflicht, Pflicht"
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                        >
                            <option value="Pflichtveranstaltung">Pflichtveranstaltung</option>
                            <option value="Wahlveranstaltung">Wahlveranstaltung</option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.lectures?.[index]?.lecture_type?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/4 flex items-center">
                        <label htmlFor="format" className="px-2 py-2">
                            Format
                        </label>
                    </div>
                    <div className="w-3/4">
                        <select
                            {...methods.register(`lectures.${index}.lecture_format`, {
                                maxLength: {
                                    value: 500,
                                    message:
                                        'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                                },
                            })}
                            placeholder="z.B. online, hybrid, präsenz"
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                        >
                            <option value="Präsenz">Präsenz</option>
                            <option value="Online">Online</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.lectures?.[index]?.lecture_format?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/2 flex items-center">
                        <label htmlFor="participants" className="px-2 py-2">
                            Teilnehmendenanzahl
                        </label>
                    </div>
                    <div className="w-1/2">
                        <input
                            type="number"
                            min={0}
                            {...methods.register(`lectures.${index}.participants_amount`, {
                                maxLength: {
                                    value: 4,
                                    message: 'Bitte geben sie eine realistische Zahl ein',
                                },
                                pattern: {
                                    value: /^\d+$/,
                                    message: 'Bitte nur ganze postive Zahlen',
                                },
                                setValueAs: (v) => parseInt(v),
                            })}
                            placeholder="Anzahl eingeben"
                            className="border border-gray-400 rounded-lg w-full p-2"
                        />
                        <p className="text-red-600 pt-2">
                            {
                                methods.formState.errors?.lectures?.[index]?.participants_amount
                                    ?.message
                            }
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => handeleRemove(index)}
                        src={trash}
                        width={20}
                        height={20}
                        alt="deleteStep"
                    ></Image>
                </div>
            </div>
        ));
    };

    return (
        <Wrapper
            socket={socket}
            title="Lehrveranstaltungen"
            subtitle="Im Rahmen welcher Lehrveranstaltungen wird der VE umgesetzt?"
            description="Dieses Feld ist optional und kann auch zu einem späteren Zeitpunkt ausgefüllt werden (z. B. die Zahl der Teilnehmenden)."
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'rounded shadow px-4 w-full lg:w-2/3'}>
                <div className="divide-y">{renderLecturesInputs()}</div>
                <div className="flex justify-center">
                    <button
                        className="p-2 m-3 bg-white rounded-full shadow hover:bg-slate-50"
                        type="button"
                        onClick={() => {
                            append({
                                name: '',
                                lecture_type: '',
                                lecture_format: '',
                                participants_amount: '',
                            });
                        }}
                    >
                        <RxPlus size={24} />
                    </button>
                </div>
            </div>
        </Wrapper>
    );
}
