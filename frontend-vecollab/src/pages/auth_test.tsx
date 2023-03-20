import { GetServerSidePropsContext } from "next"
import { getToken } from "next-auth/jwt"
import { useSession } from "next-auth/react"
import { BACKEND_URL } from "@/constants"

interface Props {
    accessToken: string | null,
    profileData: Record<string, string> | null
}

export default function AuthComponentTest(props: Props) {
    const { data: session } = useSession()

    if (session) {
        return (
            <>
                Signed in as {session.user?.name} <br />
                Access token is: {props.accessToken} <br />
                Backend profile data is: {JSON.stringify(props.profileData)} <br />
            </>
        )
    }
    return (
        <>
            Not signed in <br />
            Access token is: {JSON.stringify(props.accessToken)} <br /> {/* should be null, json.stringify only to really print "null", it is just a String*/}
            Backend profile data is: {JSON.stringify(props.profileData)} <br /> {/* should be null as well*/}
        </>
    )
}


export async function getServerSideProps(context: GetServerSidePropsContext) {
    // if token exists --> user is signed in and valid session
    // if token is null --> no valid session
    // can use the token right here to perform API calls,
    // if no client-side api calls are made to the backend or they are proxied through nextjs api, we wouldnt need
    // to pass the token to the component (i.e. expose it to the client)
    // --> would be more secure
    // obv. this page is for testing and seeing the actual token, so we also pass it into the props
    const token = await getToken({ req: context.req })

    if (token) {
        const headers = {
            "Authorization": "Bearer " + token.accessToken
        }

        let backendResponse = null;
        let data = null;
        try {
            backendResponse = await fetch(BACKEND_URL + "/profileinformation", {
                headers: headers
            })
            data = await backendResponse.json()
            if (backendResponse.status === 200) {
                return {
                    props: {
                        accessToken: token.accessToken,
                        profileData: data
                    }
                }
            }
        }
        catch (e) {
            console.log("network error, probably backend down")
            return {
                props: {
                    accessToken: token.accessToken,
                    profileData: "backend unreacheable"
                }
            }
        }
    }

    return {
        props: {
            accessToken: null,
            profileData: null
        }
    }
}