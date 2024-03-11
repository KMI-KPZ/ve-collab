import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import { FormEvent, MouseEventHandler, useEffect } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost, BackendPostAuthor } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import PostHeader from "./PostHeader";
import React, { useState } from 'react'
import { MdAttachFile } from "react-icons/md";
import { RxFile } from "react-icons/rx";

interface Props {
    post?: BackendPost | undefined;
    space?: string | undefined;
    sharedPost?: BackendPost | null
    onCancelForm?: Function;
    onCancelRepost?: MouseEventHandler;
    onUpdatedPost?: (text: string) => void
    onCreatedPost?: (post: BackendPost) => void
}

TimelinePostForm.auth = true
export default function TimelinePostForm(
{
    post: postToEdit,
    space,
    sharedPost: postToRepost,
    onCancelForm,
    onCancelRepost,
    onCreatedPost,
    onUpdatedPost,
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)
    const fileUploadRef = useRef<HTMLInputElement>(null)
    const [filesToAttach, setFilesToAttach] = useState<File[] | null>(null);

    // scroll up to the form if user clicked to re-post a post
    useEffect(() => {
        if (postToRepost && ref.current) {
            window.scrollTo({ behavior: 'smooth', top: ref.current.offsetTop - 75 })
            ref.current.querySelector("textarea")?.focus()
        }
    }, [ref, postToRepost])

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        const text = (formData.get('text') as string).trim()

        if (text === '')  return

        const createOrUpdatePost = async () => {
            let postData: any = {};

            postData.tags = []

            if (postToEdit) {
                postData = Object.assign({}, postToEdit )
            }

            postData.text = text
            if (space) {
                postData.space = space
            }
            if (filesToAttach) {
                postData["file_amount"] = filesToAttach.length
                filesToAttach.map((file, f) => postData[`file${f}`] = file )
            }

            return await fetchPOST(
                '/posts',
                postData,
                session?.accessToken,
                true,
                ''
            )
        }

        const rePost = async () => {
            const res = await fetchPOST(
                '/repost',
                Object.assign({},
                    {
                        post_id: postToRepost?._id,
                        text
                    },
                    space ? { space } : { space: null }
                ),
                session?.accessToken
            )
            return res
        }

        try {
            const res = postToRepost
                ? await rePost()
                : await createOrUpdatePost()
            ref.current?.reset()
            setFilesToAttach(null)
            if (!postToEdit && !postToRepost && onCreatedPost) onCreatedPost(res.inserted_post)
            if (postToEdit && onUpdatedPost) onUpdatedPost(text)
            if (!postToEdit && postToRepost && onCreatedPost) onCreatedPost(res.inserted_repost)
        } catch (error) {
            alert(`Error:\n${error as string}\nSee console for details`)
            console.error(error);
        }
    }

    const onCancel = () => {
        ref.current?.reset()
        if (onCancelForm) onCancelForm()
    }

    const openFileOpenDialog = () => {
        if (fileUploadRef?.current) fileUploadRef.current.click()
    }

    const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files)
            setFilesToAttach((prev) => prev ? [...prev, ...files] : files);
        }
    }

    const removeSelectedFile = (fileId: any) => {
        setFilesToAttach(prev => prev ? prev.filter((a, i) => i != fileId) : null)
    }

    return (
        <>
            <form onSubmit={onSubmit} ref={ref}>
                <div className="flex items-center mb-5">
                    {!postToEdit && (
                        <AuthenticatedImage
                            imageId={"default_profile_pic.jpg"}
                            alt={'Benutzerbild'}
                            width={40}
                            height={40}
                            className="rounded-full mr-3 mt-5 self-start"
                        ></AuthenticatedImage>
                    )}
                    <textarea
                        className={'w-full border border-[#cccccc] rounded-md px-2 py-2'}
                        placeholder={'Beitrag schreiben ...'}
                        name='text'
                        defaultValue={postToEdit ? (postToEdit.isRepost ? postToEdit.repostText : postToEdit.text) : ''}
                    />
                </div>

                {postToRepost && (
                    <div className="my-5 ml-[50px] p-3 rounded bg-ve-collab-blue/10">
                        <div className="flex items-center">
                            {postToRepost.isRepost
                                ? ( <PostHeader author={postToRepost.repostAuthor as BackendPostAuthor} date={postToRepost.creation_date} /> )
                                : ( <PostHeader author={postToRepost.author} date={postToRepost.creation_date} /> )
                            }
                            <button onClick={onCancelRepost} className="ml-auto self-start">
                                <IoMdClose />
                            </button>
                        </div>
                        <div className="network-post-value" dangerouslySetInnerHTML={{__html: postToRepost.isRepost
                            ? postToRepost.repostText as string
                            : postToRepost.text as string}} />
                    </div>
                )}

                {(filesToAttach && filesToAttach.length > 0) && (
                    <div className="ml-16 mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                        {filesToAttach.map((file, index) => (
                            <div className="max-w-[250px] flex">
                                <RxFile size={30} className="m-1" />
                                {/* TODO preview for certain file types*/}
                                <div className="truncate py-2">{file.name}</div>
                                <button onClick={() => removeSelectedFile(index)} className="p-2" title="Remove file">
                                        <IoMdClose className="text-ve-collab-blue" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}



                <div className="flex items-center">
                    <div className="ml-auto">
                        {postToEdit && (<button className={`mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg`} title="Abbrechen" onClick={onCancel} type="button">
                            Abbrechen
                        </button>)}
                        {!postToEdit && (
                            <>
                                <button onClick={openFileOpenDialog} title="Attach file" className="mx-4 px-5 py-2 rounded-lg bg-ve-collab-blue/10 text-ve-collab-blue">
                                    {/* <MdAddCircleOutline size={`1.3em`} /> */}
                                    <MdAttachFile className="mr-2 inline" /> Datei hinzufügen
                                </button>
                                <input type="file" multiple name="file" onChange={addFiles} className="hidden" ref={fileUploadRef} />
                            </>
                        )}
                        <button className="bg-ve-collab-orange text-white py-2 px-5 rounded-lg" type='submit' title="Senden">
                            {postToEdit ? ( <>Aktualisieren</> ) : ( <><IoIosSend className="mr-2 inline" /> Senden</> )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}