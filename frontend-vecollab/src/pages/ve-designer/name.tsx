import { useRouter } from 'next/router';
import React, { useCallback } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { NameFormSchema } from '../../zod-schemas/nameSchema';
import CustomHead from '@/components/metaData/CustomHead';

interface FormValues {
    name: string;
}

interface Props {
    socket: Socket;
}

Name.auth = true;
Name.noAuthPreview = <NameNoAuthPreview />;
export default function Name({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']);

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(NameFormSchema),
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            methods.setValue('name', plan.name, { shouldValidate: true, shouldDirty: false });

            return { name: plan.name };
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
        ];
    };

    return (
        <>
            <CustomHead
                pageTitle={t('name.title')}
                pageSlug={'ve-designer/name'}
                pageDescription={t('name.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('name.title')}
                subtitle={t('name.subtitle')}
                description={t('name.description')}
                methods={methods}
                stageInMenu="generally"
                idOfProgress="name"
                nextpage="/ve-designer/partners"
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className="">
                    <input
                        type="text"
                        placeholder={t('name.placeholder')}
                        className="border border-gray-300 rounded-md p-2 w-full md:w-1/2"
                        autoComplete="off"
                        autoFocus={true}
                        {...methods.register('name')}
                    />
                    <p className="text-red-600 pt-2">
                        {t(methods.formState.errors.name?.message!)}
                    </p>
                </div>
            </Wrapper>
        </>
    );
}

export function NameNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']);
    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(NameFormSchema),
    });

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('name.title')}
                pageSlug={'ve-designer/name'}
                pageDescription={t('name.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('name.title')}
                subtitle={t('name.subtitle')}
                description={t('name.description')}
                methods={methods}
                stageInMenu="generally"
                idOfProgress="name"
                nextpage="/ve-designer/partners"
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview={true}
            >
                <div className="">
                    <input
                        type="text"
                        placeholder={t('name.placeholder')}
                        className="border border-gray-300 rounded-md p-2 w-1/2"
                        autoComplete="off"
                        autoFocus={true}
                        disabled={true}
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
