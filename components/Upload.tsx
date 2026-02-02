'use client'
import { useState } from 'react'

export default function Upload({ onLoad }: any) {
  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-8 mb-8">
      <p className="text-center text-2xl font-bold mb-4">📁 Upload Data File</p>
      <input 
        type="file" 
        accept=".json,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if(f) f.text().then(t => onLoad(JSON.parse(t).high_risk_customers || JSON.parse(t)))
        }}
        className="w-full cursor-pointer"
      />
    </div>
  )
}
