import { executablePath } from "puppeteer";
import {
  MeetingResult,
  NotulenConfig,
  NotulenInterface,
  Transribe,
} from "./interfaces";
import { launch, getStream, wss } from "puppeteer-stream";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer-core";
import { Selector } from "./selector";
import { whenSubtitleOn } from "./external";
import EventEmitter from "events";
import { transribeToText } from "./helpers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createWriteStream, WriteStream, existsSync, mkdirSync } from "fs";
import { Transform } from "stream";

export class Notulen extends EventEmitter implements NotulenInterface {
  private browser: Browser;
  private page: Page;
  private config: NotulenConfig;
  private transcribe: Transribe[] = [];
  private videoOutput: string;
  private videoFileStream: WriteStream;
  private videoStream: Transform;
  private meetingTitle: string;

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
    }/meeting-${Date.now()}.webm`.replace(/([^:])(\/\/+)/g, "$1/");

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
      args: ["--lang=id-ID,id"],
      headless: this.config.debug ? false : "new" as any,
      executablePath: executablePath(),
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    this.page = await this.browser.newPage();

    // start video steam
    this.videoFileStream = createWriteStream(this.videoOutput);
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

    // Waiting for join button appear and click
    await this.page.waitForSelector(".S3hgFf");
    const withoutMic = await this.page.waitForSelector(
      'span[class="mUIrbf-vQzf8d"]'
    );
    await withoutMic.click();
    await this.page.waitForSelector('span[class="VfPpkd-vQzf8d"]');
    await nameInput.focus();
    await this.page.keyboard.press("Enter");

    // Start recording
    this.videoStream = await getStream(this.page, { audio: true, video: true });
    this.videoStream.pipe(this.videoFileStream);

    // Waiting for Meeting has been started
    await this.page.waitForSelector(".VYBDae-Bz112c-RLmnJb");

    // Enable to transribe
    const transribe = await this.page.waitForSelector(
      "#yDmH0d > c-wiz > div.T4LgNb > div > div:nth-child(26) > div.crqnQb > div.fJsklc.nulMpf.Didmac.G03iKb > div > div > div.Tmb7Fd > div > div.juFBl > span > button"
    );
    await transribe.click();

    // change transribe language
    const settingButton = await this.page.waitForSelector(
      "#yDmH0d > c-wiz > div > div > div:nth-child(26) > div.crqnQb > div.a4cQT > div.ooO90d.P9KVBf.jxX42 > div > span > div.VfPpkd-dgl2Hf-ppHlrf-sM5MNb > button",
      {
        visible: true,
        timeout: 0,
      }
    );
    await settingButton.click();
    await this.page.waitForSelector("#dGhbkd");
    const t = await this.page.waitForSelector(
      "div.XpcnW > div > div > div.VfPpkd-TkwUic"
    );
    await t.evaluate((b) => b.click());
    const langId = await this.page.waitForSelector(
      `li[data-value="${this.config.language}"`
    );
    await langId.evaluate((b) => b.click());
    // wait for 1s using promise
    await new Promise((r) => setTimeout(r, 1000));
    const closeBtn = await this.page.waitForSelector(
      "#yDmH0d > div.VfPpkd-Sx9Kwc.VfPpkd-Sx9Kwc-OWXEXe-vOE8Lb.VfPpkd-Sx9Kwc-OWXEXe-di8rgd-bN97Pc-QFlW2.cC1eCc.UDxLd.PzCPDd.zN0eDd.Kdui9b.VfPpkd-Sx9Kwc-OWXEXe-FNFY6c > div.VfPpkd-wzTsW > div > button"
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
    const meetingTitle = await this.page.waitForSelector(".u6vdEc.ouH3xe");
    this.meetingTitle = await meetingTitle.evaluate((el) => el.textContent);

    // TODO: Listen if the bot has been kicked from the meeting
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

    /* @ts-ignore */
  }

  public async stop(): Promise<void> {
    // Stop File and video streaming
    await this.videoStream.destroy();
    await this.videoFileStream.close();

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

function setTranscribe(script: any[], last_speaker: string) {
  throw new Error("Function not implemented.");
}
