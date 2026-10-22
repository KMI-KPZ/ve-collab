import type { CollectionConfig } from 'payload';
import { isAdmin, isEditorOrAdmin } from '../access/roles';

export const Methods: CollectionConfig = {
    slug: 'methods',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'courseType', 'participantsMin', 'participantsMax', 'timeMin'],
    },
    access: {
        read: () => true,
        create: isEditorOrAdmin,
        update: isEditorOrAdmin,
        delete: isAdmin,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
        },
        {
            name: 'alternativeTitle',
            type: 'text',
        },
        {
            name: 'author',
            type: 'text',
        },
        {
            name: 'language',
            type: 'select',
            defaultValue: 'de',
            options: [
                { label: 'Deutsch', value: 'de' },
                { label: 'English', value: 'en' },
            ],
        },
        {
            name: 'thumbnail',
            type: 'upload',
            relationTo: 'media',
        },
        // --- Classification ---
        {
            name: 'courseType',
            type: 'select',
            hasMany: true,
            options: [
                { label: 'Seminar', value: 'Seminar' },
                { label: 'Übung', value: 'Übung' },
                { label: 'Vorlesung', value: 'Vorlesung' },
            ],
        },
        {
            name: 'socialForm',
            type: 'select',
            hasMany: true,
            options: [
                { label: 'Einzelarbeit', value: 'Einzelarbeit' },
                { label: 'Partner/Gruppenarbeit', value: 'Partner/Gruppenarbeit' },
                { label: 'Plenum frontal', value: 'Plenum frontal' },
                { label: 'Plenum interaktiv', value: 'Plenum interaktiv' },
                { label: 'Plenum untereinander', value: 'Plenum untereinander' },
            ],
        },
        {
            name: 'phase',
            type: 'select',
            hasMany: true,
            options: [
                { label: '(Lern-)Atmosphäre fördern', value: '(Lern-)Atmosphäre fördern' },
                { label: 'Ausrichten', value: 'Ausrichten' },
                { label: 'Auswerten', value: 'Auswerten' },
                { label: 'Informieren', value: 'Informieren' },
                { label: 'Verarbeiten', value: 'Verarbeiten' },
                { label: 'Vorwissen aktivieren', value: 'Vorwissen aktivieren' },
            ],
        },
        {
            name: 'subPhase',
            type: 'select',
            hasMany: true,
            options: [
                {
                    label: 'Auf Thema einstimmen / Sensibilisieren',
                    value: 'Auf Thema einstimmen / Sensibilisieren',
                },
                { label: 'Auflockerung', value: 'Auflockerung' },
                { label: 'Ausklang', value: 'Ausklang' },
                { label: 'Feedback einholen', value: 'Feedback einholen' },
                { label: 'Inhalte wiederholen', value: 'Inhalte wiederholen' },
                { label: 'Kennenlernen', value: 'Kennenlernen' },
                {
                    label: 'Kritische Auseinandersetzung mit Wissen',
                    value: 'Kritische Auseinandersetzung mit Wissen',
                },
                { label: 'Lernprozess reflektieren', value: 'Lernprozess reflektieren' },
                {
                    label: 'Persönlicher Austausch (Erfahrung)',
                    value: 'Persönlicher Austausch (Erfahrung)',
                },
                { label: 'Vorwissen erfragen', value: 'Vorwissen erfragen' },
                { label: 'Wissen abfragen', value: 'Wissen abfragen' },
                { label: 'Wissen anwenden / umsetzen', value: 'Wissen anwenden / umsetzen' },
                { label: 'Wissen festigen', value: 'Wissen festigen' },
                { label: 'Wissen generieren', value: 'Wissen generieren' },
                { label: 'Wissensinput', value: 'Wissensinput' },
            ],
        },
        {
            name: 'material',
            type: 'select',
            hasMany: true,
            options: [
                {
                    label: 'Digitale Lehre: hohe Ausprägung',
                    value: 'Digitale Lehre: hohe Ausprägung',
                },
                {
                    label: 'Digitale Lehre: mittlere Ausprägung',
                    value: 'Digitale Lehre: mittlere Ausprägung',
                },
                {
                    label: 'Digitale Lehre: niedrige Ausprägung',
                    value: 'Digitale Lehre: niedrige Ausprägung',
                },
                { label: 'Digitale Reaktionsfunktionen', value: 'Digitale Reaktionsfunktionen' },
                {
                    label: 'Digitales Textsammlungstool (bspw. Etherpad)',
                    value: 'Digitales Textsammlungstool (bspw. Etherpad)',
                },
                { label: 'Digitales Umfragetool', value: 'Digitales Umfragetool' },
                {
                    label: 'Digitales Whiteboard (bspw. Miro)',
                    value: 'Digitales Whiteboard (bspw. Miro)',
                },
                { label: 'IT Kompetenz: hohe Ausprägung', value: 'IT Kompetenz: hohe Ausprägung' },
                {
                    label: 'IT Kompetenz: mittlere Ausprägung',
                    value: 'IT Kompetenz: mittlere Ausprägung',
                },
                {
                    label: 'IT Kompetenz: niedrige Ausprägung',
                    value: 'IT Kompetenz: niedrige Ausprägung',
                },
                {
                    label: 'Interaktive Quiz-Plattform (bspw. Kahoot)',
                    value: 'Interaktive Quiz-Plattform (bspw. Kahoot)',
                },
                {
                    label: 'Kommunikation / Kollaboration: hohe Ausprägung',
                    value: 'Kommunikation / Kollaboration: hohe Ausprägung',
                },
                {
                    label: 'Kommunikation / Kollaboration: mittlere Ausprägung',
                    value: 'Kommunikation / Kollaboration: mittlere Ausprägung',
                },
                {
                    label: 'Kommunikation / Kollaboration: niedrige Ausprägung',
                    value: 'Kommunikation / Kollaboration: niedrige Ausprägung',
                },
                { label: 'Powerpoint', value: 'Powerpoint' },
                {
                    label: 'Videokonferenztool, mit Breakout-Räumen (bspw. Zoom, Teams)',
                    value: 'Videokonferenztool, mit Breakout-Räumen (bspw. Zoom, Teams)',
                },
                {
                    label: 'Videokonferenztool, ohne Breakout-Räume (bspw. Zoom, Teams)',
                    value: 'Videokonferenztool, ohne Breakout-Räume (bspw. Zoom, Teams)',
                },
                { label: 'Videos', value: 'Videos' },
                { label: 'Virtuelle Welt', value: 'Virtuelle Welt' },
            ],
        },
        {
            name: 'roomSpec',
            type: 'select',
            hasMany: true,
            options: [
                { label: 'Aktiv', value: 'Aktiv' },
                { label: 'Interaktiv', value: 'Interaktiv' },
                { label: 'Konstruktiv', value: 'Konstruktiv' },
                { label: 'Passiv', value: 'Passiv' },
            ],
        },
        // --- Participants ---
        {
            name: 'participantsMin',
            type: 'number',
            min: 1,
        },
        {
            name: 'participantsMax',
            type: 'number',
            min: 1,
        },
        {
            name: 'participantsComment',
            type: 'text',
        },
        // --- Time ---
        {
            name: 'timeMin',
            type: 'number',
            min: 0,
            admin: {
                description: 'Minimum time in minutes',
            },
        },
        {
            name: 'timeMax',
            type: 'number',
            min: 0,
            admin: {
                description: 'Maximum time in minutes',
            },
        },
        {
            name: 'timeComment',
            type: 'text',
        },
        // --- Content ---
        {
            name: 'proceeding',
            type: 'textarea',
        },
        {
            name: 'phaseProceeding',
            type: 'textarea',
        },
        {
            name: 'result',
            type: 'textarea',
        },
        {
            name: 'seating',
            type: 'textarea',
        },
        {
            name: 'tips',
            type: 'textarea',
        },
        {
            name: 'variations',
            type: 'textarea',
        },
        {
            name: 'examples',
            type: 'textarea',
        },
        {
            name: 'citations',
            type: 'textarea',
        },
        {
            name: 'links',
            type: 'textarea',
        },
        {
            name: 'visualization',
            type: 'textarea',
        },
        {
            name: 'experiences',
            type: 'textarea',
        },
        // --- Metadata ---
        {
            name: 'userRating',
            type: 'number',
            min: 0,
            max: 5,
            defaultValue: 0,
        },
        {
            name: 'vendorId',
            type: 'text',
            admin: {
                description: 'Original ID from Mobidics source system',
                position: 'sidebar',
            },
        },
        {
            name: 'originalCreationDate',
            type: 'date',
            admin: {
                position: 'sidebar',
            },
        },
    ],
};
