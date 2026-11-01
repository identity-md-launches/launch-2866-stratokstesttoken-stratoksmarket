# Storybook and resource-chain release — 2026-11-01

Upstream Swarm task: a5805d0d-83ac-40ab-814c-dc44f7ef6b17.
Upstream commit: 8c949005730ae77c8a4f95971e8cf9fae85c1cdc.
This integrates the resource-chain work from the preceding delivery as well.

## Behavior and assets

Original yellow Stratoks are retained. Buildings and foliage use the new coherent canvas art; building functions and biome variants come from actual world state. Smoke requires nearby real fire. Compact HUD and zoom-dependent stock grouping replace the oversized heading and repeated one-log icons; grouped quantities remain selectable and conserved.

Release fixes align public/dist atlas manifests with every runtime sheet/sprite, and let residents with a striker return to nearby existing fuel after failed ignition instead of placing another unit. They reach the exact target tile; missing piles cancel the attempt. The planner still permits interruptions and does not guarantee a fire. No inventory is silently removed.

## Verification and limitations

TypeScript and production build pass. Complete backend suite: 270/270 passed (including three seeds through 9,000 ticks each); frontend: 65/65 passed. Atlas parity test: 1/1 passed separately. Focused fuel tests cover repeated spark failure, exact traversal, success, lost targets, striker retention and conservation. Atlas source/public/export parity is separately tested.

Actual browser demo checks at 1440x900 and 390x844 cover load, zoom, resident selection/follow and no horizontal overflow. Screenshots and videos are evidence of the isolated engine demo, not live-world tests.

Unattended seed 7, 40 initial residents, 9,000 ticks: 154 residents, 134 ground piles, exact item ledger; 422 material chains and 3,735 food chains completed. This does NOT establish bounded ground accumulation. The preceding review reported 113 piles with 115 residents, so the retry fix is not claimed to reduce the absolute long-run pile count. Rendering aggregation is separate from this remaining behavioral limitation.

Native ARM image built on the target VPS. A copy of the live world at tick 432300 retained all 1,611,264 existing values; 914 additive defaults initialized chain instrumentation. Repeated signed visitor login, logout, session rotation and restart passed, preserving the entire normalized world and private visitor counts. No paid transactions were sent.

Rollout must archive the stopped live volume, retain it as rollback, restore to a separate new volume, verify all prior fields and complete normalized state, then switch the server and static assets together. No new IMD task payment or game payment contract is part of this release.

Art remains simpler than the concept illustration. The model is a designed learning simulation, not a full biological fly brain or demonstrated conscious life. IMD gameplay payments are not implemented.

The saved live world already has ledger offsets of +192 stone and +234 wood relative to its historical counters. Both the old and new engine reproduce those same offsets before stepping and retain them unchanged over 100 copied-world ticks. No correction, deletion or new discrepancy was introduced. Fresh seeded simulations use exact ledger assertions. This historical offset remains documented rather than silently rewriting stock.

## Completed live cutover

Source `dba2cdc` is live at https://stratoks.2-29-11-211.sslip.io on 2026-11-01. Image `stratoks-storybook:r1`, release `/opt/stratoks/releases/storybook-r1`, volume `stratoks_storybook_r1`. The previous `stratoks_wallet_37053ce` volume is retained unchanged.

Cutover at tick 433110, 181 residents: all 1,616,136 existing field values preserved; 914 additive chain defaults initialized. Complete normalized state matches across old/new volume copies. Actual HTTPS Chromium checks at 1440x900 and 390x844 passed anonymous viewing, real server-verified disposable EOA signature, logout invalidation, no overflow and no page exceptions. The injected wallet provider was simulated; installed extensions are not claimed tested. World advanced from tick 433145 to 433178 during checks.

Stopped-world archive is retained on the VPS and off-host: SHA256 `c6fe120f495d275c2bce38bbaca75e54dc2f3f6853999b6f82fe171c5607ad1a`, 17,899,520 bytes. Rollback configs and checks are under `/opt/stratoks/rollouts/storybook-r1`. Daily backups retain their existing schedule. Evidence in `storybook-evidence/` separates demo screenshots from actual live screenshots.
