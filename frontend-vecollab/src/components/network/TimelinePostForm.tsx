import { fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import React, { FormEvent, MouseEventHandler, useState, useEffect } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost, BackendPostAuthor, BackendUserSnippet } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import PostHeader from "./PostHeader";
import { MdAttachFile, MdFormatClear, MdInsertLink, MdLinkOff } from "react-icons/md";
import { RxFile } from "react-icons/rx";
import LoadingAnimation from "../LoadingAnimation";
import {
    BtnBold,
    BtnItalic,
    BtnUnderline,
    BtnBulletList,
    BtnNumberedList,
    Editor,
    EditorProvider,
    Toolbar,
    createButton,
  } from 'react-simple-wysiwyg';
import TimelinePostText from "./TimelinePostText";
import { sanitizedText } from "./sanitizedText";
import Dialog from "../profile/Dialog";

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
    const [loading, setLoading] = useState<boolean>(false);
    const [text, setText] = useState<string>('');

    const domParser = new DOMParser()

    const [userProfileSnippet, setUserProfileSnippet] = useState<BackendUserSnippet>();

    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState<boolean>(false);
    const [selectedLinkText, setSelectedLinkText] = useState<{
        parentNode: Node,
        selectionStart: number,
        selectionEnd: number} | undefined>();
    const [cursorInLink, setCursorInLink] = useState<false | HTMLElement>(false);

    useEffect(() => {
        if (!session?.user) return;

        fetchPOST('/profile_snippets', { usernames: [session.user.preferred_username] }, session.accessToken)
        .then((data) => {
            setUserProfileSnippet(data.user_snippets[0])
        });
    }, [session]);

    useEffect(() => {
        if (postToEdit) {
            setText(postToEdit.isRepost ? postToEdit.repostText as string : postToEdit.text)
            setFocus()
        }
    }, [postToEdit])

    // scroll up to the form if user clicked to re-post a post
    useEffect(() => {
        if (postToRepost && ref.current) {
            window.scrollTo({ behavior: 'smooth', top: ref.current.offsetTop - 75 })
            setFocus()
        }
    }, [ref, postToRepost])

    const setFocus = () => {
        const el = ref?.current?.querySelector(".rsw-ce") as HTMLElement
        if (el) el.focus()
    }

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        var newValueDoc = domParser.parseFromString(text, "text/html");

        if (text == "" || newValueDoc.body.innerText == '') return

        setLoading(true)

        const updatePost = async (id: string) => {
            return await fetchPOST(
                '/posts',
                Object.assign({},
                    {_id: id},
                    { text },
                ),
                session?.accessToken,
                true
            )
        }

        const createPost = async () => {
            return await fetchPOST(
                '/posts',
                Object.assign({},
                    { tags: [] },
                    space ? { space } : {},
                    { text },
                    filesToAttach
                        ? {
                            file_amount: filesToAttach.length,
                            ...filesToAttach.reduce((o, file, i) => ({ ...o, [`file${i}`]: file}), {})
                        }
                        : {}
                ),
                session?.accessToken,
                true
            )
        }

        const createRePost = async () => {
            return await fetchPOST(
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
        }

        const updateRePost = async (id: string) => {
            return await fetchPOST(
                '/repost',
                Object.assign({},
                    {_id: id},
                    { text },
                ),
                session?.accessToken
            )
        }

        try {
            let res: {
                inserted_repost?: BackendPost,
                inserted_post?: BackendPost
            } = {}

            if (postToEdit) {
                res = postToEdit.isRepost
                    ? await updateRePost(postToEdit._id)
                    : await updatePost(postToEdit._id)
                if (onUpdatedPost) onUpdatedPost(text)
            }
            else if (postToRepost) {
                res = await createRePost()
                if (onCreatedPost) onCreatedPost(res.inserted_repost as BackendPost)
            }
            else {
                res = await createPost()
                if (onCreatedPost) onCreatedPost(res.inserted_post as BackendPost)
            }
            ref.current?.reset()
            setText('')
            setFilesToAttach(null)
        } catch (error) {
            alert(`Error:\n${error as string}\nSee console for details`)
            console.error(error);
        }
        setLoading(false)
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

    var BtnClearFormatting = createButton('Clear formatting', <MdFormatClear className="m-auto" />, 'removeFormat');

    var BtnLink = createButton(
        cursorInLink ? 'Remove Link' : 'Create Link',
        cursorInLink ? <MdLinkOff className="m-auto" /> : <MdInsertLink className="m-auto" />,
        function (_a) {
            var $selection = _a.$selection;
            if (($selection === null || $selection === void 0 ? void 0 : $selection.nodeName) === 'A') {
                if (window.getSelection()?.getRangeAt(0).toString() == '') {
                    window.getSelection()?.selectAllChildren($selection as Node)
                }
                document.execCommand('unlink');
                setCursorInLink(false)
            } else if ($selection) {
                setSelectedLinkText({
                    parentNode: window.getSelection()?.focusNode as Node,
                    selectionStart: window.getSelection()?.anchorOffset as number,
                    selectionEnd: window.getSelection()?.focusOffset as number
                })
                setIsLinkDialogOpen(true)
            }
        }
    );

    const submitNewLinkDialog = (event: FormEvent) => {
        event.preventDefault()
        const target = event.currentTarget.querySelector('input')

        if (selectedLinkText !== undefined) {
            const range = new Range();
            range.setStart(selectedLinkText.parentNode, selectedLinkText.selectionStart)
            range.setEnd(selectedLinkText.parentNode, selectedLinkText.selectionEnd)
            var selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }

        if (target?.value) {
            document.execCommand('createLink', false, target.value );
        }
        setIsLinkDialogOpen(false)
        setSelectedLinkText(undefined)
    }

    const editorCaretChanged = () => {
        if (window.getSelection()?.focusNode?.parentNode?.nodeName === 'A') {
            setCursorInLink(window.getSelection()?.focusNode?.parentNode as HTMLElement)
        } else {
            setCursorInLink(false)
        }
    }

    return (
        <>
            <Dialog
                isOpen={isLinkDialogOpen}
                title={'Link'}
                onClose={() => setIsLinkDialogOpen(false)}
            >
                <div className="w-[20vw]">
                    <div>
                        <form onSubmit={submitNewLinkDialog}>
                            <input type="text" name="url" autoComplete="off" className="border border-[#cccccc] rounded-l px-2 py-1" />
                            <button type="submit" className="my-2 py-2 px-5 rounded-lg bg-ve-collab-orange text-white">
                                OK
                            </button>
                        </form>
                    </div>
                </div>
            </Dialog>
            <form onSubmit={onSubmit} ref={ref} className="relative">
                {cursorInLink && (
                    <div style={{
                            left: `${cursorInLink.offsetLeft-(cursorInLink.offsetWidth/2)}px`,
                            top: `${2+cursorInLink.offsetHeight+cursorInLink.offsetTop}px`
                        }}
                        className={`absolute p-2 rounded-md bg-white shadow border text-ve-collab-blue hover:underline after:content-[' '] after:absolute after:bottom-full after:left-1/2 after:-ml-2 after:border after:border-4 after:border-transparent after:border-b-gray-300`}
                    >
                        <a href={cursorInLink.getAttribute('href') as string} target="_blank">{cursorInLink.getAttribute('href') as string}</a>
                    </div>
                )}
                {loading && (
                    <>
                        <div className="absolute w-full items-center top-10 z-20"><LoadingAnimation /></div>
                        <div className="absolute w-full h-full bg-white/50 z-10"></div>
                    </>
                )}
                <div className="flex items-center mb-5">
                    {!postToEdit && (
                        <AuthenticatedImage
                            imageId={userProfileSnippet ? userProfileSnippet.profile_pic : "default_profile_pic.jpg"}
                            alt={'Benutzerbild'}
                            width={40}
                            height={40}
                            className="rounded-full mr-3 mt-5 self-start"
                        ></AuthenticatedImage>
                    )}

                    <div className="w-full">
                        <EditorProvider>
                            <Editor
                                value={text}
                                placeholder="Beitrag schreiben..."
                                onChange={(e) => setText(sanitizedText(e.target.value))}
                                onKeyUp={editorCaretChanged}
                                onClick={editorCaretChanged}
                            />
                            <Toolbar>
                                <BtnBold />
                                <BtnItalic />
                                <BtnUnderline />
                                <BtnBulletList style={{ paddingLeft: "5px" }} />
                                <BtnNumberedList style={{ paddingLeft: "5px" }} />
                                <BtnLink />
                                <BtnClearFormatting />
                            </Toolbar>
                        </EditorProvider>
                    </div>
                </div>

                {postToRepost && (
                    <div className="my-5 ml-[50px] p-3 rounded bg-slate-200">
                        <div className="flex items-center">
                            {postToRepost.isRepost
                                ? ( <PostHeader author={postToRepost.repostAuthor as BackendPostAuthor} date={postToRepost.creation_date} /> )
                                : ( <PostHeader author={postToRepost.author} date={postToRepost.creation_date} /> )
                            }
                            <button onClick={onCancelRepost} className="ml-auto self-start p-2 rounded-full hover:bg-ve-collab-blue-light">
                                <IoMdClose />
                            </button>
                        </div>
                        <TimelinePostText text={
                            postToRepost.isRepost
                                ? postToRepost.repostText as string
                                : postToRepost.text as string
                        } />
                    </div>
                )}

                {(filesToAttach && filesToAttach.length > 0) && (
                    <div className="ml-16 mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                        {filesToAttach.map((file, index) => (
                            <div className="max-w-[250px] mr-4 flex items-center" key={index}>
                                <RxFile size={30} className="m-1" />
                                {/* TODO preview for certain file types*/}
                                <div className="truncate py-2">{file.name}</div>
                                <button onClick={() => removeSelectedFile(index)} className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light" title="Entfernen">
                                        <IoMdClose />
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
                        {(!postToEdit && !postToRepost) && (
                            <>
                                <button type="button" onClick={openFileOpenDialog} title="Datei hinzufügen" className="mx-4 px-5 py-2 rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20">
                                    <span className="relative">
                                        <MdAttachFile className="mr-2 inline" /> Datei hinzufügen
                                    </span>
                                </button>
                                <input type="file" multiple name="file" onChange={addFiles} className="hidden" ref={fileUploadRef} />
                            </>
                        )}
                        <button type="submit" title="Senden" className="relative py-2 px-5 rounded-lg bg-ve-collab-orange text-white overflow-hidden transition-all before:absolute before:right-0 before:top-0 before:h-12 before:w-6 before:translate-x-12 before:rotate-6 before:bg-white before:opacity-10 before:duration-700 hover:before:-translate-x-40 ">
                            <span className="relative">
                                {postToEdit ? ( <>Aktualisieren</> ) : ( <><IoIosSend className="mr-2 inline" /> Senden</> )}
                            </span>
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}