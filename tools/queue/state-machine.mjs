import {
  PAGE_JOB_STATES,
  QueueOperationError,
} from "@offline-web-archive/archive-core";
import {
  QUEUE_STATE_MACHINE_VERSION,
  VALID_JOB_TRANSITIONS,
  assertTransition,
  canTransition,
  isTerminalState,
} from "@offline-web-archive/queue";

if (QUEUE_STATE_MACHINE_VERSION !== 2) throw new Error("Unexpected Page Job state-machine version");
let valid = 0;
let invalid = 0;
for (const from of PAGE_JOB_STATES) {
  for (const to of PAGE_JOB_STATES) {
    const expected = VALID_JOB_TRANSITIONS[from].includes(to);
    if (canTransition(from, to) !== expected) throw new Error(`Transition classifier drifted for ${from} -> ${to}`);
    if (expected) {
      assertTransition(from, to);
      valid += 1;
    } else {
      try {
        assertTransition(from, to);
        throw new Error(`Invalid transition was accepted: ${from} -> ${to}`);
      } catch (error) {
        if (!(error instanceof QueueOperationError) || error.code !== "QUEUE_INVALID_TRANSITION") throw error;
      }
      invalid += 1;
    }
  }
}
for (const terminal of ["completed", "failed", "skipped", "blocked"]) {
  if (!isTerminalState(terminal)) throw new Error(`${terminal} must remain terminal`);
}
for (const required of ["interrupted", "paused"]) if (!PAGE_JOB_STATES.includes(required)) throw new Error(`Recovery state ${required} is missing`);
for (const forbidden of ["leased", "abandoned", "recovering"]) if (PAGE_JOB_STATES.includes(forbidden)) throw new Error(`Run/Lease state ${forbidden} must not enter the Page Job vocabulary`);
process.stdout.write(`Queue state machine ${QUEUE_STATE_MACHINE_VERSION} validated ${valid} valid and ${invalid} invalid transitions.\n`);
