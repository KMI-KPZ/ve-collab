import React from 'react';
import { useRef, useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { AVIVA_PHASES, IKAP_PHASES, PhaseName } from './methodPhases';

interface CollapsiblePanelProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function CollapsiblePanel({ title, children, defaultOpen = false }: CollapsiblePanelProps) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200">
            <button
                className="flex w-full cursor-pointer items-center justify-between py-2 px-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(!open)}
            >
                {title}
                {open ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </button>
            {open && <div className="px-1 pb-3">{children}</div>}
        </div>
    );
}

/** separates several filters inside one CollapsiblePanel */
function FilterHeading({ children }: { children: React.ReactNode }) {
    return (
        <h4 className="mt-3 mb-1 first:mt-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {children}
        </h4>
    );
}

interface CheckboxGroupProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    renderOption?: (option: string) => React.ReactNode;
}

function CheckboxGroup({ options, selected, onChange, renderOption }: CheckboxGroupProps) {
    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };
    return (
        <div className="space-y-1">
            {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selected.includes(opt)}
                        onChange={() => toggle(opt)}
                        className="cursor-pointer accent-ve-collab-orange"
                    />
                    {renderOption ? renderOption(opt) : opt}
                </label>
            ))}
        </div>
    );
}

interface RangeFilterProps {
    label: string;
    min: number;
    max: number;
    value: number;
    unit: string;
    active: boolean;
    onValueChange: (value: number) => void;
    onActiveChange: (active: boolean) => void;
}

function RangeFilter({
    label,
    min,
    max,
    value,
    unit,
    active,
    onValueChange,
    onActiveChange,
}: RangeFilterProps) {
    return (
        <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => onActiveChange(e.target.checked)}
                    className="cursor-pointer accent-ve-collab-orange"
                />
                {label}
            </label>
            {active && (
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onValueChange(Number(e.target.value))}
                        className="w-full cursor-pointer accent-ve-collab-orange"
                    />
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                        {value} {unit}
                    </span>
                </div>
            )}
        </div>
    );
}

interface StepSliderProps {
    label: string;
    steps: string[];
    value: number;
    onChange: (value: number) => void;
}

/**
 * slider snapping to a few ordered steps: while dragging, the thumb follows the pointer
 * freely and snaps to the nearest step on release.
 * Not a native range input, because its drag could get stuck after releasing the mouse
 * outside of it, then following the pointer without any button held.
 */
function StepSlider({ label, steps, value, onChange }: StepSliderProps) {
    // unsnapped thumb position while dragging, null otherwise
    const [dragPosition, setDragPosition] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const lastStep = steps.length - 1;
    const position = dragPosition ?? value;
    const percent = (step: number) => `${(step / lastStep) * 100}%`;

    const dragTo = (clientX: number) => {
        const rect = trackRef.current!.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        setDragPosition(ratio * lastStep);
        const step = Math.round(ratio * lastStep);
        if (step !== value) onChange(step);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        // keeps pointer events coming even when the pointer leaves the slider or the window,
        // the capture is released on pointerup wherever it happens
        e.currentTarget.setPointerCapture(e.pointerId);
        dragTo(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        // safety net in case the release got lost nevertheless
        if (e.buttons === 0) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            return;
        }
        dragTo(e.clientX);
    };

    // the arrow keys move whole steps
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const targets: Record<string, number> = {
            ArrowLeft: value - 1,
            ArrowDown: value - 1,
            ArrowRight: value + 1,
            ArrowUp: value + 1,
            Home: 0,
            End: lastStep,
        };
        if (!(e.key in targets)) return;
        e.preventDefault();
        onChange(Math.min(lastStep, Math.max(0, targets[e.key])));
    };

    return (
        <div>
            <div className="text-sm">{label}</div>
            <div
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={lastStep}
                aria-valuenow={value}
                aria-valuetext={steps[value]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onLostPointerCapture={() => setDragPosition(null)}
                onKeyDown={handleKeyDown}
                className="py-2 px-2 cursor-pointer select-none touch-pan-y rounded outline-none focus-visible:ring-2 focus-visible:ring-ve-collab-orange-light"
            >
                {/* the horizontal padding is half the thumb width, so it stays inside at both ends */}
                <div ref={trackRef} className="relative h-1 rounded-full bg-gray-200">
                    <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-ve-collab-orange ${
                            dragPosition === null ? 'transition-[width] duration-150' : ''
                        }`}
                        style={{ width: percent(position) }}
                    />
                    {steps.map((step, i) => (
                        <div
                            key={step}
                            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                i <= position ? 'bg-ve-collab-orange' : 'bg-gray-300'
                            }`}
                            style={{ left: percent(i) }}
                        />
                    ))}
                    <div
                        className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ve-collab-orange shadow ${
                            dragPosition === null ? 'transition-[left] duration-150' : ''
                        }`}
                        style={{ left: percent(position) }}
                    />
                </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                {steps.map((step, i) => (
                    <button
                        key={step}
                        type="button"
                        onClick={() => onChange(i)}
                        className={`cursor-pointer ${
                            i === value ? 'font-semibold text-ve-collab-orange' : ''
                        }`}
                    >
                        {step}
                    </button>
                ))}
            </div>
        </div>
    );
}

const AVIVA_SUB_PHASES = [
    'Kennenlernen',
    'Persönlicher Austausch (Erfahrung)',
    'Gruppengefühl stärken',
    'Auflockerung',
    'Ausklang',
    'Auf Thema einstimmen / Sensibilisieren',
    'Vorwissen erfragen',
    'Inhalte wiederholen',
    'Wissensinput',
    'Wissen generieren',
    'Kritische Auseinandersetzung mit Wissen',
    'Wissen anwenden / umsetzen',
    'Wissen festigen',
    'Wissen abfragen',
    'Lernprozess reflektieren',
    'Feedback einholen',
];

export const TEACHER_PROFILE_DIMENSIONS = [
    'Digitale Lehre',
    'IT Kompetenz',
    'Kommunikation / Kollaboration',
] as const;
export type TeacherProfileDimension = (typeof TEACHER_PROFILE_DIMENSIONS)[number];

/** ordered from low to high */
export const TEACHER_PROFILE_LEVELS = [
    { value: 'niedrige Ausprägung', label: 'niedrig' },
    { value: 'mittlere Ausprägung', label: 'mittel' },
    { value: 'hohe Ausprägung', label: 'hoch' },
];

export interface MethodFilters {
    searchQuery: string;
    courseTypes: string[];
    socialForms: string[];
    phases: string[];
    subPhases: string[];
    /** highest level (index into TEACHER_PROFILE_LEVELS) a method may require per dimension */
    teacherProfileLevels: Record<TeacherProfileDimension, number>;
    materials: string[];
    roomSpecs: string[];
    maxParticipants: number;
    maxParticipantsActive: boolean;
    maxTime: number;
    maxTimeActive: boolean;
}

interface MethodSidebarProps {
    filters: MethodFilters;
    onFiltersChange: (filters: MethodFilters) => void;
    availableCourseTypes: string[];
    availableSocialForms: string[];
    availableMaterials: string[];
    maxParticipantsRange: number;
    maxTimeRange: number;
}

export default function MethodSidebar({
    filters,
    onFiltersChange,
    availableCourseTypes,
    availableSocialForms,
    availableMaterials,
    maxParticipantsRange,
    maxTimeRange,
}: MethodSidebarProps) {
    const update = (partial: Partial<MethodFilters>) => {
        onFiltersChange({ ...filters, ...partial });
    };

    return (
        <div className="h-full overflow-y-auto p-3 space-y-1">
            <h3 className="font-bold text-lg text-ve-collab-blue mb-2">Filter</h3>

            <CollapsiblePanel title="Lehrendenprofil">
                <p className="mb-2 text-xs text-gray-500">
                    Zeigt Methoden, die höchstens die gewählte Ausprägung erfordern.
                </p>
                <div className="space-y-3">
                    {TEACHER_PROFILE_DIMENSIONS.map((dimension) => (
                        <StepSlider
                            key={dimension}
                            label={dimension}
                            steps={TEACHER_PROFILE_LEVELS.map((level) => level.label)}
                            value={filters.teacherProfileLevels[dimension]}
                            onChange={(level) =>
                                update({
                                    teacherProfileLevels: {
                                        ...filters.teacherProfileLevels,
                                        [dimension]: level,
                                    },
                                })
                            }
                        />
                    ))}
                </div>
            </CollapsiblePanel>

            <CollapsiblePanel title="Digitale Werkzeuge">
                <CheckboxGroup
                    options={availableMaterials}
                    selected={filters.materials}
                    onChange={(materials) => update({ materials })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="Veranstaltungsarten">
                <CheckboxGroup
                    options={availableCourseTypes}
                    selected={filters.courseTypes}
                    onChange={(courseTypes) => update({ courseTypes })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="Sozialform">
                <CheckboxGroup
                    options={availableSocialForms}
                    selected={filters.socialForms}
                    onChange={(socialForms) => update({ socialForms })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="Maximaler Zeitaufwand">
                <RangeFilter
                    label="Zeitfilter aktivieren"
                    min={0}
                    max={maxTimeRange || 180}
                    value={filters.maxTime}
                    unit="Min."
                    active={filters.maxTimeActive}
                    onValueChange={(maxTime) => update({ maxTime })}
                    onActiveChange={(maxTimeActive) => update({ maxTimeActive })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="Maximale Gruppengröße">
                <RangeFilter
                    label="Gruppengrößen-Filter aktivieren"
                    min={0}
                    max={maxParticipantsRange || 200}
                    value={filters.maxParticipants}
                    unit="Teilnehmer"
                    active={filters.maxParticipantsActive}
                    onValueChange={(maxParticipants) => update({ maxParticipants })}
                    onActiveChange={(maxParticipantsActive) => update({ maxParticipantsActive })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="AVIVA+-Phasen">
                <FilterHeading>AVIVA+-Phase(n)</FilterHeading>
                <CheckboxGroup
                    options={Object.keys(AVIVA_PHASES)}
                    selected={filters.phases}
                    onChange={(phases) => update({ phases })}
                    renderOption={(phase) => <PhaseName name={AVIVA_PHASES[phase]} />}
                />
                <FilterHeading>AVIVA+-Unterphase(n)</FilterHeading>
                <CheckboxGroup
                    options={AVIVA_SUB_PHASES}
                    selected={filters.subPhases}
                    onChange={(subPhases) => update({ subPhases })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="IKAP-Phase(n)">
                <CheckboxGroup
                    options={IKAP_PHASES}
                    selected={filters.roomSpecs}
                    onChange={(roomSpecs) => update({ roomSpecs })}
                    renderOption={(phase) => <PhaseName name={phase} />}
                />
            </CollapsiblePanel>
        </div>
    );
}
