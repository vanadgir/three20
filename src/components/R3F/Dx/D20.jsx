import { useMemo } from "react";
import { IcosahedronGeometry } from "three";

import Dx from "./Dx";

import { D20_CONST } from "../../../utils";

// check createDx in DiceContext for prop definition
const D20 = (props) => {
  const geometry = useMemo(() => {
    const retVal = new IcosahedronGeometry(props.radius, 0);
    retVal.name = D20_CONST.NAME;
    retVal.groupSize = D20_CONST.GROUP_SIZE;
    return retVal;
  }, []);

  return <Dx {...props} geometry={geometry} />;
};

export default D20;
