import { fetchDELETE, useGetAvailablePlans } from '@/lib/backend';
import { useSession } from 'next-auth/react';
import { KeyboardEvent, useEffect, useState } from 'react';
import PlannerOverviewItem from '@/components/Plannner/PlannerOverviewItem';
import Link from 'next/link';
import LoadingAnimation from '@/components/LoadingAnimation';
import ButtonNewPlan from '@/components/Plannner/ButtonNewPlan';
import Alert from '@/components/Alert';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import { IPlan, PlanPreview } from '@/interfaces/planner/plannerInterfaces';
import { ISideProgressBarStates } from '@/interfaces/startingWizard/sideProgressBar';

// authentication is required on this page
Overview.auth = true;
export default function Overview() {
    const { data: session } = useSession();
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([])
    const [sortBy, setSortBy] = useState<string>('creation_timestamp')
    const [sortDesc, setSortDesc] = useState<boolean>(false)

    const [filterBy, setFilterBy] = useState<{
        planKey: keyof PlanPreview,
        /** compare function to compare the plan[planKey].planValue of a plan   */
        compare: (planValue: string|string[]|boolean|ISideProgressBarStates) => boolean
        id?: string,
    }[]>([])

    const { data: plans, isLoading, error, mutate } = useGetAvailablePlans(session!.accessToken);

    useEffect(() => {
        if (isLoading) return

        let sortedPlans = plans.sort((a, b) => {
            let av = a[sortBy as keyof PlanPreview]?.toString() || ''
            let bv = b[sortBy as keyof PlanPreview]?.toString() || ''

            return sortDesc ? av.localeCompare(bv) : bv.localeCompare(av)
        });

        if (filterBy && filterBy.length) {
            filterBy.forEach(filter => {
                sortedPlans = sortedPlans.filter(p => {
                    return p[filter.planKey] && filter.compare(p[filter.planKey])
                })
            })
        }

        console.log({sortedPlans});

        setSortedPlans([...sortedPlans])
    }, [plans, isLoading, sortBy, sortDesc, filterBy])

    const handleSortBy = (key: keyof PlanPreview) => {
        setSortDesc(prev => !prev)
        setSortBy(key)
    }

    const deletePlan = async (planId: string) => {
        const response = await fetchDELETE(
            `/planner/delete?_id=${planId}`,
            {},
            session?.accessToken
        );
        if (response.success === true) {
            mutate(); // refresh plans
        }
        setSuccessPopupOpen(true);
        setTimeout(() => setSuccessPopupOpen(false), 2000);
    };

    const handleFilterBy = (planKey: keyof PlanPreview, compare: (planValue: string|string[]|boolean|ISideProgressBarStates) => boolean, id?: string) => {

        if (filterBy.find(f => f.planKey == planKey)) {
            // update existing filter
            setFilterBy(prev => prev.map(f => f.planKey == planKey ? {id, planKey, compare} : f) )
        }
        else {
            setFilterBy(prev => [...prev, {id, planKey, compare}])
        }
    }

    const SortArrow = ({by}: {by: keyof IPlan}) => {
        if (by != sortBy) return <></>

        return <>{sortDesc
            ? <MdArrowDownward className='inline m-1 text-gray-500 group-hover:text-gray-700' />
            : <MdArrowUpward className='inline m-1 text-gray-500 group-hover:text-gray-700' />
        }</>
    }

    return (
        <>
            <div className="max-w-screen-[1500] min-h-[70vh] bg-pattern-left-blue-small bg-no-repeat">

                <div className='container mx-auto mb-14 px-5 p-12'>
                    <div className='flex items-center'>
                        <div>
                            <div className={'font-bold text-4xl mb-2'}>Pläne</div>
                            <div className={'text-gray-500 text-xl'}>
                                Übersicht Deiner oder mit Dir geteilten Pläne
                            </div>
                        </div>

                        <div className='ml-auto'><ButtonNewPlan label='Neuen Plan starten' /></div>

                        <div className='w-1/4 text-center'>
                            <div className='m-2'>Noch auf der Suche nach neuen Partner:innen für den nächsten VE?</div>
                            <Link href={'/matching'}>
                                    <button
                                        className={
                                            'mx-4 py-2 px-5 border border-ve-collab-orange rounded-lg'
                                        }
                                    >
                                        Zum Matching ...
                                    </button>
                                </Link>
                        </div>
                    </div>

                    <div>
                        <div className='mb-4 flex items-center'>

                            <div className='flex flex-rows mr-4 divide-x divide-slate-900'>
                                <div className='px-2'>
                                    <button
                                        className={`underline ${!filterBy.find(f => f.planKey == 'author') || filterBy.find(f => f.id == 'allAuthors') ? "text-blue-600": ""}`}
                                        onClick={() => handleFilterBy('author', (planAuthor) => true, 'allAuthors')}
                                    >Alle</button>
                                </div>
                                <div className='px-2'>
                                    <button
                                        className={`underline ${filterBy.find(f => f.id == 'iamAuthor') ? "text-blue-600": ""}`}
                                        onClick={() => handleFilterBy('author', (planAuthor) => (planAuthor as string) == session?.user.preferred_username, 'iamAuthor')}
                                    >Eigene</button>
                                </div>
                                <div className='px-2'>
                                    <button
                                        className={`underline ${filterBy.find(f => f.id == 'otherAuthor') ? "text-blue-600": ""}`}
                                        onClick={() => handleFilterBy('author', (planAuthor) => (planAuthor as string) != session?.user.preferred_username, 'otherAuthor')}
                                    >Mit mir geteilte</button>
                                </div>
                            </div>

                            <div>
                                <input
                                        className={'border border-[#cccccc] rounded-l px-2 py-1'}
                                        type="text"
                                        placeholder={'Nach Titel filtern ...'}
                                        name='search'
                                        autoComplete="off"
                                        onKeyUp={event => {
                                            // event.persist()
                                            handleFilterBy('name', (planName) => {
                                                // event currentTarget is not available even with prev event.persist(). Why??
                                                return (planName as string).toLowerCase().includes((event.target as HTMLInputElement).value.toLowerCase())
                                            } )
                                        }}
                                />
                                {/* <MdFilterAlt /> */}
                            </div>

                        </div>

                        <div className="rounded-lg shadow bg-white overflow-scroll md:overflow-auto w-full text-left border-1 border-gray-400">
                            <div className='flex flex-row space-x-3 items-center bg-gray-300 rounded-t-lg text-base font-semibold'>
                                    <div className='basis-1/12 text-center'>
                                        Progress
                                    </div>
                                    <div className='grow p-3 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('name')}>
                                        Name
                                        <SortArrow by="name" />
                                    </div>
                                    <div className='basis-1/6'>
                                        Autor
                                    </div>
                                    <div className='basis-1/6 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('last_modified')}>
                                        Geändert
                                        <SortArrow by="last_modified" />
                                    </div>
                                    <div className='basis-1/6 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('creation_timestamp')}>
                                        Erstellt
                                        <SortArrow by="creation_timestamp" />
                                    </div>
                            </div>

                            <div>
                                {isLoading
                                    ? ( <div className='m-12'><LoadingAnimation size='small' /> lade Pläne ...</div> )
                                    : (sortedPlans.length == 0
                                        ? <div className='m-12'>Noch keine Pläne erstellt</div>
                                        : (sortedPlans.map((plan, index) => (
                                            <div key={index} className='flex flex-row space-x-3 items-center border-b border-bg-gray-300 hover:bg-gray-100'>
                                                <PlannerOverviewItem
                                                    key={index}
                                                    plan={plan}
                                                    deleteCallback={deletePlan}
                                                    refetchPlansCallback={mutate}
                                                />
                                            </div>
                                        )))
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {successPopupOpen && (<Alert onClose={() => setSuccessPopupOpen(false)}><>Plan gelöscht</></Alert>)}
        </>
    );
}
