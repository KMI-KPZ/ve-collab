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
            setPadID(router.query.padID as string);
        }
    }, [router]);

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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
    const response = await createPad(context.query.padID as string);
    console.log(response);

    return {
        props: {},
    };
};
