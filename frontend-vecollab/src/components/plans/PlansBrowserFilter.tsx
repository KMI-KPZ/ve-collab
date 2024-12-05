import { MdArrowDropDown, MdClose } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { IfilterBy } from '@/pages/plans';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { FaMedal } from 'react-icons/fa';
import Dropdown from '../common/Dropdown';

interface Props {
    filterBy: IfilterBy[];
    filterByCallback: ({ compare, id }: IfilterBy) => void;
    isNoAuthPreview?: boolean;
}

export function PlansBrowserFilter({ filterBy, filterByCallback, isNoAuthPreview = false }: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation('common');
    const [search, setSearch] = useState<string>('');
    const showGoodPracticeOnly = filterBy.some((f) => f.id == 'isGoodPractice' && f.value == true);

    // filterBy.find((f) => f.id == 'author' && f.value === undefined)
    const [currentAuthorFilter, setCurrentAuthorFilter] = useState<string>(t('plans_filter_all'));

    const handleClickShowGoodPracticeOnly = () => {
        if (isNoAuthPreview) return;

        if (showGoodPracticeOnly) {
            filterByCallback({
                compare: undefined,
                id: 'isGoodPractice',
                value: undefined,
            });
        } else {
            filterByCallback({
                compare: (plan) => plan.is_good_practise === true,
                id: 'isGoodPractice',
                value: true,
            });
        }
    };

    const handleSwitchAuthorChange = (value: string) => {
        if (isNoAuthPreview) return;

        switch (value) {
            case 'all':
                setCurrentAuthorFilter(t('plans_filter_all'));
                filterByCallback({
                    compare: () => true,
                    id: 'author',
                    value: undefined,
                });

                break;

            case 'my':
                setCurrentAuthorFilter(t('plans_filter_my'));
                filterByCallback({
                    compare: (plan) => plan.author.username == session?.user.preferred_username,
                    id: 'author',
                    value: 'me',
                });
                break;

            case 'shared':
                setCurrentAuthorFilter(t('plans_filter_shared'));
                filterByCallback({
                    compare: (plan) => {
                        return (
                            plan.read_access.includes(session?.user.preferred_username as string) &&
                            plan.author.username != session?.user.preferred_username
                        );
                    },
                    id: 'author',
                    value: 'other',
                });
                break;

            default:
                break;
        }
    };

    return (
        <div className="mb-4 flex flex-wrap items-center gap-y-2">
            <div
                className={`flex p-2 rounded-full shadow border ${
                    isNoAuthPreview ? '' : 'cursor-pointer'
                }`}
                onClick={handleClickShowGoodPracticeOnly}
            >
                <div className="relative w-[48px] flex items-center ">
                    <div
                        className={`absolute w-[48px] h-[16px] left-0 rounded-md ${
                            showGoodPracticeOnly ? 'bg-green-800' : 'bg-gray-500'
                        }`}
                    ></div>
                    <div
                        className={`absolute  bg-white rounded-full p-1 border ${
                            showGoodPracticeOnly
                                ? 'right-0 text-ve-collab-blue border-ve-collab-blue'
                                : 'left-0 text-slate-500 border-slate-500'
                        }`}
                    >
                        <FaMedal />
                    </div>
                </div>
                <span className={`mx-2 ${showGoodPracticeOnly ? '' : 'text-gray-600'}   `}>
                    {t('plans_filter_good_practice_examples')}
                </span>
            </div>

            <div className="mx-4">
                <Dropdown
                    options={[
                        {
                            value: 'all',
                            label: t('plans_filter_all'),
                        },
                        {
                            value: 'my',
                            label: t('plans_filter_my'),
                        },
                        {
                            value: 'shared',
                            label: t('plans_filter_shared'),
                        },
                    ]}
                    onSelect={(value) => {
                        if (isNoAuthPreview) return;

                        // handleSelectOption(value, comment);
                        console.log({ value });
                        handleSwitchAuthorChange(value);
                    }}
                    icon={
                        <span className="flex  items-center">
                            {t('plans_table_author')}:{' '}
                            <span className="mx-2 text-ve-collab-blue underline">
                                {currentAuthorFilter}
                            </span>{' '}
                            <MdArrowDropDown />
                        </span>
                    }
                    ulClasses="!left-16 !right-auto"
                    isNoAuthPreview={isNoAuthPreview}
                />
            </div>

            <div className="flex items-center">
                <input
                    className={'border border-[#cccccc] rounded-l px-2 py-1'}
                    type="text"
                    placeholder={t('plans_filter_title_placeholder')}
                    name="search"
                    value={search}
                    autoComplete="off"
                    disabled={isNoAuthPreview}
                    onChange={(event) => {
                        if (isNoAuthPreview) return;

                        const value = (event.target as HTMLInputElement).value;
                        setSearch(value);
                        filterByCallback({
                            compare: (plan) => {
                                if (!plan.name) return false;
                                return plan.name.toLocaleLowerCase().includes(value.toLowerCase());
                            },
                            id: 'searchByName',
                            value: value,
                        });
                    }}
                />
                <div
                    onClick={(e) => {
                        if (isNoAuthPreview) return;

                        setSearch('');
                        filterByCallback({
                            compare: undefined,
                            id: 'searchByName',
                            value: null,
                        });
                    }}
                    className={`text-slate-600 inline relative -left-[22px] ${
                        isNoAuthPreview ? '' : 'hover:cursor-pointer'
                    }`}
                >
                    <MdClose size={15} className={`${search.length ? 'inline' : 'invisible'}`} />
                </div>
            </div>
        </div>
    );
}
