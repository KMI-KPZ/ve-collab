import { BackendPost, BackendPostAuthor, BackendPostFile } from '@/interfaces/api/apiInterfaces';
import { PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { fetchPOST, useGetAvailablePlans, useGetOwnProfile } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import React, {
    FormEvent,
    MouseEvent,
    MouseEventHandler,
    useEffect,
    useRef,
    useState,
} from 'react';
import { IoIosSend, IoMdClose } from 'react-icons/io';
import {
    MdArrowDropDown,
    MdAttachFile,
    MdEdit,
    MdFormatClear,
    MdInsertLink,
    MdLinkOff,
} from 'react-icons/md';
import { RxFile } from 'react-icons/rx';
import {
    BtnBold,
    BtnBulletList,
    BtnItalic,
    BtnNumberedList,
    BtnUnderline,
    Editor,
    EditorProvider,
    Toolbar,
    createButton,
} from 'react-simple-wysiwyg';
import { Socket } from 'socket.io-client';
import Dropdown from '../common/Dropdown';
import LoadingAnimation from '../common/LoadingAnimation';
import Timestamp from '../common/Timestamp';
import ButtonNewPlan from '../plans/ButtonNewPlan';
import Dialog from '../profile/Dialog';
import PostHeader from './PostHeader';
import TimelinePostText from './TimelinePostText';
import UserProfileImage from './UserProfileImage';
import { sanitizedText } from './sanitizedText';

import { FaMedal } from 'react-icons/fa';
import { AuthenticatedFile } from '../common/AuthenticatedFile';
import PlanIcon from '../plans/PlanIcon';
import { IplansFilter } from '@/pages/plans';
import ButtonLightBlue from '../common/buttons/ButtonLightBlue';

interface Props {
    post?: BackendPost | undefined;
    group?: string | undefined;
    postToRepost?: BackendPost | null;
    onCancelForm?: Function;
    onCancelRepost?: MouseEventHandler;
    onUpdatedPost?: (text: string) => void;
    onCreatedPost?: (post: BackendPost) => void;
    socket: Socket;
}

TimelinePostForm.auth = true;
export default function TimelinePostForm({
    post: postToEdit,
    group,
    postToRepost,
    onCancelForm,
    onCancelRepost,
    onCreatedPost,
    onUpdatedPost,
    socket,
}: Props) {
    const { data: session } = useSession();
    const { t } = useTranslation(['community', 'common']);

    const ref = useRef<HTMLFormElement>(null);
    const fileUploadRef = useRef<HTMLInputElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[] | null>(null);
    const [storedFiles, setStoredFiles] = useState<BackendPostFile[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [text, setText] = useState<string>('');
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState<boolean>(false);
    const [selectedLinkText, setSelectedLinkText] = useState<
        | {
              parentNode: Node;
              selectionStart: number;
              selectionEnd: number;
          }
        | undefined
    >();
    const [cursorInLink, setCursorInLink] = useState<false | HTMLLinkElement>(false);
    const [formHadFocus, setFormHadFocus] = useState<boolean>(false);
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState<boolean>(false);
    const [plansToAttach, setPlansToAttach] = useState<PlanPreview[]>([]);
    const domParser = new DOMParser();

    const { data: userProfileSnippet } = useGetOwnProfile(session!.accessToken);

    useEffect(() => {
        if (postToEdit) {
            setText(postToEdit.isRepost ? (postToEdit.repostText as string) : postToEdit.text);
            setPlansToAttach(postToEdit.isRepost ? [] : postToEdit.plans);
            setStoredFiles(postToEdit.isRepost ? [] : postToEdit.files);
            setFocus();
        }
    }, [postToEdit]);

    // scroll up to the form if user clicked to re-post a post
    useEffect(() => {
        if (postToRepost && ref.current) {
            window.scrollTo({ behavior: 'smooth', top: ref.current.offsetTop - 75 });
            setFocus();
        }
    }, [ref, postToRepost]);

    const setFocus = () => {
        const el = ref?.current?.querySelector('.rsw-ce') as HTMLElement;
        if (el) el.focus();
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // require domparser to check empty lines, eg `<p></p>`
        var newValueDoc = domParser.parseFromString(text, 'text/html');

        if (text == '' || newValueDoc.body.innerText == '') return;

        setLoading(true);

        const updatePost = async (id: string) => {
            return await fetchPOST(
                '/posts',
                Object.assign(
                    {},
                    { _id: id },
                    { text },
                    storedFiles
                        ? {
                              files: JSON.stringify(
                                  storedFiles.map((file) => file.file_id.toString())
                              ),
                          }
                        : {},
                    filesToAttach
                        ? {
                              file_amount: filesToAttach.length,
                              ...filesToAttach.reduce(
                                  (o, file, i) => ({ ...o, [`file${i}`]: file }),
                                  {}
                              ),
                          }
                        : {},
                    plansToAttach.length
                        ? {
                              plans: JSON.stringify(
                                  plansToAttach.map((plan) => plan._id.toString())
                              ),
                          }
                        : {}
                ),
                session?.accessToken,
                true
            );
        };

        const createPost = async () => {
            return await fetchPOST(
                '/posts',
                Object.assign(
                    {},
                    { tags: [] },
                    group ? { space: group } : {},
                    { text },
                    filesToAttach
                        ? {
                              file_amount: filesToAttach.length,
                              ...filesToAttach.reduce(
                                  (o, file, i) => ({ ...o, [`file${i}`]: file }),
                                  {}
                              ),
                          }
                        : {},
                    plansToAttach.length
                        ? {
                              plans: JSON.stringify(
                                  plansToAttach.map((plan) => plan._id.toString())
                              ),
                          }
                        : {}
                ),
                session?.accessToken,
                true
            );
        };

        const createRePost = async () => {
            return await fetchPOST(
                '/repost',
                Object.assign(
                    {},
                    {
                        post_id: postToRepost?._id,
                        text,
                    },
                    group ? { space: group } : { space: null }
                ),
                session?.accessToken
            );
        };

        const updateRePost = async (id: string) => {
            return await fetchPOST(
                '/repost',
                Object.assign({}, { _id: id }, { text }),
                session?.accessToken
            );
        };

        try {
            let res: {
                inserted_repost?: BackendPost;
                inserted_post?: BackendPost;
            } = {};

            if (postToEdit) {
                res = postToEdit.isRepost
                    ? await updateRePost(postToEdit._id)
                    : await updatePost(postToEdit._id);
                if (onUpdatedPost) onUpdatedPost(text);
            } else if (postToRepost) {
                res = await createRePost();
                if (onCreatedPost) onCreatedPost(res.inserted_repost as BackendPost);
            } else {
                res = await createPost();
                if (onCreatedPost) onCreatedPost(res.inserted_post as BackendPost);
            }
            ref.current?.reset();
            setText('');
            setFilesToAttach(null);
            setPlansToAttach([]);
        } catch (error) {
            alert(`Error:\n${error as string}\nSee console for details`);
            console.error(error);
        }
        setLoading(false);
    };

    const onCancel = () => {
        ref.current?.reset();
        if (onCancelForm) onCancelForm();
    };

    const chooseAttachMedia = (value: string) => {
        switch (value) {
            case 'local':
                openFileOpenDialog();
                break;

            case 'plan':
                setIsPlanDialogOpen(true);
                break;

            default:
                break;
        }
    };

    const addPlanAttachment = (plan: PlanPreview) => {
        setPlansToAttach((prev) => [...prev, plan]);
        setIsPlanDialogOpen(false);
    };

    const removePlanAttachment = (plan: PlanPreview) => {
        setPlansToAttach((prev) => (prev ? prev.filter((a, i) => a._id != plan._id) : []));
    };

    const openFileOpenDialog = () => {
        if (fileUploadRef?.current) fileUploadRef.current.click();
    };

    const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            setFilesToAttach((prev) => (prev ? [...prev, ...files] : files));
        }
    };

    const removeSelectedFile = (fileId: any) => {
        setFilesToAttach((prev) => (prev ? prev.filter((a, i) => i != fileId) : null));
    };

    const removeStoredFile = (fileId: any) => {
        setStoredFiles((prev) => (prev ? prev.filter((a, i) => i != fileId) : null));
    };

    var BtnClearFormatting = createButton(
        t('clear_formatting'),
        <MdFormatClear className="m-auto" />,
        'removeFormat'
    );

    var BtnLink = createButton(
        cursorInLink ? t('remove_link') : t('create_link'),
        cursorInLink ? <MdLinkOff className="m-auto" /> : <MdInsertLink className="m-auto" />,
        function (_a) {
            var $selection = _a.$selection;
            if (
                ($selection === null || $selection === void 0 ? void 0 : $selection.nodeName) ===
                'A'
            ) {
                if (window.getSelection()?.getRangeAt(0).toString() == '') {
                    window.getSelection()?.selectAllChildren($selection as Node);
                }
                document.execCommand('unlink');
                setCursorInLink(false);
            } else if ($selection) {
                setSelectedLinkText({
                    parentNode: window.getSelection()?.focusNode as Node,
                    selectionStart: window.getSelection()?.anchorOffset as number,
                    selectionEnd: window.getSelection()?.focusOffset as number,
                });
                setIsLinkDialogOpen(true);
            }
        }
    );

    const submitNewLinkDialog = (event: FormEvent) => {
        event.preventDefault();
        const target = event.currentTarget.querySelector('input');

        if (!target?.value || target.value == '' || !target.value.startsWith('http')) {
            return;
        }

        if (cursorInLink !== false) {
            // update existing link
            cursorInLink.href = target.value;
        } else if (selectedLinkText !== undefined) {
            // create new link in selected range
            const range = new Range();
            range.setStart(selectedLinkText.parentNode, selectedLinkText.selectionStart);
            range.setEnd(selectedLinkText.parentNode, selectedLinkText.selectionEnd);
            var selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.execCommand('createLink', false, target.value);
        }

        setIsLinkDialogOpen(false);
        setSelectedLinkText(undefined);
    };

    const openLinkEditor = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!cursorInLink) return;

        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(cursorInLink);
        selection?.removeAllRanges();
        selection?.addRange(range);

        setIsLinkDialogOpen(true);
    };

    const editorCaretChanged = () => {
        if (window.getSelection()?.focusNode?.parentNode?.nodeName === 'A') {
            setCursorInLink(window.getSelection()?.focusNode?.parentNode as HTMLLinkElement);
        } else {
            setCursorInLink(false);
        }
    };

    const PlansDialog = () => {
        const pageLength = 5;
        const [filterBy, setFilterBy] = useState<IplansFilter>({
            goodPracticeOnly: true,
            owner: 'own',
            limit: pageLength,
            offset: 0,
        });
        const { data: plans, mutate, isLoading } = useGetAvailablePlans(filterBy);

        if (!isLoading && !plans.length)
            return (
                <>
                    <p>{t('no_plans_yet')}</p>
                    <ButtonNewPlan socket={socket} label={t('create_new_plan')} />
                </>
            );

        // TODO add simple filter input
        return (
            <div className="flex flex-col max-h-96 overflow-y-auto">
                <div className="mb-2 pb-2 border-b border-gray-200">{t('add_your_gp_plans')}</div>
                <div className="flex flex-col max-h-96 overflow-y-auto content-scrollbar">
                    {plans
                        .sort((a, b) => {
                            return (
                                new Date(b.last_modified).getTime() -
                                new Date(a.last_modified).getTime()
                            );
                        })
                        .map((plan) => (
                            <div
                                key={plan._id}
                                className="p-2 flex items-center justify-start gap-x-4 gap-y-6 rounded-md hover:bg-ve-collab-blue/25 hover:cursor-pointer"
                                title={t('common:choose')}
                                onClick={(e) => {
                                    addPlanAttachment(plan);
                                }}
                            >
                                <PlanIcon />

                                <div className="text-xl font-bold grow-0 truncate">{plan.name}</div>
                                {plan.is_good_practise && (
                                    <div className="mx-2 text-ve-collab-blue rounded-full p-1 border border-ve-collab-blue">
                                        <FaMedal
                                            title={t('common:plans_marked_as_good_practise')}
                                        />
                                    </div>
                                )}
                                {plan.steps.length > 1 && (
                                    <div className="text-nowrap">({plan.steps.length} Etappen)</div>
                                )}
                                {plan.steps.length == 1 && <div>({plan.steps.length} Etappe)</div>}
                                {session?.user.preferred_username != plan.author.username && (
                                    <div className="text-sm text-gray-500">
                                        von {plan.author.first_name} {plan.author.last_name}
                                    </div>
                                )}
                                <span className="grow text-right" title="zuletzt geändert">
                                    <Timestamp timestamp={plan.last_modified} className="text-sm" />
                                </span>
                            </div>
                        ))}
                </div>
                {isLoading && <LoadingAnimation size="small" />}
                {plans.length >= filterBy.limit! ? (
                    <div className="mx-auto mt-4">
                        <ButtonLightBlue
                            label={t('common:more')}
                            onClick={() => {
                                setFilterBy((prev) => ({
                                    ...prev,
                                    limit: prev.limit! + pageLength,
                                }));
                                mutate();
                            }}
                        />
                    </div>
                ) : (
                    <></>
                )}
            </div>
        );
    };

    return (
        <>
            {/* link dialog */}
            <Dialog
                isOpen={isLinkDialogOpen}
                title={t('link')}
                onClose={() => setIsLinkDialogOpen(false)}
            >
                <form onSubmit={submitNewLinkDialog}>
                    <input
                        type="url"
                        name="url"
                        defaultValue={cursorInLink ? cursorInLink.href : ''}
                        autoComplete="off"
                        autoFocus
                        className="mr-2 p-2 border border-[#cccccc] rounded-md invalid:border-red-500"
                    />
                    <button
                        type="submit"
                        className="my-2 py-2 px-5 rounded-lg bg-ve-collab-orange text-white cursor-pointer"
                    >
                        {t('common:ok')}
                    </button>
                </form>
            </Dialog>

            {/* VE plan dialog */}
            <Dialog
                isOpen={isPlanDialogOpen}
                title={t('add_plan')}
                onClose={() => setIsPlanDialogOpen(false)}
            >
                <div className="w-[40vw]">
                    <PlansDialog />
                </div>
            </Dialog>

            <form onSubmit={onSubmit} ref={ref} className="relative">
                {loading && (
                    <>
                        <div className="absolute w-full items-center top-10 z-20">
                            <LoadingAnimation />
                        </div>
                        <div className="absolute w-full h-full bg-white/50 z-10"></div>
                    </>
                )}

                {/* link tooltip  */}
                {cursorInLink && (
                    <div
                        style={{
                            left: `${cursorInLink.offsetLeft - cursorInLink.offsetWidth / 2}px`,
                            top: `${2 + cursorInLink.offsetHeight + cursorInLink.offsetTop}px`,
                        }}
                        className={`absolute p-2 rounded-md bg-white shadow-sm border border-gray-200 text-ve-collab-blue after:content-[' '] after:absolute after:bottom-full after:left-1/2 after:-ml-2 after:border-4 after:border-transparent after:border-b-gray-300`}
                    >
                        <a
                            href={cursorInLink.getAttribute('href') as string}
                            className="hover:underline"
                            title={t('open_link')}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {cursorInLink.getAttribute('href') as string}
                        </a>
                        <button
                            onClick={(e) => openLinkEditor(e)}
                            className=""
                            title={t('edit_link')}
                        >
                            <MdEdit className="ml-2" />
                        </button>
                    </div>
                )}

                <div className="flex items-center mb-5">
                    {!postToEdit && (
                        <UserProfileImage
                            profile_pic={userProfileSnippet?.profile?.profile_pic}
                            chosen_achievement={userProfileSnippet?.profile?.chosen_achievement}
                        />
                    )}

                    <div className="w-full">
                        <EditorProvider>
                            <Editor
                                value={text}
                                placeholder={t('post_editor_placeholder')}
                                onChange={(e) => setText(sanitizedText(e.target.value))}
                                onKeyUp={editorCaretChanged}
                                onClick={editorCaretChanged}
                                onFocus={(e) => setFormHadFocus(true)}
                            />
                            {(postToEdit || postToRepost || formHadFocus) && (
                                <Toolbar>
                                    <BtnBold />
                                    <BtnItalic />
                                    <BtnUnderline />
                                    <BtnBulletList style={{ paddingLeft: '5px' }} />
                                    <BtnNumberedList style={{ paddingLeft: '5px' }} />
                                    <BtnLink />
                                    <BtnClearFormatting />
                                </Toolbar>
                            )}
                        </EditorProvider>
                    </div>
                </div>

                {postToRepost && (
                    <div className="my-5 ml-[50px] p-3 rounded-sm bg-slate-100">
                        <div className="flex items-center mb-6">
                            {postToRepost.isRepost ? (
                                <PostHeader
                                    author={postToRepost.repostAuthor as BackendPostAuthor}
                                    date={postToRepost.creation_date}
                                />
                            ) : (
                                <PostHeader
                                    author={postToRepost.author}
                                    date={postToRepost.creation_date}
                                />
                            )}
                            <button
                                onClick={onCancelRepost}
                                className="ml-auto self-start p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                            >
                                <IoMdClose />
                            </button>
                        </div>
                        <TimelinePostText
                            text={
                                postToRepost.isRepost
                                    ? (postToRepost.repostText as string)
                                    : (postToRepost.text as string)
                            }
                        />
                    </div>
                )}

                {((storedFiles && storedFiles.length > 0) ||
                    (filesToAttach && filesToAttach.length > 0)) && (
                    <div className="ml-16 mb-4 flex flex-wrap max-h-[40vh] overflow-y-auto content-scrollbar">
                        {storedFiles?.map((file, index) => (
                            <div className="max-w-[250px] mr-4 flex items-center" key={index}>
                                <AuthenticatedFile
                                    key={index}
                                    url={`/uploads/${file.file_id}`}
                                    filename={file.file_name}
                                    title={t('common:download')}
                                >
                                    <div className="flex justify-center">
                                        <RxFile size={30} className="m-1" />
                                    </div>
                                </AuthenticatedFile>
                                <div className="truncate py-2">{file.file_name}</div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeStoredFile(index);
                                    }}
                                    className="ml-2 p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                                    title={t('remove_file')}
                                >
                                    <IoMdClose />
                                </button>
                            </div>
                        ))}
                        {filesToAttach?.map((file, index) => (
                            <div className="max-w-[250px] mr-4 flex items-center" key={index}>
                                {file.type.startsWith('image/') ? (
                                    <Image
                                        src={URL.createObjectURL(file)}
                                        alt="Thumb"
                                        width={50}
                                        height={50}
                                        className="m-1 rounded-md"
                                    />
                                ) : (
                                    <RxFile size={30} className="m-1 cursor-pointer" />
                                )}
                                <div className="truncate py-2">{file.name}</div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeSelectedFile(index);
                                    }}
                                    className="ml-2 p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                                    title={t('remove_file')}
                                >
                                    <IoMdClose />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {plansToAttach.length > 0 && (
                    <div className="ml-16 mb-4 max-h-[40vh] overflow-y-auto overflow-x-clip content-scrollbar">
                        {plansToAttach.map((plan, index) => (
                            <div
                                className="mr-4 flex flex-row flex-wrap items-center justify-center gap-x-2 overflow-x-hidden"
                                key={index}
                            >
                                <PlanIcon />
                                <div className="truncate font-bold grow">{plan.name}</div>
                                <div className="text-sm text-gray-500 flex-none">
                                    {plan.author.first_name} {plan.author.last_name}
                                </div>
                                <Timestamp
                                    timestamp={plan.last_modified}
                                    className="text-sm flex-none"
                                />
                                <button
                                    onClick={() => removePlanAttachment(plan)}
                                    className="flex-none p-2 rounded-full cursor-pointer hover:bg-ve-collab-blue-light"
                                    title={t('remove_plan')}
                                >
                                    <IoMdClose />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    className={`flex items-center ${
                        !postToEdit && !postToRepost && !formHadFocus ? 'hidden' : ''
                    }`}
                >
                    <div className="ml-auto text-right space-x-4 space-y-2">
                        {!postToRepost && (
                            <>
                                <div
                                    title={t('add_file_or_plan')}
                                    className="px-2 py-2.5 inline rounded-lg bg-[#d8f2f9] text-ve-collab-blue hover:bg-ve-collab-blue/20"
                                >
                                    <Dropdown
                                        options={[
                                            { value: 'local', label: t('local_file') },
                                            { value: 'plan', label: t('ve_plan') },
                                        ]}
                                        icon={
                                            <span className="">
                                                <MdAttachFile className="mr-2 inline" />
                                                {t('add_media')}
                                                <MdArrowDropDown className="inline" />
                                            </span>
                                        }
                                        onSelect={(value) => {
                                            chooseAttachMedia(value);
                                        }}
                                    />
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    name="file"
                                    onChange={addFiles}
                                    className="hidden"
                                    ref={fileUploadRef}
                                />
                            </>
                        )}
                        {postToEdit && (
                            <button
                                className={`py-2 px-5 border border-ve-collab-orange rounded-lg cursor-pointer`}
                                onClick={onCancel}
                                type="button"
                            >
                                {t('common:cancel')}
                            </button>
                        )}
                        <button
                            type="submit"
                            className={`relative py-2 px-5 rounded-lg text-white overflow-hidden ${
                                text.trim() == ''
                                    ? 'cursor-default bg-ve-collab-orange/75'
                                    : 'cursor-pointer bg-ve-collab-orange'
                            }`}
                        >
                            {postToEdit ? (
                                <>{t('refresh')}</>
                            ) : (
                                <>
                                    <IoIosSend className="mr-2 inline" /> {t('send')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}
