import {
  RUNWAY_GROUND_Y,
  flightPathDegrees,
  pitchDegrees,
  type FlightState
} from '../flight/ArcadeFlightModel';
import type { TrainingMissionProgress } from './TrainingMission';

const DEG = Math.PI / 180;

export const LANDING_GUIDE_FLARE_ALTITUDE = 8;

export type LandingGuideStage = 'approach' | 'flare';
export type LandingGuideStatus = 'good' | 'adjust';

export interface LandingGuideMetric {
  readonly value: string;
  readonly target: string;
  readonly status: LandingGuideStatus;
}

export interface LandingGuideSnapshot {
  readonly stage: LandingGuideStage;
  readonly stageLabel: string;
  readonly advice: string;
  readonly metrics: {
    readonly speed: LandingGuideMetric;
    readonly pitch: LandingGuideMetric;
    readonly path: LandingGuideMetric;
    readonly verticalSpeed: LandingGuideMetric;
    readonly bank: LandingGuideMetric;
  };
}

interface LandingGuideTargets {
  readonly speed: readonly [number, number];
  readonly pitch: readonly [number, number];
  readonly path: readonly [number, number];
  readonly verticalSpeed: readonly [number, number];
  readonly bank: number;
}

const APPROACH_TARGETS: LandingGuideTargets = {
  speed: [70, 90],
  pitch: [-4, 4],
  path: [-12, -4],
  verticalSpeed: [-4.8, -1.5],
  bank: 8
};

const FLARE_TARGETS: LandingGuideTargets = {
  speed: [65, 85],
  pitch: [6, 14],
  path: [-5, -1],
  verticalSpeed: [-3.5, -0.4],
  bank: 8
};

export function getLandingGuide(
  progress: TrainingMissionProgress,
  state: FlightState
): LandingGuideSnapshot | null {
  if (progress.phase !== 'landing' || state.onGround) {
    return null;
  }

  const altitude = Math.max(0, state.position.y - RUNWAY_GROUND_Y);
  const stage: LandingGuideStage =
    altitude <= LANDING_GUIDE_FLARE_ALTITUDE ? 'flare' : 'approach';
  const targets = stage === 'flare' ? FLARE_TARGETS : APPROACH_TARGETS;

  const speed = state.speed * 3.6;
  const pitch = pitchDegrees(state);
  const path = flightPathDegrees(state);
  const verticalSpeed = state.verticalSpeed;
  const bank = state.roll / DEG;

  return {
    stage,
    stageLabel: stage === 'flare' ? 'FLARE · 接地準備' : 'APPROACH · 進入',
    advice: guidanceAdvice(stage, { speed, pitch, path, verticalSpeed, bank }, targets),
    metrics: {
      speed: rangeMetric(speed, targets.speed, 0, 'km/h'),
      pitch: rangeMetric(pitch, targets.pitch, 0, '°', true),
      path: rangeMetric(path, targets.path, 0, '°', true),
      verticalSpeed: rangeMetric(verticalSpeed, targets.verticalSpeed, 1, 'm/s', true),
      bank: bankMetric(bank, targets.bank)
    }
  };
}

function guidanceAdvice(
  stage: LandingGuideStage,
  values: {
    readonly speed: number;
    readonly pitch: number;
    readonly path: number;
    readonly verticalSpeed: number;
    readonly bank: number;
  },
  targets: LandingGuideTargets
): string {
  if (values.speed > targets.speed[1]) {
    return '速度高め — BRAKEで目安まで減速';
  }
  if (values.speed < targets.speed[0]) {
    return '速度低め — THRUSTで失速余裕を確保';
  }
  if (Math.abs(values.bank) > targets.bank) {
    return 'BANK大 — 翼を水平へ戻してから接地';
  }
  if (values.path < targets.path[0]) {
    return '降下が急 — 機首を少し上げてPATHを浅く';
  }
  if (values.path > targets.path[1]) {
    return '降下が浅い — 機首を少し下げてPATHを合わせる';
  }
  if (values.pitch < targets.pitch[0]) {
    return '機首が低い — PITCHを少し上げる';
  }
  if (values.pitch > targets.pitch[1]) {
    return '機首が高い — PITCHを少し戻す';
  }
  if (values.verticalSpeed < targets.verticalSpeed[0]) {
    return '降下率が大きい — フレアを強めてV/Sを小さく';
  }
  if (values.verticalSpeed > targets.verticalSpeed[1]) {
    return '浮き気味 — 機首上げを少し戻して接地へ';
  }

  return stage === 'flare'
    ? 'GOOD — 機首を保ち、PATHを浅くしたまま接地'
    : 'GOOD — この進入を保ち、8 m以下でFLAREへ';
}

function rangeMetric(
  value: number,
  range: readonly [number, number],
  digits: number,
  unit: string,
  signed = false
): LandingGuideMetric {
  return {
    value: `${formatNumber(value, digits, signed)}${unit}`,
    target: `${formatNumber(range[0], digits, signed)}〜${formatNumber(range[1], digits, signed)}${unit}`,
    status: value >= range[0] && value <= range[1] ? 'good' : 'adjust'
  };
}

function bankMetric(value: number, maxAbsolute: number): LandingGuideMetric {
  return {
    value: `${formatNumber(value, 0, true)}°`,
    target: `±${maxAbsolute}°以内`,
    status: Math.abs(value) <= maxAbsolute ? 'good' : 'adjust'
  };
}

function formatNumber(value: number, digits: number, signed: boolean): string {
  const rounded = value.toFixed(digits);
  if (signed && value > 0) {
    return `+${rounded}`;
  }
  return rounded;
}
