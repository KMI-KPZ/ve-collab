import React from 'react';
import { Method } from '@/interfaces/method/methodInterfaces';
import { MdArrowBack } from 'react-icons/md';

interface MethodDetailProps {
    method: Method | null;
    onBack: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <tr className="border-b border-gray-100">
            <th className="py-2 pr-4 text-sm font-semibold text-gray-600 align-top whitespace-nowrap">
                {label}
            </th>
            <td className="py-2 text-sm text-gray-800">{children}</td>
        </tr>
    );
}

function RangeDisplay({
    min,
    max,
    minLabel,
    maxLabel,
    unit,
}: {
    min: number | null;
    max: number | null;
    minLabel: string;
    maxLabel: string;
    unit: string;
}) {
    const parts: string[] = [];
    if (min != null && min > 0) parts.push(`${minLabel} ${min}`);
    if (max != null && max > 0) parts.push(`${maxLabel} ${max}`);
    if (parts.length === 0) return null;
    return (
        <span>
            {parts.join(' - ')} {unit}
        </span>
    );
}

export default function MethodDetail({ method, onBack }: MethodDetailProps) {
    if (!method) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Wählen Sie eine Methode aus der Liste aus.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            {/* Back button - visible only on mobile */}
            <button
                onClick={onBack}
                className="md:hidden flex items-center gap-1 text-ve-collab-blue hover:underline mb-3 text-sm"
            >
                <MdArrowBack size={18} />
                Zurück zur Liste
            </button>

            <div className="flex items-start gap-4 mb-4">
                {method.thumbnail && (
                    <img
                        src={method.thumbnail}
                        alt=""
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{method.title}</h2>
                    {method.alternativeTitle && (
                        <p className="text-sm text-gray-500">{method.alternativeTitle}</p>
                    )}
                </div>
            </div>

            {/* Properties table */}
            <table className="w-full">
                <tbody>
                    {method.socialForm?.length > 0 && (
                        <DetailRow label="Sozialform">
                            {method.socialForm.join(', ')}
                        </DetailRow>
                    )}
                    {method.phase?.length > 0 && (
                        <DetailRow label="AVIVA-Phase(n)">{method.phase.join(', ')}</DetailRow>
                    )}
                    {method.subPhase?.length > 0 && (
                        <DetailRow label="AVIVA-Unterphase(n)">
                            {method.subPhase.join(', ')}
                        </DetailRow>
                    )}
                    {method.roomSpec?.length > 0 && (
                        <DetailRow label="IKAP-Phase(n)">
                            {method.roomSpec.join(', ')}
                        </DetailRow>
                    )}
                    {method.result && (
                        <DetailRow label="IKAP-Phase(n) (Kommentar)">{method.result}</DetailRow>
                    )}
                    {method.courseType?.length > 0 && (
                        <DetailRow label="Art der Veranstaltung">
                            {method.courseType.join(', ')}
                        </DetailRow>
                    )}
                    {(method.participantsMin != null || method.participantsMax != null) && (
                        <DetailRow label="Gruppengröße">
                            <RangeDisplay
                                min={method.participantsMin}
                                max={method.participantsMax}
                                minLabel=""
                                maxLabel=""
                                unit="Personen"
                            />
                        </DetailRow>
                    )}
                    {method.participantsComment && (
                        <DetailRow label="Gruppengröße (Kommentar)">
                            {method.participantsComment}
                        </DetailRow>
                    )}
                    {method.proceeding && (
                        <DetailRow label="Ablauf">
                            <p className="whitespace-pre-line">{method.proceeding}</p>
                        </DetailRow>
                    )}
                    {method.phaseProceeding && (
                        <DetailRow label="Phasenspezifischer Ablauf">
                            <p className="whitespace-pre-line">{method.phaseProceeding}</p>
                        </DetailRow>
                    )}
                    {method.seating && (
                        <DetailRow label="technische Voraussetzungen">
                            <p className="whitespace-pre-line">{method.seating}</p>
                        </DetailRow>
                    )}
                    {method.material?.length > 0 && (
                        <DetailRow label="Lehrendenprofil">
                            {method.material.join(', ')}
                        </DetailRow>
                    )}
                    {method.timeMin != null && (
                        <DetailRow label="Zeitaufwand">
                            <RangeDisplay
                                min={method.timeMin}
                                max={method.timeMax}
                                minLabel=""
                                maxLabel=""
                                unit="Minuten"
                            />
                        </DetailRow>
                    )}
                    {method.timeComment && (
                        <DetailRow label="Zeitaufwand (Kommentar)">
                            {method.timeComment}
                        </DetailRow>
                    )}
                    {method.experiences && (
                        <DetailRow label="Erfahrungen">
                            <p className="whitespace-pre-line">{method.experiences}</p>
                        </DetailRow>
                    )}
                    {method.variations && (
                        <DetailRow label="Arten">
                            <p className="whitespace-pre-line">{method.variations}</p>
                        </DetailRow>
                    )}
                    {method.examples && (
                        <DetailRow label="Beispiele">
                            <p className="whitespace-pre-line">{method.examples}</p>
                        </DetailRow>
                    )}
                    {method.tips && (
                        <DetailRow label="Tipps">
                            <p className="whitespace-pre-line">{method.tips}</p>
                        </DetailRow>
                    )}
                    {method.visualization && (
                        <DetailRow label="Visualisierung">
                            <p className="whitespace-pre-line">{method.visualization}</p>
                        </DetailRow>
                    )}
                    {method.links && (
                        <DetailRow label="Weblinks">
                            <p className="whitespace-pre-line">{method.links}</p>
                        </DetailRow>
                    )}
                    {method.citations && (
                        <DetailRow label="Referenzen">
                            <p className="whitespace-pre-line">{method.citations}</p>
                        </DetailRow>
                    )}
                </tbody>
            </table>
        </div>
    );
}
