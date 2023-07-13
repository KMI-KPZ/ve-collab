import { fetchImage } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Props {
    imageId: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
}

export default function AuthenticatedImage({ imageId, alt, width, height, className }: Props) {
    const { data: session, status } = useSession();
    const [image, setImage] = useState('');

    useEffect(() => {
        (async () => {
            if (imageId) {
                //Get if url already exists in local storage
                let cached = window.localStorage.getItem(imageId);
                if (cached) {
                    setImage(cached);
                    //If not, get it from API
                } else {
                    // if session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
                    if (status === 'loading') {
                        return;
                    }

                    // fetch it
                    const response = await fetchImage(`/uploads/${imageId}`, session?.accessToken);

                    // read the blob and create a data url from it that is readable by the Image component
                    const reader = new FileReader();
                    reader.readAsDataURL(response);
                    reader.onloadend = function () {
                        setImage(reader.result as string);
                        window.localStorage.setItem(imageId, reader.result as string);
                    };
                }
            }
        })();
    }, [status, session, imageId]);

    return (
        <>
            {image !== '' ? (
                <Image src={image} alt={alt} width={width} height={height} className={className} />
            ) : (
                <></>
            )}
        </>
    );
}
