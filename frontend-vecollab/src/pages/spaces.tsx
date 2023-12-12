import AuthenticatedImage from '@/components/AuthenticatedImage';
import BoxHeadline from '@/components/BoxHeadline';
import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';

export default function Spaces() {
    const [searchSpaceInput, setSearchSpaceInput] = useState('');
    const [numSearchResultsDummy, setNumSearchResultsDummy] = useState(0);

    const handleSearchSpaceInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchSpaceInput(event.target.value);
        setNumSearchResultsDummy(Math.random() * 10);
    };
    return (
        <Container>
            <WhiteBox>
                <VerticalTabs>
                    <div tabname="meine Gruppen">
                        <div className="min-h-[50vh]">
                            <BoxHeadline title={'Du bist Mitglied in diesen Spaces'} />
                            <div className="divide-y my-4">
                                {Array(3)
                                    .fill(0)
                                    .map((_, index) => (
                                        <div key={index} className="px-2 py-5">
                                            <div className="flex cursor-pointer">
                                                <div>
                                                    <AuthenticatedImage
                                                        imageId={'default_group_pic.jpg'}
                                                        alt={'Profilbild'}
                                                        width={60}
                                                        height={60}
                                                        className="rounded-full"
                                                    ></AuthenticatedImage>
                                                </div>
                                                <div>
                                                    <BoxHeadline title={'Lorem ipsum Gruppe'} />
                                                    <div className="mx-2 px-1 my-1 text-gray-600">
                                                        {'Lorem ipsum Beschreibung'}
                                                    </div>
                                                </div>
                                                <div className="flex ml-auto px-2 items-center justify-center">
                                                    <button>
                                                        <RxDotsVertical size={25} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                    <div tabname="neue finden">
                        <div className="min-h-[60vh]">
                            <div className="h-[50vh] overflow-y-auto content-scrollbar">
                                <input
                                    className={
                                        'border border-gray-500 rounded-lg px-2 py-1 mb-1 w-11/12'
                                    }
                                    type="text"
                                    placeholder={
                                        'Suche nach Spaces, z.B. nach dem Namen oder der Beschreibung'
                                    }
                                    value={searchSpaceInput}
                                    onChange={handleSearchSpaceInput}
                                />
                                {Array.from({ length: numSearchResultsDummy }, (_, index) => (
                                    <div key={index} className="px-2 py-5">
                                        <div className="flex cursor-pointer">
                                            <div>
                                                <AuthenticatedImage
                                                    imageId={'default_group_pic.jpg'}
                                                    alt={'Profilbild'}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-full"
                                                ></AuthenticatedImage>
                                            </div>
                                            <div>
                                                <BoxHeadline title={'Lorem ipsum Gruppe'} />
                                                <div className="mx-2 px-1 my-1 text-gray-600">
                                                    {'Lorem ipsum Beschreibung'}
                                                </div>
                                            </div>
                                            <div className="flex ml-auto px-2 items-center justify-center">
                                                <div className="flex items-center">
                                                    {index % 3 === 0 && (
                                                        <button
                                                            className={
                                                                'h-10 bg-ve-collab-orange text-white px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>Beitreten</span>
                                                        </button>
                                                    )}
                                                    {index % 3 === 1 && (
                                                        <button
                                                            className={
                                                                'h-10 bg-transparent border border-ve-collab-orange text-ve-collab-orange  px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>Beitritt anfragen</span>
                                                        </button>
                                                    )}
                                                    {index % 3 === 2 && (
                                                        <button
                                                            disabled
                                                            className={
                                                                'h-10 bg-transparent border border-ve-collab-orange/50 text-ve-collab-orange/50 cursor-not-allowed px-4 mx-2 rounded-lg shadow-xl'
                                                            }
                                                        >
                                                            <span>angefragt</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>Nichts passendes gefunden?</div>
                        </div>
                    </div>
                </VerticalTabs>
            </WhiteBox>
        </Container>
    );
}
