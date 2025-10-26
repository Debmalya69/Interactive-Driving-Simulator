import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VehicleState, ManeuverParameters, HostAction, WorldStateUpdate } from './types';
import ControlsPanel from './components/ControlsPanel';
import SimulationView from './components/SimulationView';
import ChartsDisplay from './components/ChartsDisplay';
import { initializeVehicles, updateWorldState } from './services/simulationService';
import { SIMULATION_TIMESTEP } from './constants';

const Header: React.FC = () => (
  <header className="bg-white p-4 border-b border-gray-200 shadow-sm">
    <h1 className="text-2xl font-bold text-gray-800 text-center tracking-wide">
      Interactive Driving Simulator
    </h1>
  </header>
);

const INITIAL_PARAMS: ManeuverParameters = {
  v1: 100,
};

type SimulationStatus = 'idle' | 'running';

const App: React.FC = () => {
  const [params, setParams] = useState<ManeuverParameters>(INITIAL_PARAMS);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [vehicleStates, setVehicleStates] = useState<VehicleState[]>([]);
  const [isAutonomousMode, setIsAutonomousMode] = useState(true);
  const [chartData, setChartData] = useState<{time: number, ax: number, ay: number}[]>([]);
  
  const animationFrameId = useRef<number | null>(null);
  const hostActionRef = useRef<HostAction>('cruising');
  const simulationTimeRef = useRef(0);

  const resetSimulation = useCallback(() => {
    setStatus('idle');
    const initialVehicles = initializeVehicles(params);
    setVehicleStates(initialVehicles);
    setChartData([]);
    simulationTimeRef.current = 0;
    hostActionRef.current = 'cruising';
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
    }
  }, [params]);

  useEffect(() => {
    setVehicleStates(initializeVehicles(params));
  }, []);

  const gameLoop = useCallback(() => {
    setVehicleStates(prevStates => {
      simulationTimeRef.current += SIMULATION_TIMESTEP / 1000;
      
      const update: WorldStateUpdate = updateWorldState(
          prevStates, 
          params, 
          hostActionRef.current, 
          isAutonomousMode, 
          SIMULATION_TIMESTEP / 1000
      );

      if (update.hostActionConsumed) {
          if (hostActionRef.current !== 'cruising') {
               hostActionRef.current = 'cruising';
          }
      }

      const host = update.newStates.find(v => v.role === 'host');
      if (host) {
        setChartData(prevData => [...prevData, { time: simulationTimeRef.current, ax: host.ax, ay: host.ay }].slice(-900)); // ~15 seconds of data
      }
      
      return update.newStates;
    });

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [params, isAutonomousMode]);

  const handleStartStop = () => {
    if (status === 'running') {
      setStatus('idle');
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    } else {
      setStatus('running');
      simulationTimeRef.current = 0;
      setChartData([]);
      setVehicleStates(initializeVehicles(params));
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }
  };
  
  const handleReset = () => {
      resetSimulation();
      setParams(INITIAL_PARAMS);
      setVehicleStates(initializeVehicles(INITIAL_PARAMS));
  }

  const handleHostAction = (action: HostAction) => {
    hostActionRef.current = action;
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto max-w-6xl p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <SimulationView vehicleStates={vehicleStates} />
          <ChartsDisplay chartData={chartData} isRunning={status === 'running'} />
        </div>
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 flex flex-col">
          <ControlsPanel 
            params={params}
            setParams={setParams}
            status={status}
            isAutonomous={isAutonomousMode}
            setIsAutonomous={setIsAutonomousMode}
            onStartStop={handleStartStop}
            onReset={handleReset}
            onHostAction={handleHostAction}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
