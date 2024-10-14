import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { BackendUserSnippet, BackendProfileSnippetsResponse } from '@/interfaces/api/apiInterfaces';
import Wrapper from '@/components/VE-designer/Wrapper';
import { IPlan } from '@/interfaces/planner/plannerInterfaces';
import { Socket } from 'socket.io-client';
import { CheckListPartnersFormSchema } from '../../zod-schemas/checkListSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

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
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const { data: session } = useSession();
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);
    const [displayText, setDisplayText] = useState<{[key: string]: boolean}>()

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

    const toggleDisplayText = (key: string) => {
        setDisplayText((prev) =>
            ({
                ...prev,
                ...{[key]: (prev && key in prev) ? !prev[key] : true}
            })
        )
    }

    const CheckBox = ({
        checklistFormIdx,
        value,
        userIdx
    }: {
        checklistFormIdx: number,
        value: keyof CheckListPartner
        userIdx: number
    }) => {

        const getDescr = () => {
            const _descr = t(`checklist.${value}_descr`, { returnObjects: true }) as string[]
            return Array.isArray(_descr) ? _descr : t(`checklist.${value}_descr`)
        }
        const descr = getDescr()

        return (<>
            <div className="group w-full flex justify-start border-t items-center transition ease-in-out hover:bg-gray-50 pt-2 pb-1 px-2">
                <div className='grow'>
                    <label className='w-fit pr-4 truncate font-konnect cursor-pointer py-2 flex items-center'>
                        <input
                            type="checkbox"
                            {...methods.register(`checklist.${checklistFormIdx}.${value}`)}
                            className="border border-gray-500 rounded-lg w-4 h-4 p-3 mb-1 mr-4"
                        />
                        {t(`checklist.${value}_title`)}
                    </label>
                </div>

                <span
                    onClick={e => toggleDisplayText(`${value}${userIdx}`)}
                    className='hidden items-center justify-center w-9 h-9 mx-2 text-ve-collab-blue rounded-full hover:bg-ve-collab-blue-light group-hover:inline-flex cursor-pointer'
                >
                    ?
                </span>
            </div>
            {(displayText && displayText[`${value}${userIdx}`] === true) && (
                <div className='text-sm text-slate-800 ml-[24px] py-2'>
                    {typeof descr === 'string' && (
                        <>{descr}</>
                    )}
                    {Array.isArray(descr) && (
                        <ul>
                            {descr.map((v, i) => {
                                return (<li key={i} className="list-disc mx-2">{v}</li>)
                            })}
                        </ul>
                    )}
                </div>
            )}
        </>)
    }

    function renderCheckBoxes(): JSX.Element[] {
        return fields.map((userCheckForm, index) => (
            <div key={userCheckForm.id} className="min-w-80 flex basis-1/3 h-fit justify-center shadow rounded">
                <div className="w-full px-4 py-8 flex flex-col">
                    <div className="flex justify-start items-center font-bold text-lg pb-4">
                        {findPartnerFirstAndLastName(userCheckForm.username)}
                    </div>
                    {([
                        "time",
                        "topic",
                        "goals",
                        "media",
                        "technicalEquipment",
                        "institutionalRequirements",
                        "dataProtection"

                    ] as Array<keyof CheckListPartner>).map((v, i) => {
                        return (<CheckBox
                            key={i}
                            userIdx={index}
                            checklistFormIdx={index}
                            value={v}
                        />)
                    })}

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
            <div className="flex flex-wrap gap-4 mb-10">{renderCheckBoxes()}</div>
        </Wrapper>
    );
}

export async function getStaticProps({ locale }: { locale: any }) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'designer'])),
        },
    };
}
