import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import CreatableSelect from 'react-select/creatable';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { MethFormSchema } from '../../zod-schemas/methodologySchema';
import { zodResolver } from '@hookform/resolvers/zod';
import CustomHead from '@/components/metaData/CustomHead';

interface FormValues {
    methodicalApproaches: MethodicalApproach[];
}

interface MethodicalApproach {
    value: string;
    label: string;
}

// const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
//     return formValues.methodicalApproaches.every((value) => {
//         return value.value === '' && value.label === '';
//     });
// };

interface Props {
    socket: Socket;
}

Methodology.auth = true;
Methodology.noAuthPreview = <MethodologyNoAuthPreview />;
export default function Methodology({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const prevpage = '/ve-designer/learning-env';
    const nextpage = '/ve-designer/evaluation';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(MethFormSchema),
        defaultValues: {
            methodicalApproaches: [],
        },
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            const approaches = plan.methodical_approaches.map((value) => ({ value, label: value }));
            methods.setValue('methodicalApproaches', approaches);

            return { methodicalApproaches: approaches };
        },
        [methods]
    );

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'methodical_approaches',
                value: data.methodicalApproaches.map((value) => value.value),
            },
        ];
    };

    const options: { value: string; label: string }[] = [
        {
            value: t('methodology.option-1'),
            label: t('methodology.option-1'),
        },
        {
            value: t('methodology.option-2'),
            label: t('methodology.option-2'),
        },
        {
            value: t('methodology.option-3'),
            label: t('methodology.option-3'),
        },
        {
            value: t('methodology.option-4'),
            label: t('methodology.option-4'),
        },
    ];

    function createableSelect(
        control: any,
        name: any,
        options: { value: string; label: string }[]
    ): JSX.Element {
        return (
            <>
                <Controller
                    name={name}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                        <CreatableSelect
                            ref={ref}
                            onChange={onChange}
                            onBlur={onBlur}
                            value={value}
                            options={options}
                            isClearable={true}
                            isMulti
                            closeMenuOnSelect={false}
                            placeholder={t('methodology.placeholder')}
                        />
                    )}
                    control={control}
                />
                {Array.isArray(methods.formState.errors.methodicalApproaches) &&
                    methods.formState.errors.methodicalApproaches.map(
                        (error, index) =>
                            error?.value?.message && (
                                <p key={index} className="text-red-600 pt-2">
                                    {t(error.value.message!)}
                                </p>
                            )
                    )}
            </>
        );
    }

    return (
        <>
            <CustomHead pageTitle={t('methodology.title')} pageSlug={'ve-designer/methodology'} />
            <Wrapper
                socket={socket}
                title={t('methodology.title')}
                subtitle={t('methodology.subtitle')}
                description={t('methodology.description')}
                tooltip={{
                    text: t('methodology.tooltip'),
                    link: '/learning-material/4/Methodenkoffer',
                }}
                stageInMenu="generally"
                idOfProgress="methodical_approaches"
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
        </>
    );
}

export function MethodologyNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const prevpage = '/ve-designer/learning-env';
    const nextpage = '/ve-designer/evaluation';

    const methods = useForm<FormValues>({});

    return (
        <div className="opacity-55">
            <CustomHead pageTitle={t('methodology.title')} pageSlug={'ve-designer/methodology'} />
            <Wrapper
                socket={undefined}
                title={t('methodology.title')}
                subtitle={t('methodology.subtitle')}
                description={t('methodology.description')}
                tooltip={{
                    text: t('methodology.tooltip'),
                    link: '/learning-material/4/Methodenkoffer',
                }}
                stageInMenu="generally"
                idOfProgress="methodical_approaches"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div className="mt-4 flex flex-col justify-center ">
                    <CreatableSelect
                        isDisabled
                        isClearable={true}
                        isMulti
                        closeMenuOnSelect={false}
                        placeholder={t('methodology.placeholder')}
                    />
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-white/75 to-white pointer-events-none"></div>
        </div>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
