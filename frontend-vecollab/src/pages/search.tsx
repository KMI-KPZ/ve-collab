import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import TimelinePostText from '@/components/network/TimelinePostText';
import Timestamp from '@/components/common/Timestamp';
import { useGetSearchResults } from '@/lib/backend';
import { useRouter } from 'next/router';
import { FormEvent, useRef, useState } from 'react';
import { GiSadCrab } from 'react-icons/gi';
import { MdArrowDownward, MdArrowRight, MdKeyboardArrowDown, MdSearch } from 'react-icons/md';
import GeneralError from '@/components/common/GeneralError';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';
import UserProfileImage from '@/components/network/UserProfileImage';
import useDynamicPlaceholder from '@/components/common/useDynamicPlaceholder';
import H2 from '@/components/common/H2';
import Link from 'next/link';
import { FaMedal } from 'react-icons/fa';
import { TbFileText } from 'react-icons/tb';
import ButtonLightBlue from '@/components/common/buttons/ButtonLightBlue';
import { useSession } from 'next-auth/react';

SearchResult.auth = true;
SearchResult.autoForward = true;
export default function SearchResult() {
    const { t } = useTranslation(['common', 'community']);
    const { data: session, status } = useSession();

    const router = useRouter();
    const [postsPagination, setPostsPagination] = useState<number>(5);
    const [plansPagination, setPlansPagination] = useState<number>(5);

    const { data, isLoading, error, mutate } = useGetSearchResults(
        router.query.search as string,
        router.query.filter ? (router.query.filter as string).split(',') : undefined
    );

    const searchInputRef = useRef<HTMLInputElement>(null);
    useDynamicPlaceholder(searchInputRef);

    const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!e.currentTarget.search.value) return;
        router.push(`/search?search=${e.currentTarget.search.value}`);
    };

    const Wrapper = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
        return (
            <div className="">
                <div className="flex flex-col m-auto md:p-12 p-6 max-w-screen-[1500] items-center">
                    <div className="md:w-1/2">
                        <div className="font-bold text-4xl mb-4">{t('search')}</div>
                        <div className="text-gray-600">{t('search_instructions')}</div>
                        <form className="flex my-4 w-3/4" onSubmit={(e) => handleSearchSubmit(e)}>
                            <input
                                className={'w-full border border-[#cccccc] rounded-l px-2 py-1'}
                                type="text"
                                placeholder={t('search_placeholder')}
                                name="search"
                                autoComplete="off"
                                ref={searchInputRef}
                                defaultValue={
                                    router.query.search ? (router.query.search as string) : ''
                                }
                            />
                            <button
                                type="submit"
                                title={t('search_title')}
                                className="-ml-1 bg-ve-collab-orange rounded-r p-2 hover:bg-ve-collab-orange-light"
                            >
                                <MdSearch className="text-white" />
                            </button>
                        </form>
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Wrapper>
                <div className="mt-4">
                    <LoadingAnimation />
                </div>
            </Wrapper>
        );
    }

    if (error) {
        return (
            <Wrapper>
                <GeneralError />
            </Wrapper>
        );
    }

    if (
        router.query.search &&
        !data?.posts?.length &&
        !data?.users?.length &&
        !data?.spaces?.length &&
        !data?.plans?.length
    ) {
        return (
            <Wrapper>
                <div className="flex items-center">
                    <GiSadCrab size={60} className="m-4" />
                    <div className="text-xl text-slate-900">{t('search_no_results')}</div>
                </div>
            </Wrapper>
        );
    }

    return (
        <>
            <CustomHead
                pageTitle={t('search')}
                pageSlug={'search'}
                pageDescription={t('search_description')}
            />
            <Wrapper>
                {/* TODO Filter by category?! */}
                {/* <div className="flex flex-rows mr-4 divide-x divide-slate-900">
                <div className="px-2">
                    <a href={`/search?search=${router.query.search}`} className="hover:underline text-ve-collab-blue underline">Alle</a>
                </div>
                <div className="px-2">
                    <a href={`/search?search=${router.query.search}&filter=posts`} className="hover:underline">Beiträge</a>
                </div>
                <div className="px-2">
                    <a href={`/search?search=${router.query.search}&filter=users`} className="hover:underline">Personen</a>
                </div>
                <div className="px-2">
                    <a href={`/search?search=${router.query.search}&filter=spaces`} className="hover:underline">Gruppen</a>
                </div>
            </div> */}

                <div>
                    {data.plans.length > 0 && (
                        <div className="mb-10">
                            <H2>
                                {t('search_result_plans')} ({data.plans.length})
                            </H2>
                            <div className="m-2">
                                {data.plans.map((plan, i) => {
                                    if (i > plansPagination) return;
                                    if (i == plansPagination) {
                                        return (
                                            <ButtonLightBlue
                                                key={i}
                                                label={
                                                    <>
                                                        {t('search_result_show_more')}{' '}
                                                        <MdKeyboardArrowDown
                                                            size={24}
                                                            className="inline mx-1"
                                                        />
                                                    </>
                                                }
                                                onClick={() => setPlansPagination((x) => x + 10)}
                                                className="mt-4"
                                            />
                                        );
                                    }
                                    return (
                                        <div
                                            key={plan._id}
                                            className="flex flex-col p-4 mb-4 bg-white rounded shadow hover:bg-slate-50"
                                        >
                                            <Timestamp
                                                timestamp={plan.last_modified}
                                                className="text-sm text-slate-650 italic"
                                            />
                                            <div className="flex flex-row items-center my-1">
                                                <div className="grow flex items-center truncate">
                                                    <Link
                                                        href={`/plan/${plan._id}`}
                                                        className="group/ve-item flex items-center font-bold text-lg truncate"
                                                    >
                                                        <TbFileText
                                                            className="flex-none inline mr-2 p-1 border border-gray-600 rounded-full"
                                                            size={30}
                                                        />{' '}
                                                        <span className="flex flex-col truncate">
                                                            <span className="flex items-center">
                                                                <span className="truncate group-hover/ve-item:text-ve-collab-orange">
                                                                    {plan.name}
                                                                </span>
                                                                {plan.is_good_practise && (
                                                                    <span className="mx-4 text-ve-collab-blue">
                                                                        <FaMedal
                                                                            title={t(
                                                                                'common:plans_marked_as_good_practise'
                                                                            )}
                                                                        />
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {plan.abstract && (
                                                                <span className="font-normal text-sm italic">
                                                                    {plan.abstract}
                                                                </span>
                                                            )}
                                                            {plan.topics.length > 0 && (
                                                                <span className="font-normal text-sm italic truncate">
                                                                    <span>
                                                                        {t('community:ve_topics')}:
                                                                    </span>{' '}
                                                                    {plan.topics.join(' / ')}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                </div>

                                                <div className="truncate">
                                                    {plan.author.first_name} {plan.author.last_name}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {data.users.length > 0 && (
                        <div className="mb-10">
                            <H2>
                                {t('search_result_users')} ({data.users.length})
                            </H2>
                            <div className="flex flex-wrap m-2">
                                {data.users.map((user, i) => {
                                    return (
                                        <a
                                            key={i}
                                            className="flex m-2 items-center"
                                            href={`/profile/user/${user.username}`}
                                        >
                                            <UserProfileImage
                                                profile_pic={user.profile_pic}
                                                chosen_achievement={user.chosen_achievement}
                                                width={50}
                                                height={50}
                                            />
                                            <span className="font-bold text-slate-900">
                                                {user.first_name} {user.last_name}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {data.spaces.length > 0 && (
                        <div className="mb-10">
                            <H2>
                                {t('search_result_groups')} ({data.spaces.length})
                            </H2>
                            <div className="flex m-2">
                                {data.spaces.map((space, i) => {
                                    return (
                                        <a
                                            key={i}
                                            className="flex m-2 items-center"
                                            href={`/group/${space._id}`}
                                        >
                                            <AuthenticatedImage
                                                imageId={space.space_pic}
                                                alt={t('group_picture')}
                                                width={60}
                                                height={60}
                                                className="rounded-full mr-2"
                                            ></AuthenticatedImage>
                                            <span className="font-bold text-slate-900">
                                                {space.name}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {data.posts.length > 0 && (
                        <div>
                            <H2>
                                {t('search_result_posts')} ({data.posts.length})
                            </H2>
                            <div className="m-2">
                                {data.posts.map((post, i) => {
                                    if (i > postsPagination) return;
                                    if (i == postsPagination) {
                                        return (
                                            <ButtonLightBlue
                                                key={i}
                                                label={t('search_result_show_more')}
                                                onClick={() => setPostsPagination((x) => x + 10)}
                                            />
                                        );
                                    }
                                    return (
                                        <div
                                            key={i}
                                            className="p-4 mb-4 bg-white rounded shadow hover:cursor-pointer hover:bg-slate-50"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.push(`/post/${post._id}`);
                                            }}
                                        >
                                            <div className="flex mb-2">
                                                <UserProfileImage
                                                    profile_pic={post.author.profile_pic}
                                                    chosen_achievement={
                                                        post.author.chosen_achievement
                                                    }
                                                />
                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/profile/user/${post.author.username}`}
                                                        className="font-bold"
                                                    >
                                                        {post.author.first_name}
                                                        {post.author.last_name}
                                                    </Link>

                                                    <Timestamp
                                                        relative={true}
                                                        timestamp={post.creation_date}
                                                        showTitle={true}
                                                        className="text-xs text-gray-500"
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                className="max-h-20 text-ellipsis overflow-hidden"
                                                style={{
                                                    WebkitLineClamp: 3,
                                                    display: '-webkit-box',
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                <TimelinePostText text={post.text as string} />
                                            </div>
                                            {/* <span className="">...</span>
                                        <a href={`/post/${post._id}`} className="hover:cursor-pointer hover:underline group-hover/post:underline mt-2">Zum Beitrag</a>*/}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
