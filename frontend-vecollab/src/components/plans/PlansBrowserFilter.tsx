import { MdAdd } from 'react-icons/md';
import ButtonNewPlan from './ButtonNewPlan';
import { useSession } from 'next-auth/react';
import { IfilterBy } from '@/pages/plans';
import { Socket } from 'socket.io-client';
import { GiCheckMark } from 'react-icons/gi';

interface Props {
    socket: Socket;
    filterBy: IfilterBy[];
    filterByCallback: ({ planKey, compare, id }: IfilterBy) => void;
}

export function PlansBrowserFilter({
    filterBy,
    filterByCallback,
    socket,
}: Props) {
    const { data: session } = useSession();

    return (
        <div className="mb-4 flex items-center">
            <div className="flex flex-rows mr-4 divide-x divide-slate-900">
                <div className="px-2">
                    <button
                        className={`hover:underline ${
                            !filterBy.find((f) => f.planKey == 'author') ||
                            filterBy.find((f) => f.id == 'allAuthors')
                                ? 'text-ve-collab-blue underline'
                                : ''
                        }`}
                        onClick={() =>
                            filterByCallback({
                                planKey: 'author',
                                compare: () => true,
                                id: 'allAuthors',
                            })
                        }
                    >
                        Alle
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
                                planKey: 'author',
                                compare: (planAuthor) =>
                                    (planAuthor as string) == session?.user.preferred_username,
                                id: 'iamAuthor',
                            })
                        }
                    >
                        Eigene
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
                                planKey: 'author',
                                compare: (planAuthor) =>
                                    (planAuthor as string) != session?.user.preferred_username,
                                id: 'otherAuthor',
                            })
                        }
                    >
                        Mit mir geteilte
                    </button>
                </div>
            </div>

            <div>
                <input
                    className={'border border-[#cccccc] rounded-l px-2 py-1'}
                    type="text"
                    placeholder={'Nach Titel filtern ...'}
                    name="search"
                    autoComplete="off"
                    onKeyUp={(event) => {
                        filterByCallback({
                            planKey: 'name',
                            compare: (planName) => {
                                if (!planName) return false
                                return (planName as string)
                                    .toLocaleLowerCase()
                                    .includes(
                                        (event.target as HTMLInputElement).value.toLowerCase()
                                    );
                            },
                            id: 'searchByName',
                        });
                    }}
                />
            </div>

            <div
                className="mx-4 py-2 px-5 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20 cursor-pointer"
                onClick={() => {
                    if ( filterBy.find((f) => f.id == 'isGoodPractice') ) {
                        filterByCallback({
                            planKey: 'is_good_practise',
                            compare: () => true,
                            id: 'isAnyPractice',
                        })
                    } else {
                        filterByCallback({
                            planKey: 'is_good_practise',
                            compare: (planIsGoodPractice) =>
                                (planIsGoodPractice as boolean) === true,
                            id: 'isGoodPractice',
                        })
                    }
                }}
            >
                Good Practice Beispiele
                { filterBy.find((f) => f.id == 'isGoodPractice') && <GiCheckMark className='inline ml-2 mb-2' /> }
            </div>

            <div className="ml-auto">
                <ButtonNewPlan
                    socket={socket}
                    className="ml-4 py-2 px-5 bg-ve-collab-orange rounded-lg text-white"
                    label={
                        <>
                            <MdAdd className="inline" /> Neuen Plan starten
                        </>
                    }
                />
            </div>
        </div>
    );
}
