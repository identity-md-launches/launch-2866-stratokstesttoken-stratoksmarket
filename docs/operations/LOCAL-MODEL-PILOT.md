# Local model adviser pilot

This is an optional experiment, not evidence of consciousness or a biological brain emulation. The existing reduced fly-inspired mb-v1 circuit, individual learned outcome model, needs, reflexes and physics remain the decision system. Qwen weights are not trained or changed by world experience. A selected creature's observations and last two real experiences are included in its prompt; generated reasons are proposals, not a readout of thoughts.

## Limits and behavior

- Three existing adult residents, chosen by ascending ID when the service starts. No residents are created or reset. Dead pilot residents are not automatically replaced until a restart.
- One asynchronous inference at a time, at most one per minute across all three. Queue holds only their latest decision contexts. HTTP readers cannot trigger inference.
- A model chooses among at most six actual current affordances/plans. Its valid suggestion adds only 0.5 to the matching fresh candidate utility; it does not force execution, create resources, invent abilities or change world rules.
- Emergency reflexes take priority. Replies expire after 120 ticks, are ignored after movement beyond three cells or needs changing over 20 points, and must still match a current candidate. Failures/timeouts do not stop world ticks.
- JSON schema constrained output, response capped at 16 KiB, 45-second request timeout, 1,536-token context and 64-token output. No reasoning stream. One CPU thread with a 0.75 CPU container quota.
- Last six decision receipts per pilot persist in the existing snapshot. This bounded record is not a complete deterministic replay log. Asynchronous external suggestions make the enabled experiment timing-dependent. With the feature disabled, normal seeded execution remains unchanged and stored notes are ignored.
- `selected` means the candidate received a nudge and was chosen, not that the model caused a better outcome or the action succeeded. `considered` means another candidate won; `unavailable` means the proposed candidate was absent on reconsideration. Expired proposals can remain displayed as expired until replaced.

## Observe

GET `/api/expanse/cognition` reports pilot IDs, model, request/failure counts, latest latency and bounded recent decision history. These runtime counters reset on restart. `selectedInRecentHistory` is only a count within the last six receipts.

Select a pilot resident in the world and open **Local model experiment** in its inspector. Ordinary observation remains walletless. This module adds no transactions, IMD payments or private-wallet data to model requests.

## Local installation and disable

`deploy/cognition/compose.yml` runs the pinned official Ollama image. Run `docker compose -f deploy/cognition/compose.yml up -d`, then `docker compose -f deploy/cognition/compose.yml exec ollama ollama pull qwen3:1.7b`. Use the world override only with a backend image containing this module. The API binds to host loopback and a private Docker network; do not expose port 11434 through the public proxy. `OLLAMA_NO_CLOUD=1` disables cloud features. Initial image/model downloads need internet; inference is local. No per-token API charge; server resources, disk and hosting still cost money.

For the deployed server, set `LOCAL_MODEL_ENABLED: 'false'` in `/opt/stratoks/compose.yml`, then `cd /opt/stratoks && docker compose up -d --no-deps world`. Do not change the data-volume name. Model history remains, but does not affect decisions. To free model RAM afterward: `docker compose -f /opt/stratoks/llm/compose.yml stop`. Stop/restart preserves world files; a brief service restart is expected.

The model service has a 2 GiB memory limit. The current 2-CPU, approximately 4-GB VPS cannot support simultaneous inference for the whole population. Expansion requires measured load and behavioral validation, not just raising the pilot count. A model pause never pauses the world.

References: https://docs.ollama.com/docker , https://docs.ollama.com/api/chat , https://docs.ollama.com/faq
