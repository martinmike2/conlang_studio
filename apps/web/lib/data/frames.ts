export interface Frame {
  id: string
  name: string
  domain?: string
  description?: string
  roles: { name: string; cardinality: string }[]
}

let frames: Frame[] = [
  { id: 'f1', name: 'TRANSFER_POSSESSION', domain: 'exchange', description: 'Giving / receiving events', roles: [
    { name: 'AGENT', cardinality: '1' },
    { name: 'RECIPIENT', cardinality: '1' },
    { name: 'ITEM', cardinality: '1..n' }
  ]},
  { id: 'f2', name: 'EMISSION_SOUND', domain: 'perception', description: 'Producing a sound', roles: [
    { name: 'SOURCE', cardinality: '1' },
    { name: 'SOUND', cardinality: '1' }
  ]}
]

export function listFrames(): Promise<Frame[]> {
  return Promise.resolve(frames)
}

export function getFrame(id: string): Promise<Frame | undefined> {
  return Promise.resolve(frames.find(f => f.id === id))
}

export function createFrame(input: Omit<Frame, 'id'>): Promise<Frame> {
  const frame: Frame = { ...input, id: `f${Date.now().toString(36)}` }
  frames = [...frames, frame]
  return Promise.resolve(frame)
}
