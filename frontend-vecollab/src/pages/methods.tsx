import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { MdFilterList, MdSearch } from 'react-icons/md';
import { Method } from '@/interfaces/method/methodInterfaces';
import { getAllMethods } from '@/lib/cmsApi';
import MethodSidebar, { MethodFilters } from '@/components/methods/MethodSidebar';
import MethodList from '@/components/methods/MethodList';
import MethodDetail from '@/components/methods/MethodDetail';
import CustomHead from '@/components/metaData/CustomHead';

const defaultFilters: MethodFilters = {
    searchQuery: '',
    courseTypes: [],
    socialForms: [],
    phases: [],
    materials: [],
    roomSpecs: [],
    maxParticipants: 200,
    maxParticipantsActive: false,
    maxTime: 180,
    maxTimeActive: false,
};

/** Extract unique sorted values from an array field across all methods */
function collectUnique(methods: Method[], key: keyof Method): string[] {
    const set = new Set<string>();
    for (const m of methods) {
        const val = m[key];
        if (Array.isArray(val)) {
            for (const v of val) {
                if (v) set.add(v);
            }
        }
    }
    return Array.from(set).sort();
}

/** Apply all filters to a list of methods */
function applyFilters(methods: Method[], filters: MethodFilters): Method[] {
    return methods.filter((m) => {
        // text search
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            const titleMatch = m.title?.toLowerCase().includes(q);
            const altMatch = m.alternativeTitle?.toLowerCase().includes(q);
            if (!titleMatch && !altMatch) return false;
        }

        // checkbox filters: method must have at least one of the selected values
        if (
            filters.courseTypes.length > 0 &&
            !m.courseType?.some((v) => filters.courseTypes.includes(v))
        )
            return false;
        if (
            filters.socialForms.length > 0 &&
            !m.socialForm?.some((v) => filters.socialForms.includes(v))
        )
            return false;
        if (filters.phases.length > 0 && !m.phase?.some((v) => filters.phases.includes(v)))
            return false;
        if (filters.materials.length > 0 && !m.material?.some((v) => filters.materials.includes(v)))
            return false;
        if (
            filters.roomSpecs.length > 0 &&
            !m.roomSpec?.some((v) => filters.roomSpecs.includes(v))
        )
            return false;

        // range filters
        if (filters.maxParticipantsActive && m.participantsMin != null) {
            if (m.participantsMin > filters.maxParticipants) return false;
        }
        if (filters.maxTimeActive) {
            const effectiveTime = m.timeMin ?? m.timeMax;
            if (effectiveTime != null && effectiveTime > filters.maxTime) return false;
        }

        return true;
    });
}

export default function Methods({ allMethods }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    // a method can be preselected via ?method=<id>, e.g. from the dashboard suggestions
    const queryMethodId = typeof router.query.method === 'string' ? router.query.method : null;

    const [filters, setFilters] = useState<MethodFilters>(defaultFilters);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(queryMethodId);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (queryMethodId) setSelectedMethodId(queryMethodId);
    }, [queryMethodId]);

    const selectedMethod = useMemo(
        () => allMethods.find((m) => m.id === selectedMethodId) ?? null,
        [allMethods, selectedMethodId]
    );

    // Extract available filter options from all methods
    const availableCourseTypes = useMemo(
        () => collectUnique(allMethods, 'courseType'),
        [allMethods]
    );
    const availableSocialForms = useMemo(
        () => collectUnique(allMethods, 'socialForm'),
        [allMethods]
    );
    const availablePhases = useMemo(() => collectUnique(allMethods, 'phase'), [allMethods]);
    const availableMaterials = useMemo(() => collectUnique(allMethods, 'material'), [allMethods]);
    const availableRoomSpecs = useMemo(() => collectUnique(allMethods, 'roomSpec'), [allMethods]);
    const maxParticipantsRange = useMemo(() => {
        let max = 0;
        for (const m of allMethods) {
            if (m.participantsMax != null && m.participantsMax > max) max = m.participantsMax;
        }
        return max || 200;
    }, [allMethods]);
    const maxTimeRange = useMemo(() => {
        let max = 0;
        for (const m of allMethods) {
            if (m.timeMin != null && Number(m.timeMin) > max) max = Number(m.timeMin);
        }
        return max || 180;
    }, [allMethods]);

    const filteredMethods = useMemo(() => applyFilters(allMethods, filters), [allMethods, filters]);

    const handleSelectMethod = (id: string) => {
        setSelectedMethodId(id);
        setSidebarOpen(false);
    };

    const handleBack = () => {
        setSelectedMethodId(null);
    };

    return (
        <>
            <CustomHead pageTitle="Methoden" />

            {/* Mobile top bar: search + filter toggle */}
            <div className="md:hidden flex items-center gap-2 p-2 bg-ve-collab-blue-light border-b border-gray-200">
                {!selectedMethodId && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm"
                    >
                        <MdFilterList size={18} />
                        Filter
                    </button>
                )}
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.searchQuery}
                            onChange={(e) =>
                                setFilters({ ...filters, searchQuery: e.target.value })
                            }
                            placeholder="Methode suchen..."
                            className="w-full border border-gray-300 rounded px-3 py-1.5 pr-8 text-sm"
                        />
                        <MdSearch
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                    </div>
                </div>
            </div>

            <div className="flex relative" style={{ height: 'calc(100vh - 120px)' }}>
                {/* === Sidebar === */}
                {/* Desktop: always visible */}
                <div className="hidden md:block w-64 flex-shrink-0 border-r border-gray-200 bg-white">
                    <MethodSidebar
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableCourseTypes={availableCourseTypes}
                        availableSocialForms={availableSocialForms}
                        availablePhases={availablePhases}
                        availableMaterials={availableMaterials}
                        availableRoomSpecs={availableRoomSpecs}
                        maxParticipantsRange={maxParticipantsRange}
                        maxTimeRange={maxTimeRange}
                    />
                </div>
                {/* Mobile: slide-in overlay */}
                {sidebarOpen && (
                    <>
                        <div
                            className="md:hidden fixed inset-0 bg-black/30 z-20"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-30 shadow-lg overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                <span className="font-bold text-ve-collab-blue">Filter</span>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                            <MethodSidebar
                                filters={filters}
                                onFiltersChange={setFilters}
                                availableCourseTypes={availableCourseTypes}
                                availableSocialForms={availableSocialForms}
                                availablePhases={availablePhases}
                                availableMaterials={availableMaterials}
                                availableRoomSpecs={availableRoomSpecs}
                                maxParticipantsRange={maxParticipantsRange}
                                maxTimeRange={maxTimeRange}
                            />
                        </div>
                    </>
                )}

                <div className="flex-1 flex min-w-0">
                    {/* Method List Column */}
                    {/* Desktop: always visible as left column */}
                    {/* Mobile: visible only when no method is selected */}
                    <div
                        className={`w-full md:w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col ${
                            selectedMethodId ? 'hidden md:flex' : 'flex'
                        }`}
                    >
                        <div className="hidden md:block p-3 border-b border-gray-200">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={filters.searchQuery}
                                    onChange={(e) =>
                                        setFilters({ ...filters, searchQuery: e.target.value })
                                    }
                                    placeholder="Methode suchen..."
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 pr-8 text-sm"
                                />
                                <MdSearch
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                    size={18}
                                />
                            </div>
                        </div>

                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                            {filteredMethods.length} Methode
                            {filteredMethods.length !== 1 ? 'n' : ''} gefunden
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <MethodList
                                methods={filteredMethods}
                                selectedMethodId={selectedMethodId}
                                onSelectMethod={handleSelectMethod}
                            />
                        </div>
                    </div>

                    {/* Method Detail Column */}
                    {/* Desktop: always visible */}
                    {/* Mobile: visible only when a method is selected */}
                    <div
                        className={`flex-1 bg-white min-w-0 ${
                            selectedMethodId ? 'block' : 'hidden md:block'
                        }`}
                    >
                        <MethodDetail
                            method={selectedMethod}
                            onBack={handleBack}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ locale }: GetServerSidePropsContext) {
    const allMethods = await getAllMethods();

    return {
        props: {
            allMethods,
            ...(await serverSideTranslations(locale ?? 'de', ['common'])),
        },
    };
}
