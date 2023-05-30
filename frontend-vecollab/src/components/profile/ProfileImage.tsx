import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { fetchGET, fetchImage } from '@/lib/backend';
export default function ProfileImage({ profilePicId }: { profilePicId: string | undefined }) {
    const { data: session, status } = useSession();
    const [image, setImage] = useState('');

    useEffect(() => {
        (async () => {
            if (profilePicId) {
                //Get if url already exists in local storage
                let cached = window.localStorage.getItem(profilePicId);
                if (cached) {
                    setImage(cached);
                    //If not, get it from API
                } else {
                    // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
                    if (status === 'loading') {
                        return;
                    }
                    const response = await fetchImage(
                        `/uploads/${profilePicId}`,
                        session?.accessToken
                    );
                    
                    // read the blob and create a data url from it that is readable by the Image component
                    const reader = new FileReader();
                    reader.readAsDataURL(response);
                    reader.onloadend = function () {
                        setImage(reader.result as string);
                        window.localStorage.setItem(profilePicId, reader.result as string);
                    };
                }
            }
        })();
    }, [status, session, profilePicId]);

    return <>{image ? <Image src={image} alt="profile" width={180} height={180} /> : <></>}</>;
}
