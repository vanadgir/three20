import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvexPolyhedron } from "@react-three/cannon";
import { Color } from "three";

import { useSFX, useDiceActions } from "../../../contexts";

import {
  applyAtlasUVs,
  CannonUtils,
  getDiceTexture,
  randomAngularVelocity,
  randomRotation,
  randomVelocity,
  randomSpawnPosition,
  REST_INTERVAL,
  ZEROISH,
} from "../../../utils";

const NO_TINT = new Color(1, 1, 1);
const REST_TINT = new Color(1.4, 1.4, 1.4);
const REST_HOVER_TINT = new Color(1.2, 1.2, 1.2);
const TEXT_SIZE = 0.4;

const Dx = ({
  id,
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
  const { playContactSFX } = useSFX();
  const { diceOptions, onDieResolve, resetDie } = useDiceActions();
  const [collidingPlane, setCollidingPlane] = useState(false);
  const [hovered, setHover] = useState(false);
  const [lowVelocity, setLowVelocity] = useState(false);
  const [atRest, setAtRest] = useState(false);
  const [roll, setRoll] = useState(null);
  const [shouldReset, setShouldReset] = useState(false);
  const [texture, setTexture] = useState(null);

  const onCollideBegin = useCallback((e) => {
    if (e.body.geometry.type === "PlaneGeometry") {
      setCollidingPlane(true);
    }
  }, []);

  const onCollide = useCallback((e) => {
    playContactSFX(e.contact.impactVelocity);
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
  const normals = useMemo(() => CannonUtils.getNormals(geometry), [geometry]);
  const faceDirections = useMemo(
    () => centroids.map((c) => c.clone().normalize()),
    [centroids]
  );

  const cellWorldSize = useMemo(
    () => applyAtlasUVs(geometry, centroids, normals),
    [geometry, centroids, normals]
  );
  const fontFraction = (TEXT_SIZE * radius) / cellWorldSize;

  useEffect(() => {
    let active = true;
    const highlightColor =
      roll === null
        ? null
        : roll === 0
        ? "red"
        : roll === centroids.length - 1
        ? "green"
        : "blue";
    getDiceTexture({
      name: geometry.name,
      faceCount: centroids.length,
      color: `#${color.getHexString()}`,
      textColor,
      fontFraction,
      highlightFace: roll,
      highlightColor,
    }).then((t) => {
      if (active) {
        setTexture(t);
      }
    });
    return () => {
      active = false;
    };
  }, [geometry.name, centroids.length, color, textColor, fontFraction, roll]);

  const resetRoll = useCallback(() => {
    api.wakeUp();
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
  }, [api, id, resetDie]);

  useEffect(() => {
    if (!atRest || roll !== null) {
      return;
    }
    api.velocity.set(0, 0, 0);
    api.sleep();

    const result = CannonUtils.getResult(
      geometry.name,
      ref.current.matrixWorld,
      faceDirections
    );

    // a cocked die has no readable face, so roll it again
    if (result === null) {
      resetRoll();
      return;
    }

    const resultFudge =
      result === 0
        ? "min"
        : result === faceDirections.length - 1
        ? "max"
        : "neutral";
    setRoll(result);
    onDieResolve(id, result + 1, resultFudge);
  }, [api, atRest, roll, faceDirections, geometry.name, id, onDieResolve, resetRoll]);

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
        const magnitude = Math.sqrt(
          velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2
        );
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
    // once the die stays at low velocity on an acceptable surface
    // for a full REST_INTERVAL, consider it at rest
    if (
      !lowVelocity ||
      atRest ||
      (diceOptions.restOnTable && !collidingPlane)
    ) {
      return;
    }
    const timer = setTimeout(() => setAtRest(true), REST_INTERVAL);
    return () => clearTimeout(timer);
  }, [atRest, collidingPlane, diceOptions.restOnTable, lowVelocity]);

  useEffect(() => {
    // this effect makes sure that any 'stuck' dice can still resolve, by rerolling
    // them after a timer
    if (atRest || !shouldReroll) {
      return;
    }
    const interval = setInterval(
      () => setShouldReset(true),
      rerollTime * 1000
    );
    return () => clearInterval(interval);
  }, [atRest, shouldReroll, rerollTime]);

  useEffect(() => {
    if (shouldReset) {
      resetRoll();
    }
  }, [resetRoll, shouldReset]);

  useEffect(() => {
    // when the die first loads, spin it
    api.angularVelocity.set(...randomAngularVelocity());
    setRoll(null);
  }, []);

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      receiveShadow
      castShadow
      onClick={() => {
        if (atRest) {
          resetRoll();
        }
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {texture ? (
        <meshStandardMaterial
          key="textured"
          map={texture}
          color={atRest ? (hovered ? REST_HOVER_TINT : REST_TINT) : NO_TINT}
        />
      ) : (
        <meshStandardMaterial key="plain" color={color} />
      )}
    </mesh>
  );
};

export default Dx;
