# Autonomy Dial Agent

A browser voice agent whose autonomy is a **dial**, not a fixed persona. It goes
from a **Teacher** (it guides, you do every click), through a **Helper** (you
lead, it steps in when you ask), to an **Autopilot** (it does the steps and
narrates). A second dial sets how familiar the task is. At every setting, the
person types private details and makes the final decision.

It is built on *What Moves the Dial? Understanding Age and Task
Characteristics Shaping Preferences for Computer-Use Voice Agent Autonomy*
(CHI 2027 submission): the three personas, P9's "levels 1 through 9", and design
guidelines DG1–DG3. It follows the design of the Controller in the
[AI for Accessibility Toolkit](https://github.com/AI-for-Accessibility-Collective/AI-for-Accessibility-Toolkit).

> **Status:** research prototype. There are two tasks, each on its own
> fictional website:
> - **Order a birthday cake** on **Basketly**, a grocery delivery marketplace
>   (the paper's persona demo task).
> - **Plan a party menu** on **Platewise**, a recipe and party-planning site
>   (the paper's Information Management scenario: 10 guests, 2 vegetarian,
>   1 nut allergy, $250, then a shopping list that goes to Basketly).
>
> Nothing is bought, no payment is taken, and nothing leaves the page.

## Try it

No install or build step. Serve the folder and open it in Chrome or Edge, which
support voice input:

```bash
python3 -m http.server 4100 --bind 127.0.0.1
# open http://localhost:4100
```

Photos load from Wikimedia Commons and Open Food Facts, so the demo needs an
internet connection to show them (cards show a plain placeholder otherwise).
After updating the files, press ⌘ + Shift + R (Ctrl + Shift + R on Windows) so
the browser drops its cached copy.

Pick a task, set the dials, and say or type what you want. Typing works
everywhere the mic does.

URL options for study sessions:

| Option | Effect |
|---|---|
| `?task=cake\|menu` | Skip the task picker |
| `?autonomy=1..9` | Starting autonomy (default 2, Teacher) |
| `?familiarity=0\|1\|2` | First time / done it before / know it well (default: from history) |
| `?tone=auto\|warm\|neutral\|minimal` | Starting tone (default `auto`, which follows the dial) |
| `?stuck=25` | Seconds of no activity before a gentle nudge |
| `?speed=1` | How fast the agent's hands move (lower is faster) |
| `?fresh=1` | Ignore past completions |

**Settings (⚙) → Download session log** saves a JSON log: what was said, each
step, highlights, nudges, every dial change and every action the agent took.

## The autonomy dial

Each step of a task is tagged with the kind of responsibility it is: **find**
(getting to the right place), **choose** (a decision), **do** (a routine
action), **private** (typing private details), or **commit** (the final,
hard-to-undo decision). Turning the dial hands more kinds to the agent (DG1:
calibrate at the subtask level):

| Level | Stop | Who does what |
|---|---|---|
| 1 | Teacher | You do every step; extra explanation and earlier check-ins |
| **2** | **Teacher** | You do every step; the agent points and explains why |
| 3 | Teacher | As 2, but when you're stuck it offers to do that one step |
| 4 | Helper | It offers to do each "find" step |
| **5** | **Helper** | You lead; say "help" and it does that step, then hands back |
| 6 | Helper | It does the "find" steps; you choose and do the rest |
| 7 | Autopilot | It finds and does; you make the choices |
| **8** | **Autopilot** | It finds, does, and asks you about choices |
| 9 | Autopilot | As 8, but it takes its suggested choices without asking |

**Private and commit steps are always yours.** This is enforced twice: the
engine never hands them to the agent, and the agent's hands (`hands.js`) refuse
to touch any field marked `data-private` or any button inside `data-commit`.
Asking "type the address for me" or "just place the order" gets a polite no.

When the agent acts, the shop gets a turquoise border with "Agent is
controlling the screen" and a ring around the control it's using (the paper's
Fig. 5 convention), and it narrates each action. You can turn the dial at any
point; the agent re-describes the current step under the new setting.

**Familiarity dial.** *First time* gives full instructions with reasons. *Done
it before* gives full instructions, with reasons only when asked. *Know it well*
gives short reminders, and nudges wait longer. If you've finished a task before
and haven't set this dial, the agent asks which you'd like.

**Tone** (DG2, separate from control). *Match the dial* is warm at Teacher and
Helper and brief at Autopilot, like the paper's personas. You can also fix it to
warm, neutral or minimal at any level. The steps, hints and highlights never
depend on tone.

## How each setting behaves

- **Teacher.** Proactive next step, a reason that transfers to other sites,
  hints that get more specific, at most two unprompted nudges per step, and a
  close that names what you did.
- **Helper.** "Why don't you try it yourself? I'll be right here." On "help" or
  "I can't find it" it does that step ("Let me do that one for you"), then says
  "Your turn again". For a choice, it asks you first.
- **Autopilot.** Short status lines ("Searching Summit for chocolate cake"). It
  picks up choices you gave up front ("a 10 inch cake, tomorrow afternoon") and
  asks for the rest. It suggests dishes with reasons and accepts "yes", another
  dish's name, or "I'll do it".
- **Party menu extras.** If a dish with nuts goes on the menu, the agent warns
  you (pesto, peanut noodles, Waldorf salad, carrot cake and baklava all contain
  nuts). It also warns if the menu goes over budget. A vegetarian main counts
  for both main-dish steps.

Things you can say: *why*, *where is it*, *I'm stuck*, *help*, *do it for me*,
*I'll do it*, *repeat that*, *done*, *shorter*, *more detail*, *stop*.

## Files

```
index.html                    task picker / website on the left, agent on the right
styles.css                    page, panel, dials, agent-control styles
shop.css, platewise.css       the two websites
src/agent.js                  the engine: dials, steps, hand-back (pure, unit-tested)
src/persona.js                wording per tone and per band
src/guide.js                  the highlight overlay (points only)
src/hands.js                  the agent's hands; refuses private and commit controls
src/lessons/birthday-cake.js  cake lesson: steps, kinds, hints, how the agent does each
src/lessons/party-menu.js     party-menu lesson
src/shop.js, src/catalog.js   Basketly and its products
src/platewise.js, src/recipes.js  Platewise and its recipes
src/panel.js                  the panel: transcript, mic, dials, settings
src/voice.js                  speech in and out (Web Speech API)
src/main.js                   wiring, task picker, session log
test/teacher.test.mjs         engine tests (all three bands, both tasks)
credits.html                  image credits (generated: node scripts/build-credits.mjs)
```

## Writing another task

A task is a website plus a lesson in `src/lessons/`. Each step has a `kind`, a
`target` to highlight, an `instruction`, a `short` reminder, a `why`, two
`hints`, and a `doneWhen(state)` check. Steps the agent may do also have a
`narrate` line and a `perform(hands, value)` function; choice steps add `ask`,
`suggest` and `parse`. Give the website `data-guide` attributes on the elements
to point at, `data-private` on private fields, `data-commit` around final
buttons, and have it report its state the way `shop.js` does.

## Tests

```bash
npm test
```

## Credits

Basketly, Platewise and their stores are invented. Fresh items and dishes are
photographed by Wikimedia Commons contributors; packaged goods are real
products with photos from Open Food Facts. Every image's author and license is
in `credits.html`. Brand names and packaging belong to their owners and appear
only to make the demo realistic.

The voice selection and speech clean-up in `src/voice.js` follow the
Controller's web UI in the AI for Accessibility Toolkit (Apache-2.0).
