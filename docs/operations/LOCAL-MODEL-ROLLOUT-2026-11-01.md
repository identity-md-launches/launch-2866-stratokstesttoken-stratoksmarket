# Local model rollout — 2026-11-01

Runtime source: `1b4ab3b`; image `stratoks-local-model:r3`. Live URL: https://stratoks.2-29-11-211.sslip.io . Setup, disable and interpretation limits: [LOCAL-MODEL-PILOT.md](LOCAL-MODEL-PILOT.md).

Installed official Ollama container with cloud disabled, host loopback API only and a separate private Docker network. ARM64 VPS: two CPUs, 3,796 MiB RAM. Ollama limited to 0.75 CPU and 2 GiB; observed loaded use approximately 1.55–1.68 GiB; world approximately 110–220 MiB during the test. No GPU inference. An initial runner OOM was traced to its 8-GiB prompt cache default; `LLAMA_ARG_CACHE_RAM=0` disables that cache without raising the container RAM limit. The world kept running during the model failure. Downloaded qwen3:0.6b and qwen3:1.7b; the latter is active, one model loaded at a time.

Model `qwen3:1.7b` digest: `8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7` (Q4_K_M). Ollama image digest is pinned in deploy/cognition/compose.yml.

## Evidence and limits

- Three small choice fixtures: 0.6B chose the expected action in 2/3; 1.7B in 3/3. These are smoke tests, not a capability benchmark. Warm 1.7B fixture calls took about 7–8 seconds; full live creature contexts took roughly 25–45 seconds.
- Read-only copied live snapshot rehearsal: tick 437400 to 437514, 52 to 49 residents through existing simulation rules. Three real model responses accepted, one nudged candidate selected. Existing historical ledger offsets (+234 wood, +192 stone) unchanged; no new discrepancy. A shorter 15-second admission interval was used for this rehearsal, production uses 60 seconds.
- Initial cutover at tick 437871, 44 residents, world-20260101-0. Byte-for-byte comparison of all copied files plus complete normalized world equality passed. 788,143 prior scalar values retained in the earlier compatibility rehearsal, no new defaults required. Existing brains, memories, relationships, stocks and visitor profiles were not reset. Population changes happened through the running simulation; the pilot does not guarantee survival.
- New volume `stratoks_local_model_r1`; old `stratoks_storybook_r1` retained. Private backup `pre-local-model.tar` was copied off-host and its SHA256 matched: `7c3f17ca4b5e90b42f0eda1143ee590c397b94f2f576bb7e207e4fd996c1adcb`. Subsequent small backend revisions used the current volume and made additional private pre-revision backups.
- Ten cognition tests, 57 selected backend regression tests, 65 frontend tests passed; TypeScript and production build passed. The already-passed full long-run suite from the prior release was not repeated. No production transactions.
- Actual HTTPS browser checks at 1440x900 and 390x844: anonymous world, injected disposable EOA signature verified by the live server, logout revocation, no overflow, no browser exceptions. A real model record appeared in the resident inspector at both sizes. This is not a physical MetaMask-extension test.
- Runtime counters reset across deployment; bounded history persists. Initial live record selection was observed, but some suggestions were unavailable by the time they were reconsidered. One generated reason misread raw needs; explicit need labels were added. This remains an experimental adviser, not evidence of improved cognition, consciousness, or a full fly connectome.
- Daily backup uses the active Compose volume. Disabling the pilot leaves existing learned state and history intact. API GET endpoints only observe; they cannot invoke the model or edit the world.

Validation reports are in `local-model-evidence/`. Private world backups and credentials are not in this repository.

Post-correction check: runner log confirms prompt cache disabled; a real `/api/chat` completed HTTP 200 in 39.36 seconds. Loaded container RAM was 1.55 GiB, fresh cgroup OOM counters were zero, and world tick advanced to 438765. This is a short recovery check, not a long-duration stability claim. The one failed request recorded in the world status coincided with the model-container recreation; subsequent success cleared lastError.
