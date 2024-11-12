// unused -> next js metadata not working -> only Head component works
import { Metadata } from 'next';

const metadataBaseURL =
    process.env.NODE_ENV === 'production' ? 'https://ve-collab.org/' : 'http://localhost:3000/';

export const metadataConfig: Metadata = {
    metadataBase: new URL(metadataBaseURL),
    authors: [{ name: 'VE Collab Team' }],
    applicationName: 'test',
    creator: 'VE Collab Team',
    publisher: 'VE Collab Team',
    title: {
        template: '%s | VE Collab', // %s will be replaced with the children page title
        default: 'test',
        // absolute: 'VE Collab' // overwrite template in children
    },
    description:
        'VE-Collab supports educators with a variety of qualification offers in building their own competencies and provides assistance in the initiation, planning, and implementation of international and national virtual exchanges. By building a Community of Practice, we also promote active collegial (virtual) exchange.',
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
        description:
            'VE-Collab supports educators with a variety of qualification offers in building their own competencies and provides assistance in the initiation, planning, and implementation of international and national virtual exchanges. By building a Community of Practice, we also promote active collegial (virtual) exchange.',
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
        description:
            'VE-Collab supports educators with a variety of qualification offers in building their own competencies and provides assistance in the initiation, planning, and implementation of international and national virtual exchanges. By building a Community of Practice, we also promote active collegial (virtual) exchange.',
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
