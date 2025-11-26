import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Color } from "three";

import { useAudio } from "./AudioContext";
import { diceComponents } from "../components/R3F/Dx";

import {
  defaultDiceAttributes,
  defaultDiceOptions,
  randomSpawnPosition,
  validDice,
} from "../utils";

// no implementation yet, more like an interface
export const DiceContext = createContext({
  diceAttributes: defaultDiceAttributes,
  diceInPlay: [],
  diceOptions: defaultDiceOptions,
  clearDice: () => undefined,
  createDice: (listToCreate) => undefined,
  updateAttributes: (attribute, key, value) => undefined,
});

export const DiceProvider = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [diceAttributes, setDiceAttributes] = useState(defaultDiceAttributes);
  const [diceOptions, setDiceOptions] = useState(defaultDiceOptions);
  const [diceInPlay, setDiceInPlay] = useState({});
  const { playRollResultSFX } = useAudio();
  const [gravity, setGravity] = useState([0, -9.8, 0]);

  const diceCounts = useMemo(() => {
    const total = Object.keys(diceInPlay).length;
    const resolved = Object.keys(diceInPlay).filter(
      (d) => diceInPlay[d].resolved
    ).length;
    const netScore = Object.keys(diceInPlay).reduce(
      (prev, cur) => prev + diceInPlay[cur].resolveValue,
      0
    );
    const diceNames = Object.keys(diceInPlay).map((d) => diceInPlay[d].name);
    const individualCounts = diceNames.reduce(
      (prev, cur) => {
        prev[cur]++;
        return prev;
      },
      {
        D4: 0,
        D6: 0,
        D8: 0,
        D10: 0,
        D12: 0,
        D20: 0,
      }
    );
    const formula = Object.keys(individualCounts).reduce((prev, cur) => {
      let addString = "";
      if (individualCounts[cur] !== 0) {
        if (prev === "") {
          addString = individualCounts[cur] + cur.toLocaleLowerCase();
        } else {
          addString = ` + ${individualCounts[cur]}${cur.toLocaleLowerCase()}`;
        }
      }
      return prev + addString;
    }, "");
    return { total, resolved, netScore, individualCounts, formula };
  }, [diceInPlay]);

  const createDx = useCallback(
    (dName, key) => {
      // use dName o dDie to dTermine dAttribute
      const D = diceComponents[dName];
      return {
        component: (
          <D
            id={key}
            position={randomSpawnPosition()}
            key={key}
            shouldReroll={diceOptions.resetStuck}
            rerollTime={diceOptions.stuckTimer}
            radius={
              diceOptions.globalSize
                ? diceAttributes.sizes["global"]
                : diceAttributes.sizes[dName]
            }
            color={
              new Color(
                diceOptions.globalColor
                  ? diceAttributes.colors["global"]
                  : diceAttributes.colors[dName]
              )
            }
            textColor={
              diceOptions.globalColor
                ? diceAttributes.textColors["global"]
                : diceAttributes.textColors[dName]
            }
          />
        ),
        name: dName,
        resolved: false,
        resolveValue: 0,
      };
    },
    [diceAttributes, diceOptions]
  );

  const createDice = useCallback(
    (listToCreate, shouldClear) => {
      let dice = diceInPlay;
      if (shouldClear) {
        dice = {};
      }
      const addedDice = listToCreate.reduce(
        (prev, cur, i) => ({
          ...prev,
          [currentIndex + i]: createDx(cur, currentIndex + i),
        }),
        {}
      );
      setDiceInPlay({ ...dice, ...addedDice });
      setCurrentIndex(currentIndex + listToCreate.length);
    },
    [currentIndex, diceAttributes, diceInPlay, createDx]
  );

  const onDieResolve = useCallback(
    (id, result, resultFudge) => {
      try {
        setDiceInPlay({
          ...diceInPlay,
          [id]: { ...diceInPlay[id], resolved: true, resolveValue: result },
        });
        playRollResultSFX(resultFudge);
      } catch (e) {
        console.error(e);
        return;
      }
    },
    [diceInPlay, playRollResultSFX]
  );

  const submitDiceFormula = useCallback(
    (diceFormula) => {
      const splitFormula = [
        ...diceFormula.matchAll(new RegExp(/(\d*)[d|D](\d{1,2})/gm)),
      ]
        .filter((group) => validDice.includes(`D${group[2]}`))
        .reduce((prev, cur) => {
          const toAdd = new Array(parseInt(cur[1]) || 1)
            .fill(undefined)
            .map((e) => {
              return `D${cur[2]}`;
            });
          return [...prev, ...toAdd];
        }, []);

      if (splitFormula.length) {
        createDice(splitFormula, true);
      }
    },
    [createDice]
  );

  const rerollBoard = useCallback(() => {
    clearBoard();
    submitDiceFormula(diceCounts.formula);
  }, [diceCounts.formula, submitDiceFormula]);

  const resetDie = useCallback(
    (key) => {
      setDiceInPlay({
        ...diceInPlay,
        [key]: { ...diceInPlay[key], resolved: false, resolveValue: -1 },
      });
    },
    [diceInPlay]
  );

  const clearBoard = useCallback(() => {
    setDiceInPlay({});
    setCurrentIndex(0);
  }, []);

  const updateAttributes = useCallback(
    (attribute, key, value) => {
      setDiceAttributes({
        ...diceAttributes,
        [attribute]: { ...diceAttributes[attribute], [key]: value },
      });
    },
    [diceAttributes]
  );

  const updateOptions = useCallback(
    (option, value) => {
      setDiceOptions({
        ...diceOptions,
        [option]: value,
      });
    },
    [diceOptions]
  );

  return (
    <>
      <DiceContext.Provider
        value={{
          clearBoard,
          createDice,
          diceAttributes,
          diceCounts,
          diceInPlay,
          diceOptions,
          onDieResolve,
          rerollBoard,
          resetDie,
          submitDiceFormula,
          updateAttributes,
          updateOptions,
          gravity,
          setGravity
        }}
      >
        {children}
      </DiceContext.Provider>
    </>
  );
};

export function useDice() {
  if (!DiceContext) {
    throw new Error("DiceContext must be defined!");
  }
  return useContext(DiceContext);
}
