import Image from 'next/image';
import blueBackground from '@/images/footer/KAVAQ_Footer_rounded.png';
import { useEffect, useState } from 'react';
import Dialog from './Dialog';
import BoxHeadline from './BoxHeadline';
import { UserSnippet } from '@/interfaces/profile/profileInterfaces';
import { RxTrash } from 'react-icons/rx';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingAnimation from '../LoadingAnimation';

interface Props {
    followsNum: number;
    followersNum: number;
    foreignUser: boolean;
    username: string;
}

export default function ProfileBanner({ followsNum, followersNum, foreignUser, username }: Props) {
    const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
    const handleOpenFollowingDialog = () => {
        setIsFollowingDialogOpen(true);
        //setLoading(true);
        // TODO request folling snippets and set state to trigger rerender and setLoading(false) on finish
    };
    const handleCloseFollowingDialog = () => {
        setIsFollowingDialogOpen(false);
    };

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
                signIn('keycloak');
            }
        }
    }, [session, status]);

    return (
        <>
            <div className={'w-full h-72 mt-10 relative rounded-2xl'}>
                <Image className={'z-10'} fill src={blueBackground} alt={''} />
                <div className={'flex absolute bottom-5 right-14 divide-x z-20 cursor-pointer'}>
                    <div
                        className={'pr-6 text-lg text-white'}
                        onClick={(e) => {
                            e.preventDefault();
                            handleOpenFollowingDialog();
                        }}
                    >
                        <div className={'font-bold'}>{followsNum}</div>
                        <div>Folgt</div>
                    </div>
                    <div className={'pl-6 text-lg text-white'}>
                        <div className={'font-bold'}>{followersNum}</div>
                        <div>Follower</div>
                    </div>
                </div>
            </div>
            <Dialog
                isOpen={isFollowingDialogOpen}
                title={`${username} folgt:`}
                onClose={handleCloseFollowingDialog}
            >
                <div className="w-[30rem] h-[28rem] overflow-y-auto content-scrollbar">
                    {loading ? (
                        <div className="flex w-full h-full justify-center items-center">
                            <LoadingAnimation />
                        </div>
                    ) : (
                        <ul className="px-1 divide-y">
                            <li
                                className="flex py-2 cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log('test');
                                }}
                            >
                                <div>
                                    <Image
                                        src={'/images/random_user.jpg'}
                                        alt={'Profilbild'}
                                        width={60}
                                        height={60}
                                        className="rounded-full"
                                    ></Image>
                                </div>
                                <div className="">
                                    <BoxHeadline title={'Name'} />
                                    <div className="mx-2 px-1 my-1 text-gray-600">institution</div>
                                </div>
                                {!foreignUser && (
                                    <div className="ml-auto flex items-center">
                                        <RxTrash size={20} />
                                    </div>
                                )}
                            </li>
                            <li
                                className="flex py-2 cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log('test2');
                                }}
                            >
                                <div>
                                    <Image
                                        src={'/images/random_user.jpg'}
                                        alt={'Profilbild'}
                                        width={60}
                                        height={60}
                                        className="rounded-full"
                                    ></Image>
                                </div>
                                <div className="">
                                    <BoxHeadline title={'Name'} />
                                    <div className="mx-2 px-1 my-1 text-gray-600">institution</div>
                                </div>
                                {!foreignUser && (
                                    <div className="ml-auto flex items-center">
                                        <RxTrash size={20} />
                                    </div>
                                )}
                            </li>
                        </ul>
                    )}
                </div>
            </Dialog>
        </>
    );
}
