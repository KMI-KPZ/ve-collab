import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Waiting() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!router.isReady || status === 'loading') {
            return;
        }
        if (!session) {
            signIn('keycloak', undefined, {
                kc_idp_hint: 'orcid',
            });
        }
        else {
            router.push("/editProfile")
        }
    });

    return <div>waiting</div>;
}
