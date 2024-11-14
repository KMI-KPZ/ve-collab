import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Favicon from './Favicon';

export default function VEHead() {
    const { t } = useTranslation('common');

    const title = 'VE Collab';
    const keywords = 'virtual exchange, collaboration, VE Collab, online learning';
    const description =
        'VE-Collab supports educators with a variety of qualification offers in building their own competencies and provides assistance in the initiation, planning, and implementation of international and national virtual exchanges. By building a Community of Practice, we also promote active collegial (virtual) exchange.';

    return (
        <Head>
            <meta charSet="UTF-8" />
            <meta
                name="robots"
                content="index, follow, noarchiv, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
            />
            <title>{title}</title>
            {/* may overwrittten in <CustomHead />  */}
            <meta name="application-name" content="test" />
            <meta name="author" content="VE Collab Team" />
            <meta name="creator" content="VE Collab Team" />
            <meta name="publisher" content="VE Collab Team" />
            <meta name="keywords" content={keywords} />
            <meta name="description" content={description} />
            <link rel="canonical" href="/" />
            <link rel="alternate" href="/en" hrefLang="en-US" />
            <link rel="alternate" href="/de" hrefLang="de-DE" />
            <meta property="og:title" content="VE Collab" />
            <meta property="og:description" content={description} />
            <meta property="og:url" content="https://ve-collab.org/" />
            <meta property="og:site_name" content={title} />
            <meta property="og:image" content="https://ve-collab.org/images/veCollabLogo.png" />
            <meta property="og:image:width" content="652" />
            <meta property="og:image:height" content="292" />
            <meta property="og:image:alt" content="VE Collab Logo" />
            <meta property="og:locale" content="de-DE" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content="https://ve-collab.org/images/veCollabLogo.png" />
            <meta name="twitter:image:width" content="652" />
            <meta name="twitter:image:height" content="292" />
            <meta name="twitter:image:alt" content="VE Collab Logo" />
            <Favicon />
        </Head>
    );
}
