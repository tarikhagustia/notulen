import { Transribe } from "./interfaces";

export function transribeToText(transribes: Transribe[]): string {
  return transribes
    .map((entry) => {
      const date = new Date(entry.date);
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      const formattedText = entry.text.replace(/\r\n/g, " ");

      return `${hours}:${minutes} - ${entry.speaker.name} : ${formattedText}`;
    })
    .join("\n");
}
