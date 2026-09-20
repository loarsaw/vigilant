
export interface TourStep {
  target: string;
  title?: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface TourProps {
  steps: TourStep[];
  run: boolean;
  onFinish: () => void;
  padding?: number;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}