# Teacher Voice Agent

A browser voice agent with a **Teacher** persona: it guides a person through a
web task step by step, and the person does every click and keystroke
themselves. The agent explains, points, encourages and answers questions. It
never acts on the page.

It is built around the Teacher persona from *What Moves the Dial? Understanding
Age and Task Characteristics Shaping Preferences for Computer-Use Voice Agent
Autonomy* (CHI 2027 submission), and follows the design of the Controller in
the [AI for Accessibility Toolkit](https://github.com/AI-for-Accessibility-Collective/AI-for-Accessibility-Toolkit).

> **Status:** research prototype. The first lesson runs on **Corner Market**, a
> fictional demo shop. Nothing is bought, no payment is taken, and nothing
> leaves the page.

## Try it

No install or build step. Serve the folder and open it in Chrome or Edge, which
support voice input:

```bash
npm start            # or: python3 -m http.server 4100
# open http://localhost:4100
```

Then say or type something like *"My granddaughter's birthday is this weekend
and I'd like to send her a cake, but I don't know where to start."* Typing
works everywhere the mic does.

URL options for study sessions:

| Option | Effect |
|---|---|
| `?tone=warm\|neutral\|minimal` | Starting tone (default `warm`) |
| `?stuck=25` | Seconds of no activity before a gentle nudge (default 25) |
| `?fresh=1` | Treat the participant as new, ignoring past completions |

**Settings → Download session log** saves a JSON log of the session: what was
said, each step, highlights, nudges and tone changes.

## How the Teacher behaves

| Teacher trait | How it's built |
|---|---|
| **User acts; the agent never takes over** | The agent's only way to touch the page is `guide.js`, which can highlight and clear, and nothing else. There is no click, type, scroll or navigate method, so the limit is structural rather than a prompt instruction. Asking "can you do it for me?" gets a kind refusal and a brighter highlight. |
| **Gives the next step before being asked** | The shop reports its state after each of the person's actions. When a step's goal is met, the Teacher praises it and gives the next instruction. |
| **Explains why** | Every step has a reason that transfers to other sites ("the cart is almost always in the top right corner"). Ask "why" at any point. |
| **Friction is a teaching moment** | "I can't find it" or a quiet spell brings more specific hints and a brighter, pulsing highlight. Unprompted nudges stop at two per step, so it doesn't nag. |
| **Reflective, skill-affirming close** | The recap lists only what the person actually did ("you chose the size, added a message, …"). |

The paper's design guidelines are built in as well:

- **DG1, guidance that fades with familiarity.** Once someone has finished the
  lesson, the next session *offers* short reminders instead of the full
  walkthrough, and the person chooses. "Shorter" and "more detail" work at any
  time.
- **DG2, tone separate from control.** *Settings → How I talk* switches between
  warm, neutral and minimal. The steps, hints and highlights are the same at
  every tone; only the wording changes. This responds to participants who
  objected to the Teacher's tone rather than to the amount of guidance.
- **Judgment stays with the person.** The last step frames "Place order" as the
  decision point and asks the person to review the summary first.
- **Sensitive information.** For the address step, the Teacher says the person
  types it themselves. The shop reports only *that* the address is filled in,
  never what was typed, so it can't appear in the agent's state or the log.

Things you can say: *why*, *where is it*, *I'm stuck*, *repeat that*, *done*,
*shorter*, *more detail*, *stop*.

## Files

```
index.html                 the page: shop on the left, Teacher on the right
styles.css
src/teacher.js             the lesson engine: pure, no DOM, unit-tested
src/persona.js             wording for each tone (warm / neutral / minimal)
src/lessons/birthday-cake.js  the lesson: steps, targets, reasons, hints
src/guide.js               the highlight overlay, the agent's only page access
src/shop.js                Corner Market, the mock shop
src/panel.js               the voice agent panel (transcript, mic, settings)
src/voice.js               speech in and out (Web Speech API)
src/main.js                wiring and session log
test/teacher.test.mjs      engine tests
```

## Writing another lesson

A lesson is a list of steps in `src/lessons/`. Each step names the shop page it
happens on, a CSS selector to highlight, the instruction, a short reminder, the
reason, two hints, and a `doneWhen(state)` check. See `birthday-cake.js` for a
commented example. To use a new app, give it `data-guide` attributes on the
elements the Teacher should point to and have it report its state the way
`shop.js` does.

## Tests

```bash
npm test
```

The tests cover the whole cake lesson, refusing to act, hints that escalate and
then stop, getting back on track after leaving a page, the private address step,
tone changing wording but not guidance, and the familiarity offer.

## Credits

The voice selection and speech clean-up in `src/voice.js` follow the
Controller's web UI in the AI for Accessibility Toolkit (Apache-2.0).
