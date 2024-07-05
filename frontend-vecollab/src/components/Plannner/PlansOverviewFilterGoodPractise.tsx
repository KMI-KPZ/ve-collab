import { useSession } from 'next-auth/react';
import { IfilterBy } from '@/pages/plans';

interface Props {
    filterBy: IfilterBy[];
    filterByCallback: ({ planKey, compare, id }: IfilterBy) => void;
}

export function PlansOverviewFilterGoodPractise({
    filterBy,
    filterByCallback,
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
                                return (planName as string)
                                    .toLocaleLowerCase()
                                    .includes(
                                        (event.target as HTMLInputElement).value.toLowerCase()
                                    );
                            },
                            id: 'iamAthor',
                        });
                    }}
                />
            </div>
        </div>
    );
}
