import { executablePath } from "puppeteer";
import {
  MeetingResult,
  NotulenConfig,
  NotulenInterface,
  Transribe,
} from "./interfaces";
import { launch, getStream, getStreamOptions, wss } from "puppeteer-stream";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer-core";
import { Selector } from "./selector";
import { whenSubtitleOn } from "./external";
import EventEmitter from "events";
import { transribeToText } from "./helpers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { existsSync, mkdirSync } from "fs";
import { Transform } from "stream";
import { exec } from "child_process";
import ffmpegPath from "ffmpeg-static";

const defaultStreamOptions: Partial<getStreamOptions> = {
  audio: true,
  video: true,
  videoConstraints: {
    mandatory: {
      width: { max: 1280 },
      height: { max: 720 },
      frameRate: { max: 15 },
    },
  },
};

export enum RecordingStatus {
  NOT_STARTED = "not_started",
  STARTED = "started",
  PAUSED = "paused",
  STOPPED = "stopped",
}

export class Notulen extends EventEmitter implements NotulenInterface {
  private browser: Browser;
  private page: Page;
  private config: NotulenConfig;
  private transcribe: Transribe[] = [];
  private videoOutput: string;
  private videoFileStream: any;
  private meetingTitle: string;
  private recordingStatus: RecordingStatus = RecordingStatus.NOT_STARTED;

  // video stream can be public
  private videoStream: Transform;

  constructor(config: NotulenConfig) {
    super();
    // check if the prompt is not provided
    if (!config.prompt) {
      config.prompt = `Kamu adalah seorang Asisten Note Takker, berdasarkan hasil meeting berupa transribe dibawah ini tolong buatkan summary meeting\n`;
    }

    // check if the recording location is not provided
    if (!config.recordingLocation) {
      config.recordingLocation = "./";
    } else {
      // check if recordingLocation is existing and create it otherwise

      if (!existsSync(config.recordingLocation)) {
        mkdirSync(config.recordingLocation);
      }
    }

    // cleanup double slashs
    this.videoOutput = `${
      config.recordingLocation
    }/meeting-${Date.now()}.mp4`.replace(/([^:])(\/\/+)/g, "$1/");

    // merge the streamConfig
    config.streamConfig = {
      ...defaultStreamOptions,
      ...config.streamConfig,
    };

    // default recordMeeting is true
    if (config.recordMeeting === undefined) {
      config.recordMeeting = true;
    }

    this.config = config;
  }

  private async setUp() {
    const puppeteer = require("puppeteer-extra");
    const stealthPlugin = StealthPlugin();
    stealthPlugin.enabledEvasions.delete("iframe.contentWindow");
    stealthPlugin.enabledEvasions.delete("media.codecs");
    puppeteer.use(stealthPlugin);
    // setup puppeteer
    this.browser = await launch(puppeteer, {
      args: ["--lang=en-US"],
      headless: this.config.debug ? false : ("new" as any),
      executablePath: executablePath(),
    });

    this.page = await this.browser.newPage();

    // start video steam if recordMeeting is true
    if (this.config.recordMeeting) {
      this.videoFileStream = exec(
        `${ffmpegPath} -y -i - -c:v copy -c:a copy ${this.videoOutput}`
      );
    }
  }

  public async listen(): Promise<void> {
    await this.setUp();

    await this.page.goto(this.config.googleMeetUrl);

    // Waiting for input email appear
    const nameInput = await this.page.waitForSelector(Selector.INPUT_NAME, {
      visible: true,
      timeout: 0,
    });
    await nameInput.focus();
    await this.page.keyboard.type(this.config.name);
    await this.page.keyboard.press("Enter");

    // Waiting for join button appear and click
    // do not throw error if the selector is not found
    await this.waitSelector(Selector.JOIN_BUTTON, {
      timeout: 2_000, // 2s
      cb: async () => {
        // Check if selector exists and click it if exists
        await this.page.click(Selector.CANCEL_ALLOW_MIC);
      },
    });

    // Waiting for Meeting has been started
    await this.page.waitForSelector(Selector.BUTTON_END_CALL, {
      timeout: 0,
      visible: true,
    });

    // Start recording
    this.videoStream = await getStream(this.page, this.config.streamConfig);

    // Start the video status
    this.recordingStatus = RecordingStatus.STARTED;

    if (this.config.recordMeeting) {
      this.videoStream.on("close", () => {
        this.videoFileStream.stdin.end();
      });
      this.videoStream.pipe(this.videoFileStream.stdin);
    }

    // Enable to transribe
    const transribe = await this.page.waitForSelector(
      Selector.ENABLE_TRANSRIBE_BUTTON,
      {
        timeout: 0,
      }
    );
    await transribe.click();

    // change transribe language
    const settingButton = await this.page.waitForSelector(
      Selector.CAPTION_SETTING,
      {
        visible: true,
        timeout: 0,
      }
    );
    await settingButton.click();
    await this.page.waitForSelector(Selector.TRANSRIBE_SETTING_CONTAINER);
    const t = await this.page.waitForSelector(
      Selector.TRANSRIBE_SETTING_BUTTON
    );
    await t.evaluate((b) => b.click());
    const langId = await this.page.waitForSelector(
      `li[data-value="${this.config.language}"`
    );
    await langId.evaluate((b) => b.click());
    // wait for 1s using promise
    await new Promise((r) => setTimeout(r, 1000));
    const closeBtn = await this.page.waitForSelector(
      Selector.TRANSRIBE_SETTING_CLOSE_BUTTON
    );
    await closeBtn.click();

    // Check if the participants goes to zero
    await this.page.exposeFunction(
      "onParticipantChange",
      async (current: string) => {
        // Trigger to stop the meeting
        await this.stop();
      }
    );

    function onParticipantChange(current: string) {
      // Just for ignoring TS error
    }

    // Add transribe function
    this.listenForTransribe();

    // Listen for the meeting to end (by checking if the participant has left the meeting)
    await this.page.evaluate(() => {
      const target = document.querySelector("div[class='uGOf1d']");
      setInterval(() => {
        const currentParticipants = target?.textContent;
        if (currentParticipants === "1") {
          onParticipantChange(currentParticipants);
        }
      }, 1000);
    });

    // Set the meeting title
    const meetingTitle = await this.page.waitForSelector(
      Selector.MEETING_TITLE
    );
    this.meetingTitle = await meetingTitle.evaluate((el) => el.textContent);

    // Listen if the bot has been kicked from the meeting
    // Remove for now since the timeout is not working
    // this.page
    //   .waitForSelector(Selector.MEETING_TITLE, {
    //     hidden: true,
    //     timeout: 0
    //   })
    //   .then(async () => {
    //     await this.stop();
    //   });
  }

  private async listenForTransribe() {
    // Start listening for subtitle changes
    await this.page.exposeFunction(
      "setTransribe",
      (scripts: any[], lastSpeaker: string) => {
        this.transcribe = scripts;
      }
    );
    await this.page.evaluate(whenSubtitleOn);
  }

  private async waitSelector(
    selector: string,
    { timeout = 0, cb }: { timeout?: number; cb?: Function } = {}
  ): Promise<void> {
    try {
      await this.page.waitForSelector(selector, {
        timeout,
        visible: true,
      });
      await cb();
    } catch (error) {
      // TODO: Handle the errorF
    }
  }

  public async stop(): Promise<void> {
    // Skip if the recording has been stopped
    if (this.recordingStatus === RecordingStatus.STOPPED) {
      return;
    }

    // Stop the recording
    this.recordingStatus = RecordingStatus.STOPPED;

    // Stop File and video streaming
    await this.videoStream.destroy();

    // Stop WSS
    (await wss).close();

    // Convert the transribe to summary
    const transcribe = transribeToText(this.transcribe);

    // summary the meeting
    const fullPrompt = `${this.config.prompt} ${transcribe}`;

    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    const meetingResult: MeetingResult = {
      title: this.meetingTitle,
      googleMeetLink: this.config.googleMeetUrl,
      recordingLocation: this.videoOutput,
      transribe: transcribe,
      summary: text,
    };

    await this.browser.close();

    // Emit the end event
    this.emit("end", meetingResult);
  }
}
