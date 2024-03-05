import HeadProgressBarSection from '@/components/StartingWizard/HeadProgressBarSection';
import SideProgressBarSectionBroadPlanner from '@/components/StartingWizard/SideProgressBarSectionBroadPlanner';
import { fetchGET, fetchPOST } from '@/lib/backend';
import { signIn, useSession } from 'next-auth/react';
import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingAnimation from '@/components/LoadingAnimation';
import {
    initialSideProgressBarStates,
    ISideProgressBarStates,
    ProgressState,
} from '@/interfaces/startingWizard/sideProgressBar';
import { sideMenuStepsData } from '@/data/sideMenuSteps';
import { IFineStep } from '@/pages/startingWizard/fineplanner/[stepSlug]';
import WhiteBox from '@/components/Layout/WhiteBox';
import Select from 'react-select';
import { SingleValue, ActionMeta } from 'react-select';
import Link from 'next/link';
import { RxMinus, RxPlus } from 'react-icons/rx';
import { set } from 'date-fns';

interface PhysicalMobility {
    location: string;
    timestamp_from: string;
    timestamp_to: string;
}

export default function Realization() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [sideMenuStepsProgress, setSideMenuStepsProgress] = useState<ISideProgressBarStates>(
        initialSideProgressBarStates
    );
    const [courseFormat, setCourseFormat] = useState<string>();
    const [physicalMobilityChosen, setPhysicalMobilityChosen] = useState<boolean>(false);
    const [physicalMobilities, setPhysicalMobilities] = useState<PhysicalMobility[]>([
        { location: '', timestamp_from: '', timestamp_to: '' },
    ]);
    const [steps, setSteps] = useState<IFineStep[]>([]);

    // check for session errors and trigger the login flow if necessary
    useEffect(() => {
        if (status !== 'loading') {
            if (!session || session?.error === 'RefreshAccessTokenError') {
                console.log('forced new signIn');
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
                    setLoading(false);
                    console.log(data.plan);
                    if (data.plan.realization !== null) {
                        setCourseFormat(data.plan.realization);
                        setPhysicalMobilityChosen(data.plan.physical_mobility);
                        // date inputs only accept yyyy-mm-dd, so gotta cut the time part off
                        setPhysicalMobilities(
                            data.plan.physical_mobilities.map((mobility: PhysicalMobility) => {
                                if (
                                    mobility.timestamp_from !== null &&
                                    mobility.timestamp_from !== '' &&
                                    mobility.timestamp_to !== null &&
                                    mobility.timestamp_to !== ''
                                ) {
                                    return {
                                        location: mobility.location,
                                        timestamp_from: mobility.timestamp_from.split('T')[0],
                                        timestamp_to: mobility.timestamp_to.split('T')[0],
                                    };
                                } else {
                                    return mobility;
                                }
                            })
                        );
                    }
                    if (data.plan.physical_mobility !== null) {
                        setPhysicalMobilityChosen(data.plan.physical_mobility);
                    }

                    setSteps(data.plan.steps);

                    if (data.plan.progress.length !== 0) {
                        setSideMenuStepsProgress(data.plan.progress);
                    }
                }
            );
        }
    }, [session, status, router]);

    /*
    const validateDateRange = (fromValue: string) => {
        const fromDate = new Date(fromValue);
        const toDate = new Date(watch(`physicalMobilityQuestion.physicalMobilityTimeTo`));
        if (fromDate > toDate) {
            return 'Das Startdatum muss vor dem Enddatum liegen';
        } else {
            return true;
        }
    };
    */

    const onSubmit = async () => {
        await fetchPOST(
            '/planner/update_fields',
            {
                update: [
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'realization',
                        value: courseFormat ? courseFormat : null,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'physical_mobility',
                        value: physicalMobilityChosen,
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'physical_mobilities',
                        value: physicalMobilityChosen
                            ? physicalMobilities
                            : [{ location: '', timestamp_from: '', timestamp_to: '' }],
                    },
                    {
                        plan_id: router.query.plannerId,
                        field_name: 'progress',
                        value: {
                            ...sideMenuStepsProgress,
                            realization: ProgressState.completed,
                        },
                    },
                ],
            },
            session?.accessToken
        );

        await router.push({
            pathname: '/startingWizard/generalInformation/learningPlatform',
            query: { plannerId: router.query.plannerId },
        });
    };

    function handleChange(
        newValue: SingleValue<{ value: string; label: string }>,
        actionMeta: ActionMeta<{ value: string; label: string }>
    ): void {
        setCourseFormat(newValue!.value);
    }

    function addPhysicalMobilityField(event: FormEvent): void {
        event.preventDefault();
        setPhysicalMobilities([
            ...physicalMobilities,
            { location: '', timestamp_from: '', timestamp_to: '' },
        ]);
    }

    function removePhysicalMobilityField(event: FormEvent): void {
        event.preventDefault();
        let copy = [...physicalMobilities];
        copy.pop();
        setPhysicalMobilities(copy);
    }

    function modifyPhysicalMobilityLocation(index: number, value: string): void {
        let copy = [...physicalMobilities];
        copy[index].location = value;
        setPhysicalMobilities(copy);
    }

    function modifyPhysicalMobilityTimestampFrom(index: number, value: string): void {
        let copy = [...physicalMobilities];
        copy[index].timestamp_from = value;
        setPhysicalMobilities(copy);
    }

    function modifyPhysicalMobilityTimestampTo(index: number, value: string): void {
        let copy = [...physicalMobilities];
        copy[index].timestamp_to = value;
        setPhysicalMobilities(copy);
    }

    return (
        <>
            <HeadProgressBarSection stage={0} linkFineStep={steps[0]?.name} />
            <div className="flex justify-between bg-pattern-left-blue-small bg-no-repeat">
                {loading ? (
                    <LoadingAnimation />
                ) : (
                    <form className="flex flex-col w-full p-12 max-w-screen-2xl items-center justify-start">
                        <div>
                            <div className={'text-center font-bold text-4xl mb-2'}>
                                In welchem Format / welchen Formaten wird der VE umgesetzt?
                            </div>
                            <div className={'text-center mb-20'}>optional</div>
                            <div className="mx-7 mt-7 flex justify-center">
                                <Select
                                    className="w-3/4"
                                    value={
                                        courseFormat
                                            ? { label: courseFormat, value: courseFormat }
                                            : null
                                    }
                                    options={[
                                        { value: 'synchron', label: 'synchron' },
                                        { value: 'asynchron', label: 'asynchron' },
                                        {
                                            value: 'asynchron und synchron',
                                            label: 'asynchron und synchron',
                                        },
                                    ]}
                                    onChange={handleChange}
                                    placeholder="Auswählen..."
                                />
                            </div>
                        </div>
                        <WhiteBox>
                            <div className="p-10">
                                <div className="flex items-center justify-start">
                                    <p className="w-1/2">
                                        Wird der VE durch eine physische Mobilität ergänzt /
                                        begleitet?
                                    </p>
                                    <div className="flex w-1/2 gap-x-5">
                                        <div className="flex my-1">
                                            <div>
                                                <label className="px-2 py-2">Ja</label>
                                            </div>
                                            <div>
                                                <input
                                                    type="radio"
                                                    name="physicalMobility"
                                                    value="true"
                                                    checked={physicalMobilityChosen}
                                                    className="border border-gray-500 rounded-lg p-2"
                                                    onChange={() => setPhysicalMobilityChosen(true)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex my-1">
                                            <div>
                                                <label className="px-2 py-2">Nein</label>
                                            </div>
                                            <div>
                                                <input
                                                    type="radio"
                                                    name="physicalMobility"
                                                    value="false"
                                                    checked={!physicalMobilityChosen}
                                                    className="border border-gray-500 rounded-lg p-2"
                                                    onChange={() =>
                                                        setPhysicalMobilityChosen(false)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {physicalMobilityChosen && (
                                    <>
                                        <div className="divide-y">
                                            {physicalMobilities.map((mobility, index) => (
                                                <div
                                                    key={index}
                                                    className="w-full items-center justify-start py-4"
                                                >
                                                    <div className="flex items-center justify-start pb-2 gap-x-2">
                                                        <p>Ort:</p>
                                                        <input
                                                            type="text"
                                                            value={mobility.location}
                                                            onChange={(e) =>
                                                                modifyPhysicalMobilityLocation(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Ort eingeben"
                                                            className="border border-gray-500 rounded-lg p-2"
                                                        />
                                                    </div>
                                                    <label htmlFor="from" className="">
                                                        von:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={mobility.timestamp_from}
                                                        onChange={(e) =>
                                                            modifyPhysicalMobilityTimestampFrom(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                                                    />
                                                    <label htmlFor="to" className="">
                                                        bis:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={mobility.timestamp_to}
                                                        onChange={(e) =>
                                                            modifyPhysicalMobilityTimestampTo(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="border border-gray-500 rounded-lg h-12 p-2 mx-2"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className={'mx-7 mt-3 flex justify-end'}>
                                            <button
                                                type="button"
                                                onClick={removePhysicalMobilityField}
                                            >
                                                <RxMinus size={20} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addPhysicalMobilityField}
                                            >
                                                <RxPlus size={20} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </WhiteBox>
                        <div className="flex justify-around w-full mt-10">
                            <div>
                                <Link
                                    href={{
                                        pathname: '/startingWizard/generalInformation/languages',
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
                                    className="items-end bg-ve-collab-orange text-white py-3 px-5 rounded-lg"
                                    onClick={onSubmit}
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                <SideProgressBarSectionBroadPlanner
                    progressState={sideMenuStepsProgress}
                    handleValidation={() => {}}
                    isValid={true}
                    sideMenuStepsData={sideMenuStepsData}
                />
            </div>
        </>
    );
}
