/**
 * A simple task queue to ensure promises are executed sequentially.
 *
 * @returns A function that takes an action and returns a promise that resolves when the action is complete.
 */
export function taskQueue() {
  let last: Promise<unknown> = Promise.resolve();

  /**
   * Adds a task to the queue.
   *
   * @param action - The action to perform. If not provided, returns the promise for the last task in the queue.
   * @returns A promise that resolves with the result of the action.
   */
  return <T>(action?: () => T | PromiseLike<T>): Promise<T> => {
    if (!action) return last as Promise<T>;

    last = new Promise<T>((resolve, reject) => {
      void last.finally(
        () =>
          void (async () => {
            try {
              resolve(await action());
            } catch (e) {
              reject(e as Error);
            }
          })(),
      );
    });

    return last as Promise<T>;
  };
}
