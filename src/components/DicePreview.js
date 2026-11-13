import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PIPS = [
  [[0, 0]],
  [[-.29, .29], [.29, -.29]],
  [[-.29, .29], [0, 0], [.29, -.29]],
  [[-.29, .29], [.29, .29], [-.29, -.29], [.29, -.29]],
  [[-.29, .29], [.29, .29], [0, 0], [-.29, -.29], [.29, -.29]],
  [[-.29, .3], [.29, .3], [-.29, 0], [.29, 0], [-.29, -.3], [.29, -.3]],
];

function DiceModel({ face, rolling }) {
  const ref = useRef(null);
  const dieGeometry = useMemo(() => new RoundedBoxGeometry(1.18, 1.18, 1.18, 5, .11), []);
  const trimGeometry = useMemo(() => new RoundedBoxGeometry(.91, .91, .075, 4, .09), []);
  const faceGeometry = useMemo(() => new RoundedBoxGeometry(.79, .79, .04, 4, .07), []);
  const shownFace = Math.max(1, Math.min(6, Math.round(face || 1)));

  // Keep the numbered face parallel to the screen at rest. Only spin around
  // the screen-facing axis while rolling, so no result is left on a side face.
  useEffect(() => {
    if (!rolling && ref.current) ref.current.rotation.set(-.13, .15, 0);
  }, [rolling, shownFace]);

  useFrame((_, dt) => {
    if (rolling && ref.current) ref.current.rotation.z += dt * 12;
  });

  return <group ref={ref}>
    <mesh castShadow receiveShadow>
      <primitive object={dieGeometry} attach="geometry" />
      <meshStandardMaterial color="#1255a4" roughness={.29} metalness={.18} />
    </mesh>
    <mesh position={[0, 0, .588]} castShadow>
      <primitive object={trimGeometry} attach="geometry" />
      <meshStandardMaterial color="#ffd34f" roughness={.28} metalness={.12} />
    </mesh>
    <mesh position={[0, 0, .632]}>
      <primitive object={faceGeometry} attach="geometry" />
      <meshStandardMaterial color="#fffaf0" roughness={.3} />
    </mesh>
    {PIPS[shownFace - 1].map(([x, y], i) => <mesh key={`${shownFace}-${i}`} position={[x, y, .662]}>
      <sphereGeometry args={[.09, 20, 16]} />
      <meshStandardMaterial color="#12315c" roughness={.27} metalness={.08} />
    </mesh>)}
  </group>;
}

export default function DicePreview({ face, rolling }) {
  return <Canvas frameloop={rolling ? 'always' : 'demand'} camera={{ position: [0, 0, 4.8], fov: 35, near: .1, far: 30 }} gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }} style={{ width: 78, height: 78, backgroundColor: 'transparent' }}>
    <ambientLight intensity={1.35} /><directionalLight position={[2, 4, 5]} intensity={2.1} /><DiceModel face={face} rolling={rolling} />
  </Canvas>;
}
