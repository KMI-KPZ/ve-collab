import Tasks from '@/components/VE-designer/FinePlanner/Tasks';
import React from 'react';
import { emptyTask, IFineStepFrontend } from '@/pages/ve-designer/step/[stepId]';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import Image from 'next/image';
import imageTrashcan from '@/images/icons/ve-designer/trash.png';
import { useTranslation } from 'next-i18next';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';

interface Props {
    fineStep: IFineStepFrontend;
}

export default function Stage({ fineStep }: Props) {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

    const { register, control, formState, watch, setValue } = useFormContext<IFineStepFrontend>();
    const { fields, append, remove, update } = useFieldArray<IFineStepFrontend>({
        name: 'tasks',
        control,
        rules: { minLength: 1 },
    });
    let dateFrom = new Date(fineStep.timestamp_from).toLocaleString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    let dateTo = new Date(fineStep.timestamp_to).toLocaleString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleDelete = (index: number): void => {
        if (fields.length > 1) {
            remove(index);
        } else {
            update(index, emptyTask);
        }
    };

    function radioBooleanInput(control: any, name: any): JSX.Element {
        return (
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <>
                        <div className="flex">
                            <div>
                                <label className="px-2 py-2">{t('common:yes')}</label>
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
                        <div className="flex">
                            <div>
                                <label className="px-2 py-2">{t('common:no')}</label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    onBlur={onBlur} // notify when input is touched
                                    onChange={() => {
                                        setValue('tasks', [emptyTask]);
                                        return onChange(false);
                                    }}
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
        <div>
            <div>
                <div className="flex">
                    <div className="font-bold mx-2">{t('step-data.time_frame')}</div>
                    <div className="mx-2">
                        {dateFrom} - {dateTo}
                    </div>
                    <input type="hidden" {...register(`_id`)} />
                </div>
            </div>
            <div className="mt-4 flex">
                <div className="w-1/6 flex items-center">
                    <label htmlFor="learning_goal" className="px-2 py-2">
                        {t('step-data.learning_activities')}
                    </label>
                </div>
                <div className="w-5/6">
                    <textarea
                        {...register(`learning_activity`)}
                        rows={2}
                        placeholder={t('step-data.learning_activities_placeholder')}
                        className="border border-gray-400 rounded-lg w-full p-2"
                    />
                    <p className="text-red-600 pt-2">
                        {formState.errors?.learning_activity?.message}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <p>{t('step-data.detail_activities')}</p>
                <div className="flex">{radioBooleanInput(control, 'has_tasks')}</div>
            </div>
            {watch('has_tasks') && (
                <div className="mt-4 flex">
                    <div className="flex flex-col w-full">
                        {fields.map((task, taskIndex) => (
                            <div className="relative" key={task.id}>
                                <Tasks taskIndex={taskIndex} />
                                <div className="absolute left-10 bottom-7">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(taskIndex)}
                                        className="cursor-pointer"
                                    >
                                        <Image
                                            src={imageTrashcan}
                                            width={20}
                                            height={20}
                                            alt="trashcan"
                                        ></Image>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="w-full flex items-center justify-center">
                            <ButtonLightBlue
                                onClick={() => {
                                    append(emptyTask);
                                }}
                            >
                                {t('step-data.add_learning_activity')}
                            </ButtonLightBlue>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
