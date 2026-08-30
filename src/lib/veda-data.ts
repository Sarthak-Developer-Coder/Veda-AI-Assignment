export type ScoreState = "good" | "partial" | "bad" | "answered" | "unanswered";

export type Region = {
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Question = {
  id: string;
  number: string;
  sub?: string;
  text: string;
  earned: number;
  total: number;
  state: ScoreState;
  feedback: string;
  regions: Region[];
  answerIds?: string[];
};

export type HandBlock = {
  id: string;
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
  lines: string[];
  unmapped?: boolean;
};

export const scoreStyles: Record<ScoreState, string> = {
  good: "bg-success/12 text-success",
  partial: "bg-warn/15 text-warn",
  bad: "bg-danger/12 text-danger",
  answered: "bg-brand/12 text-brand",
  unanswered: "bg-muted text-muted-foreground",
};
