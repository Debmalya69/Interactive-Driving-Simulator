import { VehicleState, ManeuverParameters, HostAction, WorldStateUpdate } from '../types';
import { LANE_WIDTH, VEHICLE_LENGTH, SAFE_FOLLOWING_TIME, MAX_BRAKING_DECEL } from '../constants';

// --- Initialization for the real-time simulation ---
export const initializeVehicles = (params: ManeuverParameters): VehicleState[] => {
    const allVehicles: Omit<VehicleState, 'id' | 'v' | 'vy' | 'ax' | 'ay'>[] = [];
    const topLaneY = LANE_WIDTH * 0.5;
    const bottomLaneY = LANE_WIDTH * 1.5;

    // Create Host
    allVehicles.push({
        role: 'host', x: 20, y: topLaneY, lane: 0,
        color: 'red', action: 'cruising', targetSpeed: params.v1 / 3.6,
        laneChangeProgress: 0, isCornering: false, actionTimer: 0, actionDeniedTimer: 0, isEmergencyBraking: false, blinker: 'none'
    });

    // --- Forced Aggressive Overtake Scenario Generation ---
    // Place a cluster of slow cars directly in front of the host
    for (let i = 0; i < 4; i++) {
        const speed = (params.v1 * 0.7) / 3.6; // Slower than host
        allVehicles.push({
            role: 'ai',
            x: 80 + i * (VEHICLE_LENGTH + 25), // Stagger them in front
            y: topLaneY, lane: 0,
            color: 'gray', action: 'cruising', targetSpeed: speed,
            laneChangeProgress: 0, isCornering: false, actionTimer: 0, actionDeniedTimer: 0, isEmergencyBraking: false, blinker: 'none'
        });
    }
    
    // Place a car in the other lane to create a tight but possible gap
    const blockingCarSpeed = (params.v1 * 0.8) / 3.6;
    allVehicles.push({
        role: 'ai',
        x: 60, y: bottomLaneY, lane: 1,
        color: 'gray', action: 'cruising', targetSpeed: blockingCarSpeed,
        laneChangeProgress: 0, isCornering: false, actionTimer: 0, actionDeniedTimer: 0, isEmergencyBraking: false, blinker: 'none'
    });


    // Fill the rest of the road with random traffic
    for (let i = 0; i < 35; i++) { // Total 40 AI cars
        const lane = Math.random() > 0.5 ? 0 : 1;
        const speed = (80 + Math.random() * 40) / 3.6; // 80-120 km/h
        allVehicles.push({
            role: 'ai',
            x: (Math.random() * 2000) - 500,
            y: lane === 0 ? topLaneY : bottomLaneY,
            lane,
            color: 'gray', action: 'cruising', targetSpeed: speed,
            laneChangeProgress: 0, isCornering: false, actionTimer: 0, actionDeniedTimer: 0, isEmergencyBraking: false, blinker: 'none'
        });
    }

    const tempVehiclesWithIds = allVehicles.map((v, i) => ({
        ...v,
        id: i,
        v: 0, vy: 0, ax: 0, ay: 0,
    }));
    
    const vehiclesInLane0 = tempVehiclesWithIds.filter(v => v.lane === 0).sort((a, b) => a.x - b.x);
    const vehiclesInLane1 = tempVehiclesWithIds.filter(v => v.lane === 1).sort((a, b) => a.x - b.x);

    [vehiclesInLane0, vehiclesInLane1].forEach(laneVehicles => {
        for (let i = 1; i < laneVehicles.length; i++) {
            const carInFront = laneVehicles[i - 1];
            const currentCar = laneVehicles[i];
            const requiredGap = carInFront.targetSpeed * SAFE_FOLLOWING_TIME + VEHICLE_LENGTH + 5;
            if (currentCar.x - carInFront.x < requiredGap) {
                currentCar.x = carInFront.x + requiredGap;
            }
        }
    });

    return [...vehiclesInLane0, ...vehiclesInLane1];
};


// --- Core real-time update loop ---
export const updateWorldState = (
    vehicles: VehicleState[],
    params: ManeuverParameters,
    hostAction: HostAction,
    isAutonomousMode: boolean,
    dt: number
): WorldStateUpdate => {

    const newStates = vehicles.map(v => ({ ...v }));
    let hostActionConsumed = false;

    newStates.forEach(vehicle => {
        if (vehicle.actionDeniedTimer > 0) vehicle.actionDeniedTimer -= dt;
        if (vehicle.actionTimer > 0) vehicle.actionTimer -= dt;
        vehicle.isEmergencyBraking = false;

        if (vehicle.role === 'host') {
            vehicle.targetSpeed = params.v1 / 3.6;
            const consumed = handleHostActions(vehicle, hostAction, newStates);
            if (consumed) {
                hostActionConsumed = true;
            }
            if (isAutonomousMode && vehicle.action === 'cruising') {
                runAutonomousDecisionMaking(vehicle, newStates);
            }
        } else {
            vehicle.action = 'cruising';
        }

        updateVehiclePhysics(vehicle, newStates, dt);
    });

    return { newStates, hostActionConsumed };
};


const handleHostActions = (vehicle: VehicleState, hostAction: HostAction, allVehicles: VehicleState[]): boolean => {
    if (hostAction === 'cruising') return false;

    if (hostAction === 'braking') {
        vehicle.action = 'braking';
        vehicle.actionTimer = 1.5;
        vehicle.isCornering = false;
        vehicle.laneChangeProgress = 0;
        vehicle.originalLane = undefined;
        return true;
    }

    if (vehicle.action === 'cruising') {
        if (hostAction === 'requestingLaneChange' || hostAction === 'requestingCornering') {
            if (isLaneChangeSafe(vehicle, allVehicles)) {
                vehicle.action = 'changingLane';
                vehicle.isCornering = hostAction === 'requestingCornering';
                if (vehicle.isCornering) {
                    vehicle.originalLane = vehicle.lane;
                }
                vehicle.actionTimer = 0.5;
            } else {
                vehicle.actionDeniedTimer = 1.0;
            }
            return true;
        }
    }
    return false;
};

const runAutonomousDecisionMaking = (vehicle: VehicleState, allVehicles: VehicleState[]) => {
    const carInFront = findCarInFront(vehicle, allVehicles, vehicle.lane);
    
    const isBlocked = carInFront && (vehicle.v < vehicle.targetSpeed * 0.95);

    if (isBlocked && vehicle.actionTimer <= 0) {
        const currentLaneProspects = getLaneProspects(vehicle, allVehicles, vehicle.lane);
        const targetLaneProspects = getLaneProspects(vehicle, allVehicles, 1 - vehicle.lane);
        
        if (targetLaneProspects.clearDistance > currentLaneProspects.clearDistance + VEHICLE_LENGTH * 2 && isLaneChangeSafe(vehicle, allVehicles)) {
            vehicle.action = 'changingLane';
            vehicle.actionTimer = 0.5;
        }
    }
};

const updateVehiclePhysics = (vehicle: VehicleState, allVehicles: VehicleState[], dt: number) => {
    const target_ax = getTargetAcceleration(vehicle, allVehicles);

    switch (vehicle.action) {
        case 'braking':
            vehicle.ax = MAX_BRAKING_DECEL;
            vehicle.isEmergencyBraking = true;
            if (vehicle.actionTimer <= 0) vehicle.action = 'cruising';
            break;

        case 'changingLane':
        case 'returningLane':
            if (vehicle.actionTimer > 0) {
                const targetLaneForBlinker = vehicle.action === 'returningLane' ? vehicle.originalLane : 1 - vehicle.lane;
                vehicle.blinker = (targetLaneForBlinker ?? 0) > vehicle.lane ? 'right' : 'left';
                vehicle.ax = target_ax;
            } else {
                vehicle.blinker = 'none';
                const laneChangeDuration = 3.0;

                let targetLane = 1 - vehicle.lane;
                if (vehicle.action === 'returningLane' && vehicle.originalLane !== undefined) {
                    targetLane = vehicle.originalLane;
                }

                const targetY = (targetLane === 0 ? LANE_WIDTH * 0.5 : LANE_WIDTH * 1.5);
                const dy = targetY - vehicle.y;
                const lateralForce = dy * 2.0 - vehicle.vy * 2.5;
                vehicle.ay = lateralForce;
                vehicle.ax = target_ax;

                vehicle.laneChangeProgress += dt / laneChangeDuration;
                if (vehicle.laneChangeProgress >= 1) {
                    vehicle.y = targetY;
                    vehicle.vy = 0;
                    vehicle.ay = 0;
                    vehicle.lane = targetLane;
                    vehicle.laneChangeProgress = 0;
                    if (vehicle.action === 'changingLane' && vehicle.isCornering) {
                        vehicle.action = 'returningLane';
                        vehicle.actionTimer = 0.5;
                        vehicle.isCornering = false;
                    } else {
                        vehicle.action = 'cruising';
                        vehicle.isCornering = false;
                        vehicle.originalLane = undefined;
                    }
                }
            }
            break;

        default: // Cruising
            vehicle.ax = target_ax;
            vehicle.ay = 0;
            vehicle.vy = 0;
            const currentLaneY = vehicle.lane === 0 ? LANE_WIDTH * 0.5 : LANE_WIDTH * 1.5;
            if (Math.abs(vehicle.y - currentLaneY) > 0.01) {
                vehicle.y += (currentLaneY - vehicle.y) * 0.1;
            } else {
                vehicle.y = currentLaneY;
            }
            break;
    }

    vehicle.v += vehicle.ax * dt;
    vehicle.v = Math.max(0, vehicle.v);
    vehicle.x += vehicle.v * dt;

    vehicle.vy += vehicle.ay * dt;
    vehicle.y += vehicle.vy * dt;
};

const calculateIDMAcceleration = (vehicle: VehicleState, carInFront: VehicleState | null): number => {
    const a_max = 1.5;
    const b = 2.0;
    const delta = 4;
    const s0 = 2.0;
    const v = vehicle.v;
    const v0 = vehicle.targetSpeed;

    const freeRoadTerm = Math.pow(v / v0, delta);

    let interactionTerm = 0;
    if (carInFront) {
        const deltaX = carInFront.x - vehicle.x - VEHICLE_LENGTH;
        if (deltaX < 0.1) return -10;

        const deltaV = v - carInFront.v;
        const s_star = s0 + Math.max(0, v * SAFE_FOLLOWING_TIME + (v * deltaV) / (2 * Math.sqrt(a_max * b)));
        interactionTerm = Math.pow(s_star / deltaX, 2);
    }

    return a_max * (1 - freeRoadTerm - interactionTerm);
};

const getTargetAcceleration = (vehicle: VehicleState, allVehicles: VehicleState[]): number => {
    const carInFrontCurrentLane = findCarInFront(vehicle, allVehicles, vehicle.lane);
    const accelCurrentLane = calculateIDMAcceleration(vehicle, carInFrontCurrentLane);

    if (vehicle.role === 'host' && (vehicle.action === 'changingLane' || vehicle.action === 'returningLane')) {
        const targetLane = vehicle.action === 'returningLane' ? vehicle.originalLane ?? 1 - vehicle.lane : 1 - vehicle.lane;
        const carInFrontTargetLane = findCarInFront(vehicle, allVehicles, targetLane);
        const accelTargetLane = calculateIDMAcceleration(vehicle, carInFrontTargetLane);
        return Math.min(accelCurrentLane, accelTargetLane);
    }

    return accelCurrentLane;
};

const findCarInFront = (currentVehicle: VehicleState, allVehicles: VehicleState[], lane: number): VehicleState | null => {
    let carInFront: VehicleState | null = null;
    let minDistance = Infinity;

    for(const v of allVehicles) {
        if (v.id !== currentVehicle.id && v.lane === lane) {
            const distance = v.x - currentVehicle.x;
            if (distance > 0 && distance < minDistance) {
                minDistance = distance;
                carInFront = v;
            }
        }
    }
    return carInFront;
};

const getLaneProspects = (vehicle: VehicleState, allVehicles: VehicleState[], lane: number): { clearDistance: number } => {
    const carInFront = findCarInFront(vehicle, allVehicles, lane);
    if (carInFront) {
        return { clearDistance: carInFront.x - vehicle.x - VEHICLE_LENGTH };
    }
    return { clearDistance: Infinity };
};

const isLaneChangeSafe = (vehicle: VehicleState, allVehicles: VehicleState[]): boolean => {
    const targetLane = 1 - vehicle.lane;
    const safetyMargin = VEHICLE_LENGTH * 1.2;

    for (const other of allVehicles) {
        if (other.id !== vehicle.id && other.lane === targetLane) {
            const futureHostX = vehicle.x + vehicle.v * 1.0;
            const futureOtherX = other.x + other.v * 1.0;
            if(Math.abs(futureHostX - futureOtherX) < safetyMargin) return false;

            if (other.x > vehicle.x && (other.x - vehicle.x) < safetyMargin * 2) return false;
            if (vehicle.x > other.x && (vehicle.x - other.x) < safetyMargin * 2) return false;
        }
    }
    return true;
};
