import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { SubmitHandler, useForm } from 'react-hook-form';
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

interface FormValues {
    methodicalApproach: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.methodicalApproach === '';
};

MethodicalApproach.auth = true;
export default function MethodicalApproach() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/learning-goals'
    const nextpage = '/ve-designer/topics'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            methodicalApproach: '',
        },
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.methodical_approach !== null) {
            methods.setValue('methodicalApproach', plan.methodical_approach);
        }
        if (Object.keys(plan.progress).length) {
            setSideMenuStepsProgress(plan.progress)
        }
    }, [methods]);

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        if (areAllFormValuesEmpty(data)) return

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'methodical_approach',
                value: data.methodicalApproach,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    methodical_approach: ProgressState.completed,
                },
            },
        ]
    };

    return (
        <Wrapper
            title='Methodischer Ansatz'
            subtitle='Welche methodischen Ansätze kommen im VE zum Einsatz?'
            tooltip={{
                text: 'Mehr zu Methodik findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material'
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="mt-4 flex flex-col justify-center ">
                <textarea
                    rows={5}
                    placeholder="z.B. ..."
                    className="border border-gray-300 rounded-lg w-3/4 p-2"
                    {...methods.register('methodicalApproach', {
                        maxLength: {
                            value: 500,
                            message:
                                'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                        },
                    })}
                />
                <p className="text-red-600 pt-2">
                    {methods.formState.errors?.methodicalApproach?.message}
                </p>
            </div>
        </Wrapper>
    );
}