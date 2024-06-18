import { fetchGET, fetchPOST } from "@/lib/backend";
import { useSession } from "next-auth/react";
import React, { MouseEvent, FormEvent, MouseEventHandler, useState, useEffect } from "react";
import { IoIosSend, IoMdClose } from "react-icons/io";
import AuthenticatedImage from "../AuthenticatedImage";
import { BackendPost, BackendPostAuthor, BackendUserSnippet } from "@/interfaces/api/apiInterfaces";
import { useRef } from 'react'
import PostHeader from "./PostHeader";
import { MdArrowDropDown, MdAttachFile, MdEdit, MdFormatClear, MdInsertLink, MdLinkOff, MdNewspaper } from "react-icons/md";
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
import Dropdown from "../Dropdown";
import { PlanPreview } from "@/interfaces/planner/plannerInterfaces";
import Link from "next/link";
import Timestamp from "../Timestamp";
import ButtonNewPlan from "../Plannner/ButtonNewPlan";
import { Socket } from "socket.io-client";

interface Props {
    post?: BackendPost | undefined;
    group?: string | undefined;
    postToRepost?: BackendPost | null
    onCancelForm?: Function;
    onCancelRepost?: MouseEventHandler;
    onUpdatedPost?: (text: string) => void
    onCreatedPost?: (post: BackendPost) => void,
    socket: Socket;
}

TimelinePostForm.auth = true
export default function TimelinePostForm(
{
    post: postToEdit,
    group,
    postToRepost,
    onCancelForm,
    onCancelRepost,
    onCreatedPost,
    onUpdatedPost,
    socket
}: Props) {
    const { data: session } = useSession();
    const ref = useRef<HTMLFormElement>(null)
    const fileUploadRef = useRef<HTMLInputElement>(null)
    const [filesToAttach, setFilesToAttach] = useState<File[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [text, setText] = useState<string>('');
    const [userProfileSnippet, setUserProfileSnippet] = useState<BackendUserSnippet>();
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState<boolean>(false);
    const [selectedLinkText, setSelectedLinkText] = useState<{
        parentNode: Node,
        selectionStart: number,
        selectionEnd: number} | undefined>();
    const [cursorInLink, setCursorInLink] = useState<false | HTMLLinkElement>(false);
    const [formHadFocus, setFormHadFocus] = useState<boolean>(false)
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState<boolean>(false)
    const [loadingPlans, setLoadingPlans] = useState<boolean>(true)
    const [plans, setPlans] = useState<PlanPreview[]>([])
    const [plansToAttach, setPlansToAttach] = useState<PlanPreview[]>([])
    const domParser = new DOMParser()

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
        // require domparser to check empty lines, eg `<p></p>`
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
                    group ? { space: group } : {},
                    { text },
                    filesToAttach
                        ? {
                            file_amount: filesToAttach.length,
                            ...filesToAttach.reduce((o, file, i) => ({ ...o, [`file${i}`]: file}), {})
                        }
                        : {},
                    plansToAttach.length
                        ? { plans: JSON.stringify(plansToAttach.map(plan => plan._id.toString())) }
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
                    group ? { space: group } : { space: null }
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
            setPlansToAttach([])
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

    const chooseAttachMedia = (value: string) => {
        switch (value) {
            case 'local':
                openFileOpenDialog()
                break;

            case 'plan':
                openPlanDialog()
                break;

            default:
                break;
        }
    }

    const openPlanDialog = () => {
        setIsPlanDialogOpen(true)
        if (plans.length) return

        setLoadingPlans(true)

        fetchGET('/planner/get_available', session?.accessToken)
        .then(data => setPlans(data.plans))

        setLoadingPlans(false)
    }

    const addPlanAttachment = (plan: PlanPreview) => {
        setPlansToAttach(prev => [...prev, plan])
        setIsPlanDialogOpen(false)
    }

    const removePlanAttachment = (plan: PlanPreview) => {
        setPlansToAttach(prev => prev ? prev.filter((a, i) => a._id != plan._id) : [])
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

        if (!target?.value || target.value == '' || !target.value.startsWith('http')) {
            return
        }

        if (cursorInLink !== false) {
            // update existing link
            cursorInLink.href = target.value
        }
        else if (selectedLinkText !== undefined) {
            // create new link in selected range
            const range = new Range();
            range.setStart(selectedLinkText.parentNode, selectedLinkText.selectionStart)
            range.setEnd(selectedLinkText.parentNode, selectedLinkText.selectionEnd)
            var selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.execCommand('createLink', false, target.value );
        }

        setIsLinkDialogOpen(false)
        setSelectedLinkText(undefined)
    }

    const openLinkEditor = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        if (!cursorInLink) return

        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(cursorInLink);
        selection?.removeAllRanges();
        selection?.addRange(range);

        setIsLinkDialogOpen(true)
    }

    const editorCaretChanged = () => {
        if (window.getSelection()?.focusNode?.parentNode?.nodeName === 'A') {
            setCursorInLink(window.getSelection()?.focusNode?.parentNode as HTMLLinkElement)
        } else {
            setCursorInLink(false)
        }
    }

    const PlansDialog = () => {
        if (loadingPlans) return <LoadingAnimation />

        if (!plans.length) return <>Noch keine Pläne erstellt. <ButtonNewPlan socket={socket} label="Neuen Plan erstellen" /></>

        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                {plans.map(plan => (
                    <div key={plan._id} className="p-2 flex items-center gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer" title="Auswählen" onClick={e => {addPlanAttachment(plan)}}>
                        <MdNewspaper />
                        <div className="text-xl font-bold grow-0">{plan.name}</div>
                        {/* <div className="text-sm text-gray-500 grow">{plan.author}</div> */}
                        <span title="zuletzt geändert"><Timestamp timestamp={plan.last_modified} className='text-sm' /></span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <>
            {/* link dialog */}
            <Dialog
                isOpen={isLinkDialogOpen}
                title={'Link'}
                onClose={() => setIsLinkDialogOpen(false)}
            >
                <div className="w-[20vw]">
                    <div>
                        <form onSubmit={submitNewLinkDialog}>
                            <input type="url" name="url" defaultValue={cursorInLink ? cursorInLink.href : ''} autoComplete="off" autoFocus className="mr-2 p-2 border border-[#cccccc] rounded-md invalid:border-red-500" />
                            <button type="submit" className="my-2 py-2 px-5 rounded-lg bg-ve-collab-orange text-white">
                                OK
                            </button>
                        </form>
                    </div>
                </div>
            </Dialog>

            {/* VE plan dialog */}
            <Dialog
                isOpen={isPlanDialogOpen}
                title={'Deine Pläne'}
                onClose={() => setIsPlanDialogOpen(false)}
            >
                <div className="w-[40vw]"><PlansDialog /></div>
            </Dialog>

            <form onSubmit={onSubmit} ref={ref} className="relative">
                {loading && (
                    <>
                        <div className="absolute w-full items-center top-10 z-20"><LoadingAnimation /></div>
                        <div className="absolute w-full h-full bg-white/50 z-10"></div>
                    </>
                )}

                {/* link tooltip  */}
                {cursorInLink && (
                    <div style={{
                            left: `${cursorInLink.offsetLeft-(cursorInLink.offsetWidth/2)}px`,
                            top: `${2+cursorInLink.offsetHeight+cursorInLink.offsetTop}px`
                        }}
                        className={`absolute p-2 rounded-md bg-white shadow border text-ve-collab-blue after:content-[' '] after:absolute after:bottom-full after:left-1/2 after:-ml-2 after:border after:border-4 after:border-transparent after:border-b-gray-300`}
                    >
                        <a href={cursorInLink.getAttribute('href') as string} className="hover:underline" title="Link öffnen" target="_blank" rel="noreferrer">{cursorInLink.getAttribute('href') as string}</a>
                        <button onClick={e => openLinkEditor(e)} className="" title="Link bearbeiten"><MdEdit className="ml-2" /></button>
                    </div>
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
                                onFocus={e => setFormHadFocus(true)}
                            />
                            {(postToEdit || postToRepost || formHadFocus) && (
                                <Toolbar>
                                    <BtnBold />
                                    <BtnItalic />
                                    <BtnUnderline />
                                    <BtnBulletList style={{ paddingLeft: "5px" }} />
                                    <BtnNumberedList style={{ paddingLeft: "5px" }} />
                                    <BtnLink />
                                    <BtnClearFormatting />
                                </Toolbar>
                            )}
                        </EditorProvider>
                    </div>
                </div>

                {postToRepost && (
                    <div className="my-5 ml-[50px] p-3 rounded bg-slate-100">
                        <div className="flex items-center mb-6">
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
                                <button onClick={() => removeSelectedFile(index)} className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light" title="Datei Entfernen">
                                        <IoMdClose />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {plansToAttach.length > 0 && (
                    <div className="ml-16 mb-4 flex flex-col flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                        {plansToAttach.map((plan, index) => (
                            <div className="mr-4 flex items-center gap-x-4 gap-y-6" key={index}>
                                <MdNewspaper size={30} />
                                <div className="truncate font-bold grow-0">{plan.name}</div>
                                <div className="text-sm text-gray-500 gro">{plan.author}</div>
                                <Timestamp timestamp={plan.last_modified} className='text-sm' />
                                <button onClick={() => removePlanAttachment(plan)} className="ml-2 p-2 rounded-full hover:bg-ve-collab-blue-light" title="Plan Entfernen">
                                        <IoMdClose />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`flex items-center ${(!postToEdit && !postToRepost && !formHadFocus) ? 'hidden' : ''}`}>
                    <div className="ml-auto">
                        {postToEdit && (<button className={`mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg`} onClick={onCancel} type="button">
                            Abbrechen
                        </button>)}
                        {(!postToEdit && !postToRepost) && (
                            <>
                                <div title="Datei oder Plan hinzufügen" className="mx-4 px-5 py-2 inline rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20">
                                    <Dropdown
                                            options={[
                                                {value: 'local', label: 'lokale Datei' },
                                                {value: 'plan', label: 'VE Collab Plan' }
                                            ]}
                                            icon={<span className=""><MdAttachFile className="mr-2 inline" /> Medien hinzufügen <MdArrowDropDown className="inline" /></span>}
                                            onSelect={value => {chooseAttachMedia(value)}}
                                    />
                                </div>
                                <input type="file" multiple name="file" onChange={addFiles} className="hidden" ref={fileUploadRef} />
                            </>
                        )}
                        <button type="submit" className={`relative py-2 px-5 rounded-lg bg-ve-collab-orange text-white overflow-hidden ${text == '' ? 'cursor-default bg-ve-collab-orange/75' : ''}`}>
                            {postToEdit ? ( <>Aktualisieren</> ) : ( <><IoIosSend className="mr-2 inline" /> Senden</> )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}