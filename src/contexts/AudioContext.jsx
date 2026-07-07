import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import { useLoader } from "@react-three/fiber";
import { AudioLoader, AudioListener, Audio } from "three";

import wahoo from "../../assets/audio/wahoo.wav";
import nooo from "../../assets/audio/nooo.wav";
import neutral from "../../assets/audio/neutral.mp3";
import dice from "../../assets/audio/dice.wav";
import bgm1 from "../../assets/audio/bgm1.mp3";
import bgm2 from "../../assets/audio/bgm2.mp3";
import bgm3 from "../../assets/audio/bgm3.mp3";

import { defaultVolumes } from "../utils";

const AudioContext = createContext({
  children: [],
  volumes: defaultVolumes,
  playContactSFX: (impactVelocity) => undefined,
  playRollResultSFX: (roll) => undefined,
  togglePlayback: () => undefined,
  nextTrack: () => undefined,
  updateVolume: (key, value) => undefined,
});

// SFX callbacks are stable across renders, so consumers of this context
// (every die) don't re-render when BGM playback state ticks
const SFXContext = createContext({
  volumes: { current: defaultVolumes },
  playContactSFX: (impactVelocity) => undefined,
  playRollResultSFX: (roll) => undefined,
  updateVolume: (key, value) => undefined,
});

const CONTACT_FACTOR = 20;
const CONTACT_THRESHOLD = 0.0075;
const CONTACT_DETUNE_RANGE = 300;

export const AudioProvider = ({ children }) => {
  const maxRollSFXBuffer = useLoader(AudioLoader, wahoo);
  const minRollSFXBuffer = useLoader(AudioLoader, nooo);
  const neutralRollSFXBuffer = useLoader(AudioLoader, neutral);
  const contactSFXBuffer = useLoader(AudioLoader, dice);
  const volumes = useRef(defaultVolumes);

  const sfxListener = useMemo(() => new AudioListener(), []);
  const bgmListener = useMemo(() => new AudioListener(), []);

  const allRollResultSFX = useMemo(
    () => ({
      max: (() => {
        const audio = new Audio(sfxListener);
        audio.setBuffer(maxRollSFXBuffer);
        audio.setLoop(false);
        audio.setVolume(0.6);
        return audio;
      })(),
      min: (() => {
        const audio = new Audio(sfxListener);
        audio.setBuffer(minRollSFXBuffer);
        audio.setLoop(false);
        audio.setVolume(0.6);
        return audio;
      })(),
      neutral: (() => {
        const audio = new Audio(sfxListener);
        audio.setBuffer(neutralRollSFXBuffer);
        audio.setLoop(false);
        audio.setVolume(0.2);
        return audio;
      })(),
    }),
    [maxRollSFXBuffer, minRollSFXBuffer, neutralRollSFXBuffer, sfxListener]
  );

  const updateVolume = useCallback(
    (key, value) => {
      if (value < 0) {
        value = 0;
      } else if (value > 1) {
        value = 1;
      }
      volumes.current = { ...volumes.current, [key]: value };
    },
    [volumes]
  );

  const playRollResultSFX = useCallback(
    (roll) => {
      if (volumes.current.global === 0 || volumes.current.sfx === 0) {
        return;
      }
      const selectedAudio = allRollResultSFX[roll] || allRollResultSFX.neutral;
      selectedAudio.setVolume(
        selectedAudio.getVolume() * volumes.current.global * volumes.current.sfx
      );
      selectedAudio.play();
    },
    [allRollResultSFX, volumes]
  );

  const playContactSFX = useCallback(
    (impactVelocity) => {
      if (volumes.current.global === 0 || volumes.current.sfx === 0) {
        return;
      }
      const constrained = Math.min(
        Math.max(impactVelocity / CONTACT_FACTOR / 2, 0),
        1
      );
      if (constrained > CONTACT_THRESHOLD) {
        const audio = new Audio(sfxListener);
        audio.setBuffer(contactSFXBuffer);
        audio.setLoop(false);
        audio.setVolume(
          constrained * volumes.current.global * volumes.current.sfx
        );
        audio.setDetune(
          (audio.getDetune() -
            CONTACT_DETUNE_RANGE / 2 +
            Math.random() * CONTACT_DETUNE_RANGE) /
            constrained
        );
        audio.play();
      }
    },
    [contactSFXBuffer, sfxListener, volumes]
  );

  // BEGIN BGM LOGIC
  const bgmBuffersRef = useRef([]);
  const bgmAudioRef = useRef(new Audio(bgmListener));
  const [bgmLoaded, setBGMLoaded] = useState(false);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);

  // this effect loads BGM tracks asynchronously
  // then stores them in a bgm tracklist ref
  useEffect(() => {
    const tracks = [bgm1, bgm2, bgm3];
    const loader = new AudioLoader();

    Promise.all(tracks.map((path) => loader.loadAsync(path)))
      .then((buffers) => {
        bgmBuffersRef.current = buffers;
        setBGMLoaded(true);
        setCurrentTrack(0);
        setPlaybackPosition(0);
        setTrackDuration(bgmBuffersRef.current[0].duration);
        bgmAudioRef.current.setBuffer(bgmBuffersRef.current[0]);
        bgmAudioRef.current.setVolume(0.5);
        bgmAudioRef.current.setLoop(true);
        // bgmAudioRef.current.pause();
        // setBgmPlaying(false);
        console.log("BGM loaded and playing");
      })
      .catch((err) => {
        console.error("There was an issue loading BGM tracks: ", err);
      });

    return () => {
      bgmAudioRef.current.stop();
      bgmAudioRef.current.disconnect();
    };
  }, []);

  const togglePlayback = useCallback(() => {
    if (!bgmLoaded) return;

    if (bgmAudioRef.current.isPlaying) {
      bgmAudioRef.current.pause();
      setBgmPlaying(false);
    } else {
      bgmAudioRef.current.play();
      setBgmPlaying(true);
    }
  }, [bgmLoaded]);

  const playFromPosition = useCallback(
    (position) => {
      if (!bgmLoaded) return;

      bgmAudioRef.current.stop();
      bgmAudioRef.current.offset = position;
      setPlaybackPosition(position);
      setBgmPlaying(true);
      bgmAudioRef.current.play();
    },
    [bgmLoaded, bgmAudioRef.current]
  );

  const nextTrack = useCallback(() => {
    if (!bgmLoaded) return;

    const nextTrackIndex = (currentTrack + 1) % bgmBuffersRef.current.length;
    setCurrentTrack(nextTrackIndex);
    setPlaybackPosition(0);
    setTrackDuration(bgmBuffersRef.current[nextTrackIndex].duration);

    bgmAudioRef.current.stop();
    bgmAudioRef.current.setBuffer(bgmBuffersRef.current[nextTrackIndex]);
    bgmAudioRef.current.offset = 0;
    bgmAudioRef.current.play();
  }, [currentTrack, bgmLoaded]);

  useEffect(() => {
    if (!bgmLoaded) return;

    const intervalId = setInterval(() => {
      if (bgmAudioRef.current.isPlaying) {
        let newPosition = playbackPosition + 1; // track duration is in seconds
        if (newPosition >= trackDuration) newPosition = 0;
        setPlaybackPosition(newPosition);
      }
    }, 1000); // interval is in milliseconds

    return () => clearInterval(intervalId);
  }, [bgmLoaded, currentTrack, playbackPosition]);
  // END BGM LOGIC

  if (bgmAudioRef.current?.setVolume) {
    bgmAudioRef.current.setVolume(volumes.current.global * volumes.current.bgm);
  }

  const sfxValue = useMemo(
    () => ({
      volumes,
      playContactSFX,
      playRollResultSFX,
      updateVolume,
    }),
    [playContactSFX, playRollResultSFX, updateVolume]
  );

  const audioValue = useMemo(
    () => ({
      bgmLoaded,
      bgmPlaying,
      playbackPosition,
      trackDuration,
      volumes,
      nextTrack,
      playContactSFX,
      playFromPosition,
      playRollResultSFX,
      togglePlayback,
      updateVolume,
    }),
    [
      bgmLoaded,
      bgmPlaying,
      playbackPosition,
      trackDuration,
      nextTrack,
      playContactSFX,
      playFromPosition,
      playRollResultSFX,
      togglePlayback,
      updateVolume,
    ]
  );

  return (
    <SFXContext.Provider value={sfxValue}>
      <AudioContext.Provider value={audioValue}>
        {children}
      </AudioContext.Provider>
    </SFXContext.Provider>
  );
};

export function useAudio() {
  if (!AudioContext) {
    throw new Error("AudioContext must be defined!");
  }
  return useContext(AudioContext);
}

export function useSFX() {
  return useContext(SFXContext);
}
