export interface NotulenInterface {
  listen(): Promise<void>;

  stop(): Promise<void>;

  /**
   * TODO: This package need to have realtime event listener to the Google Meet.
   *
   * the plan is to have these events:
   * - when the meeting started
   * - when the meeting ended
   * - when the speaker changed
   * - when message received
   * - when parcipant joined or left the meeting
   */
}
