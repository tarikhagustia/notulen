import { Notulen } from "../src";
import { MeetingResult } from "../src/interfaces";

async function main() {
  const client = new Notulen({
    name: "My Assistant",
    googleMeetUrl: "https://meet.google.com/bvk-ryhf-tkk",
    language: "id-ID",
    geminiApiKey: "API KEYS",
  });

  await client.listen();

  client.on("end", (result: MeetingResult) => {
    console.log("Summary:");
    console.log(result.summary);

    process.exit(0);
  });
}

main();
