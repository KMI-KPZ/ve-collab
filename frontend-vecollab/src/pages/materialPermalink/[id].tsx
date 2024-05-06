import { getMaterialNodePath } from '@/lib/backend';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface Props {
    uri: string;
}

// page: /materialPermalink/[id]
// reconstructs the path of a learning material given by it's id from the taxonomy
// and redirects accordingly
// used for permalinks from MeinBildungsraum Metadata space to be able to link to learning materials
// but having flexibility in our frontend routing
// caveat: this only works for true material nodes, i.e. leaf nodes in the taxonomy, not any other nodes
// but for now thats sufficient since only the material nodes are in MeinBildungsraum Metadata anyway
export default function MaterialPermalink(props: Props) {
    const router = useRouter();

    useEffect(() => {
        if (router.isReady) {
            router.push(props.uri);
        }
    }, [router, props.uri]);

    return (
        <div>
            <h1>Sie werden weitergeleitet!</h1>
            <p>
                Falls dies nicht innerhalb von 3 Sekunden automatisch passiert, klicken Sie bitte{' '}
                <Link href={props.uri}>hier</Link>
            </p>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
}: GetServerSidePropsContext) => {
    const path = await getMaterialNodePath(Number.parseInt(params?.id as string));

    const uri =
        '/learning-material/' + path.bubble.text + '/' + path.category.text + '/' + path.material.text;

    return {
        props: {
            uri,
        },
    };
};
