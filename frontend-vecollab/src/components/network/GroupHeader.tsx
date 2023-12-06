import Link from 'next/link';
import AuthenticatedImage from '../AuthenticatedImage';
import { RxDotFilled, RxDotsVertical } from 'react-icons/rx';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useGetSpace } from '@/lib/backend';

export default function GroupHeader() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.name as string);

    return (
        <div className={'flex'}>
            <div className={'mr-8 rounded-full overflow-hidden border-4 border-white shadow-2xl'}>
                <AuthenticatedImage
                    imageId={space.space_pic}
                    alt={'Gruppenbild'}
                    width={180}
                    height={180}
                />
            </div>
            <div className={'mr-auto'}>
                <div className="mt-2 min-h-[2rem]">
                    <>
                        <Link href={`/editGroup?name=${space.name}`}>
                            <button
                                className={
                                    'border border-white bg-black/75 text-white rounded-lg px-3 py-1'
                                }
                            >
                                <span>Gruppe bearbeiten</span>
                            </button>
                        </Link>
                    </>
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
    );
}
