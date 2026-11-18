const TEXT = {
    working: "<b>⏳ Pi is working.</b>",
    waiting: "<b>⏳ Pi is waiting for your input.</b>",
    idle: "<b>💤 Pi is idle.</b>",
    unknown: "<b>⚠️ Pi work status is unknown.</b>",
};
export function createTelegramWorkStatusRuntime(deps) {
    let observation = {
        agent: false, compaction: false, waiting: false,
    };
    let generation = 0;
    let tail = Promise.resolve();
    let episode;
    const state = () => observation.waiting ? "waiting"
        : observation.agent || observation.compaction === true ? "working"
            : observation.compaction === "unknown" ? "unknown" : "idle";
    return {
        update(change) {
            observation = { ...observation, ...change };
            const desired = state();
            if (episode && !episode.isCurrent())
                episode = undefined;
            if (!episode) {
                if (desired === "idle")
                    return;
                const scope = deps.capture();
                if (!scope.target || !scope.isCurrent())
                    return;
                episode = {
                    target: { ...scope.target }, isCurrent: scope.isCurrent,
                    generation, desired, attempted: false,
                };
            }
            const captured = episode;
            captured.desired = desired;
            const current = () => episode === captured &&
                captured.generation === generation && captured.isCurrent();
            tail = tail.then(async () => {
                if (!current() || captured.delivered === captured.desired)
                    return;
                const next = captured.desired;
                if (!captured.attempted) {
                    // A failed/ambiguous send is never replayed on a later transition.
                    captured.attempted = true;
                    captured.messageId = await deps.send(captured.target, TEXT[next]);
                }
                else if (captured.messageId !== undefined) {
                    await deps.edit(captured.target, captured.messageId, TEXT[next]);
                }
                if (!current())
                    return;
                captured.delivered = next;
                if (next === "idle" && captured.desired === "idle" && episode === captured) {
                    episode = undefined;
                }
            }).catch((error) => {
                if (!current())
                    return;
                try {
                    deps.recordFailure(error);
                }
                catch { /* Diagnostics cannot poison publication. */ }
            });
        },
        reset() {
            generation += 1;
            episode = undefined;
            observation = { agent: false, compaction: false, waiting: false };
            // A hung old transport call must not hold replacement-session projection.
            tail = Promise.resolve();
        },
        waitForIdle: () => tail,
    };
}
