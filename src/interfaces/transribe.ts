import { Participant } from "./participant";

export interface Transribe {
  speaker: Participant;
  date: Date;
  text: string;
}
