import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { Color } from "three";
import { useConvexPolyhedron } from "@react-three/cannon";

import { useAudio } from "./contexts/AudioContext";
import { ZEROISH } from "./constants";
import CannonUtils from "./CannonUtils";
import {
  randomAngularVelocity,
  randomRotation,
  randomVelocity,
} from "./Vec3Utils";
import font from "../assets/hobbitonbrushhand.ttf";

const Dx = ({
  children,
  inertiaMod,
  geometry,
  position,
  radius,
  color,
  textColor,
}) => {
  const [collidingPlane, setCollidingPlane] = useState(false);
  const [lastContactId, setLastContactId] = useState(null);
  const [hovered, setHover] = useState(false);
  const [lowVelocity, setLowVelocity] = useState(false);
  const [atRest, setAtRest] = useState(false);
  const [roll, setRoll] = useState(null);
  const interval = useRef(null);
  const { createRollResultSFX } = useAudio();

  const rollResultSFX = createRollResultSFX();

  // generate the up-to-frame physics properties from the geometry
  const [ref, api] = useConvexPolyhedron(() => ({
    ...CannonUtils.toConvexPolyhedronProps(
      geometry,
      setCollidingPlane,
      lastContactId,
      setLastContactId,
      position
    ),
  }));

  const centroids = useMemo(
    () => CannonUtils.getCentroids(geometry),
    [geometry]
  );
  const vertices = useMemo(() => CannonUtils.getVertices(geometry), [geometry]);
  const normals = useMemo(() => CannonUtils.getNormals(geometry), [geometry]);

  const resetRoll = useCallback(() => {
    setRoll(null);
    setHover(false);
    setLowVelocity(false);
    api.position.set(...position);
    api.rotation.set(...randomRotation());
    api.velocity.set(...randomVelocity());
    api.angularVelocity.set(...randomAngularVelocity());
  }, [api]);

  const onRest = useCallback(() => {
    setAtRest(true);
    api.velocity.set(0, 0, 0);

    const result = CannonUtils.getResult(
      geometry.name,
      ref.current.matrixWorld,
      api.position,
      centroids
    );

    setRoll(result);

    if (result === 0) {
      rollResultSFX("min");
    } else if (result === centroids.length - 1) {
      rollResultSFX("max");
    } else {
      rollResultSFX();
    }

    // console.log(`${geometry.name}: You have rolled ${result + 1}!`);
  }, [api]);

  useEffect(() => {
    // this effect checks the velocity of the die, and if any velocity values are low enough,
    // it then checks the magnitude of the velocity. if that is low enough, sets lowVelocity to true
    const inertiaFactor = ZEROISH + (inertiaMod ?? 0);
    const unsubscribe = api.velocity.subscribe((velocity) => {
      if (
        Math.abs(velocity[0]) < inertiaFactor ||
        Math.abs(velocity[1]) < inertiaFactor ||
        Math.abs(velocity[2]) < inertiaFactor
      ) {
        const x = Math.pow(Math.abs(velocity[0]), 2);
        const y = Math.pow(Math.abs(velocity[1]), 2);
        const z = Math.pow(Math.abs(velocity[2]), 2);
        const magnitude = Math.sqrt(x + y + z);
        if (magnitude < inertiaFactor) {
          if (!lowVelocity) {
            setLowVelocity(true);
          }
        } else if (lowVelocity) {
          setLowVelocity(false);
        }
      }
    });
    return unsubscribe;
  }, [api, inertiaMod, lowVelocity]);

  useEffect(() => {
    // this effect checks if the die is low velocity and colliding the plane.
    // if so, then it starts an interval/timer to see if that persists for half a second.
    // if so, sets atRest to true
    if (lowVelocity && collidingPlane && !atRest) {
      interval.current = setInterval(() => {
        onRest();
      }, 500);
    } else if (!lowVelocity || !collidingPlane) {
      if (interval.current) {
        clearInterval(interval.current);
      }
      if (atRest) {
        setAtRest(false);
      }
    }
    return () => clearInterval(interval.current);
  }, [collidingPlane, interval.current, lowVelocity]);

  useEffect(() => {
    // when the die first loads, spin it
    api.angularVelocity.set(...randomAngularVelocity());
    // reset the roll
    setRoll(null);
  }, []);

  const assignColor = useCallback(
    // this callback sets the text color based on roll state
    // Nat 1 turns red
    // Nat 20 turns green
    (index) => {
      if (index === roll) {
        if (index === 0) return "red";
        if (index === centroids.length - 1) return "green";
        return "blue";
      }
    },
    [roll]
  );

  return (
    <>
      <mesh
        ref={ref}
        receiveShadow
        castShadow
        onClick={(event) => {
          if (atRest) {
            resetRoll();
          }
        }}
        onPointerOver={(event) => setHover(true)}
        onPointerOut={(event) => setHover(false)}
      >
        {children}
        <meshStandardMaterial
          color={
            hovered && atRest
              ? color.clone().add(new Color(0.2, 0.2, 0.2))
              : atRest
              ? color.clone().add(new Color(0.5, 0.5, 0.5))
              : color
          }
        />
        {centroids.map((centroid, index) => {
          // this quaternion represents a rotation
          // equal to the orientation of the face normal
          const quaternion = CannonUtils.calculateFaceQuaternion(
            normals[index]
          );

          return (
            <Text
              mass={0}
              key={index}
              font={font}
              position={centroid.multiplyScalar(1.03)}
              fontSize={0.4 * radius}
              color={assignColor(index) || textColor}
              characters="0123456789."
              quaternion={quaternion}
              // castShadow
              // receiveShadow
            >
              {`${index + 1}` + `${index === 5 || index === 8 ? "." : ""}`}
            </Text>
          );
        })}
      </mesh>
    </>
  );
};

export default Dx;
