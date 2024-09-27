import { MdAdd, MdClose } from 'react-icons/md';
import ButtonNewPlan from './ButtonNewPlan';
import { useSession } from 'next-auth/react';
import { IfilterBy } from '@/pages/plans';
import { Socket } from 'socket.io-client';
import { GiCheckMark } from 'react-icons/gi';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

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
    const [isGoodPractice, setIsGoodPractice] = useState<boolean>(false)
    const [search, setSearch] = useState<string>("")

    return (
        <div className="mb-4 flex items-center">
            <div className="flex flex-rows items-center mr-4 divide-x divide-slate-900">
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'allAuthors')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: () => true,
                                id: 'allAuthors',
                            })
                        }
                    >
                        {t("plans_filter_all")}
                    </button>
                </div>
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'iamAuthor')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: (plan) => plan.author.username == session?.user.preferred_username,
                                id: 'iamAuthor',
                            })
                        }
                    >
                        {t("plans_filter_my")}
                    </button>
                </div>
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            filterBy.find((f) => f.id == 'otherAuthor')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                compare: (plan) => {
                                    return plan.read_access.includes(session?.user.preferred_username as string)
                                        && plan.author.username != session?.user.preferred_username
                                },
                                id: 'otherAuthor',
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
                            isAdditional: true
                        });
                    }}
                />
                <div onClick={e => {
                    setSearch("")
                    filterByCallback({
                        compare: undefined,
                        id: 'searchByName',
                        isAdditional: true
                    });
                }} className='text-slate-600 inline relative -left-[22px] hover:cursor-pointer'><MdClose size={15} className='inline' /></div>
            </div>

            <div
                className="mx-4 py-2 px-5 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20 cursor-pointer"
                onClick={() => {
                    if (isGoodPractice) {
                        filterByCallback({
                            compare: undefined,
                            id: 'isGoodPractice',
                            isAdditional: true
                        })
                    } else {
                        filterByCallback({
                            compare: (plan) => plan.is_good_practise === true,
                            id: 'isGoodPractice',
                            isAdditional: true
                        })

                    }
                    setIsGoodPractice(prev => !prev)
                }}
            >
                {t("plans_filter_good_practice_examples")}
                {isGoodPractice && <GiCheckMark className='inline ml-2 mb-2' /> }
            </div>

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
