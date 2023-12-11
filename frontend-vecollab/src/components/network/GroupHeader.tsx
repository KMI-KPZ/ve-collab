import Link from 'next/link';
import AuthenticatedImage from '../AuthenticatedImage';
import { RxDotFilled, RxDotsVertical } from 'react-icons/rx';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { fetchPOST, useGetSpace } from '@/lib/backend';
import { useEffect, useState } from 'react';
import Dialog from '../profile/Dialog';
import { set } from 'date-fns';
import Tabs from '../profile/Tabs';

export default function GroupHeader() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [toggleJoinable, setToggleJoinable] = useState(true);
    const [toggleInvisible, setToggleInvisible] = useState(true);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.name as string);

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
    };

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
                        <div tabname="Sichtbarkeit">
                            <div className="flex mx-4 my-4">
                                <div className="mx-4">öffentlich</div>
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
                                <div className="mx-4">privat</div>
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
                        <div tabname="Anfragen"></div>
                        <div tabname="Einladungen"></div>
                        <div tabname="Berechtigungen"></div>
                    </Tabs>
                </div>
            </Dialog>
        </>
    );
}
