import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/ve-designer/sideProgressBar';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import CreatableSelect from 'react-select/creatable';

interface FormValues {
    methodicalApproaches: MethodicalApproach[];
}

interface MethodicalApproach {
    value: string;
    label: string;
}

export interface PhysicalMobility {
    location: string;
    timestamp_from: string;
    timestamp_to: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.methodicalApproaches.every((value) => {
        return value.value === '' && value.label === '';
    });
};

interface Props {
    socket: Socket;
}

Methodology.auth = true;
export default function Methodology({ socket }: Props): JSX.Element {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/learning-env';
    const nextpage = '/ve-designer/evaluation';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            methodicalApproaches: [],
        },
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const approaches = plan.methodical_approaches.map((value) => ({ value, label: value }))
            methods.setValue('methodicalApproaches', approaches);

            if (Object.keys(plan.progress).length) {
                setSideMenuStepsProgress(plan.progress);
            }
            return {methodicalApproaches: approaches}
        },
        [methods]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        const progressState = areAllFormValuesEmpty(data)
            ? ProgressState.notStarted
            : ProgressState.completed;

        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'methodical_approaches',
                value: data.methodicalApproaches.map((value) => value.value),
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    methodical_approaches: progressState,
                },
            },
        ];
    };

    const options: { value: string; label: string }[] = [
        {
            value: 'aufgabenbasiertes Lernen',
            label: 'aufgabenbasiertes Lernen',
        },
        {
            value: 'problembasiertes / problemorientiertes Lernen',
            label: 'problembasiertes / problemorientiertes Lernen',
        },
        {
            value: 'forschendes Lernen',
            label: 'forschendes Lernen',
        },
        {
            value: 'game-based Learning',
            label: 'game-based Learning',
        },
    ];

    function createableSelect(
        control: any,
        name: any,
        options: { value: string; label: string }[]
    ): JSX.Element {
        return (
            <Controller
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <CreatableSelect
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                        options={options}
                        isClearable={true}
                        isMulti
                        closeMenuOnSelect={false}
                        placeholder="Ansätze auswählen oder neue durch Tippen hinzufügen"
                    />
                )}
                control={control}
            />
        );
    }

    return (
        <Wrapper
            socket={socket}
            title="Methodischer Ansatz"
            subtitle="Welcher methodische Ansatz liegt eurem VA zugrunde?"
            description={[
                'Dieses Feld ist optional und kann auch zu einem späteren Zeitpunkt ausgefüllt werden.',
                'Falls keines der Vorschläge eurem Ansatz entspricht, könnt ihr durch Schreiben im Feld individuelle Eingaben hinzufügen.',
            ]}
            tooltip={{
                text: 'Mehr zu Methodik findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material',
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="mt-4 flex flex-col justify-center ">
                {createableSelect(methods.control, 'methodicalApproaches', options)}
            </div>
        </Wrapper>
    );
}
