import WhiteBox from '@/components/Layout/WhiteBox';
import Container from '@/components/Layout/container';
import SmallTimestamp from '@/components/SmallTimestamp';
import Dialog from '@/components/profile/Dialog';
import Tabs from '@/components/profile/Tabs';
import Link from 'next/link';
import { useState } from 'react';
import { RxDotsVertical } from 'react-icons/rx';

export default function Notifications() {
    const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);

    const handleOpenNotificationsDialog = () => {
        setIsNotificationsDialogOpen(true);
    };

    const handleCloseNotificationsDialog = () => {
        setIsNotificationsDialogOpen(false);
    };
    return (
        <Container>
            <div className="flex items-center justify-center">
                <WhiteBox>
                    <div className="w-[50rem] min-h-[30rem]">
                        <Tabs>
                            <div tabname="neu">
                                <ul className="divide-y">
                                    <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                                        <div
                                            className="px-2 cursor-pointer"
                                            onClick={handleOpenNotificationsDialog}
                                        >
                                            <p>
                                                Du wurdest von <b>Test Admin</b> zu einem VE
                                                eingeladen: <b>VE-Plan Titel</b>
                                            </p>
                                            <SmallTimestamp
                                                className="text-gray-500"
                                                timestamp={'2023-01-01T12:08:12.575Z'}
                                            />
                                        </div>
                                        <div className="flex ml-auto px-2 items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    console.log('hi');
                                                }}
                                            >
                                                <RxDotsVertical size={25} />
                                            </button>
                                        </div>
                                    </li>
                                    <li className="flex mx-2 py-4 items-center rounded-xl hover:bg-slate-200">
                                        <div
                                            className="px-2 cursor-pointer"
                                            onClick={handleOpenNotificationsDialog}
                                        >
                                            <p>
                                                Du wurdest von <b>Test Admin</b> zu einem VE
                                                eingeladen: <b>VE-Plan Titel</b>
                                            </p>
                                            <SmallTimestamp
                                                className="text-gray-500"
                                                timestamp={'2023-01-01T12:08:12.575Z'}
                                            />
                                        </div>
                                        <div className="flex ml-auto px-2 items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    console.log('hi');
                                                }}
                                            >
                                                <RxDotsVertical size={25} />
                                            </button>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div tabname="alle">hi</div>
                        </Tabs>
                    </div>
                </WhiteBox>
            </div>
            <Dialog
                isOpen={isNotificationsDialogOpen}
                title={'neue VE-Einladung'}
                onClose={handleCloseNotificationsDialog}
            >
                <div className="w-[30rem] h-[30rem] overflow-y-auto content-scrollbar relative">
                    <div>
                        <p>
                            <Link href={'/profile?username=test_admin'}>
                                <b>Test Admin</b>
                            </Link>{' '}
                            hat dich eingeladen:
                        </p>
                    </div>
                    <div className="my-4 p-2 border-2 rounded-xl max-h-[15rem] overflow-y-auto">
                        <p className="text-slate-700">
                            Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy
                            eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam
                            voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet
                            clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit
                            amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
                            nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat,
                            sed diam voluptua. At vero eos et accusam et justo duo dolores et ea
                            rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem
                            ipsum dolor sit amet.
                        </p>
                    </div>
                    <div>
                        <p>
                            <Link href={'/profile?username=test_admin'}>
                                <b>Test Admin</b>
                            </Link>{' '}
                            hat bereits vorgearbeitet, sieh dir den zugehörigen Plan an:
                        </p>
                        <div className="flex my-4 justify-center text-slate-900 text-xl font-bold">
                            {/* todo this should link to a read-only view of the plan*/}
                            <Link
                                target="_blank"
                                href={
                                    '/startingWizard/generalInformation/projectName?plannerId=64aea3f76ebb499c8c26cd64'
                                }
                            >
                                VE-Plan-Titel
                            </Link>
                        </div>
                    </div>
                    <div className="flex absolute bottom-0 w-full">
                        <button
                            className={
                                'bg-transparent border border-gray-500 py-3 px-6 mr-auto rounded-lg shadow-lg'
                            }
                            onClick={handleCloseNotificationsDialog}
                        >
                            <span>Ablehnen</span>
                        </button>
                        <button
                            className={
                                'bg-ve-collab-orange border text-white py-3 px-6 rounded-lg shadow-xl'
                            }
                            onClick={(e) => {
                                //sharePlan();
                                handleCloseNotificationsDialog();
                            }}
                        >
                            <span>Annehmen</span>
                        </button>
                    </div>
                </div>
            </Dialog>
        </Container>
    );
}
