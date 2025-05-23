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
import ButtonLight from '@/components/common/buttons/ButtongLight';
import { MdAdd, MdClose, MdEdit } from 'react-icons/md';
import Button from '@/components/common/buttons/Button';
import CustomHead from '@/components/metaData/CustomHead';

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
    userDefinedAspects: {
        label: string;
        value: boolean;
    }[];
}

interface FormValues {
    checklist: CheckListPartner[];
}

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
    userDefinedAspects: [],
};

interface Props {
    socket: Socket;
}

Checklist.auth = true;
Checklist.noAuthPreview = <ChecklistNoAuthPreview />;
export default function Checklist({ socket }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['designer', 'common']); // designer is default ns
    const { data: session } = useSession();
    const [usersFirstLastNames, setUsersFirstLastNames] = useState<BackendUserSnippet[]>([]);
    const [showDescr, setShowDescr] = useState<{ [key: string]: boolean }>();

    const prevpage = '/ve-designer/evaluation';
    const nextpage = '/ve-designer/steps';

    const methods = useForm<FormValues>({
        mode: 'onChange',
        resolver: zodResolver(CheckListPartnersFormSchema),
        defaultValues: {
            checklist: [emptyCheckListPartner],
        },
    });

    const { fields: usersChecklist, update: updateUserChecklist } = useFieldArray({
        name: 'checklist',
        control: methods.control,
    });

    const defaultCheckboxes = [
        'time',
        'topic',
        'goals',
        'media',
        'technicalEquipment',
        'institutionalRequirements',
        'dataProtection',
    ] as Array<keyof CheckListPartner>;

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
            },
        ];
    };

    const toggleShowDescr = (key: string) => {
        setShowDescr((prev) => ({
            ...prev,
            ...{ [key]: prev && key in prev ? !prev[key] : true },
        }));
    };

    const DefaultCheckBox = ({
        value,
        userIdx,
    }: {
        value: keyof CheckListPartner;
        userIdx: number;
    }) => {
        const getDescr = () => {
            const _descr = t(`checklist.${value}_descr`, { returnObjects: true }) as string[];
            return Array.isArray(_descr) ? _descr : t(`checklist.${value}_descr`);
        };
        const descr = getDescr();

        return (
            <>
                <div className="group w-full flex justify-start border-t border-t-gray-200 items-center transition ease-in-out hover:bg-gray-50 pt-2 pb-1 px-2">
                    <div className="grow">
                        <label className="w-fit pr-4 truncate font-konnect cursor-pointer py-2 flex items-center">
                            <input
                                type="checkbox"
                                {...methods.register(`checklist.${userIdx}.${value}`)}
                                className="border border-gray-500 rounded-lg w-4 h-4 p-3 mb-1 mr-4"
                            />
                            {t(`checklist.${value}_title`)}
                        </label>
                    </div>

                    <span
                        onClick={() => toggleShowDescr(`${value}${userIdx}`)}
                        className="hidden items-center justify-center w-9 h-9 mx-2 text-ve-collab-blue rounded-full hover:bg-ve-collab-blue-light group-hover:inline-flex cursor-pointer"
                    >
                        ?
                    </span>
                </div>
                {showDescr && showDescr[`${value}${userIdx}`] === true && (
                    <div className="text-sm text-slate-800 ml-[24px] py-2">
                        {typeof descr === 'string' && <>{descr}</>}
                        {Array.isArray(descr) && (
                            <ul>
                                {descr.map((v, i) => {
                                    return (
                                        <li key={i} className="list-disc mx-2">
                                            {v}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </>
        );
    };

    const UserDefinedCheckBox = ({
        value,
        label,
        userIdx,
        index,
    }: {
        value: boolean;
        label: string;
        userIdx: number;
        index: number;
    }) => {
        const [showEdit, setShowEdit] = useState<boolean>(label == '');

        return (
            <>
                <div className="group w-full flex justify-start border-t border-t-gray-200 items-center transition ease-in-out hover:bg-gray-50 pt-2 pb-1 px-2">
                    <div className="grow">
                        <label className="w-fit truncate font-konnect cursor-pointer py-2 flex items-center">
                            <input
                                type="checkbox"
                                {...methods.register(
                                    `checklist.${userIdx}.userDefinedAspects.${index}.value`
                                )}
                                checked={value}
                                className="border border-gray-500 rounded-lg w-4 h-4 p-3 mb-1 mr-4"
                                onChange={() => {
                                    updateUserChecklist(userIdx, {
                                        ...usersChecklist[userIdx],
                                        ...{
                                            userDefinedAspects: usersChecklist[
                                                userIdx
                                            ].userDefinedAspects.map((a, i) => {
                                                return i == index
                                                    ? { label: a.label, value: !a.value }
                                                    : a;
                                            }),
                                        },
                                    });
                                }}
                            />
                            {showEdit ? (
                                <input
                                    type="text"
                                    {...methods.register(
                                        `checklist.${userIdx}.userDefinedAspects.${index}.label`
                                    )}
                                    placeholder={t('checklist.new_userbox_placeholder')}
                                    className="border border-gray-300 rounded-md px-2 py-1 -mt-1 -mb-1 w-fit"
                                    defaultValue={label}
                                    autoComplete="off"
                                    autoFocus={true}
                                    onBlur={(e) => {
                                        if (e.target.value !== label) {
                                            updateUserChecklist(userIdx, {
                                                ...usersChecklist[userIdx],
                                                ...{
                                                    userDefinedAspects: usersChecklist[
                                                        userIdx
                                                    ].userDefinedAspects.map((a, i) => {
                                                        return i == index
                                                            ? {
                                                                  label: e.target.value,
                                                                  value: a.value,
                                                              }
                                                            : a;
                                                    }),
                                                },
                                            });
                                        }
                                        if (e.target.value != '') setShowEdit(false);
                                    }}
                                />
                            ) : (
                                <>
                                    <input
                                        type="hidden"
                                        {...methods.register(
                                            `checklist.${userIdx}.userDefinedAspects.${index}.label`
                                        )}
                                        defaultValue={label}
                                    />
                                    <div className="grow">{label}</div>
                                </>
                            )}
                        </label>
                    </div>
                    {!showEdit && (
                        <>
                            <Button
                                className="invisible group-hover:visible"
                                onClick={() => {
                                    setShowEdit(true);
                                }}
                            >
                                <MdEdit />
                            </Button>
                        </>
                    )}
                    <button
                        className={`${!showEdit ? 'invisible' : ''} group-hover:visible`}
                        onClick={() => {
                            updateUserChecklist(userIdx, {
                                ...usersChecklist[userIdx],
                                ...{
                                    userDefinedAspects: usersChecklist[
                                        userIdx
                                    ].userDefinedAspects.filter((_, i) => i !== index),
                                },
                            });
                        }}
                    >
                        <MdClose size={20} />
                    </button>
                </div>
            </>
        );
    };

    function renderDefaultCheckBoxes(userIdx: number): JSX.Element[] {
        return defaultCheckboxes.map((v, i) => (
            <DefaultCheckBox key={i} userIdx={userIdx} value={v} />
        ));
    }

    function renderUserDefinedCheckBoxes(userIdx: number): JSX.Element[] {
        if (!usersChecklist[userIdx].userDefinedAspects) return [];

        return usersChecklist[userIdx].userDefinedAspects.map((key, i) => (
            <UserDefinedCheckBox
                key={i}
                index={i}
                userIdx={userIdx}
                label={key.label}
                value={key.value}
            />
        ));
    }

    return (
        <>
            <CustomHead
                pageTitle={t('checklist.title')}
                pageSlug={'ve-designer/checklist'}
                pageDescription={t('checklist.page_description')}
            />
            <Wrapper
                socket={socket}
                title={t('checklist.title')}
                subtitle={t('checklist.subtitle')}
                description={t('checklist.description')}
                tooltip={{
                    text: t('checklist.tooltip'),
                    link: '/learning-material/Zusammen%20Planen/Leitfragen%20für%20die%20Aushandlungsphase',
                }}
                stageInMenu="generally"
                idOfProgress="checklist"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={setPlanerData}
                submitCallback={onSubmit}
            >
                <div className="flex flex-wrap gap-4 mb-10">
                    {usersChecklist.map((userCheckForm, index) => (
                        <div
                            key={userCheckForm.id}
                            className="min-w-80 flex basis-1/3 h-fit justify-center shadow-sm rounded-sm"
                        >
                            <div className="w-full px-4 py-8 flex flex-col">
                                <div className="flex justify-start items-center font-bold text-lg pb-4">
                                    {findPartnerFirstAndLastName(userCheckForm.username)}
                                </div>
                                {renderDefaultCheckBoxes(index)}

                                {renderUserDefinedCheckBoxes(index)}

                                <ButtonLight
                                    className="w-fit rounded-full! mx-auto mt-2"
                                    title={t('checklist.add_userdefined_title')}
                                    onClick={() => {
                                        updateUserChecklist(index, {
                                            ...userCheckForm,
                                            ...{
                                                userDefinedAspects:
                                                    !userCheckForm.userDefinedAspects
                                                        ? [{ label: '', value: false }]
                                                        : [
                                                              ...userCheckForm.userDefinedAspects,
                                                              { label: '', value: false },
                                                          ],
                                            },
                                        });
                                    }}
                                >
                                    <MdAdd size={21} />
                                </ButtonLight>
                            </div>
                        </div>
                    ))}
                </div>
            </Wrapper>
        </>
    );
}

export function ChecklistNoAuthPreview() {
    const { t } = useTranslation(['designer', 'common']); // designer is default ns

    const prevpage = '/ve-designer/evaluation';
    const nextpage = '/ve-designer/steps';

    const methods = useForm<FormValues>({});

    const defaultCheckboxes = [
        'time',
        'topic',
        'goals',
        'media',
        'technicalEquipment',
        'institutionalRequirements',
        'dataProtection',
    ] as Array<keyof CheckListPartner>;

    return (
        <div className="opacity-55">
            <CustomHead
                pageTitle={t('checklist.title')}
                pageSlug={'ve-designer/checklist'}
                pageDescription={t('checklist.page_description')}
            />
            <Wrapper
                socket={undefined}
                title={t('checklist.title')}
                subtitle={t('checklist.subtitle')}
                description={t('checklist.description')}
                tooltip={{
                    text: t('checklist.tooltip'),
                    link: '/learning-material/Zusammen%20Planen/Aushandlungsphase',
                }}
                stageInMenu="generally"
                idOfProgress="checklist"
                methods={methods}
                prevpage={prevpage}
                nextpage={nextpage}
                planerDataCallback={() => ({})}
                submitCallback={() => {}}
                isNoAuthPreview
            >
                <div className="flex flex-wrap gap-4 mb-10">
                    {Array(2)
                        .fill(null)
                        .map((_, index) => (
                            <div
                                key={index}
                                className="min-w-80 flex basis-1/3 h-fit justify-center shadow-sm rounded-sm"
                            >
                                <div className="w-full px-4 py-8 flex flex-col">
                                    <div className="flex justify-start items-center font-bold text-lg pb-4">
                                        {index === 0
                                            ? t('common:no_auth.partner1')
                                            : t('common:no_auth.partner2')}
                                    </div>
                                    {defaultCheckboxes.map((v, i) => (
                                        <div
                                            key={i}
                                            className="group w-full flex justify-start border-t border-t-gray-200 items-center transition ease-in-out hover:bg-gray-50 pt-2 pb-1 px-2"
                                        >
                                            <div className="grow">
                                                <label className="w-fit pr-4 truncate font-konnect cursor-pointer py-2 flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        disabled
                                                        className="border border-gray-500 rounded-lg w-4 h-4 p-3 mb-1 mr-4"
                                                    />
                                                    {t(`checklist.${v}_title`)}
                                                </label>
                                            </div>

                                            <span
                                                onClick={() => {}}
                                                className="hidden items-center justify-center w-9 h-9 mx-2 text-ve-collab-blue rounded-full"
                                            >
                                                ?
                                            </span>
                                        </div>
                                    ))}

                                    <ButtonLight
                                        className="w-fit rounded-full! mx-auto mt-2"
                                        title={t('checklist.add_userdefined_title')}
                                        onClick={() => {}}
                                    >
                                        <MdAdd size={21} />
                                    </ButtonLight>
                                </div>
                            </div>
                        ))}
                </div>
            </Wrapper>
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-white/60 to-white pointer-events-none"></div>
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
