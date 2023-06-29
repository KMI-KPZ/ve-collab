import { createPad } from '@/lib/etherpad';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Etherpad() {
    const router = useRouter();
    const [padID, setPadID] = useState('');

    useEffect(() => {
        if (!router.isReady) {
            return;
        } else {
            //createPad(router.query.padID as string);
            setPadID(router.query.padID as string);
        }
    });

    return (
        <>
            {padID !== '' && (
                <iframe
                    src={`${process.env.NEXT_PUBLIC_ETHERPAD_URL}/p/${padID}#L4?showChat=true&showLineNumbers=false`}
                    width={600}
                    height={400}
                ></iframe>
            )}
        </>
    );
}

export const getServerSideProps = (context: GetServerSidePropsContext) => {
    createPad(context.query.padID as string);

    return {
        props: {},
    };
};
