import Head from 'next/head';

export default function VEHead() {
    const title = 'VE Collab';

    const baseURL = 'https://ve-collab.org/';
    const baseURLen = 'https://ve-collab.org/en';
    const baseURLde = 'https://ve-collab.org/de';

    const keywords =
        'virtual exchange, collaboration, VE Collab, online learning, VE Designer, Selbstlernmaterialien'; // 5-10 keywords

    const description =
        'VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten und gibt Hilfestellungen bei der Planung und Durchführung virtueller Austausche.';
    return (
        <Head>
            <meta charSet="UTF-8" />
            <meta
                name="robots"
                content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
            />
            {/* key attributes entries may be overwritten in <CustomHead />  */}
            <title>{title}</title>
            <meta name="application-name" content="VE Collab" key="application-name" />
            <meta name="creator" content="VE Collab Team" key="creator" />
            <meta name="publisher" content="VE Collab Team" key="publisher" />
            <meta name="keywords" content={keywords} key="keywords" />
            <meta name="description" content={description} key="description" />
            <link rel="canonical" href={baseURL} key="canonical" />
            <link rel="alternate" href={baseURLen} hrefLang="en-US" key="alternateEN" />
            <link rel="alternate" href={baseURLde} hrefLang="de-DE" key="alternateDE" />
            <meta name="language" content="de" key="language" />

            {/* Link Preview */}
            <meta property="og:title" content="VE Collab" key="og:title" />
            <meta property="og:description" content={description} key="og:description" />
            <meta property="og:url" content="https://ve-collab.org/" key="og:url" />
            <meta property="og:site_name" content={title} key="og:site_name" />
            <meta
                property="og:image"
                content="https://ve-collab.org/images/veCollabLogoLinkPreview.png"
            />
            <meta property="og:image:width" content="652" />
            <meta property="og:image:height" content="341" />
            <meta property="og:image:alt" content="VE Collab Logo" />
            <meta property="og:locale" content="de-DE" key="og:locale" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} key="twitter:title" />
            <meta name="twitter:description" content={description} key="twitter:description" />
            <meta
                name="twitter:image"
                content="https://ve-collab.org/images/veCollabLogoLinkPreview.png"
            />
            <meta name="twitter:image:width" content="652" />
            <meta name="twitter:image:height" content="341" />
            <meta name="twitter:image:alt" content="VE Collab Logo" />

            {/* Favicon */}
            <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
            <link rel="manifest" href="/favicon/site.webmanifest" />
            <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#5bbad5" />
            <meta name="apple-mobile-web-app-title" content="Snippit" />
            <meta name="msapplication-TileColor" content="#ffc40d" />
            <meta name="theme-color" content="#ffffff" />
        </Head>
    );
}
