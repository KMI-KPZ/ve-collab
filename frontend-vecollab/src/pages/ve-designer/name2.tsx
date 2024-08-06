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
import { Socket } from 'socket.io-client';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const NameFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Ein Name ist erforderlich.')
        .max(100, 'Ein gültiger Name darf maximal 100 Buchstaben lang sein.'),
});

interface FormValues {
    name: string;
}

interface Props {
    socket: Socket;
}

Name2.auth = true;
export default function Name2({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(NameFormSchema),
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            methods.setValue('name', plan.name, { shouldValidate: true, shouldDirty: false });
            // methods.resetField ('name', {defaultValue: plan.name})
            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
        },
        [methods]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
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
        ];
    };

    return (
        <Wrapper
            socket={socket}
            title="Projektname"
            subtitle="Wie soll das Projekt heißen?"
            description="Gebt eurem Projekt einen Namen. Unter diesem Namen erscheint euer Projekt im VE-Schaufenster und in der Projekt-/Good-Practice-Übersicht."
            methods={methods}
            nextpage="/ve-designer/partners"
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="">
                <input
                    type="text"
                    placeholder="Name eingeben"
                    className="border border-gray-300 rounded-md p-2 w-1/2"
                    autoComplete="off"
                    {...methods.register('name')}
                />
                {methods.formState.errors.name && (
                    <p className="text-red-600 pt-2">{methods.formState.errors.name?.message}</p>
                )}
            </div>
        </Wrapper>
    );
}
