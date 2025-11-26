import { useAudio } from "../../../contexts";

import styles from "./BGM.module.scss";
import next from "../../../../assets/images/next.png";
import pause from "../../../../assets/images/pause.png";
import play from "../../../../assets/images/play.png";

const BGM = () => {
  const {
    bgmLoaded,
    bgmPlaying,
    nextTrack,
    playFromPosition,
    playbackPosition,
    togglePlayback,
    trackDuration,
  } = useAudio();

  const convertTime = (time) => {
    const minutes = `${Math.floor(time / 60)}`;
    const seconds = `${Math.floor(time % 60)}`.padStart(2, 0);
    return `${minutes}:${seconds}`;
  };

  const safeDuration = trackDuration || 0;

  return (
    <div className={styles.bgmMenu}>
      <span className={styles.bgmButtons}>
        <input
          className={bgmPlaying ? "" : styles.paused}
          type="image"
          src={bgmPlaying ? pause : play}
          onClick={togglePlayback}
          disabled={!bgmLoaded}
        />
        <input
          type="image"
          src={next}
          onClick={nextTrack}
          disabled={!bgmLoaded}
        />
      </span>

      <input
        className={styles.trackProgress}
        type="range"
        min={0}
        max={safeDuration || 1}
        step={0.1}
        value={bgmLoaded ? playbackPosition : 0}
        onChange={(e) => playFromPosition(parseFloat(e.target.value))}
        disabled={!bgmLoaded}
      />

      <span className={styles.trackDuration}>
        {bgmLoaded
          ? `${convertTime(playbackPosition)} / ${convertTime(trackDuration)}`
          : "Loading..."}
      </span>
    </div>
  );
};


export default BGM;
