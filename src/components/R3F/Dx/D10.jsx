import { useMemo } from "react";
import { PolyhedronGeometry } from "three";

import Dx from "./Dx";

import { D10_CONST } from "../../../utils";

// check createDx in DiceContext for prop definition
const D10 = (props) => {
  const geometryArgs = useMemo(() => {
    const sides = 10;
    const vertices = [
      [0, 0, 1],
      [0, 0, -1],
    ].flat();

    for (let i = 0; i < sides; ++i) {
      const b = (i * Math.PI * 2) / sides;
      vertices.push(-Math.cos(b), -Math.sin(b), 0.105 * (i % 2 ? 1 : -1));
    }

    const faces = [
      // 0
      [0, 11, 2],
      [0, 2, 3],
      // 1
      [0, 3, 4],
      [0, 4, 5],
      // 2
      [0, 5, 6],
      [0, 6, 7],
      // 3
      [0, 7, 8],
      [0, 8, 9],
      // 4
      [0, 9, 10],
      [0, 10, 11],
      // 5
      [1, 3, 2],
      [1, 4, 3],
      // 6
      [1, 5, 4],
      [1, 6, 5],
      // 7
      [1, 7, 6],
      [1, 8, 7],
      // 8
      [1, 9, 8],
      [1, 10, 9],
      // 9
      [1, 11, 10],
      [1, 2, 11],
    ].flat();
    return [vertices, faces];
  }, []);

  const geometry = useMemo(() => {
    const retVal = new PolyhedronGeometry(
      geometryArgs[0],
      geometryArgs[1],
      props.radius,
      0
    );
    retVal.name = D10_CONST.NAME;
    retVal.groupSize = D10_CONST.GROUP_SIZE;
    return retVal;
  }, [geometryArgs]);

  return <Dx {...props} geometry={geometry} />;
};

export default D10;
