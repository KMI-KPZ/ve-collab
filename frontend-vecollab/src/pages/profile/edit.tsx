import WhiteBox from '@/components/Layout/WhiteBox';
import LoadingAnimation from '@/components/LoadingAnimation';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import EditVEInfo from '@/components/profile/EditVEInfo';
import EditPersonalInformation from '@/components/profile/EditPersonalInformation';
import EditResearchAndTeachingInformation from '@/components/profile/EditResearchAndTeachingInformation';
import EditEducationInformation from '@/components/profile/EditEducationInformation';
import EditWorkExperienceInformation from '@/components/profile/EditWorkExperienceInformation';
import {
    Education,
    PersonalInformation,
    ResearchAndTeachingInformation,
    VEInformation,
    VEWindowItem,
    WorkExperience,
} from '@/interfaces/profile/profileInterfaces';
import EditVisibilitySettings from '@/components/profile/EditVisibilitySettings';
import EditProfileVeWindow from '@/components/profile/EditProfileVeWindow';
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { DropdownList } from '@/interfaces/dropdowns';
import Alert from '@/components/Alert';

EditProfile.auth = true;
export default function EditProfile({
    dropdowns,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>({
        firstName: '',
        lastName: '',
        institution: '',
        bio: '',
        expertise: '',
        birthday: '',
        profilePicId: '',
        languages: [''],
    });
    const [veReady, setVeReady] = useState(true);
    const [excludedFromMatching, setExcludedFromMatching] = useState(false);
    const [veInformation, setVeInformation] = useState<VEInformation>({
        veInterests: [''],
        veContents: [''],
        veGoals: [''],
        experience: [''],
        interdisciplinaryExchange: true,
        preferredFormat: '',
    });
    const [researchandTeachingInformation, setResearchAndTeachingInformation] =
        useState<ResearchAndTeachingInformation>({
            researchTags: [''],
            courses: [
                {
                    title: '',
                    academic_courses: '',
                    semester: '',
                },
            ],
            lms: [''],
            tools: [''],
        });
    const [educations, setEducations] = useState<Education[]>([
        {
            institution: '',
            degree: '',
            department: '',
            timestamp_from: '',
            timestamp_to: '',
            additional_info: '',
        },
    ]);
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([
        {
            position: '',
            institution: '',
            department: '',
            timestamp_from: '',
            timestamp_to: '',
            city: '',
            country: '',
            additional_info: '',
        },
    ]);

    const [veWindowItems, setVeWindowItems] = useState<VEWindowItem[]>([
        {
            plan: {
                _id: '',
                name: '',
            },
            title: '',
            description: '',
        },
    ]);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchGET(`/profileinformation`, session?.accessToken).then((data) => {
            setLoading(false);
            if (data) {
                setPersonalInformation({
                    firstName: data.profile.first_name,
                    lastName: data.profile.last_name,
                    institution: data.profile.institution,
                    bio: data.profile.bio,
                    expertise: data.profile.expertise,
                    birthday: data.profile.birthday,
                    profilePicId: data.profile.profile_pic,
                    languages: data.profile.languages,
                });
                setVeReady(data.profile.ve_ready);
                setExcludedFromMatching(data.profile.excluded_from_matching);
                setVeInformation({
                    veInterests: data.profile.ve_interests,
                    veContents: data.profile.ve_contents,
                    veGoals: data.profile.ve_goals,
                    experience: data.profile.experience,
                    interdisciplinaryExchange: data.profile.interdisciplinary_exchange,
                    preferredFormat: data.profile.preferred_format,
                });
                setResearchAndTeachingInformation({
                    researchTags: data.profile.research_tags,
                    courses: data.profile.courses,
                    lms: data.profile.lms,
                    tools: data.profile.tools,
                });
                setEducations(data.profile.educations);
                setWorkExperience(data.profile.work_experience);
                setVeWindowItems(
                    data.profile.ve_window.map((elem: any) => ({
                        plan: { _id: elem.plan_id, name: '' },
                        title: elem.title,
                        description: elem.description,
                    }))
                );
            }
        });
    }, [session]);

    /*
    sync the currently entered form data with the backend
    */
    const updateProfileData = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchPOST(
            '/profileinformation',
            {
                first_name: personalInformation.firstName,
                last_name: personalInformation.lastName,
                institution: personalInformation.institution,
                bio: personalInformation.bio,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languages,
                ve_ready: veReady,
                ve_interests: veInformation.veInterests,
                ve_contents: veInformation.veContents,
                ve_goals: veInformation.veGoals,
                experience: veInformation.experience,
                interdisciplinary_exchange: veInformation.interdisciplinaryExchange,
                preferred_format: veInformation.preferredFormat,
                research_tags: researchandTeachingInformation.researchTags,
                courses: researchandTeachingInformation.courses,
                lms: researchandTeachingInformation.lms,
                tools: researchandTeachingInformation.tools,
                educations: educations,
                work_experience: workExperience,
                ve_window: veWindowItems.map((elem) => ({
                    plan_id: elem.plan._id,
                    title: elem.title,
                    description: elem.description,
                })),
                excluded_from_matching: excludedFromMatching,
            },
            session?.accessToken
        );
        setSuccessPopupOpen(true);

        // perform a reload to propagate the possible change of excluded_from_matching
        // to the parent (LayoutSection.tsx)
        router.reload();
    };

    /*
    import profile data from the users public ORCiD record.
    This requires the user to have linked his ORCiD account,
    which will result in the orcid being a part of the user's
    access token. The backend ensures that.
    */
    const importOrcidProfile = async (evt: FormEvent) => {
        evt.preventDefault();

        await fetchGET('/orcid', session?.accessToken).then((data) => {
            let profile = data.suggested_profile;
            console.log(profile);
            setPersonalInformation({
                firstName: profile.first_name,
                lastName: profile.last_name,
                bio: profile.bio,
                institution: profile.institution,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languages,
            });
            setResearchAndTeachingInformation({
                researchTags: profile.research_tags,
                courses: researchandTeachingInformation.courses,
                lms: researchandTeachingInformation.lms,
                tools: researchandTeachingInformation.tools,
            });
            setEducations(profile.educations);
            setWorkExperience(profile.work_experience);
        });
    };

    return (
        <>
            <div className={'flex justify-center'}>
                <WhiteBox>
                    <div className={'w-[60rem]'}>
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <VerticalTabs>
                                <div tabname="Stammdaten">
                                    <EditPersonalInformation
                                        personalInformation={personalInformation}
                                        setPersonalInformation={setPersonalInformation}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        dropdowns={dropdowns}
                                    />
                                </div>
                                <div tabname="VE-Info">
                                    <EditVEInfo
                                        veInformation={veInformation}
                                        setVeInformation={setVeInformation}
                                        veReady={veReady}
                                        setVeReady={setVeReady}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        dropdowns={dropdowns}
                                    />
                                </div>
                                <div tabname="Lehre & Forschung">
                                    <EditResearchAndTeachingInformation
                                        researchAndTeachingInformation={
                                            researchandTeachingInformation
                                        }
                                        setResearchAndTeachingInformation={
                                            setResearchAndTeachingInformation
                                        }
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabname="Ausbildung">
                                    <EditEducationInformation
                                        educations={educations}
                                        setEducations={setEducations}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabname="Berufserfahrung">
                                    <EditWorkExperienceInformation
                                        workExperience={workExperience}
                                        setWorkExperience={setWorkExperience}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabname="VE-Schaufenster">
                                    <EditProfileVeWindow
                                        items={veWindowItems}
                                        setItems={setVeWindowItems}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabname="Sichtbarkeiten">
                                    <EditVisibilitySettings
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        excludedFromMatching={excludedFromMatching}
                                        setExcludedFromMatching={setExcludedFromMatching}
                                    />
                                </div>
                            </VerticalTabs>
                        )}
                    </div>
                </WhiteBox>
                {successPopupOpen && <Alert message='Gespeichert' autoclose={2000} onClose={() => setSuccessPopupOpen(false)} />}
            </div>
        </>
    );
}

export const getServerSideProps = (async () => {
    // prepare select dropdown options
    const optionLists = {
        veInterests: [
            'Best Practice-Beispiele',
            'Evaluation',
            'Fachspezifische Umsetzungsmöglichkeiten',
            'Forschung',
            'Fördermöglichkeiten',
            'Implementierung',
            'Methoden und Aufgabenformate',
            'Netzwerke',
            'Theoretische Grundlagen und Ansätze',
            '(digitale) Tools',
        ],
        veGoals: [
            'Förderung globalen Lernens',
            'Förderung kommunikativer Kompetenzen',
            'Förderung fachlicher Kompetenzen',
            'Förderung (fremd)sprachlicher Kompetenzen',
            'Interdisziplinärer Austausch',
            'Internationale Zusammenarbeit',
        ],
        preferredFormat: ['synchron', 'asynchron', 'synchron und asynchron'],
        expertise: [
            'Agrar- und Forstwissenschaft',
            'Allgemeine Naturwissenschaft',
            'Amerikanistik',
            'Anglistik',
            'Archäologie',
            'Architektur, Bauingenieur- und Vermessungswesen',
            'Außereuropäische Sprachen und Literaturen',
            'Bildungswissenschaften',
            'Biologie',
            'Biotechnologie',
            'Buch- und Bibliothekswesen',
            'Chemie',
            'Deutsch als Fremd- und Zweitsprache',
            'Elektrotechnik, Elektronik, Nachrichtentechnik',
            'Energietechnik',
            'Ernährungs- und Haushaltswissenschaft',
            'Ethnologie',
            'Fachdidaktik Englisch',
            'Fachdidaktik romanische Sprachen',
            'Gartenbau',
            'Geographie',
            'Geowissenschaften',
            'Germanistik',
            'Geschichte',
            'Gesundheitswissenschaften',
            'Indogermanistik',
            'Ingenieurwissenschaften',
            'Informatik',
            'Informationswissenschaft',
            'Klassische Philologie, Mittellateinische und Neugriechische Philologie',
            'Kommunikationsdesign',
            'Kulturwissenschaften',
            'Kunstwissenschaften und Kunstgeschichte',
            'Literaturwissenschaft',
            'Maschinenbau',
            'Mathematik',
            'Medien- und Kommunikationswissenschaften',
            'Medizin',
            'Militärwissenschaft',
            'Museologie',
            'Musikwissenschaft',
            'Natur- und Umweltschutz',
            'Niederlandistik',
            'Pädagogik',
            'Pharmazie',
            'Philosophie',
            'Physik',
            'Politologie',
            'Psychologie',
            'Rechtswissenschaft',
            'Romanistik',
            'Skandinavistik',
            'Slavistik',
            'Soziologie, empirische Sozialforschung, soziale Arbeit',
            'Sportwissenschaft',
            'Sprachwissenschaft',
            'Sprechwissenschaft',
            'Technik',
            'Theologie und Religionswissenschaften',
            'Übersetzen und Dolmetschen (Translationswissenschaft)',
            'Werkstoffwissenschaften und Fertigungstechnik',
            'Wirtschaftsingenieurwesen',
            'Wirtschaftswissenschaften (BWL und VWL)',
        ],
    };

    // generate value/label options to directly pass them to the react-select components
    const dropdowns = {
        veInterests: optionLists.veInterests.map((elem) => ({
            value: elem,
            label: elem,
        })),
        veGoals: optionLists.veGoals.map((elem) => ({
            value: elem,
            label: elem,
        })),
        preferredFormat: optionLists.preferredFormat.map((elem) => ({
            value: elem,
            label: elem,
        })),
        expertise: optionLists.expertise.map((elem) => ({
            value: elem,
            label: elem,
        })),
    };

    return { props: { dropdowns } };
}) satisfies GetServerSideProps<{ dropdowns: DropdownList }>;
