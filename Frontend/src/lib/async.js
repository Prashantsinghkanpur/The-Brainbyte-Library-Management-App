export async function withMinimumDelay(task, minimumMs = 320) {
  const startedAt = Date.now();

  try {
    return await task;
  } finally {
    const elapsed = Date.now() - startedAt;
    const remaining = minimumMs - elapsed;

    if (remaining > 0) {
      await new Promise((resolve) => {
        globalThis.setTimeout(resolve, remaining);
      });
    }
  }
}
