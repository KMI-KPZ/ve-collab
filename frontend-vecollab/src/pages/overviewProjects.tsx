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

// authentication is required on this page
Overview.auth = true;
export default function Overview() {
    const { data: session } = useSession();
    const [successPopupOpen, setSuccessPopupOpen] = useState(false);
    const [sortedPlans, setSortedPlans] = useState<PlanPreview[]>([])
    const [sortBy, setSortBy] = useState<string>('creation_timestamp')
    const [sortDesc, setSortDesc] = useState<boolean>(false)

    const [filterBy, setFilterBy] = useState<string>()

    const { data: plans, isLoading, error, mutate } = useGetAvailablePlans(session!.accessToken);

    useEffect(() => {
        if (isLoading) return

        let sortedPlans = plans.sort((a, b) => {
            let av = a[sortBy as keyof PlanPreview]?.toString() || ''
            let bv = b[sortBy as keyof PlanPreview]?.toString() || ''

            if (!av || !bv) {
                console.log('not av/bv', {av, bv, avs: a[sortBy as keyof PlanPreview], bvs: b[sortBy as keyof PlanPreview]});
            }

            return sortDesc ? av.localeCompare(bv) : bv.localeCompare(av)
        });

        if (filterBy) {
            sortedPlans = sortedPlans.filter(p => p.name && p.name.toLowerCase().includes(filterBy.toLowerCase()))
        }

        console.log({sortedPlans});

        setSortedPlans([...sortedPlans])
    }, [plans, sortBy, sortDesc, filterBy])

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

    const applyFilter = (event: KeyboardEvent<HTMLInputElement>) => {
        console.log('aply filter', event, event.currentTarget.value);

        setFilterBy(event.currentTarget.value)

    }

    const SortArrow = ({by}: {by: keyof IPlan}) => {
        // {sortBy == "name" && (<SortArrow by='' />)}

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
                        <div className='mb-4'>

                            <input
                                    className={'border border-[#cccccc] rounded-l px-2 py-1'}
                                    type="text"
                                    placeholder={'Nach Titel filtern ...'}
                                    name='search'
                                    autoComplete="off"
                                    onKeyUp={e => applyFilter(e)}
                            />
                            {/* <MdFilterAlt /> */}

                        </div>

                        <div className="rounded-lg shadow bg-white overflow-scroll md:overflow-auto w-full text-left border-1 border-gray-400">
                            <div className='flex flex-row items-center bg-gray-300 rounded-t-lg text-base font-semibold'>
                                    <div className='basis-1/12 px-3 '>Status</div>
                                    <div className='grow p-3 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('name')}>
                                        Name
                                        <SortArrow by="name" />
                                    </div>
                                    <div className='basis-1/6 px-3'>Autor</div>
                                    <div className='basis-1/6 px-3 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('last_modified')}>
                                        Geändert
                                        <SortArrow by="last_modified" />
                                    </div>
                                    <div className='basis-1/6 px-3 hover:underline hover:cursor-pointer group' onClick={() => handleSortBy('creation_timestamp')}>
                                        Erstellt
                                        <SortArrow by="creation_timestamp" />
                                    </div>
                            </div>

                            <div>
                                {isLoading
                                    ? (<LoadingAnimation />)
                                    : (
                                        sortedPlans.map((plan, index) => (
                                            <div key={index} className='flex flex-row items-center border-b border-bg-gray-300 hover:bg-gray-100'>
                                                <PlannerOverviewItem
                                                    key={index}
                                                    plan={plan}
                                                    deleteCallback={deletePlan}
                                                    refetchPlansCallback={mutate}
                                                />
                                            </div>
                                        ))
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
