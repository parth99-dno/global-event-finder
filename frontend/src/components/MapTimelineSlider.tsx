import React, { useState, useEffect } from 'react';

interface Props {
  minDate: Date;
  maxDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

export default function MapTimelineSlider({ minDate, maxDate, onRangeChange }: Props) {
  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();
  
  const [startVal, setStartVal] = useState(minTime);
  const [endVal, setEndVal] = useState(maxTime);

  // Debounce the callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onRangeChange(new Date(startVal), new Date(endVal));
    }, 300);
    return () => clearTimeout(timer);
  }, [startVal, endVal, onRangeChange]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), endVal - 86400000); // at least 1 day gap
    setStartVal(val);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), startVal + 86400000);
    setEndVal(val);
  };

  const getPercent = (val: number) => ((val - minTime) / (maxTime - minTime)) * 100;
  
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 hidden sm:block">
      <div className="bg-slate-900/90 border border-slate-700/50 backdrop-blur-md rounded-xl p-4 shadow-xl">
        <div className="flex justify-between text-xs font-semibold text-slate-300 mb-4 px-1">
          <span>{formatDate(startVal)}</span>
          <span className="text-slate-500 font-medium">Timeline</span>
          <span>{formatDate(endVal)}</span>
        </div>
        
        <div className="relative h-2 rounded-full bg-slate-800">
          <div 
            className="absolute h-full bg-indigo-500 rounded-full"
            style={{ 
              left: `${getPercent(startVal)}%`, 
              right: `${100 - getPercent(endVal)}%` 
            }}
          />
          
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={startVal}
            onChange={handleStartChange}
            className="absolute w-full -top-1 h-4 opacity-0 cursor-pointer pointer-events-auto"
            style={{ zIndex: startVal > maxTime - 100 ? 5 : 3 }}
          />
          
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={endVal}
            onChange={handleEndChange}
            className="absolute w-full -top-1 h-4 opacity-0 cursor-pointer pointer-events-auto"
            style={{ zIndex: 4 }}
          />
          
          {/* Custom thumbs */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-indigo-500 pointer-events-none"
            style={{ left: `calc(${getPercent(startVal)}% - 8px)`, zIndex: 10 }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-indigo-500 pointer-events-none"
            style={{ left: `calc(${getPercent(endVal)}% - 8px)`, zIndex: 10 }}
          />
        </div>
      </div>
    </div>
  );
}
