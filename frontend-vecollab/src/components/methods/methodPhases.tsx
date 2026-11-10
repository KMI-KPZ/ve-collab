import { Fragment } from 'react';

export const AVIVA_PHASES: Record<string, string> = {
    Ausrichten: 'Ankommen / Ausrichten',
    'Vorwissen aktivieren': 'Vorwissen aktivieren',
    Informieren: 'Informieren',
    Verarbeiten: 'Verarbeiten',
    Auswerten: 'Auswerten',
    // from the AVIVA+ model, the "+" is what gets highlighted
    '(Lern-)Atmosphäre fördern': '+ (Lern-)Atmosphäre fördern',
};

export const IKAP_PHASES = ['Interaktiv', 'Konstruktiv', 'Aktiv', 'Passiv'];

// first character bold
export function PhaseName({ name }: { name: string }) {
    return (
        <span>
            <strong>{name[0]}</strong>
            {name.slice(1)}
        </span>
    );
}

export function PhaseNames({ names }: { names: string[] }) {
    return (
        <>
            {names.map((name, i) => (
                <Fragment key={name}>
                    {i > 0 && ', '}
                    <PhaseName name={name} />
                </Fragment>
            ))}
        </>
    );
}
