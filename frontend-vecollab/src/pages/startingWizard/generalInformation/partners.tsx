import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSection from '@/components/StartingWizard/SideProgressBarSection';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import AsyncCreatableSelect from 'react-select/async-creatable';
import {
    BackendProfileSnippetsResponse,
    BackendSearchResponse,
    BackendUserSnippet,
} from '@/interfaces/api/apiInterfaces';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import { FormalConditionPartner } from '@/pages/startingWizard/generalInformation/formalConditions';

export default function Partners() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formalConditions, setFormalConditions] = useState<FormalConditionPartner[]>([]);
    const [partners, setPartners] = useState<string[]>(['']);
    const [partnerProfileSnippets, setPartnerProfileSnippets] = useState<{
        [Key: string]: BackendUserSnippet;
    }>({});
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [steps, setSteps] = useState<IFineStep[]>([]);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                signIn('keycloak');
            }
        }
    }, [session, status]);

    useEffect(() => {
        // if router or session is not yet ready, don't make an redirect decisions or requests, just wait for the next re-render
        if (!router.isReady || status === 'loading') {
            setLoading(true);
            return;
        }
        // router is loaded, but still no plan ID in the query --> redirect to overview because we can't do anything without an ID
        if (!router.query.plannerId) {
            router.push('/overviewProjects');
            return;
        }
        // to minimize backend load, request the data only if session is valid (the other useEffect will handle session re-initiation)
        if (session) {
            fetchGET(`/planner/get?_id=${router.query.plannerId}`, session?.accessToken).then(
                (data) => {
                    if (data.plan.partners.length !== 0) {
                        setPartners(data.plan.partners);

                        // fetch profile snippets to be able to display the full name instead of username only
                        fetchPOST(
                            '/profile_snippets',
                            { usernames: data.plan.partners },
                            session.accessToken
                        ).then((snippets: BackendProfileSnippetsResponse) => {
                            let partnerSnippets: { [Key: string]: BackendUserSnippet } = {};
                            snippets.user_snippets.forEach((element: BackendUserSnippet) => {
                                partnerSnippets[element.username] = element;
                            });
                            setPartnerProfileSnippets(partnerSnippets);
                            setLoading(false);
                        });
                    } else {
                        setLoading(false);
                    }
                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                    if (data.plan.formalities && Array.isArray(data.plan.formalities)) {
                        setFormalConditions(data.plan.formalities);
                    }
                    setSteps(data.plan.steps);
                }
            );
        }
    }, [session, status, router]);

    const modifyPartner = (index: number, value: string) => {
        let newPartners = [...partners];
        newPartners[index] = value;
        setPartners(newPartners);
    };

    const addInputField = (e: FormEvent) => {
        e.preventDefault();
        setPartners([...partners, '']);
    };

    const removeInputField = (e: FormEvent) => {
        e.preventDefault();
        let copy = [...partners];
        copy.pop();
        setPartners(copy);
    };

    const onSubmit = async () => {
        const updateFormalConditions = partners.map((partner) => {
            const findFormalCondition = formalConditions.find(
                (formalCondition) => formalCondition.username === partner
            );
            if (findFormalCondition) {
                return findFormalCondition;
            } else {
                return {
                    username: partner,
                    time: false,
                    place: false,
                    technicalEquipment: false,
                    institutionalRequirements: false,
                    examinationRegulations: false,
                    dataProtection: false,
                };
            }
        });
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'partners',
                        value: partners,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            partners: ProgressState.completed,
                        },
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'formalities',
                        value: updateFormalConditions,
                    },
                ],
            },
            session?.accessToken
        );

        await router.push({
            pathname: '/startingWizard/generalInformation/externalParties',
            query: { plannerId: router.query.plannerId },
        });
    };

    const loadOptions = (
        inputValue: string,
        callback: (options: { label: string; value: string }[]) => void
    ) => {
        // a little less api queries, only start searching for recommendations from 2 letter inputs
        if (inputValue.length > 1) {
            fetchGET(`/search?users=true&query=${inputValue}`, session?.accessToken).then(
                (data: BackendSearchResponse) => {
                    callback(
                        data.users.map((user) => ({
                            label: user.first_name + ' ' + user.last_name + ' - ' + user.username,
                            value: user.username,
                        }))
                    );
                }
            );
        }
    };

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form
                        onSubmit={onSubmit}
                        className="gap-y-6 w-full p-12 max-w-screen-2xl items-center flex flex-col justify-between"
                    >
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                Wer ist am Projekt beteiligt?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            {partners.map((partner, index) => (
                                <div key={index} className="my-2">
                                    <AsyncCreatableSelect
                                        instanceId={index.toString()}
                                        loadOptions={loadOptions}
                                        onChange={(e) => modifyPartner(index, e!.value)}
                                        value={{
                                            label: partnerProfileSnippets[partner]
                                                ? `${partnerProfileSnippets[partner].first_name} ${partnerProfileSnippets[partner].last_name} - ${partner}`
                                                : `${partner}`,
                                            value: partner,
                                        }}
                                        placeholder={'Suche nach Nutzer:innen...'}
                                        getOptionLabel={(option) => option.label}
                                        formatCreateLabel={(inputValue) => (
                                            <span>
                                                kein Treffer? <b>{inputValue}</b> trotzdem verwenden
                                            </span>
                                        )}
                                    />
                                </div>
                            ))}
                            <div className={'w-3/4 mx-7 mt-3 flex justify-end'}>
                                <button onClick={removeInputField}>
                                    <RxMinus size={20} />
                                </button>
                                <button onClick={addInputField}>
                                    <RxPlus size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-around w-full">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/projectName',
                                        query: { plannerId: router.query.plannerId },
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    >
                                        Zurück
                                    </button>
                                </Link>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={onSubmit}
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSection
                    progressState={sideMenuStepsProgress}
                    handleValidation={() => {}}
                    isValid={true}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
