import { GetServerSidePropsContext } from "next"
import { getToken } from "next-auth/jwt"
import { signIn, useSession } from "next-auth/react"
import { BACKEND_URL } from "@/constants"
import { useEffect, useState } from "react"

interface Props {
    accessToken: string | null,
    profileData: Record<string, string> | null
}

export default function AuthComponentTest(props: Props) {
    const { data: session } = useSession()

    const [profileData, setProfileData] = useState({})


    useEffect(() => {
        if (session?.error === "RefreshAccessTokenError") {
            console.log("forced new signIn")
            signIn("keycloak"); // Force sign in to hopefully resolve error
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            const headers = {
                "Authorization": "Bearer " + session.accessToken
            }
            try {
                fetch(BACKEND_URL + "/profileinformation", {
                    headers: headers
                })
                .then(res => res.json())
                .then(data => {
                    console.log(data)
                    if (data.status) {
                        if (data.status !== 200) {
                            //error case
                            console.log(data)
                        }
                    }
                    else {
                        setProfileData(data)
                    }
                })
                .catch(rejected => {
                    console.log(rejected)
                    console.log("probably backend down")
                })
            }
            catch (e) {
                console.log("network error, probably backend down")
            }
        }
        else {
            console.log("No session")
        }
    }, [session])

    if (session) {
        return (
            <>
                Signed in as {session.user?.name} <br />
                Access token is: {session.accessToken} <br />
                Backend profile data is: {JSON.stringify(profileData)} <br />
            </>
        )
    }
    return (
        <>
            Not signed in <br />
            Access token is: {JSON.stringify(null)} <br /> {/* should be null, json.stringify only to really print "null", it is just a String*/}
            Backend profile data is: {JSON.stringify(null)} <br /> {/* should be null as well*/}
        </>
    )
}