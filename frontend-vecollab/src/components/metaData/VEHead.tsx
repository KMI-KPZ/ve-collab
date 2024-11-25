import Head from 'next/head';
import Favicon from './Favicon';
import LinkPreview from '@/components/metaData/LinkPreview';

export default function VEHead() {
    const title = 'VE Collab';

    const keywords =
        'virtual exchange, collaboration, VE Collab, online learning, VE Designer, Selbstlernmaterialien'; // 5-10 keywords

    const description =
        'VE-Collab unterstützt Lehrende mit vielfältigen Qualifizierungsangeboten beim eigenen Kompetenzaufbau und gibt Hilfestellungen bei der Initialisierung, Planung und Durchführung internationaler und nationaler virtueller Austausche (eng. virtual exchanges). Durch den Aufbau einer Community of Practice fördern wir zudem den aktiven kollegialen (virtuellen) Austausch.';

    return (
        <Head>
            <meta charSet="UTF-8" />
            <meta
                name="robots"
                content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
            />
            <title>{title}</title>
            {/* may overwrittten in <CustomHead />  */}
            <meta name="application-name" content="VE Collab" />
            <meta name="creator" content="VE Collab Team" />
            <meta name="publisher" content="VE Collab Team" />
            <meta name="keywords" content={keywords} />
            <meta name="description" content={description} />
            <link rel="canonical" href="/" />
            <link rel="alternate" href="/en" hrefLang="en-US" />
            <link rel="alternate" href="/de" hrefLang="de-DE" />
            <meta name="language" content="de" />
            <LinkPreview description={description} title={title} />
            <Favicon />
        </Head>
    );
}
