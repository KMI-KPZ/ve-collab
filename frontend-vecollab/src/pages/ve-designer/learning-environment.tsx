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
    learningEnv: string;
}

const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
    return formValues.learningEnv === '';
};

LearningEnvironment.auth = true;
export default function LearningEnvironment() {
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const prevpage = '/ve-designer/teaching-formats'
    const nextpage = '/ve-designer/checklist'

    const methods = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
            learningEnv: '',
        },
    });

    const setPlanerData = useCallback((plan: IPlan) => {
        if (plan.learning_env !== null) {
            methods.setValue('learningEnv', plan.learning_env);
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
                field_name: 'learning_env',
                value: data.learningEnv,
            },
            {
                plan_id: router.query.plannerId,
                field_name: 'progress',
                value: {
                    ...sideMenuStepsProgress,
                    learning_env: ProgressState.completed,
                },
            },
        ]
    };

    return (
        <Wrapper
            title='Digitale Lernumgebung'
            subtitle='In welcher digitalen Lernumgebung findet der VE statt?'
            tooltip={{
                text: 'Mehr zu LMS findest du hier in den Selbstlernmaterialien …',
                link: '/learning-material/right-bubble/Digitale%20Medien%20&%20Werkzeuge'
            }}
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="mt-4">
                <textarea
                    rows={5}
                    placeholder="Lernumgebung beschreiben"
                    className="border border-gray-300 rounded-lg w-3/4 p-2"
                    {...methods.register('learningEnv', {
                        maxLength: {
                            value: 500,
                            message:
                                'Das Feld darf nicht mehr als 500 Buchstaben enthalten.',
                        },
                    })}
                />
                <p className="text-red-600 pt-2">
                    {methods.formState.errors?.learningEnv?.message}
                </p>
            </div>
        </Wrapper>
    );
}
