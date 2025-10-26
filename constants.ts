
// Physical constants
export const LANE_WIDTH = 3.9; // meters (W in the paper, from Fig 13)
export const VEHICLE_LENGTH = 4.5; // meters
export const VEHICLE_WIDTH = 1.8; // meters

// Simulation behavior from the paper
export const LATERAL_MANEUVER_DURATION = 5.5; // seconds (Ty)
export const MAX_PHYSICAL_ACCEL = 2.0; // m/s^2 (alim)
export const MAX_BRAKING_DECEL = -8.0; // m/s^2 for emergency braking
export const JERK = 2.0; // m/s^3 (jx)
export const SAFE_FOLLOWING_TIME = 1.5; // seconds for reactive AI

// Visual & Timing Constants
export const SIMULATION_SCALE = 10; // pixels per meter
export const SIMULATION_TIMESTEP = 16; // ms, for ~60fps