import { useMemo } from "react";
import { DodecahedronGeometry } from "three";

import Dx from "./Dx";

import { D12_CONST } from "../../../utils";

// check createDx in DiceContext for prop definition
const D12 = (props) => {
  const geometry = useMemo(() => {
    const retVal = new DodecahedronGeometry(props.radius, 0);
    retVal.name = D12_CONST.NAME;
    retVal.groupSize = D12_CONST.GROUP_SIZE;
    return retVal;
  }, []);

  return <Dx {...props} geometry={geometry} />;
};

export default D12;
