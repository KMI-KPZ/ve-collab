import CustomHead from '@/components/metaData/CustomHead';
import { useTranslation } from 'next-i18next';
import { Socket } from 'socket.io-client';
import UserProfile, { UserProfileNoAuthPreview } from '..';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

interface Props {
    socket: Socket;
    openOrCreateChatWith: (users: string[]) => void;
}

NoSelectedUserProfile.auth = true;
NoSelectedUserProfile.noAuthPreview = <UserProfileNoAuthPreview />;
export default function NoSelectedUserProfile({
    socket,
    openOrCreateChatWith,
}: Props): JSX.Element {
    const { t } = useTranslation(['community', 'common']);
    return (
        <>
            <CustomHead pageTitle={t('common:profile')} pageSlug={`profile/user`} />
            <UserProfile socket={socket} openOrCreateChatWith={openOrCreateChatWith} />
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
