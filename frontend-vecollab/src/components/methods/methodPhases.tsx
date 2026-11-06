import { Fragment } from 'react';

export const AVIVA_PHASES: Record<string, string> = {
    Ausrichten: 'Ankommen / Ausrichten',
    'Vorwissen aktivieren': 'Vorwissen aktivieren',
    Informieren: 'Informieren',
    Verarbeiten: 'Verarbeiten',
    Auswerten: 'Auswerten',
    '(Lern-)Atmosphäre fördern': '(Lern-)Atmosphäre fördern',
};

export const IKAP_PHASES = ['Interaktiv', 'Konstruktiv', 'Aktiv', 'Passiv'];

// first letter bold
export function PhaseName({ name }: { name: string }) {
    // "(Lern-)Atmosphäre fördern" starts with "(", so 2nd character needs to be bold
    const index = name.startsWith('(') ? 1 : 0;

    return (
        <span>
            {name.slice(0, index)}
            <strong>{name[index]}</strong>
            {name.slice(index + 1)}
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
