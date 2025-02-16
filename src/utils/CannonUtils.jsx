// MIT License
// Copyright (c) 2022, 2023, 2024 Sean Bradley
// Based on https://sbcode.net/threejs/physics-cannonDebugrenderer/#srcclientutilscannonutilsts

import { Quaternion, Vector3 } from "three";

class CannonUtils {
  // turns mesh information into physics compatible format
  static toConvexPolyhedronArgs(geometry) {
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const vertices = [];
    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i));
    }
    const faces = [];
    for (let i = 0; i < position.count; i += 3) {
      const vertexNormals =
        normal === undefined
          ? []
          : [
              new Vector3().fromBufferAttribute(normal, i),
              new Vector3().fromBufferAttribute(normal, i + 1),
              new Vector3().fromBufferAttribute(normal, i + 2),
            ];
      const face = {
        a: i,
        b: i + 1,
        c: i + 2,
        normals: vertexNormals,
      };
      faces.push(face);
    }

    const verticesMap = {};
    const points = [];
    const changes = [];
    for (let i = 0, il = vertices.length; i < il; i++) {
      const v = vertices[i];
      const key =
        Math.round(v.x * 100) +
        "_" +
        Math.round(v.y * 100) +
        "_" +
        Math.round(v.z * 100);
      if (verticesMap[key] === undefined) {
        verticesMap[key] = i;
        points.push({ x: vertices[i].x, y: vertices[i].y, z: vertices[i].z });
        changes[i] = points.length - 1;
      } else {
        changes[i] = changes[verticesMap[key]];
      }
    }

    const faceIdsToRemove = [];
    for (let i = 0, il = faces.length; i < il; i++) {
      const face = faces[i];
      face.a = changes[face.a];
      face.b = changes[face.b];
      face.c = changes[face.c];
      const indices = [face.a, face.b, face.c];
      for (let n = 0; n < 3; n++) {
        if (indices[n] === indices[(n + 1) % 3]) {
          faceIdsToRemove.push(i);
          break;
        }
      }
    }

    for (let i = faceIdsToRemove.length - 1; i >= 0; i--) {
      const idx = faceIdsToRemove[i];
      faces.splice(idx, 1);
    }

    return [
      points.map((v) => [v.x, v.y, v.z]),
      faces.map((f) => [f.a, f.b, f.c]),
    ];
  }

  // gather all the properties needed to build a physics convex from a geometry
  // also include some overrideable defaults
  static toConvexPolyhedronProps(
    geometry,
    position = [0, 0, 0],
    mass = 1,
    restitution = 0.8,
    onCollideBegin = (e) => undefined,
    onCollide = (e) => undefined,
    onCollideEnd = (e) => undefined
  ) {
    return {
      args: this.toConvexPolyhedronArgs(geometry),
      mass,
      position,
      restitution,
      onCollideBegin,
      onCollide,
      onCollideEnd,
    };
  }

  // helper function for averaging groups of vectors
  static getVector3Average(vectors, groupSize) {
    let averages = [];
    for (let i = 0; i < vectors.length; i += groupSize) {
      const group = vectors.slice(i, i + groupSize);
      const average = group
        .reduce((acc, vec) => acc.add(vec), new Vector3())
        .divideScalar(group.length);
      averages.push(average);
    }

    return averages;
  }

  // returns the list of all centroids (faces)
  static getCentroids(geometry) {
    const position = geometry.attributes.position;

    const vertices = [];
    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i));
    }

    const centroids = [];
    for (let i = 0; i < position.count; i += 3) {
      const a = vertices[i];
      const b = vertices[i + 1];
      const c = vertices[i + 2];

      const centroid = new Vector3(
        (a.x + b.x + c.x) / 3,
        (a.y + b.y + c.y) / 3,
        (a.z + b.z + c.z) / 3
      );
      centroids.push(centroid);
    }

    // takes average of centroid groups when shape
    // contains faces composed of multiple triangles
    if (geometry.groupSize > 1) {
      return this.getVector3Average(centroids, geometry.groupSize);
    }

    return centroids;
  }

  // returns the list of vertices
  static getVertices(geometry) {
    const position = geometry.attributes.position;
    const vertices = [];
    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i));
    }

    return vertices;
  }

  // returns the list of face normals
  static getNormals(geometry) {
    const position = geometry.attributes.position;
    const normals = [];
    for (let i = 0; i < position.count; i += 3) {
      const a = new Vector3().fromBufferAttribute(position, i);
      const b = new Vector3().fromBufferAttribute(position, i + 1);
      const c = new Vector3().fromBufferAttribute(position, i + 2);
      const normal = new Vector3()
        .subVectors(b, a)
        .cross(new Vector3().subVectors(c, a))
        .normalize();
      normals.push(normal);
    }

    // takes average of normal groups when shape
    // contains faces composed of multiple triangles
    if (geometry.groupSize > 1) {
      return this.getVector3Average(normals, geometry.groupSize);
    }

    return normals;
  }

  // returns a quaternion that can rotate a component to lay flat on its face
  static calculateFaceQuaternion(faceNormal) {
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(new Vector3(0, 0, 1), faceNormal);
    return quaternion;
  }

  // looks for direction vector with y component close to 1 (or -1 for D4)
  static getResult(name, mat, centroids) {
    const worldCenter = new Vector3(0, 0, 0).applyMatrix4(mat);
    const worldCentroidPos = new Vector3();
    const direction = new Vector3();

    let result;

    centroids.forEach((c, index) => {
      worldCentroidPos.set(c.x, c.y, c.z).applyMatrix4(mat);
      direction.subVectors(worldCentroidPos, worldCenter).normalize();

      if (name === "D4") {
        if (direction.y >= -0.9) {
          return;
        }
      } else {
        if (direction.y <= 0.9) {
          return; 
        }
      }

      result = index;
    });

    return result;
  }
  
}

export default CannonUtils;
