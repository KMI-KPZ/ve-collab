import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { SubmitHandler, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';

interface FormValues {
    name: string;
}

Name.auth = true;
export default function Name() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const methods = useForm<FormValues>({ mode: 'onChange' });

    const setPlanerData = useCallback((plan: IPlan) => {
            methods.setValue('name', plan.name, { shouldValidate: true });

            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress)
            }
    }, [methods])

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        console.log('namne, submit');

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'name',
                value: data.name,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    name: ProgressState.completed,
                },
            },
        ]
    };

    return (
        <Wrapper
            title='Projektname'
            subtitle="Wie soll das Projekt heißen?"
            methods={methods}
            nextpage='/ve-designer/partners'
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
                <div className="">
                    <input
                        type="text"
                        placeholder="Name eingeben"
                        className="border border-gray-300 rounded-md p-2 w-1/2"
                        {...methods.register('name', {
                            required: {
                                value: true,
                                message: 'Bitte gebe deiner VE einen Namen.',
                            },
                            maxLength: {
                                value: 50,
                                message:
                                    'Das Feld darf nicht mehr als 50 Buchstaben enthalten.',
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9äöüÄÖÜß\s_*+'":&()!?,-]*$/i,
                                message:
                                    'Nur folgende Sonderzeichen sind zulässig: _*+\'":&()!?,-',
                            },
                        })}
                    />
                    <p className="text-red-600 pt-2">
                        {methods.formState.errors.name?.message}
                    </p>
                </div>
        </Wrapper>
    );
}
