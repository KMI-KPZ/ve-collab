const LinkPreview = (): JSX.Element => {
    return (
        <>
            <meta property="og:url" content="https://skm.sc.uni-leipzig.de:3001/" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content="Ve Collab" />
            <meta
                property="og:description"
                content="kollaboratives Assistenzsystem für Virtuelle Austausche"
            />
            <meta
                property="og:image"
                content={
                    'https://skm.sc.uni-leipzig.de:3001/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FveCollabLogo.4aff0faa.png&w=384&q=75'
                }
            />
            <meta name="twitter:card" content="summary" />
        </>
    );
};

export default LinkPreview;
