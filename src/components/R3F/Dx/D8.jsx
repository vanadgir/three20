import { useMemo } from "react";
import { OctahedronGeometry } from "three";

import Dx from "./Dx";

import { D8_CONST } from "../../../utils";

// check createDx in DiceContext for prop definition
const D8 = (props) => {
  const geometry = useMemo(() => {
    const retVal = new OctahedronGeometry(props.radius, 0);
    retVal.name = D8_CONST.NAME;
    retVal.groupSize = D8_CONST.GROUP_SIZE;
    return retVal;
  }, []);

  return <Dx {...props} geometry={geometry} />;
};

export default D8;
