import Container from "@/components/Layout/container"
import PersonalInformation from "@/components/profile/personal-information"
import ProfileBanner from "@/components/profile/profile-banner"
import ProfileHeader from "@/components/profile/profile-header"
import { GetServerSideProps, GetServerSidePropsContext } from "next/types"
import WhiteBox from "@/components/Layout/WhiteBox"
import VEVitrine from "@/components/profile/VEVitrine"
import ExtendedPersonalInformation from "@/components/profile/ExtendedPersonalInformation"
import BoxHeadline from "@/components/profile/BoxHeadline"
import { BACKEND_URL } from "@/constants"
import { getToken } from "next-auth/jwt"

interface Props {
    name: string,
    institution: string,
    profilePictureUrl: string,
    bio: string,
    department: string,
    birthday: string,
    languages: string[]
}

export default function Profile(props: Props) {
    return (
        <>
            <Container>
                <ProfileBanner followsNum={2500} followersNum={3500} />
                <div className={"mx-20 mb-2 px-5 relative -mt-16 z-10"}>
                    <ProfileHeader name={props.name} institution={props.institution} profilePictureUrl={props.profilePictureUrl} />
                </div>
                <Container>
                    <div className={"mx-20 flex"}>
                        <div className={"w-3/4  mr-4"}>
                            <WhiteBox>
                                <ExtendedPersonalInformation />
                            </WhiteBox>
                            <WhiteBox>
                                <div className={"h-96"}> {/* remove height once content is implemented to avoid unexpected overflow */}
                                    <BoxHeadline title={"Timeline?"} />
                                </div>
                            </WhiteBox>
                        </div>
                        <div className={"w-1/4  ml-4"}>
                            <WhiteBox>
                                <PersonalInformation name={props.name} bio={props.bio} department={props.department} birthday={props.birthday} languages={props.languages} />
                            </WhiteBox>
                            <WhiteBox>
                                <VEVitrine />
                            </WhiteBox>
                        </div>
                    </div>
                </Container>
            </Container>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {

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
                        name: data.profile.first_name + " " + data.profile.last_name,
                        institution: data.profile.institution,
                        profilePictureUrl: "/images/random_user.jpg",
                        bio: data.profile.bio,
                        department: data.profile.expertise,
                        birthday: data.profile.birthday,
                        languages: data.profile.languages
                    }
                }
            }
        }
        catch (e) {
            console.log("network error, probably backend down")
            return {
                props: {
                    name: "Max Mustermann",
                    institution: "Universität Leipzig",
                    profilePictureUrl: "/images/random_user.jpg",
                    bio: "Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.",
                    department: "Informatik",
                    birthday: "01.01.1990",
                    languages: ["Deutsch", "Englisch", "Spanisch", "Französisch", "Italienisch"]
                }
            }
        }
    }

    return {
        props: {
            name: "Max Mustermann",
            institution: "Universität Leipzig",
            profilePictureUrl: "/images/random_user.jpg",
            bio: "Lorem ipsum dolor si ameterto de la consectetur adipiscing elit. Lets make this text slightly longer so the box looks more filled.",
            department: "Informatik",
            birthday: "01.01.1990",
            languages: ["Deutsch", "Englisch", "Spanisch", "Französisch", "Italienisch"]
        }
    }
}