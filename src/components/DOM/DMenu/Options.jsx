import { CompactPicker } from "react-color";
import { useState } from "react";

import Slider from "./Slider";
import { useDice, useSFX } from "../../../contexts";

import styles from "./Options.module.scss";
import { validDice } from "../../../utils";
import Credits from "./Credits";

const Options = ({}) => {
  const { volumes, updateVolume } = useSFX();
  const { diceAttributes, diceOptions, updateAttributes, updateOptions, gravity, setGravity } =
    useDice();
  const [selectedForColor, setSelectedForColor] = useState("D4");
  const [selectedForSize, setSelectedForSize] = useState("D4");
  const [selectedForText, setSelectedForText] = useState("D4");

  return (
    <div className={styles.options}>
      <div className={styles.optionsColumn}>
        <Slider
          className={styles.slider}
          label="Global Volume"
          max={1}
          min={0}
          update={(value) => updateVolume("global", value)}
          value={volumes.global}
        />
        <Slider
          className={styles.slider}
          label="SFX Volume"
          max={1}
          min={0}
          update={(value) => updateVolume("sfx", value)}
          value={volumes.sfx}
        />
        <Slider
          className={styles.slider}
          label="Music Volume"
          max={1}
          min={0}
          step={0.05}
          update={(value) => updateVolume("bgm", value)}
          value={volumes.bgm}
        />
        <div className={styles.optionWrapper}>
          <p>Resolve Only on Table</p>
          <input
            type="checkbox"
            onChange={(e) =>
              updateOptions("restOnTable", !diceOptions.restOnTable)
            }
            checked={diceOptions.restOnTable}
          />
        </div>
        <div className={styles.optionWrapper}>
          <p>Reset Stuck Dice</p>
          <input
            type="checkbox"
            onChange={(e) =>
              updateOptions("resetStuck", !diceOptions.resetStuck)
            }
            checked={diceOptions.resetStuck}
          />
        </div>
        {diceOptions.resetStuck && (
          <div className={styles.optionWrapper}>
            <p>Stuck Timer (sec)</p>
            <input
              type="number"
              max={30}
              min={1}
              onChange={(e) => updateOptions("stuckTimer", e.target.value)}
              value={diceOptions.stuckTimer}
            />
          </div>
        )}
        <div className={styles.optionWrapper}>
          <p>Global Size</p>
          <input
            type="checkbox"
            onChange={(e) =>
              updateOptions("globalSize", !diceOptions.globalSize)
            }
            checked={diceOptions.globalSize}
          />
        </div>
        <Slider
          className={styles.slider}
          label="Size"
          max={3}
          update={(value) => {
            updateAttributes(
              "sizes",
              diceOptions.globalSize ? "global" : selectedForSize,
              value
            );
          }}
          value={
            diceOptions.globalSize
              ? diceAttributes?.sizes.global
              : diceAttributes.sizes[selectedForSize] ?? 0
          }
        />
        <Slider
          className={styles.slider}
          label="Gravity"
          min={1}
          max={12}
          step={0.1}
          update={(value) => setGravity([0, -value, 0])}
          value={gravity ? -gravity[1] : 9.81}
        />
        {!diceOptions.globalSize && (
          <div className={styles.sizeButtons}>
            {validDice.map((d) => (
              <button
                key={`size-button-${d}`}
                className={`${styles.dButton} ${styles.sizeButton} ${
                  d === selectedForSize ? styles.active : ""
                }`}
                onClick={() => {
                  setSelectedForSize(d);
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.optionsColumn}>
        <div className={styles.optionWrapper}>
          <p>Global Color</p>
          <input
            type="checkbox"
            onChange={(e) =>
              updateOptions("globalColor", !diceOptions.globalColor)
            }
            checked={diceOptions.globalColor}
          />
        </div>
        <div className={styles.colorWrapper}>
          <div className={styles.colorTitle}>
            <p>Body</p>
            {!diceOptions.globalColor ? (
              validDice.map((d) => (
                <button
                  key={`color-button-${d}`}
                  className={`${styles.dButton} ${styles.colorButton} ${
                    d === selectedForColor ? styles.active : ""
                  }`}
                  onClick={() => {
                    setSelectedForColor(d);
                  }}
                >
                  {d}
                </button>
              ))
            ) : (
              <p>(Global)</p>
            )}
          </div>
          <CompactPicker
            onChangeComplete={(color) => {
              if (diceOptions.globalColor || selectedForColor) {
                updateAttributes(
                  "colors",
                  diceOptions.globalColor ? "global" : selectedForColor,
                  color.hex
                );
              }
            }}
          />
        </div>
        <div className={styles.colorWrapper}>
          <div className={styles.colorTitle}>
            <p>Text</p>
            {!diceOptions.globalColor ? (
              validDice.map((d) => (
                <button
                  key={`text-button-${d}`}
                  className={`${styles.dButton} ${styles.colorButton} ${
                    d === selectedForText ? styles.active : ""
                  }`}
                  onClick={() => {
                    setSelectedForText(d);
                  }}
                >
                  {d}
                </button>
              ))
            ) : (
              <p>(Global)</p>
            )}
          </div>
          <CompactPicker
            onChangeComplete={(color) => {
              if (diceOptions.globalColor || selectedForText) {
                updateAttributes(
                  "textColors",
                  diceOptions.globalColor ? "global" : selectedForText,
                  color.hex
                );
              }
            }}
          />
        </div>
        <Credits />
      </div>
    </div>
  );
};

export default Options;
