import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartsDisplayProps {
  chartData: {time: number, ax: number, ay: number}[];
  isRunning: boolean;
}

const ChartPlaceholder: React.FC<{ message: string}> = ({ message }) => (
    <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500 text-center p-4">{message}</p>
    </div>
);

const ChartsDisplay: React.FC<ChartsDisplayProps> = ({ chartData, isRunning }) => {
    
    if (!isRunning && chartData.length === 0) {
        return (
            <div className="h-64">
                <div className="h-full bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                    <ChartPlaceholder message="Press 'Start Simulation' to see live vehicle data." />
                </div>
            </div>
        );
    }

    const lastTime = chartData.length > 0 ? chartData[chartData.length - 1].time : 0;
    const timeDomain = [Math.max(0, lastTime - 15), lastTime];
        
    return (
        <div className="h-64">
            <div className="h-full bg-white p-4 rounded-lg shadow-inner border border-gray-200">
                <h3 className="text-md font-semibold text-gray-700 mb-4 text-center">Live Host Vehicle Acceleration (m/s²)</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                            dataKey="time" 
                            type="number"
                            domain={timeDomain}
                            tickFormatter={(time) => time.toFixed(0)}
                            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
                            allowDataOverflow
                        />
                        <YAxis domain={[-4, 4]} allowDataOverflow={true} />
                        <Tooltip 
                            formatter={(value: number) => value.toFixed(2)}
                            labelFormatter={(label: number) => `Time: ${label.toFixed(2)}s`}
                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #ccc' }}
                        />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }}/>
                        <Line 
                            type="linear" 
                            dataKey="ax" 
                            stroke="#1E40AF" // blue-800
                            strokeWidth={2}
                            dot={false}
                            name="Longitudinal (ax)"
                        />
                        <Line 
                            type="linear" 
                            dataKey="ay" 
                            stroke="#BE123C" // rose-700
                            strokeWidth={2}
                            dot={false}
                            name="Lateral (ay)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartsDisplay;
