# Notulen - private Google meet AI Note Taker

Notulen is a private Google meet AI Note Taker that takes notes during a Google meet session. It uses the Puppeteer to join the meeting and use Puppeteer steam to convert the screen to video. The caption is generated using Google meet caption by default. Once the meeting is done the transribe is sent to the Google gemini API to generate the notes.

## Installation

Install via npm or yarn

```bash
npm install @tarikhagustia/notulen
or
yarn add @tarikhagustia/notulen
```

then you can use it in your project

```javascript
const notulen = require("@tarikhagustia/notulen");
// or using ES6
import notulen from "@tarikhagustia/notulen";
```

## Usage

```javascript
import { Notulen } from "../src";
import { MeetingResult } from "../src/interfaces";

async function main() {
  const client = new Notulen({
    name: "My Assistant", // Bot name
    googleMeetUrl: "https://meet.google.com/xxx-xxx-xxx", // your google meet link
    language: "id-ID", // language for caption generation
    geminiApiKey: "secretApiKey", // google gemini api key (get it for free)
    recordingLocation: './out' // location to save the recording
    prompt: 'Kamu adalah seorang Asisten Note Takker, berdasarkan hasil meeting berupa transribe dibawah ini tolong buatkan summary meeting\n' // Optional, this is the default prompt that will be used to generate the summary
  });

    // Start join the meeting
  client.listen();

  client.on("end", (result: MeetingResult) => {
    console.log("Summary:");
    console.log(result.summary);

    // exit process when done
    process.exit(0);
  });
}

// Start the main function
main();
```

## Contributing

Thank you for considering contributing to Notulen! you can fork this repository and feel free to make pull request.

## Security Vulnerabilities

If you discover a security vulnerability within Notulen package, please send an e-mail to Tarikh Agustia via [agustia.tarikh150@gmail.com](mailto:agustia.tarikh150@gmail.com). All security vulnerabilities will be promptly addressed.

## License

This project is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).
