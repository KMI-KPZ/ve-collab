#### Kurzfassung
db.plan.audience.mother_tongue + db.plan.audience.foreign_languages --> db.plan.audience.languages

#### branch
planerRedesign20

#### Beschreibung
- Zielgruppen-Attribute `mother_tongue` und `foreign_languages` werden vereint zu `languages`, Datentyp `str` oder `null`

#### letzte Änderung
11.06.24 09:00

---

#### Kurzfassung
db.plan.steps.learning_activity neu

#### branch
fineplanner_field_revival

#### Beschreibung
- Attribt `learning_activity` ist neu in jedem `Step`, Datentyp `str` oder `null`

#### letzte Änderung
05.06.24 09:30

---

#### Kurzfassung
db.plan.methodical_approach --> db.plan.methodical_approaches

#### branch
ve_designer_rework

#### Beschreibung
- Attribt `methodical_approach` wird umbenannt zu `methodical_approaches` und erhält Datentyp `string[]`

#### letzte Änderung
26.06.24 09:30

---