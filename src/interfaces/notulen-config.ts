import { getStreamOptions } from "puppeteer-stream";

export interface NotulenConfig {
  /**
   * The bot name.
   */
  name: string;

  /**
   * The URL of the Google Meet to take notes on.
   */
  googleMeetUrl: string;

  /**
   * The API key for the Gemini API.
   * currenty this package only supports Gemini API. on the next milestone we will support other API.
   * if this package can be agnostic to the API, it will have a good point.
   */
  geminiApiKey?: string;

  /**
   * The prompt to use for summarizing the meeting.
   */
  prompt?: string;

  /**
   * Meeting language
   */

  language: string;

  /**
   * Record the meeting
   *
   * default is trues
   */
  recordMeeting?: boolean;

  /**
   * The location to save the recording. if this is not provided, the recording will be saved in the current directory.
   */
  recordingLocation?: string;

  /**
   * Debug mode
   * if this is set to true, the chrome browser will be visible.
   */
  debug?: boolean;

  /**
   * Stream configuration
   */
  streamConfig?: getStreamOptions;
}
