import { Transribe } from "./interfaces";

export function transribeToText(transribes: Transribe[]): string {
  if (transribes.length === 0) return "";

  // Calculate the start time from the first transcription entry
  const startTime = transribes[0].date;

  return transribes
    .map((entry) => {
      const elapsedTime = Number(entry.date) - Number(startTime); // Elapsed time in milliseconds
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // Format the elapsed time as MM:SS
      const timestamp = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
      const formattedText = entry.text.replace(/\r\n/g, " ");

      return `${timestamp} - ${entry.speaker.name} : ${formattedText}`;
    })
    .join("\n");
}
