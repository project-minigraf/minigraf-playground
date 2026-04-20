'use client'
import { useMemo } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import type { QueryResult } from '@/lib/types'

interface ResultsGraphProps { result: QueryResult }

export function ResultsGraph({ result }: ResultsGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeSet = new Set<string>()
    result.rows.forEach(([src, tgt]) => { nodeSet.add(src); nodeSet.add(tgt) })
    const nodeArr = Array.from(nodeSet)
    const nodes = nodeArr.map((id, i) => ({
      id,
      data: { label: id },
      position: { x: (i % 5) * 150, y: Math.floor(i / 5) * 100 },
      style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
    }))
    const edges = result.rows.map(([src, tgt], i) => ({
      id: `e${i}`,
      source: src,
      target: tgt,
      style: { stroke: '#4ade80' },
    }))
    return { nodes, edges }
  }, [result])

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#1e293b" />
        <Controls />
      </ReactFlow>
    </div>
  )
}