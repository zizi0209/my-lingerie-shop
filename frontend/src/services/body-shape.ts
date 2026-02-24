import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface BodyShapeProfile {
  bustRatio: number;
  waistRatio: number;
  hipRatio: number;
}

const LANDMARK = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function estimateBodyShape(
  landmarks: NormalizedLandmark[],
  canvasWidth: number
): BodyShapeProfile {
  const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK.LEFT_HIP];
  const rightHip = landmarks[LANDMARK.RIGHT_HIP];

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x) * canvasWidth;
  const hipWidth = Math.abs(rightHip.x - leftHip.x) * canvasWidth;

  const leftWaistX = lerp(leftShoulder.x, leftHip.x, 0.55) * canvasWidth;
  const rightWaistX = lerp(rightShoulder.x, rightHip.x, 0.55) * canvasWidth;
  const waistWidth = Math.abs(rightWaistX - leftWaistX);

  const baseWidth = Math.max(1, (shoulderWidth + hipWidth) / 2);

  const bustRatio = clamp(shoulderWidth / baseWidth, 0.75, 1.35);
  const waistRatio = clamp(waistWidth / baseWidth, 0.6, 1.2);
  const hipRatio = clamp(hipWidth / baseWidth, 0.75, 1.35);

  return {
    bustRatio,
    waistRatio,
    hipRatio,
  };
}
