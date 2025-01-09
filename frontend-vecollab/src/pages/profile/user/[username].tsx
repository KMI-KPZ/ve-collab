import { Socket } from 'socket.io-client';
import UserProfile, { UserProfileNoAuthPreview } from '..';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CustomHead from '@/components/metaData/CustomHead';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

interface Props {
    socket: Socket;
    openOrCreateChatWith: (users: string[]) => void;
}

SelectedUserProfile.auth = true;
SelectedUserProfile.noAuthPreview = <UserProfileNoAuthPreview />;

export default function SelectedUserProfile({ socket, openOrCreateChatWith }: Props): JSX.Element {
    const router = useRouter();
    const { t } = useTranslation(['community', 'common']);
    const username: string = router.query.username as string;
    return (
        <>
            <CustomHead pageTitle={t('common:profile')} pageSlug={`profile/user/${username}`} />
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
