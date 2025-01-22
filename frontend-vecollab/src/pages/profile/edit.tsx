import WhiteBox from '@/components/common/WhiteBox';
import LoadingAnimation from '@/components/common/LoadingAnimation';
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
    NotificationSettings,
    OptionLists,
    PersonalInformation,
    ResearchAndTeachingInformation,
    VEInformation,
    VEWindowItem,
    WorkExperience,
} from '@/interfaces/profile/profileInterfaces';
import EditSettings from '@/components/profile/EditSettings';
import EditProfileVeWindow from '@/components/profile/EditProfileVeWindow';
import Alert from '@/components/common/dialogs/Alert';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import CustomHead from '@/components/metaData/CustomHead';
import { languageKeys } from '@/data/languages';

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

const defaultNotificationSettings: NotificationSettings = {
    messages: 'email',
    ve_invite: 'email',
    group_invite: 'email',
    system: 'email',
};

interface Props {
    optionLists: OptionLists;
}

EditProfile.auth = true;
EditProfile.autoForward = true;
export default function EditProfile({ optionLists }: Props): JSX.Element {
    const { t } = useTranslation(['community', 'common']);

    const [personalInformation, setPersonalInformation] = useState<PersonalInformation>(
        defaultPersonalInformation
    );
    const [veReady, setVeReady] = useState(defaultVeReady);
    const [excludedFromMatching, setExcludedFromMatching] = useState(defaultExcludedFromMatching);
    const [veInformation, setVeInformation] = useState<VEInformation>(defaultVeInformation);
    const [researchandTeachingInformation, setResearchAndTeachingInformation] =
        useState<ResearchAndTeachingInformation>(defaultResearchAndTeachingInformation);
    const [educations, setEducations] = useState<Education[]>(defaultEducations);
    const [workExperience, setWorkExperience] = useState<WorkExperience[]>(defaultWorkExperience);

    const [veWindowItems, setVeWindowItems] = useState<VEWindowItem[]>(defaultVeWindowItems);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
        defaultNotificationSettings
    );

    const { data: session } = useSession();
    const [loading] = useState(false);
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const router = useRouter();

    const { data: userInfo, isLoading, mutate } = useGetOwnProfile(session!.accessToken);

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
        if (notificationSettings !== defaultNotificationSettings) return;

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
            achievements: userInfo.profile.achievements,
            chosen_achievement: userInfo.profile.chosen_achievement,
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
        setNotificationSettings({
            messages: userInfo.profile.notification_settings.messages,
            ve_invite: userInfo.profile.notification_settings.ve_invite,
            group_invite: userInfo.profile.notification_settings.group_invite,
            system: userInfo.profile.notification_settings.system,
        });
    }, [
        session,
        isLoading,
        userInfo,
        personalInformation,
        veReady,
        excludedFromMatching,
        veInformation,
        researchandTeachingInformation,
        educations,
        workExperience,
        veWindowItems,
        notificationSettings,
    ]);

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
                notification_settings: notificationSettings,
                chosen_achievement: personalInformation.chosen_achievement,
            },
            session?.accessToken
        );
        setSuccessPopupOpen(true);

        // trigger a re-fetch of the user's profile data to reflect the changes
        await mutate();

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
            setPersonalInformation({
                firstName: profile.first_name,
                lastName: profile.last_name,
                bio: profile.bio,
                expertise: personalInformation.expertise,
                birthday: personalInformation.birthday,
                languages: personalInformation.languages,
                institutions: personalInformation.institutions,
                chosen_institution_id: personalInformation.chosen_institution_id,
                achievements: personalInformation.achievements,
                chosen_achievement: personalInformation.chosen_achievement,
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
            <CustomHead pageTitle={t('common:edit_profile_title')} pageSlug={'profile/edit'} />
            <div className={'flex justify-center'}>
                <WhiteBox>
                    <div className={'w-[60rem]'}>
                        {loading ? (
                            <LoadingAnimation />
                        ) : (
                            <VerticalTabs>
                                <div tabid="Stammdaten" tabname={t('general')}>
                                    <EditPersonalInformation
                                        personalInformation={personalInformation}
                                        setPersonalInformation={setPersonalInformation}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        optionLists={optionLists}
                                    />
                                </div>
                                <div tabid="VE-Info" tabname={t('ve_info')}>
                                    <EditVEInfo
                                        veInformation={veInformation}
                                        setVeInformation={setVeInformation}
                                        veReady={veReady}
                                        setVeReady={setVeReady}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        optionLists={optionLists}
                                    />
                                </div>
                                <div tabid="Lehre & Forschung" tabname={t('research_and_teaching')}>
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
                                <div tabid="Ausbildung" tabname={t('education')}>
                                    <EditEducationInformation
                                        educations={educations}
                                        setEducations={setEducations}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabid="Berufserfahrung" tabname={t('work_experience')}>
                                    <EditWorkExperienceInformation
                                        workExperience={workExperience}
                                        setWorkExperience={setWorkExperience}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabid="VE-Schaufenster" tabname={t('ve_window')}>
                                    <EditProfileVeWindow
                                        items={veWindowItems}
                                        setItems={setVeWindowItems}
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                    />
                                </div>
                                <div tabid="Einstellungen" tabname={t('settings')}>
                                    <EditSettings
                                        updateProfileData={updateProfileData}
                                        orcid={session?.user.orcid}
                                        importOrcidProfile={importOrcidProfile}
                                        excludedFromMatching={excludedFromMatching}
                                        setExcludedFromMatching={setExcludedFromMatching}
                                        notificationSettings={notificationSettings}
                                        setNotificationSettings={setNotificationSettings}
                                    />
                                </div>
                            </VerticalTabs>
                        )}
                    </div>
                </WhiteBox>
                {successPopupOpen && (
                    <Alert
                        type='success'
                        message={t('saved')}
                        autoclose={2000}
                        onClose={() => setSuccessPopupOpen(false)}
                    />
                )}
            </div>
        </>
    );
}

export const expertiseKeys = [
    'Agricultural and Forestry Sciences',
    'General Natural Sciences',
    'American Studies',
    'English Studies',
    'Archaeology',
    'Architecture, Civil Engineering and Surveying',
    'Non-European Languages and Literatures',
    'Educational Sciences',
    'Biology',
    'Biotechnology',
    'Book and Library Science',
    'Chemistry',
    'German as a Foreign and Second Language',
    'Electrical Engineering, Electronics, Communications Engineering',
    'Energy Engineering',
    'Nutritional and Household Sciences',
    'Ethnology',
    'Subject-specific English Didactics',
    'Subject-specific Romance Languages Didactics',
    'Horticulture',
    'Geography',
    'Earth Sciences',
    'German Studies',
    'History',
    'Health Sciences',
    'Indo-Germanic Studies',
    'Engineering',
    'Computer Science',
    'Information Science',
    'Classical Philology, Medieval Latin and Modern Greek Philology',
    'Communication Design',
    'Cultural Studies',
    'Art History and Art History',
    'Literary Studies',
    'Mechanical Engineering',
    'Mathematics',
    'Media and Communication Sciences',
    'Medicine',
    'Military Science',
    'Museology',
    'Musicology',
    'Nature and Environmental Protection',
    'Dutch Studies',
    'Pedagogy',
    'Pharmacy',
    'Philosophy',
    'Physics',
    'Political Science',
    'Psychology',
    'Law',
    'Romance Studies',
    'Scandinavian Studies',
    'Slavic Studies',
    'Sociology, Empirical Social Research, Social Work',
    'Sports Science',
    'Linguistics',
    'Speech Science',
    'Technology',
    'Theology and Religious Studies',
    'Translation and Interpreting (Translation Studies)',
    'Materials Science and Manufacturing Engineering',
    'Industrial Engineering',
    'Economics (Business Administration and Economics)',
];

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    // prepare select dropdown options
    const optionLists = {
        veInterestsKeys: [
            'Good Practice Examples',
            'Evaluation',
            'Subject-specific Implementation Options',
            'Research',
            'Funding Opportunities',
            'Implementation',
            'Methods and Task Formats',
            'Networks',
            'Theoretical Foundations and Approaches',
            '(Digital) Tools',
        ],
        veGoalsKeys: [
            'Promotion of Global Learning',
            'Promotion of Communicative Competences',
            'Promotion of Subject-specific Competences',
            'Promotion of (Foreign) Language Competences',
            'Interdisciplinary Exchange',
            'International Cooperation',
        ],
        preferredFormatKeys: ['synchronous', 'asynchronous', 'synchronous and asynchronous'],
        expertiseKeys,
        languageKeys: languageKeys,
    };

    return {
        props: {
            optionLists,
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
