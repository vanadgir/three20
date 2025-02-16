import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvexPolyhedron } from "@react-three/cannon";
import { Text } from "@react-three/drei";
import { Color } from "three";

import { useAudio, useDice } from "../../../contexts";

import {
  CannonUtils,
  randomAngularVelocity,
  randomRotation,
  randomVelocity,
  randomSpawnPosition,
  REST_INTERVAL,
  ZEROISH,
} from "../../../utils";
import font from "../../../../assets/fonts/TypeMachine.ttf";

const Dx = ({
  id,
  children,
  inertiaMod,
  geometry,
  position,
  mass,
  restitution,
  radius,
  color,
  textColor,
  shouldReroll,
  rerollTime,
}) => {
  const { playContactSFX } = useAudio();
  const { diceInPlay, diceOptions, onDieResolve, resetDie } = useDice();
  const [collidingPlane, setCollidingPlane] = useState(false);
  const [lastContactId, setLastContactId] = useState(null);
  const [hovered, setHover] = useState(false);
  const [lowVelocity, setLowVelocity] = useState(false);
  const [atRest, setAtRest] = useState(false);
  const [roll, setRoll] = useState(null);
  const [shouldReset, setShouldReset] = useState(false);
  let restInterval;
  let rerollInterval;

  const onCollideBegin = useCallback((e) => {
    if (e.body.geometry.type === "PlaneGeometry") {
      setCollidingPlane(true);
    }
  }, []);

  const onCollide = useCallback((e) => {
    playContactSFX(e.contact.impactVelocity);
    if (lastContactId !== e.contact.id) {
      setLastContactId(e.contact.id);
    }
  }, []);

  const onCollideEnd = useCallback((e) => {
    if (e.body.geometry.type === "PlaneGeometry") {
      setCollidingPlane(false);
    }
  }, []);

  // generate the up-to-frame physics properties from the geometry
  const [ref, api] = useConvexPolyhedron(() => ({
    ...CannonUtils.toConvexPolyhedronProps(
      geometry,
      position,
      mass,
      restitution,
      onCollideBegin,
      onCollide,
      onCollideEnd
    ),
  }));

  const centroids = useMemo(
    () => CannonUtils.getCentroids(geometry),
    [geometry]
  );
  // const vertices = useMemo(() => CannonUtils.getVertices(geometry), [geometry]);
  const normals = useMemo(() => CannonUtils.getNormals(geometry), [geometry]);

  const resetRoll = useCallback(() => {
    api.wakeUp(); // resumes physics on this object
    setAtRest(false);
    setRoll(null);
    setHover(false);
    setLowVelocity(false);
    setShouldReset(false);
    api.position.set(...randomSpawnPosition());
    api.rotation.set(...randomRotation());
    api.velocity.set(...randomVelocity());
    api.angularVelocity.set(...randomAngularVelocity());
    resetDie(id);
  }, [api, resetDie]);

  useEffect(() => {
    // onRest needs to be an effect, so the most up-to-date state and context are available
    // the restInterval that triggers atRest captures a state from 500ms prior
    if (atRest && diceInPlay[id] && !diceInPlay[id].resolved) {
      api.velocity.set(0, 0, 0);
      api.sleep(); // stops physics on this object

      // use timeout of 0 to run immediately but async
      setTimeout(() => {
        const result = CannonUtils.getResult(
          geometry.name,
          ref.current.matrixWorld,
          centroids
        );
  
        // if (!result) {
        //   resetRoll();
        //   return;
        // }

        const resultFudge =
          result === 0
            ? "min"
            : result === centroids.length - 1
            ? "max"
            : "neutral";
        onDieResolve(id, result + 1, resultFudge);
        setRoll(result);
      }, 0);
    }
  }, [api, atRest, centroids, diceInPlay, onDieResolve]);

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
    // this effect checks if the die is low velocity,
    // then if it's resting on an acceptable surface, as set by the user
    // if so, then it starts an restInterval/timer to see if that persists for half a second.
    // if so, sets atRest to true
    if (
      lowVelocity &&
      (!diceOptions.restOnTable || collidingPlane) &&
      !atRest
    ) {
      restInterval = setInterval(() => {
        setAtRest(true);
      }, REST_INTERVAL);
    }
    return () => clearInterval(restInterval);
  }, [atRest, collidingPlane, diceOptions, lowVelocity]);

  useEffect(() => {
    // this effect makes sure that any 'stuck' dice can still resolve, by rerolling
    // them after a timer
    if (!atRest && shouldReroll) {
      rerollInterval = setInterval(() => {
        setShouldReset(true);
      }, rerollTime * 1000);
    } else {
      clearInterval(rerollInterval);
    }
    return () => clearInterval(rerollInterval);
  }, [atRest, shouldReroll]);

  useEffect(() => {
    if (shouldReset) {
      resetRoll();
    }
  }, [resetRoll, shouldReset]);

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
