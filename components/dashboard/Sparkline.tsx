'use client'

import React from 'react'

interface SparklineProps {
    data: number[]
    width?: number
    height?: number
    color?: string
    strokeWidth?: number
}

export default function Sparkline({ 
    data, 
    width = 100, 
    height = 40, 
    color = '#5C8A42', 
    strokeWidth = 2 
}: SparklineProps) {
    if (!data || data.length < 2) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="transition-all duration-1000 ease-in-out"
                style={{
                    strokeDasharray: 500,
                    strokeDashoffset: 0,
                    animation: 'sparkline-draw 2s ease-out forwards'
                }}
            />
            {/* Gradient fill */}
            <path
                d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
                fill={`url(#gradient-${color})`}
                opacity="0.1"
            />
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <style>{`
                @keyframes sparkline-draw {
                    from { stroke-dashoffset: 500; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </svg>
    )
}
