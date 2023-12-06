import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import GroupBanner from '@/components/network/GroupBanner';
import GroupHeader from '@/components/network/GroupHeader';
import { useGetSpace } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

Space.auth = true;
export default function Space() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [renderPicker, setRenderPicker] = useState<'timeline' | 'members' | 'files'>('timeline');

    const {
        data: space,
        isLoading,
        error,
        mutate,
    } = useGetSpace(session!.accessToken, router.query.name as string);
    console.log(space);

    return (
        <Container>
            <GroupBanner />
            <div className={'mx-20 mb-2 px-5 relative -mt-16 z-10'}>
                <GroupHeader />
            </div>
            <Container>
                <div className={'mx-20 flex'}>
                    <div className={'w-3/4  mr-4'}>
                        {(() => {
                            switch (renderPicker) {
                                case 'timeline':
                                    return <div>Timeline</div>;
                                case 'members':
                                    return <div>Mitglieder</div>;
                                case 'files':
                                    return <div>Dateiablage</div>;

                                default:
                                    return <div>dont know</div>;
                            }
                        })()}
                    </div>
                    <div className={'w-1/4  ml-4'}>
                        <button
                            className={
                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                (renderPicker === 'timeline'
                                    ? 'bg-ve-collab-blue text-white'
                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                            }
                            onClick={() => setRenderPicker('timeline')}
                        >
                            <span>Dashboard</span>
                        </button>
                        <button
                            className={
                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                (renderPicker === 'members'
                                    ? 'bg-ve-collab-blue text-white'
                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                            }
                            onClick={() => setRenderPicker('members')}
                        >
                            <span>Mitglieder</span>
                        </button>
                        <button
                            className={
                                'w-full h-12 mb-2 border py-3 px-6 rounded-lg shadow-xl ' +
                                (renderPicker === 'files'
                                    ? 'bg-ve-collab-blue text-white'
                                    : 'bg-white text-gray-500 hover:border-ve-collab-blue hover:text-ve-collab-blue')
                            }
                            onClick={() => setRenderPicker('files')}
                        >
                            <span>Dateiablage</span>
                        </button>
                        <WhiteBox>
                            <BoxHeadline title={'Beschreibung'} />
                            <div className="min-h-[20vh] mx-2 my-1">
                                <div className={'text-gray-500'}>
                                    {space?.space_description
                                        ? space.space_description
                                        : 'Keine Beschreibung vorhanden.'}
                                </div>
                            </div>
                        </WhiteBox>
                    </div>
                </div>
            </Container>
        </Container>
    );
}
