/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'motion/react';
import { TrendingUp, Coins, Package, ArrowUpRight, ArrowDownRight, Award, HelpCircle, Activity } from 'lucide-react';

export function HistoricalPerformanceCharts() {
  const { results, currentTeam } = useGame();
  const [hoveredIndex, setHoveredIndex] = useState<Record<string, number | null>>({
    revenue: null,
    profit: null,
    inventory: null,
  });

  // Sort results sequentially by round
  const sortedResults = [...results].sort((a, b) => a.round - b.round);
  const totalRoundsData = sortedResults.length;

  if (!currentTeam) return null;

  // Render helper for an interactive SVG line chart
  const renderSVGChart = (
    key: 'revenue' | 'profit' | 'inventory',
    title: string,
    color: string,
    icon: React.ReactNode,
    unitPrefix = '',
    unitSuffix = ''
  ) => {
    if (totalRoundsData === 0) {
      return (
        <div className="bg-[#fcfcf9] border border-dashed border-[#c8c8c5] rounded p-6 h-48 flex flex-col items-center justify-center text-center">
          <div className="text-gray-400 text-2xl mb-2">{icon}</div>
          <p className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-tight">
            {title} Trend awaiting logs
          </p>
          <span className="text-[9px] text-gray-400 mt-1 max-w-[240px]">
            Advance the simulation to Day 1 to map real-time performance coordinates.
          </span>
        </div>
      );
    }

    // Extract data values based on selected metric
    const dataPoints = sortedResults.map((r) => {
      if (key === 'revenue') return r.revenue;
      if (key === 'profit') return r.profit;
      // inventoryCost is precisely standard remaining bottles since storage fee is $1/unit
      return r.inventoryCost;
    });

    // Compute min & max values for scale coordinates
    let maxVal = Math.max(...dataPoints, 100);
    let minVal = Math.min(...dataPoints, 0);

    // Padding values for aesthetics
    const range = maxVal - minVal;
    maxVal = maxVal + range * 0.15;
    minVal = minVal - (range > 0 ? range * 0.15 : 10);

    const chartHeight = 130;
    const chartWidth = 320;
    const paddingX = 40;
    const paddingY = 20;

    const translateValueToY = (val: number) => {
      const valRange = maxVal - minVal || 1;
      const heightPercentage = (val - minVal) / valRange;
      return chartHeight - paddingY - heightPercentage * (chartHeight - 2 * paddingY);
    };

    const getXCoord = (index: number) => {
      if (totalRoundsData <= 1) return paddingX + (chartWidth - 2 * paddingX) / 2;
      return paddingX + (index / (totalRoundsData - 1)) * (chartWidth - 2 * paddingX);
    };

    // Construct svg polyline coordinates string
    const pointsString = sortedResults
      .map((r, idx) => {
        const x = getXCoord(idx);
        const y = translateValueToY(dataPoints[idx]);
        return `${x},${y}`;
      })
      .join(' ');

    // Fill polygon coordinates for nice gradient base shadows
    const lastX = getXCoord(totalRoundsData - 1);
    const firstX = getXCoord(0);
    const bottomY = chartHeight - paddingY;
    const areaPointsString = `${firstX},${bottomY} ${pointsString} ${lastX},${bottomY}`;

    // Get current active hovered point if any
    const activeIdx = hoveredIndex[key];
    const hasActiveHover = activeIdx !== null && activeIdx >= 0 && activeIdx < totalRoundsData;

    // Metric analysis calculations
    const latestVal = dataPoints[totalRoundsData - 1];
    const previousVal = totalRoundsData > 1 ? dataPoints[totalRoundsData - 2] : null;
    const isUp = previousVal !== null ? latestVal >= previousVal : true;
    const percentChange = previousVal && previousVal !== 0 
      ? Math.round(((latestVal - previousVal) / Math.abs(previousVal)) * 100)
      : null;

    return (
      <div className="bg-white border-2 border-[#b8b8b4] rounded p-4 flex flex-col justify-between shadow-xs hover:border-gray-500 transition-colors relative group">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-gray-100 rounded text-gray-700">{icon}</span>
              <span className="text-[10px] font-black uppercase text-gray-600 tracking-tight">{title}</span>
            </div>
            
            {/* Trend indicator pill */}
            {previousVal !== null && (
              <div className={`flex items-center gap-0.5 text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                {percentChange !== null ? `${Math.abs(percentChange)}%` : 'Shift'}
              </div>
            )}
          </div>

          {/* Core Figure */}
          <div className="mb-2">
            <span className="text-[10px] text-gray-400 font-bold block uppercase leading-none">Latest Recording</span>
            <div className="text-xl font-mono font-black text-gray-800 tracking-tight">
              {unitPrefix}{latestVal.toLocaleString()}{unitSuffix}
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Chart Stage */}
        <div className="relative h-32 w-full bg-gray-50/50 border border-dashed border-gray-200 rounded overflow-hidden flex items-end">
          <svg 
            className="w-full h-full cursor-crosshair"
            onMouseLeave={() => setHoveredIndex(prev => ({ ...prev, [key]: null }))}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              // Map mouseX to nearest point index
              let closestIdx = 0;
              let minDistance = Infinity;
              for (let i = 0; i < totalRoundsData; i++) {
                const xCoord = getXCoord(i);
                const dist = Math.abs(xCoord - mouseX);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIdx = i;
                }
              }
              setHoveredIndex(prev => ({ ...prev, [key]: closestIdx }));
            }}
          >
            {/* Draw Horizontal Grid Lines */}
            <line x1="0" y1={translateValueToY(maxVal)} x2={chartWidth} y2={translateValueToY(maxVal)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <line x1="0" y1={translateValueToY((maxVal + minVal) / 2)} x2={chartWidth} y2={translateValueToY((maxVal + minVal) / 2)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <line x1="0" y1={translateValueToY(minVal)} x2={chartWidth} y2={translateValueToY(minVal)} stroke="#e5e7eb" strokeDasharray="3 3" />

            {/* Area gradient underlay */}
            <polygon
              fill={key === 'revenue' ? '#dcfce7' : key === 'profit' ? '#fef3c7' : '#dbeafe'}
              opacity="0.35"
              points={areaPointsString}
            />

            {/* Core Plot Polyline */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />

            {/* Plot Dots for Completed Rounds */}
            {sortedResults.map((r, idx) => (
              <circle
                key={idx}
                cx={getXCoord(idx)}
                cy={translateValueToY(dataPoints[idx])}
                r={activeIdx === idx ? 4.5 : 2.5}
                className="transition-all duration-100"
                fill={activeIdx === idx ? '#fff' : color}
                stroke={color}
                strokeWidth={activeIdx === idx ? 3.5 : 1}
              />
            ))}

            {/* Hover vertical guidelining */}
            {hasActiveHover && (
              <line
                x1={getXCoord(activeIdx!)}
                y1="0"
                x2={getXCoord(activeIdx!)}
                y2={chartHeight - paddingY}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </svg>

          {/* Axis Labels */}
          <div className="absolute bottom-1 left-2 text-[7.5px] font-mono text-gray-400 font-bold uppercase">
            MIN: {unitPrefix}{Math.round(minVal).toLocaleString()}
          </div>
          <div className="absolute top-1 left-2 text-[7.5px] font-mono text-gray-400 font-bold uppercase">
            MAX: {unitPrefix}{Math.round(maxVal).toLocaleString()}
          </div>

          {/* Floating Tooltip State Overlay */}
          {hasActiveHover && (
            <div className="absolute top-2 right-2 bg-[#2d4a6b] text-white border border-indigo-950 font-mono text-[8px] font-bold p-1 px-2 uppercase rounded shadow-md z-30 pointer-events-none">
              <span className="block opacity-75">DAY {sortedResults[activeIdx!].round}</span>
              <span className="text-yellow-400">
                {unitPrefix}{dataPoints[activeIdx!].toLocaleString()}{unitSuffix}
              </span>
            </div>
          )}
        </div>

        {/* Legend Indicator or Metric Summary */}
        <div className="mt-2 text-[8px] font-mono text-gray-400 uppercase tracking-tighter flex justify-between">
          <span>Simulation Days 1 - {totalRoundsData}</span>
          <span>Latest cycle metrics logged</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#ededeb] border-2 border-[#a8a8a4] p-5 shadow rounded-sm text-[#1c1c1a] space-y-4 relative overflow-hidden">
      {/* Visual Identity Decorator Strip */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-700" />

      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[#c8c8c5] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-700 animate-pulse" />
          <div>
            <h3 className="font-sans font-black text-sm uppercase text-indigo-900 tracking-tight leading-none">
              Historic Production & Sales Analytics
            </h3>
            <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest block mt-0.5">
              Live feedback telemetry monitoring unit metrics
            </span>
          </div>
        </div>

        {/* Small stats summary */}
        <div className="hidden sm:flex items-center gap-4 text-right">
          <div className="text-right">
            <span className="block text-[8px] text-gray-400 font-black uppercase">AVERAGE PROFIT</span>
            <span className="font-mono text-xs font-bold">
              ${totalRoundsData > 0 
                ? Math.round(sortedResults.reduce((acc, r) => acc + r.profit, 0) / totalRoundsData).toLocaleString()
                : '0'
              }
            </span>
          </div>
          <div className="text-right border-l-2 border-gray-300 pl-4">
            <span className="block text-[8px] text-gray-400 font-black uppercase">TOTAL REVENUE RECORDED</span>
            <span className="font-mono text-xs font-bold text-green-700">
              ${sortedResults.reduce((acc, r) => acc + r.revenue, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderSVGChart(
          'revenue',
          'Sales Revenue Stream',
          '#15803d',
          <Coins className="w-3.5 h-3.5 text-green-700" />,
          '$'
        )}

        {renderSVGChart(
          'profit',
          'Day-over-day Net Profits',
          '#b45309',
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />,
          '$'
        )}

        {renderSVGChart(
          'inventory',
          'Warehouse Stock levels',
          '#1d4ed8',
          <Package className="w-3.5 h-3.5 text-blue-600" />,
          '',
          ' un.'
        )}
      </div>

      {/* Manual Helper Quote Block */}
      <div className="bg-[#e4e4e1] border border-[#bebfa4] rounded-sm p-3 font-sans text-gray-600 text-[9px]/relaxed uppercase">
        <div className="font-extrabold flex items-center gap-1.5 mb-0.5 text-indigo-900">
          <HelpCircle className="w-3.5 h-3.5" />
          Operations Research Guidance:
        </div>
        <p className="font-medium">
          Verify if sales revenues closely keep up with production quotas. When net profit plunges below zero, check your warehouse stock levels. Persistent piling stock suggests low market contract compliance, while zero inventory with high missed demand demands immediate bottleneck capacity expansion.
        </p>
      </div>
    </div>
  );
}
