import { MdAdd, MdCheck, MdCheckBoxOutlineBlank, MdClose } from 'react-icons/md';
import ButtonNewPlan from './ButtonNewPlan';
import { useSession } from 'next-auth/react';
import { IfilterBy } from '@/pages/plans';
import { Socket } from 'socket.io-client';
import { GiCheckMark } from 'react-icons/gi';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';

interface Props {
    socket: Socket;
    filterBy: IfilterBy[];
    filterByCallback: ({ compare, id }: IfilterBy) => void;
}

export function PlansBrowserFilter({
    filterBy,
    filterByCallback,
    socket,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common')
    const [search, setSearch] = useState<string>("")
    const isGoodPractice = filterBy.some(f => f.id == "isGoodPractice" && f.value == true)

    return (
        <div className="mb-4 flex flex-wrap items-center gap-y-2">
            <div className="flex flex-rows items-center mr-4 divide-x divide-slate-900">
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'author' && f.value === undefined)
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: () => true,
                                id: 'author',
                                value: undefined
                            })
                        }
                    >
                        {t("plans_filter_all")}
                    </button>
                </div>
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'author' && f.value == 'me')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: (plan) => plan.author.username == session?.user.preferred_username,
                                id: 'author',
                                value: 'me'
                            })
                        }
                    >
                        {t("plans_filter_my")}
                    </button>
                </div>
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'author' && f.value == 'other')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: (plan) => {
                                    return plan.read_access.includes(session?.user.preferred_username as string)
                                        && plan.author.username != session?.user.preferred_username
                                },
                                id: 'author',
                                value: 'other'
                            })
                        }
                    >
                        {t("plans_filter_shared")}
                    </button>
                </div>
            </div>

            <div className='flex items-center'>
                <input
                    className={'border border-[#cccccc] rounded-l px-2 py-1'}
                    type="text"
                    placeholder={t("plans_filter_title_placeholder")}
                    name="search"
                    value={search}
                    autoComplete="off"
                    onChange={(event) => {
                        const value = (event.target as HTMLInputElement).value
                        setSearch(value)
                        filterByCallback({
                            compare: (plan) => {
                                if (!plan.name) return false
                                return plan.name
                                    .toLocaleLowerCase()
                                    .includes(value.toLowerCase());
                            },
                            id: 'searchByName',
                            value: value
                        });
                    }}
                />
                <div onClick={e => {
                    setSearch("")
                    filterByCallback({
                        compare: undefined,
                        id: 'searchByName',
                        value: null
                    });
                }} className='text-slate-600 inline relative -left-[22px] hover:cursor-pointer'>
                    <MdClose size={15} className={`${search.length ? "inline" : "invisible"}`} />
                </div>
            </div>

            <ButtonLightBlue
                onClick={() => {
                    if (isGoodPractice) {
                        filterByCallback({
                            compare: undefined,
                            id: 'isGoodPractice',
                            value: undefined
                        })
                    } else {
                        filterByCallback({
                            compare: (plan) => plan.is_good_practise === true,
                            id: 'isGoodPractice',
                            value: true
                        })

                    }
                }}
            >
                <>
                    {isGoodPractice
                        ? (<MdCheck className='inline mr-1 mb-1' />)
                        : (<MdCheckBoxOutlineBlank className='inline mr-1 mb-1' />)
                    }
                    {t("plans_filter_good_practice_examples")}
                </>
            </ButtonLightBlue>

            <div className="ml-auto">
                <ButtonNewPlan
                    socket={socket}
                    label={
                        <>
                            <MdAdd className="inline" /> {t("plans_btn_new_plan")}
                        </>
                    }
                />
            </div>
        </div>
    );
}
