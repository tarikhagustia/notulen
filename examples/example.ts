import { Notulen } from "../src";

async function main() {
  const client = new Notulen({
    name: "My Assistant",
    googleMeetUrl: "https://meet.google.com/bvk-ryhf-tkk",
    language: "id-ID",
  });

  const result = await client.listen();

  console.log(result);
}

main();
