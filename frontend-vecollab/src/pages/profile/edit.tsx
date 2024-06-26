import WhiteBox from '@/components/Layout/WhiteBox';
import LoadingAnimation from '@/components/LoadingAnimation';
import VerticalTabs from '@/components/profile/VerticalTabs';
import { fetchGET, fetchPOST, useGetOwnProfile } from '@/lib/backend';
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

const defaultPersonalInformation: PersonalInformation = {
    firstName: '',
    lastName: '',
    bio: '',
    expertise: '',
    birthday: '',
    languages: [''],
    institutions: [],
    chosen_institution_id: '',
};
const defaultVeReady = true;
const defaultExcludedFromMatching = false;
const defaultVeInformation: VEInformation = {
    veInterests: [''],
    veContents: [''],
    veGoals: [''],
    experience: [''],
    interdisciplinaryExchange: true,
    preferredFormat: '',
};
const defaultResearchAndTeachingInformation: ResearchAndTeachingInformation = {
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
};
const defaultEducations: Education[] = [
    {
        institution: '',
        degree: '',
        department: '',
        timestamp_from: '',
        timestamp_to: '',
        additional_info: '',
    },
];
const defaultWorkExperience: WorkExperience[] = [
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
];
const defaultVeWindowItems: VEWindowItem[] = [
    {
        plan: {
            _id: '',
            name: '',
        },
        title: '',
        description: '',
    },
];

EditProfile.auth = true;
export default function EditProfile({
    dropdowns,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>(defaultPersonalInformation);
    const [veReady, setVeReady] = useState(defaultVeReady);
    const [excludedFromMatching, setExcludedFromMatching] = useState(defaultExcludedFromMatching);
    const [veInformation, setVeInformation] = useState<VEInformation>(defaultVeInformation);
    const [researchandTeachingInformation, setResearchAndTeachingInformation] =
        useState<ResearchAndTeachingInformation>(defaultResearchAndTeachingInformation);
    const [educations, setEducations] = useState<Education[]>(defaultEducations);
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>(defaultWorkExperience);

    const [veWindowItems, setVeWindowItems] = useState<VEWindowItem[]>(defaultVeWindowItems);

    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const router = useRouter();

    const { data: userInfo, isLoading, error, mutate } = useGetOwnProfile();

    useEffect(() => {
        if (isLoading) return;

        // if user has filled in data that is not saved yet (e.g. on tab change)
        // do not overwrite the values
        if (personalInformation !== defaultPersonalInformation) return;
        if (veReady !== defaultVeReady) return;
        if (excludedFromMatching !== defaultExcludedFromMatching) return;
        if (veInformation !== defaultVeInformation) return;
        if (researchandTeachingInformation !== defaultResearchAndTeachingInformation) return;
        if (educations !== defaultEducations) return;
        if (workExperience !== defaultWorkExperience) return;
        if (veWindowItems !== defaultVeWindowItems) return;

        setPersonalInformation({
            firstName: userInfo.profile.first_name,
            lastName: userInfo.profile.last_name,
            bio: userInfo.profile.bio,
            expertise: userInfo.profile.expertise,
            birthday: userInfo.profile.birthday,
            profilePicId: userInfo.profile.profile_pic,
            languages: userInfo.profile.languages,
            institutions: userInfo.profile.institutions,
            chosen_institution_id: userInfo.profile.chosen_institution_id,
        });
        setVeReady(userInfo.profile.ve_ready);
        setExcludedFromMatching(userInfo.profile.excluded_from_matching);
        setVeInformation({
            veInterests: userInfo.profile.ve_interests,
            veContents: userInfo.profile.ve_contents,
            veGoals: userInfo.profile.ve_goals,
            experience: userInfo.profile.experience,
            interdisciplinaryExchange: userInfo.profile.interdisciplinary_exchange,
            preferredFormat: userInfo.profile.preferred_format,
        });
        setResearchAndTeachingInformation({
            researchTags: userInfo.profile.research_tags,
            courses: userInfo.profile.courses,
            lms: userInfo.profile.lms,
            tools: userInfo.profile.tools,
        });
        setEducations(userInfo.profile.educations);
        setWorkExperience(userInfo.profile.work_experience);
        setVeWindowItems(
            userInfo.profile.ve_window.map((elem: any) => ({
                plan: { _id: elem.plan_id, name: '' },
                title: elem.title,
                description: elem.description,
            }))
        );

    }, [session, isLoading, userInfo, personalInformation, veReady, excludedFromMatching, veInformation, researchandTeachingInformation, educations, workExperience, veWindowItems]);

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
                bio: personalInformation.bio,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languages,
                institutions: personalInformation.institutions,
                chosen_institution_id: personalInformation.chosen_institution_id,
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

        // trigger a re-fetch of the user's profile data to reflect the changes
        mutate();


        // if excludedFromMatching has changed from the previously saved state, 
        // reload the page to reflect the changes to the parent (LayoutSection.tsx)
        if (excludedFromMatching !== userInfo.profile.excluded_from_matching) {
            router.reload();
        }
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
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languages,
                institutions: personalInformation.institutions,
                chosen_institution_id: personalInformation.chosen_institution_id,
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
