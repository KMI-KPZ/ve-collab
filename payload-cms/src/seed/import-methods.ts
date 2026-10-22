import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

interface SourceMethod {
    _id: string;
    title: string;
    alternative_title: string;
    author: string;
    language: 'de' | 'en';
    thumbnail: string;
    course_type: ('Seminar' | 'Übung' | 'Vorlesung')[];
    social_form: (
        | 'Einzelarbeit'
        | 'Partner/Gruppenarbeit'
        | 'Plenum frontal'
        | 'Plenum interaktiv'
        | 'Plenum untereinander'
    )[];
    phase: (
        | '(Lern-)Atmosphäre fördern'
        | 'Ausrichten'
        | 'Auswerten'
        | 'Informieren'
        | 'Verarbeiten'
        | 'Vorwissen aktivieren'
    )[];
    sub_phase: (
        | 'Auf Thema einstimmen / Sensibilisieren'
        | 'Auflockerung'
        | 'Ausklang'
        | 'Feedback einholen'
        | 'Inhalte wiederholen'
        | 'Kennenlernen'
        | 'Kritische Auseinandersetzung mit Wissen'
        | 'Lernprozess reflektieren'
        | 'Persönlicher Austausch (Erfahrung)'
        | 'Vorwissen erfragen'
        | 'Wissen abfragen'
        | 'Wissen anwenden / umsetzen'
        | 'Wissen festigen'
        | 'Wissen generieren'
        | 'Wissensinput'
    )[];
    material: (
        | 'Digitale Lehre: hohe Ausprägung'
        | 'Digitale Lehre: mittlere Ausprägung'
        | 'Digitale Lehre: niedrige Ausprägung'
        | 'Digitale Reaktionsfunktionen'
        | 'Digitales Textsammlungstool (bspw. Etherpad)'
        | 'Digitales Umfragetool'
        | 'Digitales Whiteboard (bspw. Miro)'
        | 'IT Kompetenz: hohe Ausprägung'
        | 'IT Kompetenz: mittlere Ausprägung'
        | 'IT Kompetenz: niedrige Ausprägung'
        | 'Interaktive Quiz-Plattform (bspw. Kahoot)'
        | 'Kommunikation / Kollaboration: hohe Ausprägung'
        | 'Kommunikation / Kollaboration: mittlere Ausprägung'
        | 'Kommunikation / Kollaboration: niedrige Ausprägung'
        | 'Powerpoint'
        | 'Videokonferenztool, mit Breakout-Räumen (bspw. Zoom, Teams)'
        | 'Videokonferenztool, ohne Breakout-Räume (bspw. Zoom, Teams)'
        | 'Videos'
        | 'Virtuelle Welt'
    )[];
    room_spec: ('Aktiv' | 'Interaktiv' | 'Konstruktiv' | 'Passiv')[];
    participants_min: number;
    participants_max: number;
    participants_comment: string;
    time_min: number;
    time_max: number;
    time_comment: string;
    proceeding: string;
    phase_proceeding: string;
    experiences: string;
    result: string;
    seating: string;
    tips: string;
    variations: string;
    examples: string;
    citations: string;
    links: string;
    visualization: string;
    user_rating: number;
    vendorId: string;
    creation_date: number;
    folder: string;
}

async function seed() {
    const payload = await getPayload({ config });

    // Check if methods already exist to avoid duplicate seeding
    const existing = await payload.count({ collection: 'methods' });
    if (existing.totalDocs > 0) {
        console.log(`Skipping seed: ${existing.totalDocs} methods already exist.`);
        process.exit(0);
    }

    // Read source data
    const dataPath = path.resolve(dirname, '../../default_methods.json');
    const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));
    const methods: SourceMethod[] = raw.methods;

    console.log(`Importing ${methods.length} methods...`);

    let created = 0;
    let failed = 0;

    for (const method of methods) {
        try {
            await payload.create({
                collection: 'methods',
                data: {
                    title: method.title,
                    alternativeTitle: method.alternative_title || undefined,
                    author: method.author || undefined,
                    language: method.language || 'de',
                    courseType: method.course_type?.length ? method.course_type : undefined,
                    socialForm: method.social_form?.length ? method.social_form : undefined,
                    phase: method.phase?.length ? method.phase : undefined,
                    subPhase: method.sub_phase?.length ? method.sub_phase : undefined,
                    material: method.material?.length ? method.material : undefined,
                    roomSpec: method.room_spec?.length ? method.room_spec : undefined,
                    participantsMin: method.participants_min || undefined,
                    participantsMax: method.participants_max || undefined,
                    participantsComment: method.participants_comment || undefined,
                    timeMin: method.time_min || undefined,
                    timeMax: method.time_max || undefined,
                    timeComment: method.time_comment || undefined,
                    proceeding: method.proceeding || undefined,
                    phaseProceeding: method.phase_proceeding || undefined,
                    experiences: method.experiences || undefined,
                    result: method.result || undefined,
                    seating: method.seating || undefined,
                    tips: method.tips || undefined,
                    variations: method.variations || undefined,
                    examples: method.examples || undefined,
                    citations: method.citations || undefined,
                    links: method.links || undefined,
                    visualization: method.visualization || undefined,
                    userRating: method.user_rating || 0,
                    vendorId: method.vendorId || undefined,
                    originalCreationDate: method.creation_date
                        ? new Date(method.creation_date).toISOString()
                        : undefined,
                },
            });
            created++;
            if (created % 20 === 0) {
                console.log(`  ...created ${created}/${methods.length}`);
            }
        } catch (err) {
            failed++;
            console.error(`Failed to import method "${method.title}":`, err);
        }
    }

    console.log(
        `\nSeed complete: ${created} created, ${failed} failed out of ${methods.length} total.`
    );
    process.exit(0);
}

seed();
