import { Suspense } from "react";
import { Physics } from "@react-three/cannon";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { useDice } from "../../contexts";
import TablePlane from "./TablePlane";

import styles from "./R3F.module.scss";

const R3F = () => {
  const { diceInPlay, gravity } = useDice();
  return (
    <div className={styles.R3F}>
      <Canvas
        shadows
        camera={{ position: [8, 8, 8] }}
        dpr={[1, 2]}
        gl={{ alpha: false }}
      >
        <directionalLight
          castShadow
          position={[10, 15, 10]}
          shadow-mapSize={[2048, 2048]} 
          intensity={1.5} 
        >
          <ambientLight intensity={0.1}/>
          <orthographicCamera
            attach="shadow-camera"
            args={[-25, 25, 25, -25, 1, 50]} 
          />
        </directionalLight>
        <Physics gravity={gravity}>
          <Suspense>
            <TablePlane />
          </Suspense>
          {Object.keys(diceInPlay).map((d) => diceInPlay[d]?.component)}
        </Physics>
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default R3F;
