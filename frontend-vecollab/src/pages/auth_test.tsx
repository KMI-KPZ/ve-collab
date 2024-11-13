import { GetStaticPropsContext } from 'next';
import { useSession } from 'next-auth/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';

interface Props {
    accessToken: string | null;
    profileData: Record<string, string> | null;
}

AuthComponentTest.auth = true;
export default function AuthComponentTest(props: Props) {
    const { data: session } = useSession();

    const [profileData, setProfileData] = useState({});

    useEffect(() => {
        if (session) {
            const headers = {
                Authorization: 'Bearer ' + session.accessToken,
            };
            try {
                fetch(process.env.NEXT_PUBLIC_BACKEND_BASE_URL + '/profileinformation', {
                    headers: headers,
                })
                    .then((res) => res.json())
                    .then((data) => {
                        console.log(data);
                        if (data.status) {
                            if (data.status !== 200) {
                                //error case
                                console.log(data);
                            }
                        } else {
                            setProfileData(data);
                        }
                    })
                    .catch((rejected) => {
                        console.log(rejected);
                        console.log('probably backend down');
                    });
            } catch (e) {
                console.log('network error, probably backend down');
            }
        } else {
            console.log('No session');
        }
    }, [session]);

    if (session) {
        return (
            <>
                Signed in as {session.user?.name} <br />
                Access token is: {session.accessToken} <br />
                Backend profile data is: {JSON.stringify(profileData)} <br />
            </>
        );
    }
    return (
        <>
            Not signed in <br />
            Access token is: {JSON.stringify(null)} <br />{' '}
            {/* should be null, json.stringify only to really print "null", it is just a String*/}
            Backend profile data is: {JSON.stringify(null)} <br /> {/* should be null as well*/}
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
}
