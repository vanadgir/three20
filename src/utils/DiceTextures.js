import { BufferAttribute, CanvasTexture, Quaternion, SRGBColorSpace, Vector3 } from "three";

import CannonUtils from "./CannonUtils";

import fontUrl from "../../assets/fonts/TypeMachine.ttf";

const CELL_SIZE = 128;
// keeps face UVs just inside their atlas cell so linear filtering
// doesn't sample the neighboring cell
const FACE_INSET = 0.98;

const textureCache = new Map();
let fontPromise = null;

const loadFont = () => {
  if (!fontPromise) {
    fontPromise = new FontFace("TypeMachine", `url("${fontUrl}")`)
      .load()
      .then((font) => {
        document.fonts.add(font);
        return font;
      })
      .catch((err) => {
        console.error("Could not load dice font, falling back: ", err);
        return null;
      });
  }
  return fontPromise;
};

const atlasLayout = (faceCount) => {
  const cols = Math.ceil(Math.sqrt(faceCount));
  const rows = Math.ceil(faceCount / cols);
  return { cols, rows };
};

const faceLabel = (index) =>
  `${index + 1}${index === 5 || index === 8 ? "." : ""}`;

// draws one number-atlas texture per unique combination of inputs,
// shared across all dice that use the same combination
export const getDiceTexture = async ({
  name,
  faceCount,
  color,
  textColor,
  fontFraction,
  highlightFace = null,
  highlightColor = null,
}) => {
  const key = [
    name,
    faceCount,
    color,
    textColor,
    fontFraction.toFixed(3),
    highlightFace,
    highlightColor,
  ].join("|");
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  await loadFont();
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const { cols, rows } = atlasLayout(faceCount);
  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${Math.round(CELL_SIZE * fontFraction)}px TypeMachine, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  for (let i = 0; i < faceCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const label = faceLabel(i);
    // center on the visible glyph box rather than the em box
    const metrics = ctx.measureText(label);
    const centerOffset =
      (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    ctx.fillStyle = i === highlightFace ? highlightColor : textColor;
    ctx.fillText(
      label,
      (col + 0.5) * CELL_SIZE,
      (row + 0.5) * CELL_SIZE + centerOffset
    );
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
};

// maps each logical face of the geometry into its atlas cell; all faces
// share one scale so numbers render the same size on every face.
// returns the world-space width one atlas cell spans, for sizing the
// font in world units
export const applyAtlasUVs = (geometry, centroids, normals) => {
  const position = geometry.attributes.position;
  const faceCount = centroids.length;
  const groupSize = geometry.groupSize || 1;
  const { cols, rows } = atlasLayout(faceCount);
  const uvs = new Float32Array(position.count * 2);
  const toFacePlane = new Quaternion();
  const point = new Vector3();
  const faceLocals = [];
  let extent = 0;

  for (let f = 0; f < faceCount; f++) {
    toFacePlane
      .copy(CannonUtils.calculateFaceQuaternion(normals[f]))
      .invert();

    const start = f * groupSize * 3;
    const count = groupSize * 3;
    const locals = [];

    for (let v = 0; v < count; v++) {
      point
        .fromBufferAttribute(position, start + v)
        .sub(centroids[f])
        .applyQuaternion(toFacePlane);
      locals.push([point.x, point.y]);
      extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
    }
    faceLocals.push(locals);
  }

  for (let f = 0; f < faceCount; f++) {
    const start = f * groupSize * 3;
    const col = f % cols;
    const row = Math.floor(f / cols);
    faceLocals[f].forEach(([x, y], v) => {
      uvs[(start + v) * 2] = (col + 0.5 + (x / extent) * 0.5 * FACE_INSET) / cols;
      uvs[(start + v) * 2 + 1] =
        (rows - 1 - row + 0.5 + (y / extent) * 0.5 * FACE_INSET) / rows;
    });
  }

  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  return (2 * extent) / FACE_INSET;
};
