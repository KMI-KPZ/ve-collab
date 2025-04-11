import { GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Imprint(): JSX.Element {
    return (
        <>
            <p className="font-bold text-4xl mt-10">Impressum</p>
            <p className="font-bold text-2xl mt-10">
                Institut für Angewandte Informatik (InfAI) e. V.
            </p>
            <p>Goerdelerring 9</p>
            <p>04109 Leipzig</p>
            <br />
            <p>Telefon: +49 341 229037 0</p>
            <p>Telefax: +49 341 229037 99</p>
            <p>
                E-Mail:{' '}
                <a href="mailto:info@infai.org" className="text-blue-700 underline">
                    info@infai.org
                </a>
            </p>
            <br />
            <p>Vertretungsberechtigter Vorstand:</p>
            <p>Prof. Dr. Bogdan Franczyk (1. Vorsitzender)</p>
            <p>Prof. Dr. Erhard Rahm (2. Vorsitzender)</p>
            <p>Prof. Dr. André Ludwig</p>
            <p>Prof. Dr. Roland Fassauer</p>
            <br />
            <p>Vorstandsbeisitzer:</p>
            <p>Prof. Dr. Sören Auer</p>
            <p>Prof. Dr. Gerhard Heyer</p>
            <p>Prof. Dr. Gerik Scheuermann</p>
            <br />
            <p>Geschäftsführung:</p>
            <p>Ingolf Römer, Andreas Heinecke, Prof. Dr. Roland Fassauer</p>
            <br />
            <p>Registereintrag:</p>
            <p>Registergericht: Amtsgericht Leipzig</p>
            <p>Registernummer: VR 4342</p>
            <br />
            <p>Umsatzsteuer-ID:</p>
            <p>Umsatzsteuer-Identifikationsnummer nach §27a Umsatzsteuergesetz:</p>
            <p>DE274344504</p>
            <p className="font-bold text-2xl mt-10">InfAI Infinity GmbH</p>
            <p>Goerdelerring 9</p>
            <p>04109 Leipzig</p>
            <br />
            <p>Telefon: +49 341 229037 0</p>
            <p>Telefax: +49 341 229037 99</p>
            <p>
                E-Mail:{' '}
                <a href="mailto:info@infai.org" className="text-blue-700 underline">
                    info@infai.org
                </a>
            </p>
            <br />
            <p>Geschäftsführung:</p>
            <p>Ingolf Römer, Andreas Heinecke</p>
            <br />
            <p>Registereintrag:</p>
            <p>Registergericht: Amtsgericht Leipzig</p>
            <p>Registernummer: HRB 41024</p>
            <br />
            <p>Umsatzsteuer-ID:</p>
            <p>Umsatzsteuer-Identifikationsnummer nach §27a Umsatzsteuergesetz:</p>
            <p className="font-bold text-2xl mt-10">InfAI Management GmbH</p>
            <p>Goerdelerring 9</p>
            <p>04109 Leipzig</p>
            <br />
            <p>Telefon: +49 341 229037 0</p>
            <p>Telefax: +49 341 229037 99</p>
            <p>
                E-Mail:{' '}
                <a href="mailto:info@infai.org" className="text-blue-700 underline">
                    info@infai.org
                </a>
            </p>
            <br />
            <p>Geschäftsführung:</p>
            <p>Michael Fiedler</p>
            <br />
            <p>Registereintrag:</p>
            <p>Registergericht: Amtsgericht Leipzig</p>
            <p>Registernummer: HRB 31783</p>
            <br />
            <p>Umsatzsteuer-ID:</p>
            <p>Umsatzsteuer-Identifikationsnummer nach §27a Umsatzsteuergesetz:</p>
            <p>DE301550288</p>
            <p className="font-bold text-2xl mt-10">
                Hinweis gemäß Online-Streitbeilegungs-Verordnung
            </p>
            <p>
                Nach geltendem Recht sind wir verpflichtet, Verbraucher auf die Existenz der
                Europäischen Online-Streitbeilegungs-Plattform hinzuweisen, die für die Beilegung
                von Streitigkeiten genutzt werden kann, ohne dass ein Gericht eingeschaltet werden
                muss. Für die Einrichtung der Plattform ist die Europäische Kommission zuständig.
                Die Europäische Online-Streitbeilegungs-Plattform ist hier zu finden:{' '}
                <a href="http://ec.europa.eu/odr" className="underline text-blue-700">
                    http://ec.europa.eu/odr
                </a>
                . Unsere E-Mail lautet:{' '}
                <a href="mailto:info@infai.org" className="text-blue-700 underline">
                    info@infai.org
                </a>
            </p>
            <p className="font-bold text-2xl mt-10">
                Hinweis gemäß Verbraucherstreitbeilegungsgesetz (VSBG)
            </p>
            <p>
                Wir sind nicht bereit und verpflichtet, an Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            <p className="font-bold text-2xl mt-10">
                Verantwortlicher für journalistisch-redaktionelle Inhalte gem. § 55 II RstV:
            </p>
            <p>Tower PR</p>
            <p>Heiner Schaumann</p>
            <p>Mälzerstraße 3</p>
            <p>07745 Jena</p>
            <p>Tel: +49 (0) 3641 – 8761180</p>
            <p>Fax: +49 (0) 3641 – 8761188</p>
            <p>
                <a href="mailto:info@tower-pr.com" className="text-blue-700 underline">
                    info@tower-pr.com
                </a>
            </p>
            <p>
                <a href="https://tower-pr.com/impressum/" className="text-blue-700 underline">
                    www.tower-pr.com
                </a>
            </p>
            <p className="font-bold text-2xl mt-10">Disclaimer – rechtliche Hinweise</p>
            <br />
            <p>§ 1 Warnhinweis zu Inhalten</p>
            <p>
                Die kostenlosen und frei zugänglichen Inhalte dieser Webseite wurden mit
                größtmöglicher Sorgfalt erstellt. Trotz sorgfältiger inhaltlicher Kontrolle
                übernehmen wir keine Haftung für die Inhalte interner Links. Für den Inhalt der
                verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich. Allein durch
                den Aufruf der kostenlosen und frei zugänglichen Inhalte kommt keinerlei
                Vertragsverhältnis zwischen dem Nutzer und dem Anbieter zustande, insoweit fehlt es
                am Rechtsbindungswillen des Anbieters.
            </p>
            <br />
            <p>§ 2 Externe Links</p>
            <p>
                Diese Website enthält Verknüpfungen zu Websites Dritter („externe Links“). Diese
                Websites unterliegen der Haftung der jeweiligen Betreiber. Der Anbieter hat bei der
                erstmaligen Verknüpfung der externen Links die fremden Inhalte daraufhin überprüft,
                ob etwaige Rechtsverstöße bestehen. Zu dem Zeitpunkt waren keine Rechtsverstöße
                ersichtlich. Der Anbieter hat keinerlei Einfluss auf die aktuelle und zukünftige
                Gestaltung und auf die Inhalte der verknüpften Seiten. Das Setzen von externen Links
                bedeutet nicht, dass sich der Anbieter die hinter dem Verweis oder Link liegenden
                Inhalte zu Eigen macht. Eine ständige Kontrolle der externen Links ist für den
                Anbieter ohne konkrete Hinweise auf Rechtsverstöße nicht zumutbar. Bei Kenntnis von
                Rechtsverstößen werden jedoch derartige externe Links unverzüglich gelöscht.
            </p>
            <br />
            <p>§ 3 Urheber- und Leistungsschutzrechte</p>
            <p>
                Die auf dieser Website veröffentlichten Inhalte unterliegen dem deutschen Urheber-
                und Leistungsschutzrecht. Jede vom deutschen Urheber- und Leistungsschutzrecht nicht
                zugelassene Verwertung bedarf der vorherigen schriftlichen Zustimmung des Anbieters
                oder jeweiligen Rechteinhabers. Dies gilt insbesondere für Vervielfältigung,
                Bearbeitung, Übersetzung, Einspeicherung, Verarbeitung bzw. Wiedergabe von Inhalten
                in Datenbanken oder anderen elektronischen Medien und Systemen. Inhalte und Rechte
                Dritter sind dabei als solche gekennzeichnet. Die unerlaubte Vervielfältigung oder
                Weitergabe einzelner Inhalte oder kompletter Seiten ist nicht gestattet und
                strafbar. Lediglich die Herstellung von Kopien und Downloads für den persönlichen,
                privaten und nicht kommerziellen Gebrauch ist erlaubt.
            </p>
            <br />
            <p>
                Die Darstellung dieser Website in fremden Frames ist nur mit schriftlicher Erlaubnis
                zulässig.
            </p>
            <br />
            <p>§ 4 Besondere Nutzungsbedingungen</p>
            <p>
                § 4 Besondere Nutzungsbedingungen Soweit besondere Bedingungen für einzelne
                Nutzungen dieser Website von den vorgenannten Paragraphen abweichen, wird an
                entsprechender Stelle ausdrücklich darauf hingewiesen. In diesem Falle gelten im
                jeweiligen Einzelfall die besonderen Nutzungsbedingungen.
            </p>
            <br />
            <p>
                Quelle:{' '}
                <a href="https://www.impressum-recht.de" className="text-blue-700 underline">
                    www.impressum-recht.de
                </a>
            </p>
            <p className="font-bold text-2xl mt-10">Projektinformationen VE-Collab</p>
            <p className="underline mt-4">Verbundkoordinatorin</p>
            <p>Prof. Dr. Nicola Würffel</p>
            <br />
            <p className="underline mt-4">Selbstlernmaterialien</p>
            <p className="">Autor:innen:</p>
            <p>VE-Collab (Christine Magosch, Elisa Müller, Aliaksandra Huseva)</p>
            <p>Prof.in Dr.in Almut Ketzer-Nöltge</p>
            <p>Prof.in Dr. Petra Knorr</p>
            <p>Fabian Krengel</p>
            <p>Sandra McGury</p>
            <p>Sina Werner</p>
            <br />
            <p>Umsetzung / Visualisierung:</p>
            <p>Christine Magosch, Elisa Müller, Annika Liese, Maria Ferrera Feria</p>
            <p className="underline mt-4">VE-Designer</p>
            <p>Konzeption:</p>
            <p>Mihaela Marcovic, Elisa Müller, Christine Magosch</p>
            <p className="underline mt-4">technische Entwicklung</p>
            <p className="mb-10">Christian Schlecht, Simeon Ackermann, Jonas Greim</p>
        </>
    );
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common', 'community'])),
        },
    };
}
