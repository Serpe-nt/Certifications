# C17: notes for the final sweep

Card C17, module m18 Capstone, interviews and exams, 2026-11-15 and 16. What the planner should know when checking the module and the lab.

## Fault flags without the flag screen

- The flag screen's API reads at `GET /feature/api/read` and writes at `POST /feature/api/write` with `{"data": {...}}`. A write replaces the whole document. From WSL it answers at `http://10.10.0.5` with `Host: flags.lab.k8s.local`; inside the cluster at `http://frontend-proxy.shop.svc:8080/feature/api`.
- `/read` returns `{"flags": ...}` only, so a document written back from a read has no `$schema` key. flagd accepted it in every write of this card, as in m15's drill.
- `productCatalogFailure` is switched through `targeting.if[1]`; its `defaultVariant` stays `off`. A check that greps `defaultVariant` cannot see that flag. The game-day script and its log read both.
- The flag screen has a Scheduler tab (upstream flagd-ui 3.1.0) that switches random flags on a timer. It shows its picks, so it is no use for a game day; the step says so in one sentence.

## The game-day script

- Every change reads the document, changes its flags, checks that the document did not change in the meantime, writes, and reads again to prove that only its flags changed. A concurrent change stops it; nothing is written over a change it did not make.
- The 15-minute guard is a pod in `learn-m18` (10m CPU, 32Mi), started before the fault is switched on. The first version started it afterwards, and a round that ran into the guard lasted 15 minutes 4 seconds.
- Between two commands of the session, on 2026-11-15 between 23:21 and 23:23 UTC, WSL's archlinux `/tmp` was emptied and `/proc/uptime` read 188 seconds: the instance had restarted on its own. A guard process inside WSL would have died with it; the pod did not notice. A learner's script and state live in their home, which survives.

## For the sweep

- The step's slow-span TraceQL names the shop's services. Without that, a quiet shop returns the browser's flag streams through frontend-proxy (`flagd.evaluation.v1.Service/EventStream`, about 3 seconds each), which a learner would take for a fault.
- The three rounds drew paymentFailure once and paymentUnreachable twice; the four other faults of the list were not seen in a game day.
- The interview bank links to other steps with relative links (`../../m04/s07/`), which work under any base path. A later change of the site's URL shape would break them; `check:links` does not check them.
- The exam steps quote prices, the retake and the weights from the Linux Foundation's pages of 2026-11-15. Those change; the steps tell the learner to read both pages before booking.
