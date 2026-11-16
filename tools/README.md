# tools

## import-characters.py

Regenerates `src/data/animeSeries.ts` and `src/data/characters.ts` from the
character workbook.

```
python3 tools/import-characters.py path/to/AnimeQuiz_Characters.xlsx
```

It expects three sheets — `Персонажи`, `Аниме`, `Уровни сложности` — in the
shape the current workbook uses, and prints what it did: how many rows it
wrote, which it skipped, and which ids it had to renumber.

Two rules are worth knowing before changing it:

**Characters already in the app keep their existing ids.** A character id is
not a private detail. It is stored in every player's profile as their
favourite, and it keys the recorded lines in `assets/quotes/`. The workbook
numbers its rows independently — its `naruto-1` is Madara where the app's is
Naruto — so adopting its ids wholesale would change whose face a player picked
and which voice line plays. Rows are matched to existing characters by name
(with a few spelling aliases), and only genuinely new ones get a new id.

**Rows the workbook flags `⚠ проверить привязку к аниме` are left out.** They
carry no quote, ability or faction, which the app requires, and the flag
doubts the one field they do have. A series left with no characters is dropped
with them.

`xlsx.py` beside it is a small reader for the parts of the format this needs;
a workbook is a zip of XML and the standard library has both, so there is no
third-party dependency to install.

## import-portraits.py

Turns uploaded character pictures into the app's portraits.

```
python3 tools/import-portraits.py [another/folder]
```

The portraits in `assets/characters/` are named by the **characters table's**
id — `naruto-1.jpg` is the table's naruto-1, Madara — so the folder reads the
same as the table. (The app's own ids differ for 73 characters; which table id
is which app character is in `portrait-ids.json`, made from the table by name,
and `src/data/avatarImages.ts` maps between them.)

To add or replace a portrait, put `<table id>.png` into `assets/characters/`
(GitHub's "Add files via upload" works) and run this. Every `.png` there, and
every picture in a folder given on the command line, becomes a 1024×1024 JPEG
of the same name: transparent margins trimmed so round artwork fills the
circle the app shows, see-through parts made white, about 200 KB. The uploaded
PNG is deleted (2–3 MB each would make the app hundreds of megabytes), and
`avatarImages.ts` is rewritten. Uploads that arrived empty, names that are not
table ids, and characters the app does not have are listed and left alone; so
are characters still without a portrait. Needs ImageMagick.

