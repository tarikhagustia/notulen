# Notulen - private Google meet AI Note Taker

Notulen is a private Google meet AI Note Taker that takes notes during a Google meet session. It uses the Puppeteer to join the meeting and use Puppeteer steam to convert the screen to video. The caption is generated using Google meet caption by default. Once the meeting is done the transribe is sent to the Google gemini API to generate the notes.

## Known issue
- Google meet HTML element always changing, sometimes the bot can't join the meeting because the element is not found.
- Need to find the correct selector for all actions so the bot can work properly.

## Installation

Install via npm or yarn

```bash
npm install @tarikhagustia/notulen
or
yarn add @tarikhagustia/notulen
```

then you can use it in your project

```javascript
const { Notulen } = require("@tarikhagustia/notulen");
// or using ES6
import { Notulen } from "@tarikhagustia/notulen";
```

## Usage

```javascript
import { Notulen } from "@tarikhagustia/notulen";
import { MeetingResult } from "@tarikhagustia/notulen";

async function main() {
  const client = new Notulen({
    debug: false, // debug mode to show the browser
    name: "My Assistant", // Bot name
    googleMeetUrl: "https://meet.google.com/xxx-xxx-xxx", // your google meet link
    language: "id-ID", // language for caption generation
    geminiApiKey: "secretApiKey", // google gemini api key (get it for free)
    recordingLocation: './out', // location to save the recording
    prompt: 'You are an Assistant Note Taker, based on the meeting results in the form of the transcript below, please make a summary of the meeting\n' // Optional, this is the default prompt that will be used to generate the summary
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
## Todos

- [x] ffmpeg integration to convert the video to mp4
- [x] Able to change audio and video quality
- [ ] detect if the bot is kicked from the meeting
- [x] Video stream can be access publicly
- [x] Able to not record the video
- [x] Able to pause and resume the recording
- [ ] Add logging feature
- [ ] Change from plain prompt to template based prompt
- [ ] Able to change profile picture based on image or video (not possible yet)
- [ ] Integrate with more LLM APIs, will good if this package can be agnostic to the API

## Contributing

Thank you for considering contributing to Notulen! you can fork this repository and feel free to make pull request.

## Security Vulnerabilities

If you discover a security vulnerability within Notulen package, please send an e-mail to Tarikh Agustia via [agustia.tarikh150@gmail.com](mailto:agustia.tarikh150@gmail.com). All security vulnerabilities will be promptly addressed.

## License

This project is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).
