import { fetchImage } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Props {
    imageId?: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
}

AuthenticatedImage.auth = true;
export default function AuthenticatedImage({ imageId, alt, width, height, className }: Props) {
    const { data: session, status } = useSession();
    const [image, setImage] = useState('');

    useEffect(() => {
        if (status === 'loading' || !session) return;
        (async () => {
            if (imageId) {
                //Get if url already exists in local storage
                let cached = window.localStorage.getItem(imageId);
                if (cached) {
                    setImage(cached);
                } else {
                    //If not, get it from API
                    const response = await fetchImage(`/uploads/${imageId}`, session?.accessToken);

                    // read the blob and create a data url from it that is readable by the Image component
                    const reader = new FileReader();
                    reader.readAsDataURL(response);
                    reader.onerror = function () {};
                    reader.onloadend = function () {
                        setImage(reader.result as string);
                        window.localStorage.setItem(imageId, reader.result as string);
                    };
                }
            }
        })();
    }, [session, status, imageId]);

    return (
        <>
            {image !== '' ? (
                <Image src={image} alt={alt} width={width} height={height} className={className} />
            ) : (
                imageId && <div className={className} style={{ height, width }}></div>
            )}
        </>
    );
}
