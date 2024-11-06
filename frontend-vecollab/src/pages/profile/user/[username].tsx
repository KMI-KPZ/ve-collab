import { Socket } from 'socket.io-client';
import UserProfile from '..';
import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

interface Props {
    socket: Socket;
}

SelectedUserProfile.auth = true;
export default function SelectedUserProfile({ socket }: Props): JSX.Element {
    return <UserProfile socket={socket} />;
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
