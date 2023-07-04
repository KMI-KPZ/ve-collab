import {
    createAuthorIfNotExistsFor,
    createGroupIfNotExistsFor,
    createGroupPad,
    createSession,
} from '@/lib/etherpad';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface Props {
    groupID: string;
}

export default function Etherpad({
    groupID,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const [padID, setPadID] = useState('');

    useEffect(() => {
        if (!router.isReady) {
            return;
        } else {
            setPadID(router.query.padID as string);
        }
    }, [router]);

    return (
        <>
            {padID !== '' && (
                <iframe
                    src={`${process.env.NEXT_PUBLIC_ETHERPAD_URL}/p/${groupID}$${padID}`}
                    width={600}
                    height={400}
                ></iframe>
            )}
        </>
    );
}

export const getServerSideProps: GetServerSideProps<Props> = async (
    context: GetServerSidePropsContext
) => {
    const session = await getSession(context);
    console.log(session);
    // TODO break if not session --> force signIn --> maybe reload needed?

    // give the curently authenticated user access to this pad
    // only for demo purpose, ofc this flow has to be placed at the access-setting of plans, i.e.:
    // - as user gets access rights to a plan --> user gets access to the pad (create a long lasting session for him
    //   and store it somwhere (backend(?)), retrieve it whenever this page is loaded and set the coookie.
    // - deletion of sessionID vice versa whenever access to plan gets revoked
    // - creation of the pad gets moved to where a new plan gets created

    const createAuthorResponse = await createAuthorIfNotExistsFor(
        session?.user.id!,
        session?.user.preferred_username!
    );
    console.log('createAuthorResponse:');
    console.log(createAuthorResponse);

    const createGroupResponse = await createGroupIfNotExistsFor(context.query.padID as string);
    console.log('createGroupResponse:');
    console.log(createGroupResponse);

    const createGroupPadResponse = await createGroupPad(
        createGroupResponse.data.groupID,
        context.query.padID as string
    );
    console.log('createGroupPadResponse:');
    console.log(createGroupPadResponse);

    const createSessionResponse = await createSession(
        createGroupResponse.data.groupID,
        createAuthorResponse.data.authorID
    );
    console.log('createSessionResponse:');
    console.log(createSessionResponse);

    context.res.setHeader('Set-Cookie', `sessionID=${createSessionResponse.data.sessionID}`);

    // TODO only users with access to the plan (plan _id == padID in this case) should have access to this specific etherpad
    // might be worth to move the whole creation / access logic of etherpads into backend

    return {
        props: { groupID: createGroupResponse.data.groupID },
    };
};
