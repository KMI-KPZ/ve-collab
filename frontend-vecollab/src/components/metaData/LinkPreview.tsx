interface Props {
    description: string;
    title: string;
}

const LinkPreview = ({ description, title }: Props): JSX.Element => {
    return (
        <>
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
        </>
    );
};

export default LinkPreview;
