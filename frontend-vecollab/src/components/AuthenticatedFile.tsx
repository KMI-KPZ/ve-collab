import { useSession } from 'next-auth/react';
import { createRef } from 'react';

interface Props {
    url: string;
    filename: string;
    title?: string;
    children: JSX.Element | JSX.Element[];
    className?: string;
}

export function AuthenticatedFile({ url, filename, title, children, className }: Props) {
    const { data: session, status } = useSession();
    const link = createRef<HTMLAnchorElement>();

    const handleAction = async () => {
        if (link.current!.href) {
            return;
        }

        // fetch the file from the backend with the necessary authorization header
        const result = await fetch(process.env.NEXT_PUBLIC_BACKEND_BASE_URL + url, {
            headers: { Authorization: 'Bearer ' + session!.accessToken },
        });

        // create a blob from the result and let the same anchor element download it
        // by simulating a click on it
        const blob = await result.blob();
        const href = window.URL.createObjectURL(blob);
        link.current!.download = filename;
        link.current!.href = href;
        link.current!.click();
    };

    return (
        <>
            <a role="button" ref={link} title={title} onClick={handleAction} className={className}>
                {children}
            </a>
        </>
    );
}
