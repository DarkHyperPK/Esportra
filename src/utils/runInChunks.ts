/** Run async work in fixed-size parallel chunks with optional delay between chunks. */
export async function runInChunks<T>(
    items: T[],
    chunkSize: number,
    worker: (item: T) => Promise<void>,
    delayMsBetweenChunks = 250,
): Promise<void> {
    if (items.length === 0) return;

    const size = Math.max(1, chunkSize);

    for (let index = 0; index < items.length; index += size) {
        const chunk = items.slice(index, index + size);
        await Promise.all(chunk.map(worker));

        if (index + size < items.length && delayMsBetweenChunks > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMsBetweenChunks));
        }
    }
}
