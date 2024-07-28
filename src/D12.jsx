import { useMemo } from "react";
import { DodecahedronGeometry } from "three";

import Dx from "./Dx";

import { D12_CONST } from "./constants";

const D12 = (props = { position, radius, color, textColor }) => {
  const geometry = useMemo(() => {
    const retVal = new DodecahedronGeometry(props.radius, 0);
    retVal.name = D12_CONST.NAME;
    retVal.groupSize = D12_CONST.GROUP_SIZE;
    return retVal;
  }, []);

  return (
    <Dx {...props} geometry={geometry}>
      <dodecahedronGeometry args={[props.radius]} />
    </Dx>
  );
};

export default D12;
