import Head from 'next/head';
import React from 'react';
import { useRouter } from 'next/router';

type Props = {
    pageTitle?: string;
    pageDescription?: string;
    pageSlug?: string;
};

export default function CustomHead({ pageTitle, pageDescription, pageSlug }: Props) {
    const router = useRouter();
    const language = router.locale === 'de' ? 'de-DE' : 'en-US';

    const pageTitleTemplate = pageTitle ? `VE Collab | ${pageTitle}` : 'Ve Collab';

    const baseURL =
        process.env.NODE_ENV === 'production' ? 'https://ve-collab.org/' : 'http://localhost:3000/';
    const url = pageSlug ? `${baseURL}/${pageSlug}` : baseURL;
    const urlAlternateGerman = pageSlug ? `${baseURL}/de/${pageSlug}` : `${baseURL}/de`;
    const urlAlternateEnglish = pageSlug ? `${baseURL}/en/${pageSlug}` : `${baseURL}/en`;

    return (
        <Head>
            <title>{pageTitleTemplate}</title>

            <link rel="canonical" href={url} />
            <link rel="alternate" href={urlAlternateEnglish} hrefLang="en-US" />
            <link rel="alternate" href={urlAlternateGerman} hrefLang="de-DE" />

            {pageDescription && (
                <>
                    <meta name="description" content={pageDescription} />
                    <meta name="twitter:description" content={pageDescription} />
                    <meta property="og:description" content={pageDescription} />
                </>
            )}

            <meta name="twitter:title" content={pageTitleTemplate} />
            <meta property="og:site_name" content={pageTitleTemplate} />
            <meta property="og:title" content={pageTitleTemplate} />

            <meta property="og:locale" content={language} />
            <meta name="language" content={language} />
        </Head>
    );
}
