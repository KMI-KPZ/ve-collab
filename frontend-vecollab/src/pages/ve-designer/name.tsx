import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import { SubmitHandler, useForm } from 'react-hook-form';
import PlanerTemplateWrapper from '@/components/VE-designer/PlanerTemplateWrapper';

interface FormValues {
    name: string;
}

EssentialInformation.auth = true;
export default function EssentialInformation() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const methods = useForm<FormValues>({ mode: 'onChange' });

    const setPlanerData = (plan: any) => {
        if (plan.progress.length !== 0) {
            setSideMenuStepsProgress(plan.progress);
        }
        methods.setValue('name', plan.name, { shouldValidate: true });
    }

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
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
                ],
            },
            session?.accessToken
        );

        await router.push({
            pathname: '/ve-designer/partners',
            query: { plannerId: router.query.plannerId },
        });


    };

    // const combinedSubmitRouteAndUpdate = async (data: FormValues, url: string) => {
    //     onSubmit(data);
    //     await router.push({
    //         pathname: url,
    //         query: { plannerId: router.query.plannerId },
    //     });
    // };

    return (
        <PlanerTemplateWrapper methods={methods} planerDataCallback={setPlanerData} submitCallback={onSubmit} >

                <div className="flex-grow">
                    <div className={'text-center font-bold text-4xl mb-24'}>
                        Wie soll das Projekt heißen?
                    </div>
                    <div className="flex flex-col justify-center">
                        <input
                            type="text"
                            placeholder="Name eingeben"
                            className="border border-gray-300 rounded-md p-2 w-full"
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
                </div>

        </PlanerTemplateWrapper>
    );
}
