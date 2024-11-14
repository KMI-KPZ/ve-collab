import Head from 'next/head';
import { useTranslation } from 'react-i18next';

type Props = {
    title?: string;
    content?: string;
    pageSlug?: string;
};

export default function CustomHead({ title, content, pageSlug }: Props) {
    const { t } = useTranslation('common');

    const pageTitle = title ? `VE Collab | ${title}` : 'Ve Collab';
    const pageURL = `${process.env.NEXT_PUBLIC_BASE_URL}${pageSlug}`;

    return (
        <Head>
            <title>{pageTitle}</title>
            <meta name="description" content={content} />
            <link rel="canonical" href={pageURL} />
            <meta property="og:title" content={pageTitle} />
        </Head>
    );
}
