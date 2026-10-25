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
favourite, and it keys both the pre-rendered avatar PNGs in
`assets/characters/` and the recorded lines in `assets/quotes/`. The workbook
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
