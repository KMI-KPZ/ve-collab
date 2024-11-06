import { Metadata } from 'next';
// import { useTranslation } from 'next-i18next';
// import { getTranslations } from 'next-intl/server';

const metadataBaseURL =
    process.env.NODE_ENV === 'production' ? 'https://ve-collab.org/' : 'http://localhost:3000/';

// TODO internationlize with generate methode or with static translation files
// https://next-intl-docs.vercel.app/docs/environments/actions-metadata-route-handlers

export const metadataConfig: Metadata = {
    metadataBase: new URL(metadataBaseURL),
    authors: [{ name: 'VE Collab Team' }],
    applicationName: 'VE Collab',
    creator: 'VE Collab Team',
    publisher: 'VE Collab Team',
    title: {
        template: '%s | VE Collab', // %s will be replaced with the children page title
        default: 'VE Collab',
        // absolute: 'VE Collab' // overwrite template in children
    },
    description: 'Ve Collab', // used when you share a link f.e. on social media
    keywords: 'virtual exchange, collaboration, VE Collab, online learning',
    robots: {
        index: true,
        follow: true,
        noarchive: false,
    },
    alternates: {
        canonical: '/',
        languages: {
            'en-US': '/en',
            'de-DE': '/de',
        },
    },
    openGraph: {
        title: 'VE Collab',
        description: 'VE Collab',
        url: 'https://ve-collab.org/',
        siteName: 'VE Collab',
        images: [
            {
                url: 'https://ve-collab.org/images/veCollabLogo.png', //652x292
                width: 652,
                height: 292,
                alt: 'VE Collab Logo',
            },
        ],
        locale: 'de-DE',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'VE Collab',
        description: 'VE Collab',
        images: [
            {
                url: 'https://ve-collab.org/images/veCollabLogo.png',
                width: 652,
                height: 292,
                alt: 'VE Collab Logo',
            },
        ],
    },
};

/*export async function generateMetadata({ params: { locale } }) {
    const t = await getTranslations({ locale, namespace: 'Metadata' });

    return {
        title: t('title'),
    };
}*/
