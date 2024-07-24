import AuthenticatedImage from "@/components/AuthenticatedImage";
import LoadingAnimation from "@/components/LoadingAnimation";
import TimelinePostText from "@/components/network/TimelinePostText";
import Timestamp from "@/components/Timestamp";
import { getSearchResults } from "@/lib/backend";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { MdSearch } from "react-icons/md";

SearchResult.auth = true;
export default function SearchResult() {
    const router = useRouter();
    const [postsPagination, setPostsPagination] = useState<number>(10)

    const {
        data,
        isLoading,
        error,
        mutate,
    } = getSearchResults(
        router.query.search as string,
        router.query.filter ? (router.query.filter as string).split(',') : undefined
    )

    const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!e.currentTarget.search.value) return;
        router.push(`/search?search=${e.currentTarget.search.value}`);
    };

    const Wrapper = ({children}: {children: JSX.Element|JSX.Element[]}) => {
        return (
            <div className="bg-slate-100">
                <div className="flex flex-col m-auto md:p-12 p-6 max-w-screen-[1500] items-center bg-pattern-left-blue bg-no-repeat">
                    <div className="md:w-1/2">
                        <div className="font-bold text-4xl mb-4">Suche</div>
                        <div className="text-gray-600">Suche nach Benutzern, Gruppen und Beiträgen</div>

                        <form
                            className="flex my-4 w-3/4"
                            onSubmit={(e) => handleSearchSubmit(e)}
                        >
                            <input
                                className={
                                    'w-full border border-[#cccccc] rounded-l px-2 py-1'
                                }
                                type="text"
                                placeholder="Suchen ..."
                                name="search"
                                autoComplete="off"
                                defaultValue={router.query.search ? router.query.search as string : ''}
                            />
                            <button
                                type="submit"
                                title="Suchen"
                                className="-ml-1 bg-ve-collab-orange rounded-r p-2 hover:bg-ve-collab-orange-light"
                            >
                                <MdSearch className="text-white" />
                            </button>
                        </form>
                        {children}
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) return  <Wrapper><div className="mt-4"><LoadingAnimation /></div></Wrapper>

    if (error) return  <Wrapper><div>Es ist ein Fehler aufgetreten</div></Wrapper>

    if (router.query.search && !data.posts.length && !data.users.length && !data.spaces.length) return  <Wrapper><div>Leider nichts gefunden</div></Wrapper>

    return (
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
                    <div>
                        <div className="font-bold text-xl text-slate-900">Benutzer ({data.users.length})</div>
                        <div className="flex flex-wrap m-2">
                            {data.users.map((user, i) => {
                                return <a key={i} className="flex m-2 items-center" href={`/profile/user/${user.username}`}>
                                    <AuthenticatedImage
                                        imageId={user.profile_pic}
                                        alt={'Profilbild'}
                                        width={50}
                                        height={50}
                                        className="rounded-full mr-2"
                                    ></AuthenticatedImage>
                                    <span className="font-bold text-slate-900">{user.first_name} {user.last_name}</span>
                                </a>
                            })}
                        </div>
                    </div>
                )}

                {data.spaces.length > 0 && (
                    <div>
                        <div className="font-bold text-xl text-slate-900">Gruppen ({data.spaces.length})</div>
                        <div className="flex m-2">
                            {data.spaces.map((space, i) => {
                                return <a key={i} className="flex m-2 items-center" href={`/group/${space._id}`}>
                                    <AuthenticatedImage
                                        imageId={space.space_pic}
                                        alt={'Profilbild'}
                                        width={60}
                                        height={60}
                                        className="rounded-full mr-2"
                                    ></AuthenticatedImage>
                                    <span className="font-bold text-slate-900">{space.name}</span>
                                </a>

                            })}
                        </div>
                    </div>
                )}

                {data.posts.length > 0 && (
                    <div>
                        <div className="font-bold text-xl text-slate-900">Beiträge ({data.posts.length})</div>
                        {/* TODO pagination!?1 */}
                        <div className="m-2">
                            {data.posts.map((post, i) => {
                                if (i > postsPagination) return (<></>);
                                if (i == postsPagination) {
                                    return (
                                        <div onClick={e => setPostsPagination(x => x+10)}>Load More</div>
                                    )
                                }
                                return (
                                    <div key={i} className="p-4 mb-4 bg-white rounded shadow hover:cursor-pointer hover:bg-slate-50" onClick={e => {
                                        e.preventDefault()
                                        router.push(`/post/${post._id}`)
                                    }}>
                                        <div className="flex flex-col mb-2">
                                            {/* <PostHeader author={post.author} date={post.creation_date} /> */}

                                            {/* <span className="font-bold text-slate-900">{post.author as unknown as string}</span> */}
                                            <a href={`/post/${post._id}`} className="hover:cursor-pointer hover:underline font-bold text-slate-900">{post.author as unknown as string}</a>


                                            <Timestamp relative={true} timestamp={post.creation_date} showTitle={true} className="text-xs text-gray-500" />
                                        </div>
                                        <div className="max-h-20 text-ellipsis overflow-hidden" style={{ WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                                            <TimelinePostText text={ post.text as string } />
                                        </div>
                                        {/* <span className="">...</span>
                                        <a href={`/post/${post._id}`} className="hover:cursor-pointer hover:underline group-hover/post:underline mt-2">Zum Beitrag</a>*/}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    )}
            </div>
        </Wrapper>
    )
}