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

---

#### Kurzfassung
db.fs.files.contentType --> db.fs.files.metadata.content_type

#### branch
fileshare

#### Beschreibung
- PyMongo 4 markiert die Properties `content_type` von `GridIn`/`GridOut` (das Top-Level-Feld `contentType` der GridFS-Dateidokumente) als deprecated, PyMongo 5 entfernt sie. Der MIME-Type wird deshalb ab jetzt in den Metadaten der Datei abgelegt: `metadata.content_type` (Datentyp `str` oder `null`). Alle Schreibzugriffe laufen über `util.gridfs_put()`, alle Lesezugriffe über `util.gridfs_content_type()` (mit Fallback auf das Legacy-Feld für noch nicht migrierte Dateien).
- Migration bestehender Dateien (idempotent, vor dem Upgrade auf PyMongo 5 nötig): `docker exec backend python3 -m migrations.gridfs_content_type`. Kopiert `contentType` nach `metadata.content_type` (bereits vorhandene Metadaten-Werte bleiben erhalten) und entfernt anschließend das Top-Level-Feld.

#### letzte Änderung
02.11.26 15:30

---

#### Kurzfassung
db.spaces.files gelöscht --> neue Collection db.space_files

#### branch
fileshare

#### Beschreibung
- Das eingebettete Array `files` in jedem Space entfällt. Die Dateiablage wird zu einer hierarchischen Ordnerstruktur in der neuen Collection `space_files`, ein Dokument pro Datei bzw. Ordner:
    {
        "space": ObjectId,
        "parent": ObjectId | null,        // null = Wurzelverzeichnis des Spaces
        "type": "folder" | "file",
        "name": str,                      // pro Ordner eindeutig (ohne Beachtung der Groß-/Kleinschreibung)
        "author": str,
        "created": datetime,
        "modified": datetime,
        // nur Ordner:
        "system": str | null,             // "post_files" markiert den reservierten Ordner für Beitragsanhänge
        // nur Dateien:
        "file_id": ObjectId,              // GridFS _id
        "content_type": str,              // aus dem Dateinamen abgeleitet
        "size": int,
        "manually_uploaded": bool,        // false = Anhang eines Beitrags (nur lesbar, kopierbar)
        "post_id": ObjectId | null
    }
- Indizes: `space_files_space_parent` (space, parent), `space_files_unique_name` (space, parent, name; unique, Collation `en`/Stärke 2), `space_files_file_id` (file_id). Werden beim Start des Backends angelegt.
- Grenzen (Konstanten in `resources/network/space_files.py`): max. Ordnertiefe 5, max. 80 MB pro Datei, max. 2 GB pro Space, max. 255 Zeichen pro Name.
- Migration bestehender Dateien (idempotent, einmalig nach dem Deployment): `docker exec backend python3 -m migrations.space_files`. Manuell hochgeladene Dateien landen im Wurzelordner, Anhänge der Beiträge des Spaces (ohne Reposts) im Ordner für Beitragsanhänge, Einträge ehemaliger Beitragsanhänge ohne Beitrag als normale Dateien im Wurzelordner. Anschließend wird `files` aus dem Space entfernt.

#### letzte Änderung
02.11.26 15:55

---

#### Kurzfassung
db.chatrooms.messages.files neu

#### branch
dev

#### Beschreibung
- Nachrichten können Dateien enthalten. Attribut `files` ist neu in jeder Nachricht eines Chatrooms, Datentyp `list` von `{"file_id": ObjectId, "file_name": str, "content_type": str, "size": int}`; die Bytes liegen in GridFS (Uploader in `metadata.uploader`).
- Migration bestehender Nachrichten (idempotent, einmalig direkt nach dem Deployment): `docker exec backend python3 -m migrations.chat_message_files`. Ergänzt `files: []` in allen Nachrichten ohne das Attribut. Bis die Migration gelaufen ist, scheitern das Ausliefern noch nicht bestätigter Altnachrichten beim Login über Socket.IO und das Löschen von Chatrooms mit Altnachrichten.
- Index `chatrooms_message_files` auf `messages.files.file_id` (Berechtigungsprüfung beim Ausliefern der Dateien), wird beim Start des Backends angelegt.
- Grenzen (Konstanten in `resources/network/chat.py`): max. 10 Dateien und zusammen max. 80 MB pro Nachricht, max. 2 GB pro Chatroom.
- Beim Löschen eines Chatrooms werden alle darin gesendeten Dateien aus GridFS entfernt.

#### letzte Änderung
10.11.26 13:48
