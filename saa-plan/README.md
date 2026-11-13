# SAA-C03 three-week plan

Study tracker for the AWS Certified Solutions Architect – Associate exam: a 22-day plan you work through one step at a time, a quiz at the end of a day that you must pass at 80%, spaced review of what you missed, and a full mock exam. Static HTML/CSS/JS (no frameworks) served by a small Go server that also keeps your progress in SQLite.

The plan follows two learning plans on AWS Skill Builder: the **AWS Solutions Architect Learning Plan (Includes Labs)** on Days 2–17 (each lecture course, then its labs) and the **Exam Prep Plan** for SAA-C03 on Days 10 and 18–21. It starts from zero: Days 1 and 2 open with the free course **AWS Technical Essentials**, which every course of the first plan lists as recommended previous knowledge. Day 1 tells you what to enroll in. One month of the Skill Builder subscription is needed from Day 1: most of the courses and labs are behind it. A few builds in your own AWS account (a VPC, IAM roles and policies, one Terraform project) stay in the plan; that account is on the Paid plan, because the subscription is billed to it, so Day 1 also sets up budgets.

```
site/
  index.html     page layout: rail, overview, one-step card view, dialogs
  dm/            the Datum design system: tokens (Excimer colours, dark only), components, art (vendored)
  style.css      the app in Datum, Excimer colours (dark only)
  fx.css         quiz, results, badges and celebration styles
  plan.js        the plan: days, steps, links, time estimates, the topics each step teaches, glossary, cleanup list
  quiz/          question pools: meta.js (topics, AWS links), d01–d15.js (no d07), mock1–2.js (65 each)
  extras.js      self-check model answers, "Which service?" drill, exam-wording cheat sheet
  keys/          key points per step (what to take away, the exam trap, AWS pages): d01–d14.js, c1–c9.js (courses and labs), r1.js
  qcore.js       quiz logic without the DOM: picking, grading, spaced repetition, weak spots
  fx.js          celebration bursts, fireworks, sounds
  app.js         page logic: overview, step cards, quizzes, mock exam, notebook, timer, settings, server sync
server/          Go: serves site/ and stores progress in SQLite (GET/PUT /api/state)
tests/           node --test unit + data tests, Playwright end-to-end script
tools/           qstats.mjs (question pool stats), similar.mjs (near-duplicate finder), links.mjs (AWS link check)
docs/            architecture.md (how it works, why), questions.md (writing + checking questions, status),
                 keypoints.md (writing + checking the key points per step)
Dockerfile       two stages: Go build → distroless, non-root
compose.yaml
```

## Run

```
docker compose up -d --build
```

Open http://localhost:8080 (or the `PORT` set in `.env`, see "Security defaults").

## How a day works

- **Overview, today first.** The top of the first screen is today: the day to work on (its goal, its progress, the time left), its next step, and one big button (Start Day 1, Continue Day 3, Take the Day 3 quiz), with the date and where you stand against the plan and the exam. Under it: what is still running in your account, today's goal, practice, your numbers (steps, days, focus time, quiz accuracy, streak, level), readiness and charts, and the days as tiles. Any tile opens its day.
- **One step at a time.** A day opens as a single card with three buttons under it: Back, Mark complete, Next. Mark complete moves you to the next open step; Next skips a step without marking it, and the row of dots above the card shows what is still open. The arrow keys and Enter work too.
- **A knowledge check on every card.** After the reading, one question written for that card: a miss lands in the notebook and comes back in review, and the day quizzes never ask it.
- **Reading helpers.** A focus view hides the panels (button in the day header, or F). Search (Ctrl+K or /) finds any step, key point, term, exam wording, look-alike table, diagram part, your notes and the notebook. Theme and text size are in Settings.
- **Course diagrams.** Every card of a lecture course and its labs ends with the course's architecture as a drawn diagram. The parts this step is about are outlined and the first one is open; click any part (or Tab to it and press Enter) for why it is there and what the exam asks about it. "⤢ Larger" opens it full width.
- **Cost guard.** Build steps that create something billable in your own AWS account (a NAT gateway, an Elastic IP, an EC2 instance…) put it on a "Still running" list on the overview when you complete them; add anything else from a Build card. Mark each one ✓ Deleted when it's gone. From 20:00, while anything is still on the list, a reminder comes up every 30 minutes (and as a Windows notification), unless you say to keep it running tonight.
- **Today's goal and the week's challenges.** A dial on the overview lights up with today's XP towards your daily goal (Settings). Three challenges a week (answer 150 questions, complete 40 steps, run the drill 3 times…) each add 50 XP. Reaching either drops a badge at the top of the screen.
- **Readiness and trends.** The 📈 panel shows, per exam domain, how many of the questions you've met you'd get right now (ready from 80%), the topic to study next with its step, why you miss (from the one-click reasons under each wrong answer), and day-by-day charts of answers right, focus time and XP (hover or use the arrow keys for the values; "Show as table" for all of them).
- **Look-alikes.** 19 tables put services that sound alike side by side (SQS, SNS or EventBridge; ALB, NLB or GWLB; EBS, EFS or S3…), row by row, ending with the exam's cue. A missed question whose right and wrong answers name two services of one table links to it, and so do the card's panel, weak spots and the practice panel.
- **Purpose first.** Each card opens with why the thing exists: the problem it was made to solve. Only then come where to do it and the details, as short labelled points.
- **Something happens when you finish something.** A step gets a burst and a note that climbs through the day, a block of the day gets a banner and fireworks, and the day, the week and the whole plan get more. Right answers in a row, records, badges, levels and a perfect quiz drop in as badges at the top of the screen. Effects and sounds each have a switch in the header.
- **Each step reads like an article, top to bottom:** the headline, where to do it with the link, why it exists (the problem, then the idea), what to do and how you know it worked, the key points, the exam trap, and your own notes at the end. A sidebar beside it (under it on smaller screens) has the exam topics it feeds with your accuracy so far, three practice questions on exactly that step, look-alikes, the exam wording, the AWS pages to read and the glossary terms. Only the page scrolls.
- **The last card of a day is its quiz** (Days 3–21). Pass it and you get the day's summary and the button for the next day.
- **The length of the plan is data.** Days, weeks and quizzes come from `plan.js`: add, remove or reorder days there and the page follows.

## How the quizzes work

- **End of the day:** when every step of a day is complete, its 30-question quiz unlocks. After each answer you see why every option is right or wrong, plus the plan steps that teach that topic (lecture first, then lab), with their Open links. A day counts as complete only at 24 of 30 (80%).
- **The quiz follows what the day taught.** Each step names the exam topics it teaches; a day's quiz draws on the topics of its steps and never asks about a topic that comes later in the plan. New questions come first, so a retake draws different ones as long as the day's topics have any left. Option order is shuffled every time.
- **Days 10, 13 and 17** review everything taught so far. **Days 18 and 19** take the exam domains two at a time. **Day 20** is built from your weakest topics and past misses. **Day 21** mixes all four domains, weighted like the exam.
- **Missed questions come back** after 1, 2 and 4 days, as a morning warm-up or a review. Each one also goes into the **wrong-answer notebook**, with a line for why you missed it. You can export the notebook as Markdown.
- **Mock exam:** unlocks when Days 1–17 (the lectures and labs) are complete. It has 65 questions in 130 minutes, split by domain like the exam guide, with no feedback until the end. Each attempt draws different questions. The screen works like an exam screen: click or drag over words to highlight them, ⊘ (or Shift + the option's number) strikes an option out, flag questions for review, and the review screen shows all, flagged or unanswered ones. The clock turns red in the last 10 minutes.
- **"Which service?" drill, four ways:** 60 seconds; Reverse (a service, which requirement is it for?); Three lives (no clock, until the third miss); and the Daily five (the same five all day, your first try counts, a run of days).
- **Moving around a quiz:** ← Previous and Next → go one question either way without answering, so you can skip one and come back; the squares above the question show right, wrong and open, and jump to any of them. After an answer, the main button goes on to the next open question.
- **XP, levels and badges:** right answers earn XP the first time, after a miss, or when they were due for review (repeats don't), and so do steps and passed quizzes; levels come with titles from "Cloud curious" to "Solutions architect". 15 badges (5, 10, 20, 30 in a row, a perfect score, a comeback, 10 hours of focus, 80% on a mock…). The run of right answers shows in the quiz header and heats up; the results show stars, the XP earned and your longest run.
- **South Park on the results:** a GIF for every answer right, a pass with some wrong, and a fail, ten of each in rotation (`site/gifs.js`), loaded from GIPHY. Switch them off in Settings.
- **Practice panel:** review queue, mock exam, a 60-second "Which service?" drill, the notebook, a weak-spot map by topic, an exam-wording cheat sheet, and your badges and level.

The questions are original practice questions in the exam's style, not official AWS questions.

## On a phone or tablet

Everything works by touch. Tap a dotted term for its definition, a day on a chart for its values, a word of a mock exam question to highlight it (dragging scrolls); Back, Mark complete and Next replace the arrow keys and Enter. Theme and text size are per device (Settings). Notifications and away detection are for the PC; the focus timer still runs and syncs, and the block moves to whichever device you touch (see "Focus timer").

## Focus timer

50 minutes of focus count down and are logged to the day you started them on. When they end, a pop-up offers a break (in every open tab, and again after a reload until you answer). The break has no set length: the clock counts up, and after 10 minutes it reminds you every minute to start the next block (a sound each minute; the pop-up only if it isn't already open). "Pause the break" in the pop-up, or Pause on the timer, stops the reminders. During the mock exam and the drill the pop-ups wait until you close them; the sound still reminds you.

The timer is the strip along the top: the bar fills as the block runs; click the time for Reset, Break now/Focus now and the minutes logged today. A block starts by itself when you start a day or mark a step complete, unless one is already running or you're on a break.

Away: in the timer's menu, "Turn on notifications and away detection" lets Edge tell the page when the PC has had no mouse or keyboard for 5 minutes (when your screen goes off). The block then waits, and when you're back a pop-up asks whether that time counts. A PC that sleeps counts as away too, and so does a phone or tablet whose screen was off (or whose browser was in the background) for 5 minutes while the block ran on it. Notifications show the block's end and the break reminders on the other monitor, only when this window isn't the one you're using; phones and tablets aren't offered them, because they stop the page as soon as it is out of view.

Several devices: the block runs on the device you use. It starts there, and the first tap, click or key on another device moves it over, so only that device's idle state and sleep count: a phone waking up in your pocket doesn't stop the block on the PC, and the PC's idle detection doesn't while you read on the tablet. A device that was asleep asks the server for news before it ends a block, marks you away or submits a mock exam, so it never acts on what it knew an hour ago.

After updating the site (`docker compose up -d --build`), reload every open tab and device: a tab still running the old page doesn't know the open-ended break and can reset it.

## Keep it up after reboots

`restart: unless-stopped` restarts the container whenever the Docker daemon starts, so the daemon itself must start at boot:

```
sudo systemctl enable --now docker
```

## Update after editing files

```
docker compose up -d --build
```

## Run on a server

Every push to `main` that touches `saa-plan/` builds the image and pushes it to GHCR (`.github/workflows/ghcr.yml`): `ghcr.io/serpe-nt/saa-plan:latest` plus a `sha-<commit>` tag, for amd64 and arm64. The server uses the same `compose.yaml`, pulling instead of building.

The package is private at first. Either make it public (GitHub → Packages → saa-plan → Package settings), or log in on the server once with a classic PAT that has only `read:packages`:

```
docker login ghcr.io -u Serpe-nt
```

On the server, put `compose.yaml` in a folder named `saa-plan` (the folder name prefixes the volume: `saa-plan_saa-data`), with a `.env` next to it for what differs from the PC:

```
# .env (all optional)
BIND=127.0.0.1                                  # 0.0.0.0 opens the port to the network
PORT=8080                                       # port on the host
ALLOWED_HOSTS=localhost,127.0.0.1,::1           # add the name or IP you open it on
TAG=latest                                      # or sha-abc1234 to pin / roll back
```

There is no login: keep `BIND=127.0.0.1` and reach it through `ssh -L 8080:localhost:8080 user@server`, or put a reverse proxy with authentication in front.

### Move your progress from the PC

The database runs in WAL mode, so stop the app before copying: the volume is then one consistent set of files.

On the PC (the image has no shell, so a throwaway Alpine container reads the volume):

```
docker compose stop
docker run --rm -v saa-plan_saa-data:/data -v "${PWD}:/backup" alpine tar -czf /backup/saa-data.tgz -C /data .
scp saa-data.tgz user@server:~/saa-plan/
```

On the server, in `~/saa-plan`. `create` makes the volume and container without starting the app, so it can't open an empty database first; untarring as root keeps the files owned by the app's user (65532):

```
docker compose pull
docker compose create
docker run --rm -v saa-plan_saa-data:/data -v "$PWD:/backup" alpine sh -c "tar -xzf /backup/saa-data.tgz -C /data --numeric-owner && ls -ln /data"
docker compose up -d
```

From then on, use one copy: the PC and the server don't sync with each other. Leave the PC's stopped, or `docker compose down` it.

### Behind the Gate at /h1/

The Gate (study.built2spark.com) logs you in, then nginx passes `/h1/...` through unchanged to `127.0.0.1:8091`. The site uses only relative URLs, so the server just needs the prefix. `.env` on the server:

```
BIND=127.0.0.1
PORT=8091
BASE_PATH=/h1
ALLOWED_HOSTS=study.built2spark.com
```

With `BASE_PATH` set, everything moves under `/h1/` (`/h1` redirects there) and other paths return 404, except `/healthz` for the Docker health check. The Gate's nginx keeps `proxy_pass http://127.0.0.1:8091;` with no trailing slash. Leave `BASE_PATH` empty to serve from `/`, as on the PC.

The app compresses its own answers (gzip), so the proxy needs no `gzip` settings for it. When the Gate's sign-in runs out, the app's requests get the sign-in instead of an answer: the page says "Signed out" on the timer strip, keeps every change on the device, and a tap on the notice reloads through the sign-in.

The helpers share one origin, so the other helpers' pages can read this app's localStorage and call `/h1/api/state`. Only put helpers you trust behind the same Gate.

### Update the server

```
docker compose pull && docker compose up -d
```

## Where progress is stored

- **On the server:** a SQLite file in the `saa-data` Docker volume (`/data/saa.db` in the container). Rebuilding or recreating the container keeps it. Every browser that opens the site gets the same progress: an open page asks for news every 30 seconds and at once when you switch to it (a 304 of a few bytes when nothing changed), and sends its own changes within a second, or right away when you leave it. Edits made on two devices at once are merged: every tick and answer stays, and a quiz half done on the PC can be finished on the phone (see "Sync protocol" in `docs/architecture.md`).
- **In the browser:** localStorage keeps a working copy, so the page also works without the server. When the server can't be reached, a notice on the timer strip says so (Offline, Signed out, Not synced; a tap tries again or signs in) and changes wait on the device until it answers. You can also run `python3 -m http.server -d site` for a quick preview; that mode saves to the browser only.

Back up the database file:

```
docker compose cp saa-plan:/data/saa.db ./saa-backup.db
```

Or use Settings → Export / Import (JSON).

## Security defaults

- **Network:** the port is bound to `127.0.0.1` only. The server answers only to the host names in `ALLOWED_HOSTS`, which blocks DNS rebinding. It refuses cross-site writes (CSRF) and sends a strict Content-Security-Policy.
- **Container:** distroless image, non-root user, read-only root filesystem, all capabilities dropped, `no-new-privileges`.
- **Opening it to your LAN:** in a `.env` next to `compose.yaml`, set `BIND=0.0.0.0` and add the PC's LAN address to `ALLOWED_HOSTS` (and `PORT` for another port than 8080), e.g.:
  ```
  BIND=0.0.0.0
  PORT=8181
  ALLOWED_HOSTS=localhost,127.0.0.1,::1,192.168.1.20
  ```
  There is no login, so anyone on that network can then change your progress.

## Tests

```
node --test                                              # unit + content checks (no dependencies)
node tools/qstats.mjs && node tools/similar.mjs          # after editing questions
cd server && go vet ./... && go test -race ./...         # backend
NODE_PATH=$(npm root -g) BASE=http://localhost:8080/ node tests/e2e.mjs   # browser end-to-end (needs Playwright)
```
