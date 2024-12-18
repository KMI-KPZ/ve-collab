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
- Attribut `learning_activity` ist neu in jedem `Step`, Datentyp `str` oder `null`

#### letzte Änderung
05.06.24 09:30

---

#### Kurzfassung
db.plan.methodical_approach --> db.plan.methodical_approaches

#### branch
ve_designer_rework

#### Beschreibung
- Attribut `methodical_approach` wird umbenannt zu `methodical_approaches` und erhält Datentyp `string[]`

#### letzte Änderung
26.06.24 09:30

---

#### Kurzfassung
db.plan.abstract neu
db.plan.literature neu
db.plan.literature_files neu

#### branch
nachVE

#### Beschreibung
- Attribut `abstract` ist neu in jedem Plan, Datentyp `str` oder `null`
- Attribut `literature` ist neu in jedem Plan, Datentyp `str` oder `null`
- Attribut `literature_files` ist neu in jedem Plan, Datentyp `{file_name: string, file_id: string}[]`

#### letzte Änderung
02.08.24 11:15

---

#### Kurzfassung
db.plan.steps.original_plan neu

#### branch
stepsImport

#### Beschreibung
- Attribt `original_plan` ist neu in jedem Step von einem Plan, Datentyp `str`, `ObjectId` oder `null`

#### letzte Änderung
16.08.24 09:30

---

#### Kurzfassung
db.plan.audience --> db.plan.target_groups

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `audience` wird umbenannt zu `target_groups`

#### letzte Änderung
19.08.24 15:00

---

#### Kurzfassung
db.plan.formalities --> db.plan.checklist

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `formalities` wird umbenannt zu `checklist`

#### letzte Änderung
19.08.24 15:00

---

#### Kurzfassung
db.plan.institutions.departments --> db.plan.institutions.department

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `departments` von institutions wird umbenannt zu `department` und erhält Datentyp `str`

#### letzte Änderung
20.08.24 09:30

---

#### Kurzfassung
db.plan.new_content gelöscht

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `new_content` wird gelöscht

#### letzte Änderung
20.08.24 11:00

---

#### Kurzfassung
db.plan.steps.evaluation_tools, db.plan.steps.attachments, db.plan.steps.custom_attributes gelöscht

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `evaluation_tools` von Steps wird gelöscht
- Attribut `attachments` von Steps wird gelöscht
- Attribut `custom_attributes` von Steps wird gelöscht

#### letzte Änderung
20.08.24 11:30

---

#### Kurzfassung
db.plan.good_practise_evaluation gelöscht

#### branch
backend_attribute_renaming

#### Beschreibung
- Attribut `good_practise_evaluation` wird gelöscht

#### letzte Änderung
20.08.24 11:45

---

#### Kurzfassung
db.plan.target_groups.languages Datentyp str --> List[str]

#### branch
feedback_tweaks

#### Beschreibung
- Attribut `languages` in jeder `target_group` ändert Datentyp von `str` zu `List[str]`

#### letzte Änderung
17.10.24 11:45

---

#### Kurzfassung
db.plan.evaluation.evaluation_before neu

#### branch
feedback_tweaks

#### Beschreibung
- Attribut `evaluation_before` ist neu in jeder `Evaluation` von einem Plan, Datentyp `str` oder `null`

#### letzte Änderung
21.10.24 14:30

---

#### Kurzfassung
db.profiles.notification_settings neu

#### branch
periodic_notifications

#### Beschreibung
- Attribt `notification_settings` ist neu in jedem profile. Datentype `dict`
- Struktur:
    {
        "messages": "none|push|email",
        "ve_invite": "none|push|email",
        "group_invite": "none|push|email",
        "system": "none|push|email",
    }

#### letzte Änderung
25.10.24 14:00

---

#### Kurzfassung
db.plan.target_groups.age_min + age_max --> data.plan.target_groups.semester

#### branch
target_groups_semester

#### Beschreibung
- Attribute `age_min` und `age_max` von den `target_groups` von einem Plan werden entfernt, stattdessen neues Attribut `semester`, Datentyp `str` oder `null`

#### letzte Änderung
11.11.24 14:30

---

#### Kurzfassung
db.plan.is_good_practise_planned neu
#### branch
post-process-rework

#### Beschreibung
- Attribut `is_good_practise_planned` ist neu in jedem Plan, Datentyp `boolean` oder `null`

#### letzte Änderung
18.12.24 09:30
