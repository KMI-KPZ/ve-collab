import AuthenticatedImage from '@/components/common/AuthenticatedImage';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import TimelinePostText from '@/components/network/TimelinePostText';
import Timestamp from '@/components/common/Timestamp';
import { useGetSearchResults } from '@/lib/backend';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';
import { GiSadCrab } from 'react-icons/gi';
import { MdSearch } from 'react-icons/md';
import GeneralError from '@/components/common/GeneralError';
import ButtonSecondary from '@/components/common/buttons/ButtonSecondary';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';

SearchResult.auth = true;
SearchResult.autoForward = true;
export default function SearchResult() {
    const { t } = useTranslation('common');

    const router = useRouter();
    const [postsPagination, setPostsPagination] = useState<number>(2);

    const { data, isLoading, error, mutate } = useGetSearchResults(
        router.query.search as string,
        router.query.filter ? (router.query.filter as string).split(',') : undefined
    );

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
        !data?.spaces?.length
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
                    {data.users.length > 0 && (
                        <>
                            <div className="font-bold text-xl text-slate-900">
                                {t('search_result_users')} ({data.users.length})
                            </div>
                            <div className="flex flex-wrap m-2">
                                {data.users.map((user, i) => {
                                    return (
                                        <a
                                            key={i}
                                            className="flex m-2 items-center"
                                            href={`/profile/user/${user.username}`}
                                        >
                                            <AuthenticatedImage
                                                imageId={user.profile_pic}
                                                alt={t('profile_picture')}
                                                width={50}
                                                height={50}
                                                className="rounded-full mr-2"
                                            ></AuthenticatedImage>
                                            <span className="font-bold text-slate-900">
                                                {user.first_name} {user.last_name}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {data.spaces.length > 0 && (
                        <>
                            <div className="font-bold text-xl text-slate-900">
                                {t('search_result_groups')} ({data.spaces.length})
                            </div>
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
                        </>
                    )}

                    {data.posts.length > 0 && (
                        <>
                            <div className="font-bold text-xl text-slate-900">
                                {t('search_result_posts')} ({data.posts.length})
                            </div>
                            <div className="m-2">
                                {data.posts.map((post, i) => {
                                    if (i > postsPagination) return;
                                    if (i == postsPagination) {
                                        return (
                                            <ButtonSecondary
                                                key={i}
                                                label={t('search_result_show_more_posts')}
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
                                            {/* TODO use <TimelinePost /> !  */}
                                            <div className="flex flex-col mb-2">
                                                {/* <PostHeader author={post.author} date={post.creation_date} /> */}

                                                {/* <span className="font-bold text-slate-900">{post.author as unknown as string}</span> */}
                                                <a
                                                    href={`/post/${post._id}`}
                                                    className="hover:cursor-pointer hover:underline font-bold text-slate-900"
                                                >
                                                    {post.author as unknown as string}
                                                </a>

                                                <Timestamp
                                                    relative={true}
                                                    timestamp={post.creation_date}
                                                    showTitle={true}
                                                    className="text-xs text-gray-500"
                                                />
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
                        </>
                    )}
                </div>
            </Wrapper>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
