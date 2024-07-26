import { Notulen } from "../src";
import { MeetingResult } from "../src/interfaces";

async function main() {
  const client = new Notulen({
    name: "My Assistant",
    googleMeetUrl: "https://meet.google.com/bvk-ryhf-tkk",
    language: "id-ID",
    geminiApiKey: "API KEYS",
    debug: true,
    recordMeeting: false,
    streamConfig: {
      audio: true,
      video: true,
      audioBitsPerSecond: 128000, // 128kbps
      videoBitsPerSecond: 2500000, // 2.5Mbps
      videoConstraints: {
        mandatory: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 15 },
        },
      },
    },
  });

  await client.listen();

  client.on("end", (result: MeetingResult) => {
    console.log("Summary:");
    console.log(result.transribe);
    console.log(result.summary);
  });
}

main();
