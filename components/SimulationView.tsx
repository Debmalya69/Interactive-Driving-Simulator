import React, { useRef } from 'react';
import { VehicleState } from '../types';
import { LANE_WIDTH, VEHICLE_LENGTH, VEHICLE_WIDTH, SIMULATION_SCALE } from '../constants';

interface SimulationViewProps {
  vehicleStates: VehicleState[];
}

const VehicleSVG: React.FC<{ state: VehicleState }> = ({ state }) => {
    const isHost = state.role === 'host';
    const vehicleScaledLength = VEHICLE_LENGTH * SIMULATION_SCALE;
    const vehicleScaledWidth = VEHICLE_WIDTH * SIMULATION_SCALE;

    const hostBorderColor = state.actionDeniedTimer > 0 ? '#EF4444' : '#FBBF24'; // red-500 or amber-300

    const bodyRollAngle = state.ay * -3.0;
    const showSkidMarks = Math.abs(state.ay) > 2.5;

    return (
        <g transform={`translate(${state.x * SIMULATION_SCALE}, ${state.y * SIMULATION_SCALE})`}>
             {showSkidMarks && (
                <g opacity="0.8">
                    <rect x={-vehicleScaledLength / 2 - 5} y={-vehicleScaledWidth / 2 - 2} width="10" height="4" className="fill-black/70" rx="1" />
                    <rect x={-vehicleScaledLength / 2 - 5} y={vehicleScaledWidth / 2 - 2} width="10" height="4" className="fill-black/70" rx="1" />
                    <rect x={vehicleScaledLength / 2 - 15} y={-vehicleScaledWidth / 2 - 2} width="10" height="4" className="fill-black/70" rx="1" />
                    <rect x={vehicleScaledLength / 2 - 15} y={vehicleScaledWidth / 2 - 2} width="10" height="4" className="fill-black/70" rx="1" />
                </g>
            )}

            <g transform={`rotate(${bodyRollAngle})`}>
                <rect
                    x={-vehicleScaledLength / 2}
                    y={-vehicleScaledWidth / 2}
                    width={vehicleScaledLength}
                    height={vehicleScaledWidth}
                    fill={isHost ? "#DC2626" : "#4B5563"}
                    rx="2"
                    stroke={isHost ? hostBorderColor : 'rgba(0,0,0,0.5)'}
                    strokeWidth={isHost ? "3" : "1"}
                    className={isHost && state.actionDeniedTimer > 0 ? 'blinking' : ''}
                />
                 <rect
                    x={vehicleScaledLength * 0.1}
                    y={-vehicleScaledWidth * 0.4}
                    width={vehicleScaledLength * 0.3}
                    height={vehicleScaledWidth * 0.8}
                    className="fill-black/30"
                    rx="1"
                />
                <rect x={vehicleScaledLength / 2 - 2} y={-vehicleScaledWidth / 2 + 2} width="4" height="3" className="fill-amber-200" />
                <rect x={vehicleScaledLength / 2 - 2} y={vehicleScaledWidth / 2 - 5} width="4" height="3" className="fill-amber-200" />
                <rect 
                    x={-vehicleScaledLength / 2} 
                    y={-vehicleScaledWidth / 2 + 2} 
                    width="2" 
                    height="4" 
                    className={`fill-red-500 ${state.ax < -1 || state.isEmergencyBraking ? 'opacity-100' : 'opacity-40'} ${state.isEmergencyBraking ? 'blinking' : ''}`}
                />
                <rect 
                    x={-vehicleScaledLength / 2} 
                    y={vehicleScaledWidth / 2 - 6} 
                    width="2" 
                    height="4" 
                    className={`fill-red-500 ${state.ax < -1 || state.isEmergencyBraking ? 'opacity-100' : 'opacity-40'} ${state.isEmergencyBraking ? 'blinking' : ''}`}
                />
            </g>
            
            {state.blinker === 'left' && <rect x={-vehicleScaledLength / 2} y={-vehicleScaledWidth / 2 - 3} width="4" height="4" className="fill-amber-400 blinking" />}
            {state.blinker === 'right' && <rect x={-vehicleScaledLength / 2} y={vehicleScaledWidth / 2 - 1} width="4" height="4" className="fill-amber-400 blinking" />}
        </g>
    );
};


const SimulationView: React.FC<SimulationViewProps> = ({ vehicleStates }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const viewWidth = containerRef.current?.clientWidth || 800;
  const viewHeight = 320; // h-80
  
  const hostCar = vehicleStates.find(v => v.role === 'host');
  const cameraX = hostCar ? hostCar.x * SIMULATION_SCALE - viewWidth / 3 : 0;
  
  const roadHeight = LANE_WIDTH * 2 * SIMULATION_SCALE;
  const roadY = viewHeight / 2 - roadHeight / 2;
  
  const hostCarVelocity = hostCar ? hostCar.v : 0;

  return (
    <div ref={containerRef} className="bg-sky-300 rounded-lg h-80 w-full overflow-hidden relative border-2 border-gray-300 shadow-md">
      <svg
        width="100%"
        height="100%"
        viewBox={`${cameraX} 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x={cameraX - 1000} y={roadY} width={viewWidth + 2000} height={roadHeight} fill="#6B7280" />

        <g transform={`translate(0, ${roadY})`}>
          <line x1="-500000" y1="0" x2="1000000" y2="0" stroke="white" strokeOpacity="0.3" strokeWidth="2" />
          <line 
            x1="-500000" y1={LANE_WIDTH * SIMULATION_SCALE} x2="1000000" y2={LANE_WIDTH * SIMULATION_SCALE} 
            stroke="white" strokeWidth="2" strokeDasharray={`${2 * SIMULATION_SCALE} ${2 * SIMULATION_SCALE}`} 
          />
          <line x1="-500000" y1={roadHeight} x2="1000000" y2={roadHeight} stroke="white" strokeOpacity="0.3" strokeWidth="2" />
        </g>
        
        <g transform={`translate(0, ${roadY})`}>
          {vehicleStates.map(v => <VehicleSVG key={v.id} state={v} />)}
        </g>
      </svg>
      
       <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-md text-xs font-mono text-gray-800 border border-gray-200">
        Host Speed: {(hostCarVelocity * 3.6).toFixed(1)} km/h
      </div>
    </div>
  );
};

export default SimulationView;
