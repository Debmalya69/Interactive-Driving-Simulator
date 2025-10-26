
import React from 'react';
import { ManeuverParameters, HostAction } from '../types';

interface ControlsPanelProps {
  params: ManeuverParameters;
  setParams: React.Dispatch<React.SetStateAction<ManeuverParameters>>;
  status: 'idle' | 'running';
  isAutonomous: boolean;
  setIsAutonomous: (isAutonomous: boolean) => void;
  onStartStop: () => void;
  onReset: () => void;
  onHostAction: (action: HostAction) => void;
}

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean }> = ({ label, value, min, max, step, unit, onChange, disabled }) => (
  <div className="space-y-2">
    <label className="flex justify-between items-center text-sm font-medium text-gray-700">
      <span>{label}</span>
      <span className="text-gray-900 font-semibold">{value} {unit}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full text-center bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:border-gray-300"
  >
    {children}
  </button>
);

const ControlsPanel: React.FC<ControlsPanelProps> = ({ params, setParams, status, isAutonomous, setIsAutonomous, onStartStop, onReset, onHostAction }) => {
  const isRunning = status === 'running';

  const handleParamChange = (field: keyof ManeuverParameters, value: string) => {
    setParams(prev => ({ ...prev, [field]: Number(value) }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">Simulation Controls</h2>
        
        <div className="flex space-x-2">
            <button
                onClick={onStartStop}
                className={`flex-1 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isRunning ? 'Stop Simulation' : 'Start Simulation'}
            </button>
            <button onClick={onReset} disabled={isRunning} className="bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all duration-200">Reset</button>
        </div>

        <Slider label="Host Vehicle Speed" value={params.v1} min={50} max={130} step={1} unit="km/h" onChange={(e) => handleParamChange('v1', e.target.value)} disabled={false} />
        
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h3 className="text-md font-semibold text-gray-800">Host Vehicle Control</h3>
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <label htmlFor="autonomous-toggle" className="font-semibold text-gray-700">Autonomous Mode</label>
            <button
              id="autonomous-toggle"
              onClick={() => setIsAutonomous(!isAutonomous)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ${isAutonomous ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${isAutonomous ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <ActionButton onClick={() => onHostAction('requestingLaneChange')} disabled={!isRunning || isAutonomous}>
                Request Lane Change
            </ActionButton>
            <ActionButton onClick={() => onHostAction('requestingCornering')} disabled={!isRunning || isAutonomous}>
                Cornering
            </ActionButton>
            <ActionButton onClick={() => onHostAction('braking')} disabled={!isRunning || isAutonomous}>
                Emergency Brake
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;