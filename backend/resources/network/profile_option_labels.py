"""
German labels of the options a profile stores as English keys for its expertise,
VE interests and VE goals. The frontend translates the keys with
`expertise_options`, `ve_interests_options` and `ve_goals_options` in
`frontend-vecollab/public/locales/de/community.json`, keep these in sync.

The group suggestions match profiles against the free-text names and descriptions
of groups, which are mostly written in German, so they search for both labels to
reduce mismatches due to language.
"""

EXPERTISE_OPTIONS = {
    "Agricultural and Forestry Sciences": "Agrar- und Forstwissenschaften",
    "General Natural Sciences": "Allgemeine Naturwissenschaften",
    "American Studies": "Amerikanistik",
    "English Studies": "Anglistik",
    "Archaeology": "Archäologie",
    "Architecture, Civil Engineering and Surveying": "Architektur, Bauingenieur- und Vermessungswesen",
    "Non-European Languages and Literatures": "Außereuropäische Sprachen und Literaturen",
    "Educational Sciences": "Bildungswissenschaften",
    "Biology": "Biologie",
    "Biotechnology": "Biotechnologie",
    "Book and Library Science": "Buch- und Bibliothekswesen",
    "Chemistry": "Chemie",
    "German as a Foreign and Second Language": "Deutsch als Fremd- und Zweitsprache",
    "Electrical Engineering, Electronics, Communications Engineering": "Elektrotechnik, Elektronik, Nachrichtentechnik",
    "Energy Engineering": "Energietechnik",
    "Nutritional and Household Sciences": "Ernährungs- und Haushaltswissenschaften",
    "Ethnology": "Ethnologie",
    "Subject-specific English Didactics": "Fachdidaktik Englisch",
    "Subject-specific Romance Languages Didactics": "Fachdidaktik Romanische Sprachen",
    "Horticulture": "Gartenbau",
    "Geography": "Geographie",
    "Earth Sciences": "Geowissenschaften",
    "German Studies": "Germanistik",
    "History": "Geschichte",
    "Health Sciences": "Gesundheitswissenschaften",
    "Indo-Germanic Studies": "Indogermanistik",
    "Engineering": "Ingenieurwissenschaften",
    "Computer Science": "Informatik",
    "Information Science": "Informationswissenschaft",
    "Classical Philology, Medieval Latin and Modern Greek Philology": "Klassische Philologie, Mittellateinische und Neugriechische Philologie",
    "Communication Design": "Kommunikationsdesign",
    "Cultural Studies": "Kulturwissenschaften",
    "Art History and Art History": "Kunstgeschichte und Kunstwissenschaft",
    "Literary Studies": "Literaturwissenschaft",
    "Mechanical Engineering": "Maschinenbau",
    "Mathematics": "Mathematik",
    "Media and Communication Sciences": "Medien- und Kommunikationswissenschaften",
    "Medicine": "Medizin",
    "Military Science": "Militärwissenschaft",
    "Museology": "Museologie",
    "Musicology": "Musikwissenschaft",
    "Nature and Environmental Protection": "Natur- und Umweltschutz",
    "Dutch Studies": "Niederlandistik",
    "Pedagogy": "Pädagogik",
    "Pharmacy": "Pharmazie",
    "Philosophy": "Philosophie",
    "Physics": "Physik",
    "Political Science": "Politikwissenschaft",
    "Psychology": "Psychologie",
    "Law": "Rechtswissenschaft",
    "Romance Studies": "Romanistik",
    "Scandinavian Studies": "Skandinavistik",
    "Slavic Studies": "Slawistik",
    "Sociology, Empirical Social Research, Social Work": "Soziologie, Empirische Sozialforschung, Soziale Arbeit",
    "Sports Science": "Sportwissenschaft",
    "Linguistics": "Sprachwissenschaft",
    "Speech Science": "Sprechwissenschaft",
    "Technology": "Technik",
    "Theology and Religious Studies": "Theologie und Religionswissenschaft",
    "Translation and Interpreting (Translation Studies)": "Übersetzen und Dolmetschen (Translationswissenschaft)",
    "Materials Science and Manufacturing Engineering": "Werkstoffwissenschaft und Fertigungstechnik",
    "Industrial Engineering": "Wirtschaftsingenieurwesen",
    "Economics (Business Administration and Economics)": "Wirtschaftswissenschaften (BWL und VWL)",
}


VE_INTERESTS_OPTIONS = {
    "Good Practice Examples": "Good-Practice Beispiele",
    "Evaluation": "Evaluation",
    "Subject-specific Implementation Options": "Fachspezifische Umsetzungsmöglichkeiten",
    "Research": "Forschung",
    "Funding Opportunities": "Fördermöglichkeiten",
    "Implementation": "Implementierung",
    "Methods and Task Formats": "Methoden und Aufgabenformate",
    "Networks": "Netzwerke",
    "Theoretical Foundations and Approaches": "Theoretische Grundlagen und Ansätze",
    "(Digital) Tools": "(Digitale) Tools",
}


VE_GOALS_OPTIONS = {
    "Promotion of Global Learning": "Förderung globalen Lernens",
    "Promotion of Communicative Competences": "Förderung kommunikativer Kompetenzen",
    "Promotion of Subject-specific Competences": "Förderung fachlicher Kompetenzen",
    "Promotion of (Foreign) Language Competences": "Förderung (fremd)sprachlicher Kompetenzen",
    "Interdisciplinary Exchange": "Interdisziplinärer Austausch",
    "International Cooperation": "Internationale Zusammenarbeit",
}


PROFILE_OPTION_LABELS_DE = {
    **EXPERTISE_OPTIONS,
    **VE_INTERESTS_OPTIONS,
    **VE_GOALS_OPTIONS,
}
