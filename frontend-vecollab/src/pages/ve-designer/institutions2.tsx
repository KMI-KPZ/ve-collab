import React, { useCallback, useState } from 'react';
import { RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import trash from '@/images/icons/ve-designer/trash.png';
import Image from 'next/image';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const InstitutionFormSchema = z.object({
    name: z.string().max(200, 'Ein gültiger Name darf maximal 200 Buchstaben lang sein.'),
    school_type: z.string().max(200, 'Maximal 200 Buchstaben.'),
    country: z.string().max(200, 'Maximal 200 Buchstaben.'),
    departments: z.string().array(),
});

const InstitutionsFormSchema = z.object({ institutions: InstitutionFormSchema.array() });

export interface Institution {
    name: string;
    school_type: string;
    country: string;
    departments: string[];
}

interface FormValues {
    institutions: Institution[];
}

const emptyInstitution: Institution = {
    name: '',
    school_type: '',
    country: '',
    departments: [],
};

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.institutions.every((institution) => {
        return (
            institution.name === '' &&
            institution.school_type === '' &&
            institution.country === '' &&
            institution.departments.every((department) => department === '')
        );
    });
};

interface Props {
    socket: Socket;
}

Institutions2.auth = true;
export default function Institutions2({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/partners';
    const nextpage = '/ve-designer/lectures';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(InstitutionsFormSchema),
        defaultValues: {
            institutions: [emptyInstitution],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        name: 'institutions',
        control: methods.control,
    });

    const handleRemoveLecture = (i: number) => {
        if (fields.length > 1) {
            remove(i);
        } else {
            replace(emptyInstitution);
        }
    };

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            if (plan.institutions.length !== 0) {
                replace(plan.institutions);
            }
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
        },
        [replace]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'institutions',
                value: data.institutions,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    institutions: progressState,
                },
            },
        ];
    };

    const renderInstitutionInputs = (): JSX.Element[] => {
        return fields.map((lectures, index) => (
            <div key={lectures.id} className="pt-4 pb-2">
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="name" className="px-2 py-2">
                            Name
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder="Name eingeben"
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.name`)}
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.institutions?.[index]?.name?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="schoolType" className="px-2 py-2">
                            Bildungseinrichtung
                        </label>
                    </div>
                    <div className="w-2/3">
                        <select
                            placeholder="Bildungseinrichtung eingeben"
                            className="border border-gray-400 rounded-lg w-full px-1 py-2"
                            {...methods.register(`institutions.${index}.school_type`)}
                        >
                            <option value="Hochschule / Universität / College">
                                Hochschule / Universität / College
                            </option>
                            <option value="Fachhochschule / University of Applied Sciences">
                                Fachhochschule / University of Applied Sciences
                            </option>
                            <option value="Berufsschule">Berufsschule</option>
                            <option value="Schule – Primärbereich">Schule – Primärbereich</option>
                            <option value="Schule – Sekundarbereich">
                                Schule – Sekundarbereich
                            </option>

                            <option value="Sonstige">Sonstige</option>
                        </select>
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.institutions?.[index]?.school_type?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="country" className="px-2 py-2">
                            Land
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder="Land eingeben"
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.country`)}
                        />
                        <p className="text-red-600 pt-2">
                            {methods.formState.errors?.institutions?.[index]?.country?.message}
                        </p>
                    </div>
                </div>
                <div className="mt-2 flex">
                    <div className="w-1/3 flex items-center">
                        <label htmlFor="department" className="px-2 py-2">
                            Fachbereich
                        </label>
                    </div>
                    <div className="w-2/3">
                        <input
                            type="text"
                            placeholder="Fachbereich eingeben"
                            className="border border-gray-400 rounded-lg w-full p-2"
                            {...methods.register(`institutions.${index}.departments.0`)}
                        />
                        <p className="text-red-600 pt-2">
                            {
                                methods.formState.errors?.institutions?.[index]?.departments?.[0]
                                    ?.message
                            }
                        </p>
                    </div>
                </div>
                <div className="flex justify-end items-center">
                    <Image
                        className="mx-2 cursor-pointer m-2 "
                        onClick={() => handleRemoveLecture(index)}
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
            title="Institution"
            subtitle="In welchen Institutionen wird der VE umgesetzt?"
            description="Dieses Feld ist optional und kann auch zu einem späteren Zeitpunkt ausgefüllt werden, gibt euch aber einen besseren Überblick über die beteiligten Einrichtungen und die entsprechenden Fachbereiche."
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className={'px-4 w-full lg:w-2/3'}>
                <div className="divide-y">{renderInstitutionInputs()}</div>
                <div className="flex justify-center">
                    <button
                        className="p-2 m-2 bg-white rounded-full shadow hover:bg-slate-50"
                        type="button"
                        onClick={() => {
                            append({
                                name: '',
                                school_type: '',
                                country: '',
                                departments: [],
                            });
                        }}
                    >
                        <RxPlus size={25} />
                    </button>
                </div>
            </div>
        </Wrapper>
    );
}
