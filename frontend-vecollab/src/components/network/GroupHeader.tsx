import Link from 'next/link';
import AuthenticatedImage from '../AuthenticatedImage';
import { RxDotFilled, RxDotsVertical } from 'react-icons/rx';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { fetchDELETE, fetchPOST, useGetSpace } from '@/lib/backend';
import { ChangeEvent, useEffect, useState } from 'react';
import Dialog from '../profile/Dialog';
import { set } from 'date-fns';
import Tabs from '../profile/Tabs';
import BoxHeadline from '../BoxHeadline';
import AvatarEditor from '../profile/AvatarEditor';

export default function GroupHeader() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [toggleJoinable, setToggleJoinable] = useState(true);
    const [toggleInvisible, setToggleInvisible] = useState(true);
    const [spacePicFile, setSpacePicFile] = useState('');
    const [updatedSpaceDescription, setUpdatedSpaceDescription] = useState('');

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.name as string);

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
    };

    const handleCloseEditImageDialog = () => {
        setIsEditImageDialogOpen(false);
    };

    /*
    callback that is triggered when the user selects a new space pic in
    the input element. transforms the image to a base64 data uri and sets it
    as spacePicFile
    */
    const onSelectSpacePicFile = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            // on load the reader.result is always an image
            reader.addEventListener('load', () => {
                setSpacePicFile(reader.result as string);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    /*
    upload the newly selected and cropped space picture
    to the backend
    */
    const uploadSpaceImage = (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
            // transform base64 payload via base64 data uri and stripping the
            // pre-information
            var base64dataUri = reader.result as string;
            const spacePicPayload = base64dataUri.replace(/^data:image\/[a-z]+;base64,/, '');

            // send to backend and update state with returned _id to be able
            // to retrieve image from uploads endpoint
            /* 
            fetchPOST(
                '/profileinformation',
                {
                    profile_pic: {
                        type: blob.type,
                        payload: spacePicPayload,
                    },
                },
                session?.accessToken
                ).then((data) => {
                    mutate();
                });
            */
        };
    };

    const handleUpdateSpaceDescription = () => {
        // TODO needs backend update
        mutate();
    }

    const toggleVisibility = () => {
        fetchPOST(
            `/spaceadministration/toggle_visibility?name=${space.name}`,
            {},
            session!.accessToken
        );
        setToggleInvisible(!toggleInvisible);
        mutate();
    };

    const toggleJoinability = () => {
        fetchPOST(
            `/spaceadministration/toggle_joinability?name=${space.name}`,
            {},
            session!.accessToken
        );
        setToggleJoinable(!toggleJoinable);
        mutate();
    };

    const leaveSpace = () => {
        fetchDELETE(`/spaceadministration/leave?name=${space.name}`, {}, session!.accessToken).then(
            (response) => {
                console.log(response);
                // TODO error handling
            }
        );
        router.push('/spaces');
    };

    useEffect(() => {
        if (!isLoading) {
            setToggleInvisible(space.invisible);
        }
    }, [isLoading, space]);

    return (
        <>
            <div className={'flex'}>
                <div
                    className={
                        'mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl w-[180px] h-[180px]'
                    }
                >
                    <AuthenticatedImage
                        imageId={space.space_pic}
                        alt={'Gruppenbild'}
                        width={180}
                        height={180}
                    />
                </div>
                <div className={'mr-auto'}>
                    <div className="mt-2 min-h-[2rem]">
                        <button
                            className={
                                'border border-white bg-black/75 text-white rounded-lg px-3 py-1'
                            }
                            onClick={() => setIsEditDialogOpen(true)}
                        >
                            <span>Gruppe bearbeiten</span>
                        </button>
                    </div>
                    <div className={'mt-11 font-bold text-4xl text-slate-900'}>{space.name}</div>
                    <div className={'text-gray-500'}>{'Lorem ipsum dolor si amet'}</div>
                </div>
                <div className={'flex items-end mb-12'}>
                    <button
                        className={
                            'h-12 bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            leaveSpace();
                        }}
                    >
                        {' '}
                        <span>Space verlassen</span>
                    </button>
                    <button className={'h-12 ml-2'}>
                        <span>
                            <RxDotsVertical size={30} color={''} />
                        </span>
                    </button>
                </div>
            </div>
            <Dialog
                isOpen={isEditDialogOpen}
                title={'Gruppe bearbeiten'}
                onClose={handleCloseEditDialog}
            >
                <div className="w-[70vw] h-[50vh]">
                    <Tabs>
                        <div tabname="Bild & Beschreibung">
                            <div className="flex">
                                <div className="w-1/2 flex justify-center">
                                    <div className="w-fit">
                                        <div className="my-2 rounded-full overflow-hidden w-fit border-black border">
                                            <AuthenticatedImage
                                                imageId={space.space_pic}
                                                alt={'Profilbild'}
                                                width={180}
                                                height={180}
                                            />
                                        </div>
                                        <div className="flex justify-center">
                                            <button
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsEditImageDialogOpen(true);
                                                }}
                                            >
                                                ändern
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <Dialog
                                    isOpen={isEditImageDialogOpen}
                                    title="Gruppenbild hochladen"
                                    onClose={handleCloseEditImageDialog}
                                    >
                                    <div className="my-2 mx-2">
                                        Wähle ein neues Profilbild aus und schneide es zurecht
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="my-2"
                                        onChange={onSelectSpacePicFile}
                                        onClick={(e) => {
                                            e.currentTarget.value = '';
                                        }}
                                        />
                                     
                                    {spacePicFile !== '' ? (
                                        <div className="w-[90vw] max-w-[450px] max-h-[85vh]">
                                            <AvatarEditor
                                                sourceImg={spacePicFile}
                                                onFinishUpload={(blob) => {
                                                    uploadSpaceImage(blob);
                                                    handleCloseEditImageDialog();
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <></>
                                    )}
                                
                                </Dialog>
                                <div className="w-1/2 ml-auto mx-6 flex items-center">
                                    <div className='w-full'>
                                        <div className={'mb-1 font-bold text-slate-900 text-lg'}>
                                            Beschreibung
                                        </div>
                                        <textarea
                                            className={
                                                'w-full border border-[#cccccc] rounded-md px-2 py-[6px]'
                                            }
                                            rows={5}
                                            placeholder={'Beschreibe diesen Space'}
                                            value={updatedSpaceDescription}
                                            onChange={
                                                (e) => setUpdatedSpaceDescription(e.target.value)
                                            }
                                        ></textarea>
                                        <button
                                                className={
                                                    'bg-ve-collab-orange text-white py-2 px-5 rounded-lg'
                                                }
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleUpdateSpaceDescription();
                                                }}
                                            >
                                                Speichern
                                            </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div tabname="Sichtbarkeit">
                            <div className="flex mx-4 my-4">
                                <div className="mx-4">privat</div>
                                <div
                                    className="md:w-14 md:h-7 w-12 h-6 flex items-center bg-gray-400 rounded-full p-1 cursor-pointer"
                                    onClick={toggleJoinability}
                                >
                                    <div
                                        className={
                                            'bg-black md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                            (toggleJoinable ? null : 'transform translate-x-6')
                                        }
                                    ></div>
                                </div>
                                <div className="mx-4">öffentlich</div>
                            </div>
                            <div className="flex mx-4 my-4">
                                <div className="mx-4">unsichtbar</div>
                                <div
                                    className="md:w-14 md:h-7 w-12 h-6 flex items-center bg-gray-400 rounded-full p-1 cursor-pointer"
                                    onClick={toggleVisibility}
                                >
                                    <div
                                        className={
                                            'bg-black md:w-6 md:h-6 h-5 w-5 rounded-full shadow-md transform duration-300 ease-in-out ' +
                                            (toggleInvisible ? null : 'transform translate-x-6')
                                        }
                                    ></div>
                                </div>
                                <div className="mx-4">sichtbar</div>
                            </div>
                        </div>
                        <div tabname="Anfragen">
                            <div className="divide-y">
                                {Array(3)
                                    .fill(0)
                                    .map((_, index) => (
                                        <div key={index} className="flex py-2 justify-between">
                                            <div className="flex cursor-pointer">
                                                <div>
                                                    <AuthenticatedImage
                                                        imageId={'default_profile_pic.jpg'}
                                                        alt={'Profilbild'}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={'Max Mustermann'} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {'Lorem ipsum Institution'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <button
                                                    className={
                                                        'h-10 bg-transparent border border-green-600 text-green-600 px-4 mx-2 rounded-lg shadow-xl'
                                                    }
                                                >
                                                    <span>Annehmen</span>
                                                </button>
                                                <button
                                                    className={
                                                        'h-10 bg-transparent border border-red-600 text-red-600 px-4 mx-2 rounded-lg shadow-xl'
                                                    }
                                                >
                                                    <span>Ablehnen</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div tabname="Einladungen"></div>
                        <div tabname="Berechtigungen"></div>
                    </Tabs>
                </div>
            </Dialog>
        </>
    );
}
