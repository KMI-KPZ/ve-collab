import { getMaterialNodePath } from '@/lib/backend';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import CustomHead from '@/components/metaData/CustomHead';

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
    const id = router.query.id as string;
    const { t } = useTranslation('common');

    useEffect(() => {
        if (router.isReady) {
            router.push(props.uri);
        }
    }, [router, props.uri]);

    return (
        <div>
            <CustomHead pageTitle={t('redirect')} pageSlug={`materialPermalink/${id}`} />
            <h1>{t('you_are_redirected')}</h1>
            <p>
                {t('after_3_seconds_redirect_click')}
                <Link href={props.uri}>{t('here')}</Link>
            </p>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async ({
    params,
    locale,
}: GetServerSidePropsContext) => {
    const path = await getMaterialNodePath(Number.parseInt(params?.id as string));

    const uri =
        '/learning-material/' +
        path.bubble.text +
        '/' +
        path.category.text +
        '/' +
        path.material.text;

    return {
        props: {
            uri,
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
};
