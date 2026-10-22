import React from 'react';
import { useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

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
                className="flex w-full items-center justify-between py-2 px-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setOpen(!open)}
            >
                {title}
                {open ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </button>
            {open && <div className="px-1 pb-3">{children}</div>}
        </div>
    );
}

interface CheckboxGroupProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

function CheckboxGroup({ options, selected, onChange }: CheckboxGroupProps) {
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
                        className="accent-ve-collab-orange"
                    />
                    {opt}
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
                    className="accent-ve-collab-orange"
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
                        className="w-full accent-ve-collab-orange"
                    />
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                        {value} {unit}
                    </span>
                </div>
            )}
        </div>
    );
}

export interface MethodFilters {
    searchQuery: string;
    courseTypes: string[];
    socialForms: string[];
    phases: string[];
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
    availablePhases: string[];
    availableMaterials: string[];
    availableRoomSpecs: string[];
    maxParticipantsRange: number;
    maxTimeRange: number;
}

export default function MethodSidebar({
    filters,
    onFiltersChange,
    availableCourseTypes,
    availableSocialForms,
    availablePhases,
    availableMaterials,
    availableRoomSpecs,
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

            {/* TODO add subphases as well into this dropdown */}
            <CollapsiblePanel title="AVIVA-Phase(n)">
                <CheckboxGroup
                    options={availablePhases}
                    selected={filters.phases}
                    onChange={(phases) => update({ phases })}
                />
            </CollapsiblePanel>

            <CollapsiblePanel title="IKAP-Phase(n)">
                <CheckboxGroup
                    options={availableRoomSpecs}
                    selected={filters.roomSpecs}
                    onChange={(roomSpecs) => update({ roomSpecs })}
                />
            </CollapsiblePanel>
        </div>
    );
}
