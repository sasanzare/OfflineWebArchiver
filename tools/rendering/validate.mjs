import { DEFAULT_RENDER_POLICY, validateRenderPolicy } from "@offline-web-archive/rendering";
import { BROWSER_CONTEXT_PROFILE_VERSION, RENDER_ENGINE_VERSION, RENDER_STAGES } from "@offline-web-archive/archive-core";

validateRenderPolicy({ ...DEFAULT_RENDER_POLICY });
if (RENDER_ENGINE_VERSION !== 1 || BROWSER_CONTEXT_PROFILE_VERSION !== 1) throw new Error("Unexpected Render or Browser Context model version.");
for (const stage of ["navigating", "waiting-for-stability", "extracting-html", "committing-result", "completed", "failed"]) {
  if (!RENDER_STAGES.includes(stage)) throw new Error(`Missing Render stage ${stage}`);
}
process.stdout.write("Render policy, stage model, and compatibility versions passed.\n");
