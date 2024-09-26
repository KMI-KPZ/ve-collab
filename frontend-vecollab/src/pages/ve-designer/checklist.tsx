import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { TooltipList } from '@/components/common/TooltipList';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { BackendUserSnippet, BackendProfileSnippetsResponse } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { CheckListPartnersFormSchema } from '../../zod-schemas/checkListSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export interface CheckListPartner {
    username: string;
    time: boolean;
    // format: boolean;
    topic: boolean;
    goals: boolean;
    // languages: boolean;
    media: boolean;
    technicalEquipment: boolean;
    // evaluation: boolean;
    institutionalRequirements: boolean;
    dataProtection: boolean;
}

interface FormValues {
    checklist: CheckListPartner[];
}

// const areAllFormValuesEmpty = (formValues: FormValues): boolean => {
//     return formValues.checklist.every((checkListPartner) => {
//         return (
//             !checkListPartner.time &&
//             // !checkListPartner.format &&
//             !checkListPartner.topic &&
//             !checkListPartner.goals &&
//             // !checkListPartner.languages &&
//             !checkListPartner.media &&
//             !checkListPartner.technicalEquipment &&
//             // !checkListPartner.evaluation &&
//             !checkListPartner.institutionalRequirements &&
//             !checkListPartner.dataProtection
//         );
//     });
// };

const emptyCheckListPartner: CheckListPartner = {
    username: '',
    time: false,
    // format: false,
    topic: false,
    goals: false,
    // languages: false,
    media: false,
    technicalEquipment: false,
    // evaluation: false,
    institutionalRequirements: false,
    dataProtection: false,
};

interface Props {
    socket: Socket;
}

Checklist.auth = true;
export default function Checklist({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']) // designer is default ns
    const { data: session } = useSession();
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);

    const prevpage = '/ve-designer/evaluation';
    const nextpage = '/ve-designer/step-names';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(CheckListPartnersFormSchema),
        defaultValues: {
            checklist: [emptyCheckListPartner],
        },
    });

    const { fields } = useFieldArray({
        name: 'checklist',
        control: methods.control,
    });

    const setPlanerData = useCallback(
        (plan: IPlan) => {
            let checklistValue = [emptyCheckListPartner];
            if (plan.checklist && Array.isArray(plan.checklist) && plan.checklist.length > 0) {
                checklistValue = plan.checklist;
                methods.setValue('checklist', checklistValue);
            }

            // fetch profile snippets to be able to display the full name instead of username only
            fetchPOST(
                '/profile_snippets',
                { usernames: [...plan.partners, plan.author.username] },
                session?.accessToken
            ).then((snippets: BackendProfileSnippetsResponse) => {
                setUsersFirstLastNames(snippets.user_snippets);
            });

            return { checklist: checklistValue };
        },
        [methods, session]
    );

    const findPartnerFirstAndLastName = (username: string): string => {
        const findUser = usersFirstLastNames.find(
            (backendUserSnippet: BackendUserSnippet) => username === backendUserSnippet.username
        );
        if (findUser) {
            return findUser.first_name + ' ' + findUser.last_name;
        } else {
            return username;
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
        return [
            {
                plan_id: router.query.plannerId,
                field_name: 'checklist',
                value: data.checklist,
            }
        ];
    };

    function renderCheckBoxes(): JSX.Element[] {
        return fields.map((userCheckForm, index) => (
            <div key={userCheckForm.id} className="flex justify-center shadow rounded mx-2">
                <div className="w-4/5 space-y-3 py-8 flex flex-col">
                    <div className="flex justify-start items-center font-bold text-lg mb-4">
                        {findPartnerFirstAndLastName(userCheckForm.username)}
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.time`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                t('checklist.time_descr-1'),
                                t('checklist.time_descr-2')
                            ]}
                        >
                            <p>{t('checklist.time')}</p>
                        </TooltipList>
                    </div>
                    {/* <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.format`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={['Format(e) des VE']}>
                            <p>Format</p>
                        </TooltipList>
                    </div> */}
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.topic`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={[t('checklist.topic_descr-1')]}>
                            <p>{t('checklist.topic')}</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.goals`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={[t('checklist.objectives_descr-1')]}>
                            <p>{t('checklist.objectives')}</p>
                        </TooltipList>
                    </div>
                    {/* <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.languages`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Sprache(n), in der / denen der VE stattfinden soll bzw. in denen im VE kommuniziert werden kann',
                            ]}
                        >
                            <p>Sprache(n)</p>
                        </TooltipList>
                    </div> */}
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.media`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[t('checklist.media_descr-1') ]}
                        >
                            <p>{t('checklist.media')}</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.technicalEquipment`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                t('checklist.technic_descr-1'),
                                t('checklist.technic_descr-2')
                            ]}
                        >
                            <p>{t('checklist.technic')}</p>
                        </TooltipList>
                    </div>
                    {/* <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.evaluation`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList
                            tooltipsTextItems={[
                                'Vorgehen bei der Bewertung (Art der Leistung und Bewertung), falls Prüfungsleistung im VE',
                            ]}
                        >
                            <p>Bewertung</p>
                        </TooltipList>
                    </div> */}
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.institutionalRequirements`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={[t('checklist.guidelines_descr-1')]}>
                            <p>{t('checklist.guidelines')}</p>
                        </TooltipList>
                    </div>
                    <div className="flex justify-start items-center">
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${index}.dataProtection`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mr-6"
                        />
                        <TooltipList tooltipsTextItems={[t('checklist.dataprotection_descr-1')]}>
                            <p>{t('checklist.dataprotection')}</p>
                        </TooltipList>
                    </div>
                </div>
            </div>
        ));
    }

    return (
        <Wrapper
            socket={socket}
            title={t('checklist.title')}
            subtitle={t('checklist.subtitle')}
            description={t('checklist.description')}
            tooltip={{
                text: t('checklist.tooltip'),
                link: '/learning-material/top-bubble/Herausforderungen',
            }}
            stageInMenu='generally'
            idOfProgress="checklist"
            methods={methods}
            prevpage={prevpage}
            nextpage={nextpage}
            planerDataCallback={setPlanerData}
            submitCallback={onSubmit}
        >
            <div className="grid grid-cols-3 gap-1 mt-7 mb-10">{renderCheckBoxes()}</div>
        </Wrapper>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', [
                'common',
                'designer'
            ])),
        },
    }
}
