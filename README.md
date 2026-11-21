# Waking Matter website: four directions

**Live demo:** <https://anubhutianima-ai.github.io/waking-matter-directions/>

These are design concepts, not the live site. The Waking Matter name, wordmark, copy and the E2B logotype belong to their owners.

Four interactive concepts for redesigning [wakingmatter.com](https://wakingmatter.com). All four keep the brand (type, colour, mark) and the site's own copy. In each, one element travels down the page and changes with every section, and every motion is tied to what the lab builds: memory, provenance and evaluation infrastructure for agents.

## View it

The pages use relative paths, so serve the folder rather than opening files from disk:

```
python3 -m http.server 8741
```

Then open <http://127.0.0.1:8741/>. `index.html` is the review page: the reference study, one tab per direction (desktop and phone frames, a reduced-motion switch, jump-to-scene chips), edge cases and the direction-distance check. Each direction also opens on its own as `direction-A.html` to `direction-D.html`.

## The directions

| | The hero explains it by | The one element, and what it becomes | Best for |
|---|---|---|---|
| **A · The Second Run** (dark) | Running the same task twice; Run 2 starts with a check that Run 1 earned | One thread and bead: a bundle of stored history, a gate, four lanes, weekly passes, a column of ticks, then the mark | First-time visitors, investors |
| **B · The Aperture** (dark to ivory) | Annotating the logo: provenance, memory, evaluation | The pillars become page rails; each section gate inscribes a tick; the close re-forms the mark | A distinctive brand moment |
| **C · The Record** (ivory, one dark card) | A memory record you can operate: accept, reject, source changed, an invalid promotion that is refused | The same record travels and changes face: card, contract graph, ledger, one line | Builders evaluating the library |
| **D · The Instrument** (ivory) | A figure of eight weekly runs that repeat one mistake | One pinned plate morphs through the four research questions, then opens a record | Researchers and collaborators |

Recommendation: **A**. It is the only direction where the hero shows the idea working, and the same thread then connects every section. `directions.json` holds the structured rationale, the style register and the distance check.

## Status

Built on 20 Nov 2026. Checked in Chrome: required copy and links present with JavaScript off, no horizontal overflow from 320 to 1920 px, text contrast audit with no failures at 390 and 1440 px, every link clickable, jump-to-scene landings, reduced-motion pages.

Not done: Safari, Firefox and real-device testing, user research, a screen reader pass, and founder sign-off on B's reading of the mark and on the new microcopy. All demo data is an invented scenario, labelled "Illustrative scenario, not a result" on the page.

## Folder

```
index.html            review page
direction-A..D.html   the four directions (self-contained, one file each)
directions.json       rationale, style register, distance check
shared/               tokens.css, dir.js (scroll runtime), wrapper.*, fonts (with licences), assets
```

## Credits and third-party material

- Waking Matter name, lockups, colours and copy are from wakingmatter.com. Fonts are Newsreader, Inter and IBM Plex Mono under the SIL Open Font License 1.1, self-hosted as on the live site. The licence texts are in `shared/fonts/licenses/`.
- The E2B logotype belongs to E2B and appears as it does in the live site footer.
- pramaanalabs.ai and swarms.ai were studied as references (observed 20 Nov 2026). Their screenshots are not included.
- No licence file is included, so all rights are reserved by default.
