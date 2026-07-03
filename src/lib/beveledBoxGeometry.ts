import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

type Point = [number, number, number];

const MIN_DIMENSION = 0.001;
const DEFAULT_BEVEL_SEGMENTS = 12;
const MAX_BEVEL_SEGMENTS = 12;

export function createEdgeBeveledBoxGeometry(
  width: number,
  height: number,
  depth: number,
  edgeBevel: number,
  bevelSegments = DEFAULT_BEVEL_SEGMENTS,
): BufferGeometry {
  const safeWidth = sanitizeDimension(width);
  const safeHeight = sanitizeDimension(height);
  const safeDepth = sanitizeDimension(depth);
  const bevel = clampEdgeBevel(safeWidth, safeHeight, safeDepth, edgeBevel);
  const segments = sanitizeSegments(bevelSegments);
  const halfWidth = safeWidth / 2;
  const halfHeight = safeHeight / 2;
  const halfDepth = safeDepth / 2;
  const polygons: Point[][] = [];

  const xMin = -halfWidth + bevel;
  const xMax = halfWidth - bevel;
  const yMin = -halfHeight + bevel;
  const yMax = halfHeight - bevel;
  const zMin = -halfDepth + bevel;
  const zMax = halfDepth - bevel;

  addAxisFaces(polygons, halfWidth, halfHeight, halfDepth, xMin, xMax, yMin, yMax, zMin, zMax);

  if (bevel > 0) {
    addEdgeBevelFaces(polygons, halfWidth, halfHeight, halfDepth, bevel, segments, xMin, xMax, yMin, yMax, zMin, zMax);
    addCornerFaces(polygons, halfWidth, halfHeight, halfDepth, bevel, segments);
  }

  const positions = triangulatePolygons(polygons);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  if (bevel > 0) {
    geometry.setAttribute('normal', new Float32BufferAttribute(createRoundedNormals(positions, halfWidth, halfHeight, halfDepth, bevel), 3));
  } else {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function addAxisFaces(
  polygons: Point[][],
  halfWidth: number,
  halfHeight: number,
  halfDepth: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
) {
  polygons.push(
    [
      [-halfWidth, yMin, zMin],
      [-halfWidth, yMax, zMin],
      [-halfWidth, yMax, zMax],
      [-halfWidth, yMin, zMax],
    ],
    [
      [halfWidth, yMin, zMin],
      [halfWidth, yMin, zMax],
      [halfWidth, yMax, zMax],
      [halfWidth, yMax, zMin],
    ],
    [
      [xMin, -halfHeight, zMin],
      [xMax, -halfHeight, zMin],
      [xMax, -halfHeight, zMax],
      [xMin, -halfHeight, zMax],
    ],
    [
      [xMin, halfHeight, zMin],
      [xMin, halfHeight, zMax],
      [xMax, halfHeight, zMax],
      [xMax, halfHeight, zMin],
    ],
    [
      [xMin, yMin, -halfDepth],
      [xMax, yMin, -halfDepth],
      [xMax, yMax, -halfDepth],
      [xMin, yMax, -halfDepth],
    ],
    [
      [xMin, yMin, halfDepth],
      [xMin, yMax, halfDepth],
      [xMax, yMax, halfDepth],
      [xMax, yMin, halfDepth],
    ],
  );
}

function addEdgeBevelFaces(
  polygons: Point[][],
  halfWidth: number,
  halfHeight: number,
  halfDepth: number,
  bevel: number,
  segments: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
) {
  const angleStep = Math.PI / 2 / segments;

  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (let segment = 0; segment < segments; segment += 1) {
        const start = segment * angleStep;
        const end = (segment + 1) * angleStep;
        const point = (angle: number, z: number): Point => [
          xSign * (halfWidth - bevel + Math.cos(angle) * bevel),
          ySign * (halfHeight - bevel + Math.sin(angle) * bevel),
          z,
        ];

        polygons.push([point(start, zMin), point(end, zMin), point(end, zMax), point(start, zMax)]);
      }
    }
  }

  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      for (let segment = 0; segment < segments; segment += 1) {
        const start = segment * angleStep;
        const end = (segment + 1) * angleStep;
        const point = (angle: number, y: number): Point => [
          xSign * (halfWidth - bevel + Math.cos(angle) * bevel),
          y,
          zSign * (halfDepth - bevel + Math.sin(angle) * bevel),
        ];

        polygons.push([point(start, yMin), point(end, yMin), point(end, yMax), point(start, yMax)]);
      }
    }
  }

  for (const ySign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      for (let segment = 0; segment < segments; segment += 1) {
        const start = segment * angleStep;
        const end = (segment + 1) * angleStep;
        const point = (angle: number, x: number): Point => [
          x,
          ySign * (halfHeight - bevel + Math.cos(angle) * bevel),
          zSign * (halfDepth - bevel + Math.sin(angle) * bevel),
        ];

        polygons.push([point(start, xMin), point(end, xMin), point(end, xMax), point(start, xMax)]);
      }
    }
  }
}

function addCornerFaces(
  polygons: Point[][],
  halfWidth: number,
  halfHeight: number,
  halfDepth: number,
  bevel: number,
  segments: number,
) {
  const angleStep = Math.PI / 2 / segments;

  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const point = (alpha: number, beta: number): Point => [
          xSign * (halfWidth - bevel + Math.sin(alpha) * Math.cos(beta) * bevel),
          ySign * (halfHeight - bevel + Math.sin(alpha) * Math.sin(beta) * bevel),
          zSign * (halfDepth - bevel + Math.cos(alpha) * bevel),
        ];

        for (let alphaIndex = 0; alphaIndex < segments; alphaIndex += 1) {
          for (let betaIndex = 0; betaIndex < segments; betaIndex += 1) {
            const alphaStart = alphaIndex * angleStep;
            const alphaEnd = (alphaIndex + 1) * angleStep;
            const betaStart = betaIndex * angleStep;
            const betaEnd = (betaIndex + 1) * angleStep;
            const p00 = point(alphaStart, betaStart);
            const p10 = point(alphaEnd, betaStart);
            const p11 = point(alphaEnd, betaEnd);
            const p01 = point(alphaStart, betaEnd);

            polygons.push(alphaIndex === 0 ? [p00, p10, p11] : [p00, p10, p11, p01]);
          }
        }
      }
    }
  }
}

function triangulatePolygons(polygons: Point[][]): number[] {
  return polygons.reduce<number[]>((positions, polygon) => {
    const orientedPolygon = getOutwardPolygon(polygon);

    for (let index = 1; index < orientedPolygon.length - 1; index += 1) {
      positions.push(...orientedPolygon[0], ...orientedPolygon[index], ...orientedPolygon[index + 1]);
    }

    return positions;
  }, []);
}

function getOutwardPolygon(polygon: Point[]): Point[] {
  const normal = getPolygonNormal(polygon);
  const center = polygon.reduce((sum, point) => sum.add(new Vector3(...point)), new Vector3()).divideScalar(polygon.length);

  return normal.dot(center) < 0 ? [...polygon].reverse() : polygon;
}

function getPolygonNormal(polygon: Point[]): Vector3 {
  const a = new Vector3(...polygon[0]);
  const b = new Vector3(...polygon[1]);
  const c = new Vector3(...polygon[2]);
  return b.sub(a).cross(c.sub(a));
}

function createRoundedNormals(
  positions: number[],
  halfWidth: number,
  halfHeight: number,
  halfDepth: number,
  bevel: number,
): number[] {
  const normals: number[] = [];
  const xInset = halfWidth - bevel;
  const yInset = halfHeight - bevel;
  const zInset = halfDepth - bevel;

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];
    const normal = new Vector3(
      x - clamp(x, -xInset, xInset),
      y - clamp(y, -yInset, yInset),
      z - clamp(z, -zInset, zInset),
    );

    if (normal.lengthSq() === 0) {
      normal.set(x, y, z);
    }

    normal.normalize();
    normals.push(normal.x, normal.y, normal.z);
  }

  return normals;
}

function clampEdgeBevel(width: number, height: number, depth: number, edgeBevel: number): number {
  if (!Number.isFinite(edgeBevel) || edgeBevel <= 0) {
    return 0;
  }

  const maxBevel = Math.max(0, Math.min(width, height, depth) / 2 - MIN_DIMENSION);
  return Math.min(edgeBevel, maxBevel);
}

function sanitizeSegments(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BEVEL_SEGMENTS;
  }

  return Math.max(1, Math.min(MAX_BEVEL_SEGMENTS, Math.round(value)));
}

function sanitizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : MIN_DIMENSION;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
