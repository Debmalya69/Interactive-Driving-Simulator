
export type VehicleRole = 'host' | 'ai';
export type HostAction = 'cruising' | 'requestingLaneChange' | 'changingLane' | 'returningLane' | 'requestingCornering' | 'braking';

export interface VehicleState {
  id: number;
  role: VehicleRole;
  x: number; // longitudinal position (m)
  y: number; // lateral position (m)
  v: number; // longitudinal velocity (m/s)
  vy: number; // lateral velocity (m/s)
  ax: number; // longitudinal acceleration (m/s^2)
  ay: number; // lateral acceleration (m/s^2)
  lane: number; // 0 for top lane, 1 for bottom lane
  color: string;
  action: HostAction;
  targetSpeed: number;
  laneChangeProgress: number; // 0 to 1
  isCornering: boolean;
  originalLane?: number; // Store the starting lane for a cornering maneuver
  actionTimer: number; // For timed actions like braking or blinker
  actionDeniedTimer: number; // For visual feedback
  isEmergencyBraking: boolean;
  blinker: 'left' | 'right' | 'none';
}

export interface ManeuverParameters {
  v1: number; // Target speed for host vehicle (km/h)
}

// New type to ensure reliable state updates and fix control race condition
export interface WorldStateUpdate {
    newStates: VehicleState[];
    hostActionConsumed: boolean;
}