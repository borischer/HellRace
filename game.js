import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ============================================================
// MegaRace — 3D Racing Game Module
// ============================================================

// --- Track generation ---
// The track is a series of segments forming a looping circuit.
// Each segment has a position and direction; we pre-compute a spline.

const TRACK_LENGTH = 300;       // number of segments
const SEGMENT_DEPTH = 12;       // length of each road segment
const ROAD_WIDTH = 14;          // road width
const LANE_OFFSET = 3;          // distance from center to lane center
const TOTAL_TRACK = TRACK_LENGTH * SEGMENT_DEPTH;
const LAPS_TO_WIN = 3;

// ============================================================
// Level definitions
// ============================================================
const LEVELS = [
  {
    name: 'Annapurna Hills',
    label: 'Level 1',
    skyColor: 0x4a80b4,
    fogDensity: 0.0008,
    skyboxImage: 'siguniang-mountain-8568913_1280.jpg',
    terrainTexture: 'textures/grass_texture.avif',
    groundTexture: 'textures/grass_texture.avif',
    roadColor: 0x555560,
    edgeLineColor: 0xffffff,
    centerLineColor: 0xddaa00,
    barrierColor1: 0xcc0000,
    barrierColor2: 0xffffff,
    mountainColors: { base: [0.35, 0.30, 0.25], snow: [0.85, 0.88, 0.92] },
    hasTrees: true,
    hasHouses: true,
    groundY: -15,
    opponentSpeedRange: [0.78, 0.15],
    buildTrack: () => {
      const points = [];
      for (let i = 0; i <= TRACK_LENGTH; i++) {
        const t = (i / TRACK_LENGTH) * Math.PI * 2;
        const radius = 400;
        const x = Math.sin(t) * radius + Math.sin(t * 3) * 80 + Math.cos(t * 2) * 60;
        const z = Math.cos(t) * radius * 0.7 + Math.cos(t * 4) * 40;
        const y = Math.sin(t * 2) * 20 + Math.sin(t * 5) * 10 + Math.cos(t * 3) * 8;
        points.push(new THREE.Vector3(x, y, z));
      }
      return points;
    },
  },
  {
    name: 'Mars Expedition',
    label: 'Level 2',
    skyColor: 0x8b4513,
    fogDensity: 0.001,
    skyboxImage: 'backgrounds/mars_space_camp.png',
    terrainTexture: 'textures/sand_texture.jpg',
    groundTexture: 'textures/sand_texture.jpg',
    roadColor: 0x6e5040,
    edgeLineColor: 0xff6600,
    centerLineColor: 0xff4400,
    barrierColor1: 0xff4400,
    barrierColor2: 0x442200,
    mountainColors: { base: [0.55, 0.25, 0.12], snow: [0.7, 0.35, 0.2] },
    hasTrees: false,
    hasHouses: false,
    groundY: -15,
    opponentSpeedRange: [0.80, 0.15],
    buildTrack: () => {
      const points = [];
      for (let i = 0; i <= TRACK_LENGTH; i++) {
        const t = (i / TRACK_LENGTH) * Math.PI * 2;
        const radius = 450;
        const x = Math.sin(t) * radius + Math.cos(t * 2) * 100 + Math.sin(t * 5) * 30;
        const z = Math.cos(t) * radius * 0.8 + Math.sin(t * 3) * 60;
        const y = Math.sin(t * 3) * 15 + Math.cos(t * 2) * 12 + Math.sin(t * 7) * 5;
        points.push(new THREE.Vector3(x, y, z));
      }
      return points;
    },
  },
  {
    name: 'Apollo on the Moon',
    label: 'Level 3',
    skyColor: 0x050510,
    fogDensity: 0.0004,
    skyboxImage: 'backgrounds/earth_from_moon.png',
    terrainTexture: 'textures/ice_texture.jpg',
    groundTexture: 'textures/ice_texture.jpg',
    roadColor: 0x888890,
    edgeLineColor: 0x44ffff,
    centerLineColor: 0x44ffff,
    barrierColor1: 0x4444ff,
    barrierColor2: 0x222244,
    mountainColors: { base: [0.4, 0.4, 0.42], snow: [0.7, 0.7, 0.75] },
    hasTrees: false,
    hasHouses: false,
    groundY: -15,
    opponentSpeedRange: [0.82, 0.15],
    buildTrack: () => {
      const points = [];
      for (let i = 0; i <= TRACK_LENGTH; i++) {
        const t = (i / TRACK_LENGTH) * Math.PI * 2;
        const radius = 380;
        const x = Math.sin(t) * radius + Math.sin(t * 2) * 90 + Math.cos(t * 4) * 40;
        const z = Math.cos(t) * radius * 0.65 + Math.cos(t * 3) * 70;
        const y = Math.sin(t * 2) * 10 + Math.cos(t * 4) * 8 + Math.sin(t * 6) * 4;
        points.push(new THREE.Vector3(x, y, z));
      }
      return points;
    },
  },
];

function createTrackCurve(points) {
  return new THREE.CatmullRomCurve3(points, true);
}

// --- Road mesh from spline (grey asphalt only, no edge lines) ---
function createRoadMesh(curve, roadColor = 0x555560) {
  const divisions = TRACK_LENGTH * 4;
  const verts = [];
  const indices = [];

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const halfW = ROAD_WIDTH / 2;
    const y = pos.y - 2.3;

    // Left edge, right edge — simple 2-vertex road strip
    verts.push(
      pos.x - right.x * halfW, y, pos.z - right.z * halfW,
      pos.x + right.x * halfW, y, pos.z + right.z * halfW,
    );

    if (i < divisions) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Plain grey asphalt
  const mat = new THREE.MeshStandardMaterial({
    color: roadColor,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// --- White road edge lines (separate mesh on top of road) ---
function createEdgeLines(curve, lineColor = 0xffffff) {
  const divisions = TRACK_LENGTH * 4;
  const verts = [];
  const indices = [];
  let idx = 0;
  const LINE_W = 0.35;

  for (let i = 0; i < divisions; i++) {
    const t1 = i / divisions;
    const t2 = (i + 1) / divisions;
    const p1 = curve.getPointAt(t1);
    const p2 = curve.getPointAt(t2);
    const tan = curve.getTangentAt(t1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();
    const tan2 = curve.getTangentAt(t2).normalize();
    const right2 = new THREE.Vector3().crossVectors(tan2, up).normalize();

    const halfW = ROAD_WIDTH / 2;
    const yOff = -2.25;
    for (const side of [-1, 1]) {
      const edgeX = side * halfW;
      const innerX = side * (halfW - LINE_W);
      verts.push(
        p1.x + right.x * innerX, p1.y + yOff, p1.z + right.z * innerX,
        p1.x + right.x * edgeX, p1.y + yOff, p1.z + right.z * edgeX,
        p2.x + right2.x * edgeX, p2.y + yOff, p2.z + right2.z * edgeX,
        p2.x + right2.x * innerX, p2.y + yOff, p2.z + right2.z * innerX,
      );
      indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
      idx += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    color: lineColor,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// --- Dashed center line (on top of road) ---
function createCenterLine(curve, centerColor = 0xddaa00) {
  const divisions = TRACK_LENGTH * 4;
  const verts = [];
  const indices = [];
  let idx = 0;

  for (let i = 0; i < divisions; i++) {
    if (Math.floor(i / 4) % 2 !== 0) continue;

    const t1 = i / divisions;
    const t2 = (i + 1) / divisions;
    const p1 = curve.getPointAt(t1);
    const p2 = curve.getPointAt(t2);
    const tan = curve.getTangentAt(t1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();

    const w = 0.25;
    const yOff = -2.25;
    verts.push(
      p1.x - right.x * w, p1.y + yOff, p1.z - right.z * w,
      p1.x + right.x * w, p1.y + yOff, p1.z + right.z * w,
      p2.x + right.x * w, p2.y + yOff, p2.z + right.z * w,
      p2.x - right.x * w, p2.y + yOff, p2.z - right.z * w,
    );
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
    idx += 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: centerColor, side: THREE.DoubleSide }));
}

// --- Green terrain that follows the track (replaces flat ground plane) ---
function createTerrainAlongTrack(curve, terrainTexturePath = 'textures/grass_texture.avif') {
  const divisions = TRACK_LENGTH * 4;
  const verts = [];
  const uvs = [];
  const indices = [];
  const TERRAIN_WIDTH = 150; // wide enough to cover everything visible

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const halfW = ROAD_WIDTH / 2 + 0.3;
    const y = pos.y - 2.5; // below road surface

    // 4 verts per row: far left, road left edge (just outside road), road right edge, far right
    verts.push(
      pos.x - right.x * TERRAIN_WIDTH, y - 3, pos.z - right.z * TERRAIN_WIDTH,  // far left, slopes down
      pos.x - right.x * halfW, y, pos.z - right.z * halfW,                      // road left edge
      pos.x + right.x * halfW, y, pos.z + right.z * halfW,                      // road right edge
      pos.x + right.x * TERRAIN_WIDTH, y - 3, pos.z + right.z * TERRAIN_WIDTH,  // far right, slopes down
    );

    // UV: tile the texture along the track (v) and across width (u)
    const vCoord = t * divisions * 0.5; // repeat along track
    uvs.push(
      0, vCoord,
      TERRAIN_WIDTH / 10, vCoord,
      TERRAIN_WIDTH / 10, vCoord,
      0, vCoord,
    );

    if (i < divisions) {
      const base = i * 4;
      const next = base + 4;
      // Left terrain strip
      indices.push(base, next, base + 1, base + 1, next, next + 1);
      // Right terrain strip
      indices.push(base + 2, next + 2, base + 3, base + 3, next + 2, next + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const grassTex = new THREE.TextureLoader().load(terrainTexturePath);
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(1, 1);
  grassTex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geo, mat);
}

// --- Finish line (checkerboard strip across road + flag poles) ---
function createFinishLine(curve) {
  const group = new THREE.Group();
  const t = 0; // start/finish at t=0
  const pos = curve.getPointAt(t);
  const tan = curve.getTangentAt(t).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tan, up).normalize();
  const halfW = ROAD_WIDTH / 2;
  const roadY = pos.y - 2.3;

  // Checkerboard strip on road
  const checkSize = 1.0;
  const rows = 2;
  const cols = Math.floor(ROAD_WIDTH / checkSize);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isWhite = (r + c) % 2 === 0;
      const geo = new THREE.PlaneGeometry(checkSize, checkSize);
      const mat = new THREE.MeshBasicMaterial({
        color: isWhite ? 0xffffff : 0x111111,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const tile = new THREE.Mesh(geo, mat);
      tile.rotation.x = -Math.PI / 2;
      const lateralOffset = -halfW + c * checkSize + checkSize / 2;
      const forwardOffset = -rows * checkSize / 2 + r * checkSize + checkSize / 2;
      tile.position.set(
        pos.x + right.x * lateralOffset + tan.x * forwardOffset,
        roadY + 0.08,
        pos.z + right.z * lateralOffset + tan.z * forwardOffset
      );
      tile.renderOrder = 1;
      group.add(tile);
    }
  }

  // Flag poles on both sides
  for (const side of [-1, 1]) {
    const poleX = pos.x + right.x * (halfW + 1) * side;
    const poleZ = pos.z + right.z * (halfW + 1) * side;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(poleX, roadY + 4, poleZ);
    pole.castShadow = true;
    group.add(pole);

    // Checkered flag (4x3 grid)
    const flagW = 2.0;
    const flagH = 1.5;
    const flagRows = 3;
    const flagCols = 4;
    const cellW = flagW / flagCols;
    const cellH = flagH / flagRows;
    for (let fr = 0; fr < flagRows; fr++) {
      for (let fc = 0; fc < flagCols; fc++) {
        const isW = (fr + fc) % 2 === 0;
        const cellGeo = new THREE.PlaneGeometry(cellW, cellH);
        const cellMat = new THREE.MeshBasicMaterial({
          color: isW ? 0xffffff : 0x111111,
          side: THREE.DoubleSide,
        });
        const cell = new THREE.Mesh(cellGeo, cellMat);
        // Position flag cells relative to pole top
        const flagBaseY = roadY + 6.5;
        const offsetRight = fc * cellW - flagW / 2 + cellW / 2;
        const offsetUp = fr * cellH - flagH / 2 + cellH / 2;
        cell.position.set(
          poleX + tan.x * offsetRight,
          flagBaseY + offsetUp,
          poleZ + tan.z * offsetRight
        );
        // Face the flag perpendicular to the track
        cell.lookAt(
          poleX + tan.x * offsetRight + right.x,
          flagBaseY + offsetUp,
          poleZ + tan.z * offsetRight + right.z
        );
        group.add(cell);
      }
    }
  }

  return group;
}

// --- Barrier walls along the track ---
function createBarriers(curve, color1 = 0xcc0000, color2 = 0xffffff) {
  const group = new THREE.Group();
  const divisions = TRACK_LENGTH;
  const barrierGeo = new THREE.BoxGeometry(1.2, 0.6, 0.3);

  for (let i = 0; i < divisions; i += 3) {
    const t = i / divisions;
    const pos = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();

    const halfW = ROAD_WIDTH / 2 + 0.5;
    const angle = Math.atan2(tan.x, tan.z);
    const stripe = (i / 3) % 2 === 0;

    for (const side of [-1, 1]) {
      const mat = new THREE.MeshStandardMaterial({
        color: stripe ? color1 : color2,
        roughness: 0.6,
      });
      const barrier = new THREE.Mesh(barrierGeo, mat);
      barrier.position.set(
        pos.x + right.x * halfW * side,
        pos.y - 2.3,
        pos.z + right.z * halfW * side
      );
      barrier.rotation.y = angle;
      group.add(barrier);
    }
  }
  return group;
}

// --- Scenery: Trees (loaded from GLB model) ---
function createTrees(curve, gltfLoader) {
  return new Promise((resolve) => {
    gltfLoader.load('trees/tree.glb', (gltf) => {
      const group = new THREE.Group();
      const treeModel = gltf.scene;

      // Normalize the tree model size
      const box = new THREE.Box3().setFromObject(treeModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const baseScale = 8.0 / maxDim; // normalize to ~8 units tall

      // Wrap in container so bottom-alignment survives cloning
      treeModel.position.set(-center.x, -box.min.y, -center.z);
      const container = new THREE.Group();
      container.add(treeModel);
      container.scale.setScalar(baseScale);

      // Enable shadows on the source model
      treeModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      for (let i = 0; i < TRACK_LENGTH; i += 3) {
        const t = i / TRACK_LENGTH;
        const pos = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const count = Math.random() > 0.5 ? 2 : 1;
        for (let j = 0; j < count; j++) {
          const dist = ROAD_WIDTH / 2 + 3 + Math.random() * 20;
          const side = (j === 0) ? 1 : -1;
          const offsetAlongTrack = (Math.random() - 0.5) * 5;

          const clone = container.clone();
          // Random scale variation
          const s = (0.8 + Math.random() * 0.6) * baseScale;
          clone.scale.setScalar(s);
          clone.position.set(
            pos.x + right.x * dist * side + tan.x * offsetAlongTrack,
            pos.y - 2.5,
            pos.z + right.z * dist * side + tan.z * offsetAlongTrack
          );
          clone.rotation.y = Math.random() * Math.PI * 2;

          group.add(clone);
        }
      }
      resolve(group);
    });
  });
}

// --- Scenery: Houses / Buildings (loaded from GLB models) ---
const HOUSE_FILES = [
  'houses/house_1.glb',
  'houses/house_2.glb',
  'houses/house_3.glb',
  'houses/house_4.glb',
];

function createHouses(curve, gltfLoader) {
  // Load all 4 house models, then clone them along the track
  const loadPromises = HOUSE_FILES.map(file =>
    new Promise((resolve) => {
      gltfLoader.load(file, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const baseScale = 12.0 / maxDim; // normalize to ~12 units tall

        // Wrap in container so bottom-alignment survives cloning
        model.position.set(-center.x, -box.min.y, -center.z);
        const container = new THREE.Group();
        container.add(model);
        container.scale.setScalar(baseScale);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        resolve(container);
      });
    })
  );

  return Promise.all(loadPromises).then((houseModels) => {
    const group = new THREE.Group();
    let houseIdx = 0;

    for (let i = 0; i < TRACK_LENGTH; i += 12) {
      const t = i / TRACK_LENGTH;
      const pos = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tan, up).normalize();

      const dist = ROAD_WIDTH / 2 + 8 + Math.random() * 10;
      const side = Math.random() > 0.5 ? 1 : -1;

      // Cycle through the 4 house models
      const sourceModel = houseModels[houseIdx % houseModels.length];
      houseIdx++;

      const clone = sourceModel.clone();
      const s = (0.8 + Math.random() * 0.5) * sourceModel.scale.x;
      clone.scale.setScalar(s);

      clone.position.set(
        pos.x + right.x * dist * side,
        pos.y - 2.5,
        pos.z + right.z * dist * side
      );
      clone.rotation.y = Math.atan2(tan.x, tan.z) + (Math.random() - 0.5) * 0.5;

      group.add(clone);
    }
    return group;
  });
}

// --- Mountain range skybox ring ---
function createMountains(colorConfig = { base: [0.35, 0.30, 0.25], snow: [0.85, 0.88, 0.92] }) {
  const group = new THREE.Group();
  const NUM_MOUNTAINS = 60;
  const RING_RADIUS = 700;

  for (let i = 0; i < NUM_MOUNTAINS; i++) {
    const angle = (i / NUM_MOUNTAINS) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
    const x = Math.cos(angle) * (RING_RADIUS + Math.random() * 200);
    const z = Math.sin(angle) * (RING_RADIUS + Math.random() * 200);

    const width = 40 + Math.random() * 80;
    const height = 30 + Math.random() * 80;
    const depth = 30 + Math.random() * 60;

    // Mountain peak shape
    const geo = new THREE.ConeGeometry(width / 2, height, 5 + Math.floor(Math.random() * 4), 1);

    // Color gradient: brown base, grey-white peaks
    const isSnowy = height > 70;
    const color = isSnowy
      ? new THREE.Color(colorConfig.snow[0], colorConfig.snow[1], colorConfig.snow[2])
      : new THREE.Color(colorConfig.base[0] + Math.random() * 0.15, colorConfig.base[1] + Math.random() * 0.1, colorConfig.base[2] + Math.random() * 0.1);

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      flatShading: true,
    });

    const mountain = new THREE.Mesh(geo, mat);
    mountain.position.set(x, height / 2 - 10, z);
    mountain.rotation.y = Math.random() * Math.PI;

    // Slightly squash or stretch for variety
    mountain.scale.set(1, 1, depth / width);

    group.add(mountain);

    // Add a secondary smaller peak nearby
    if (Math.random() > 0.4) {
      const h2 = height * (0.4 + Math.random() * 0.4);
      const w2 = width * (0.3 + Math.random() * 0.4);
      const geo2 = new THREE.ConeGeometry(w2 / 2, h2, 4 + Math.floor(Math.random() * 3), 1);
      const color2 = new THREE.Color(colorConfig.base[0] + Math.random() * 0.15, colorConfig.base[1] + Math.random() * 0.1, colorConfig.base[2]);
      const mat2 = new THREE.MeshStandardMaterial({ color: color2, roughness: 0.9, flatShading: true });
      const m2 = new THREE.Mesh(geo2, mat2);
      m2.position.set(
        x + (Math.random() - 0.5) * width,
        h2 / 2 - 10,
        z + (Math.random() - 0.5) * width
      );
      group.add(m2);
    }
  }
  return group;
}

// --- Scenery: Rocks and craters (for Mars / Moon levels) ---
const MARS_ROCK_FILES = [
  'model_assets/rock_mars_1.glb',
  'model_assets/meteorit_mars.glb',
  'model_assets/mars_rock_2.glb',
];

function createRocks(curve, levelIndex, gltfLoader) {
  const isMoon = levelIndex === 2;

  if (!isMoon) {
    // Mars: load GLB rock models and scatter them
    const loadPromises = MARS_ROCK_FILES.map(file =>
      new Promise((resolve) => {
        gltfLoader.load(file, (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseScale = 4.0 / maxDim;

          // Bottom-align: shift model so its bottom is at y=0
          model.position.set(-center.x, -box.min.y, -center.z);
          const container = new THREE.Group();
          container.add(model);
          container.scale.setScalar(baseScale);

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          resolve(container);
        });
      })
    );

    return Promise.all(loadPromises).then((rockModels) => {
      const group = new THREE.Group();

      for (let i = 0; i < TRACK_LENGTH; i += 2) {
        const t = i / TRACK_LENGTH;
        const pos = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const count = Math.random() > 0.6 ? 2 : 1;
        for (let j = 0; j < count; j++) {
          const dist = ROAD_WIDTH / 2 + 3 + Math.random() * 25;
          const side = j === 0 ? 1 : -1;

          // Pick a random rock model
          const sourceModel = rockModels[Math.floor(Math.random() * rockModels.length)];
          const clone = sourceModel.clone();

          // Random size variation
          const s = (0.5 + Math.random() * 1.5) * sourceModel.scale.x;
          clone.scale.setScalar(s);

          // Place on terrain surface (y - 2.5 is terrain height)
          clone.position.set(
            pos.x + right.x * dist * side,
            pos.y - 2.5,
            pos.z + right.z * dist * side
          );
          clone.rotation.y = Math.random() * Math.PI * 2;

          group.add(clone);
        }
      }
      return group;
    });
  }

  // Moon: geometric rocks + craters (synchronous)
  const group = new THREE.Group();
  const rockColor = 0x777780;
  const rockColor2 = 0x555560;

  for (let i = 0; i < TRACK_LENGTH; i += 2) {
    const t = i / TRACK_LENGTH;
    const pos = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();

    const count = Math.random() > 0.6 ? 2 : 1;
    for (let j = 0; j < count; j++) {
      const dist = ROAD_WIDTH / 2 + 3 + Math.random() * 25;
      const side = j === 0 ? 1 : -1;

      const w = 1 + Math.random() * 3;
      const h = 0.5 + Math.random() * 2;
      const geo = new THREE.DodecahedronGeometry(w, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? rockColor : rockColor2,
        roughness: 0.95,
        flatShading: true,
      });
      const rock = new THREE.Mesh(geo, mat);
      rock.position.set(
        pos.x + right.x * dist * side,
        pos.y - 2.5 + h * 0.3,
        pos.z + right.z * dist * side
      );
      rock.scale.set(1, h / w, 1);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      group.add(rock);
    }

    // Occasional craters
    if (Math.random() > 0.85) {
      const craterDist = ROAD_WIDTH / 2 + 5 + Math.random() * 20;
      const craterSide = Math.random() > 0.5 ? 1 : -1;
      const craterR = 3 + Math.random() * 6;
      const craterGeo = new THREE.RingGeometry(craterR * 0.7, craterR, 16);
      const craterMat = new THREE.MeshStandardMaterial({
        color: 0x555560,
        roughness: 1,
        side: THREE.DoubleSide,
      });
      const crater = new THREE.Mesh(craterGeo, craterMat);
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(
        pos.x + right.x * craterDist * craterSide,
        pos.y - 2.45,
        pos.z + right.z * craterDist * craterSide
      );
      group.add(crater);
    }
  }
  return Promise.resolve(group);
}

// --- HUD ---
function createHUD() {
  const container = document.createElement('div');
  container.id = 'race-hud';
  container.innerHTML = `
    <div class="hud-panel hud-left">
      <div class="hud-speed"><span id="hud-speed-val">0</span> <small>KM/H</small></div>
    </div>
    <div class="hud-panel hud-center">
      <div class="hud-lap">LAP <span id="hud-lap-val">1</span> / ${LAPS_TO_WIN}</div>
      <div class="hud-pos">POS <span id="hud-pos-val">1</span> / 3</div>
      <div id="hud-countdown"></div>
      <div id="hud-message"></div>
    </div>
    <div class="hud-panel hud-right">
      <div class="hud-bar-label">THROTTLE</div>
      <div class="hud-bar"><div id="hud-throttle-bar" class="hud-bar-fill"></div></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #race-hud {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 30px;
      background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 80%, transparent);
      z-index: 50;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      pointer-events: none;
    }
    .hud-panel { color: #fff; text-align: center; }
    .hud-left, .hud-right { width: 180px; }
    .hud-center { flex: 1; }
    .hud-speed {
      font-size: 2.2rem;
      font-weight: 700;
      color: #4df;
      text-shadow: 0 0 10px rgba(68,221,255,0.5);
    }
    .hud-speed small { font-size: 0.8rem; font-weight: 300; color: rgba(255,255,255,0.5); }
    .hud-lap, .hud-pos {
      font-size: 0.9rem;
      letter-spacing: 0.15em;
      color: rgba(255,255,255,0.7);
    }
    .hud-pos { margin-top: 2px; }
    #hud-pos-val { color: #4f4; font-weight: 700; }
    #hud-lap-val { color: #ff4; font-weight: 700; }
    #hud-countdown {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 8rem;
      font-weight: 900;
      color: #ff4;
      text-shadow: 0 0 40px rgba(255,255,0,0.8), 0 0 80px rgba(255,200,0,0.4);
      min-height: 0;
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
    #hud-countdown.show {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    #hud-countdown.go {
      color: #4f4;
      text-shadow: 0 0 40px rgba(0,255,0,0.8), 0 0 80px rgba(0,255,0,0.4);
    }
    #hud-message {
      font-size: 1.5rem;
      font-weight: 700;
      color: #4f4;
      text-shadow: 0 0 15px rgba(0,255,0,0.5);
      min-height: 2rem;
    }
    .hud-bar-label { font-size: 0.6rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
    .hud-bar {
      width: 160px;
      height: 14px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 3px;
      overflow: hidden;
    }
    .hud-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #f80, #f00);
      transition: width 0.05s;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(container);
  return container;
}

// --- Sound system for the game ---
function createGameAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Preload lap completion sound
  let lapSoundBuffer = null;
  fetch('sound/action_game.wav')
    .then(r => r.arrayBuffer())
    .then(buf => ctx.decodeAudioData(buf))
    .then(decoded => { lapSoundBuffer = decoded; });

  function playLapSound() {
    if (!lapSoundBuffer) return;
    if (ctx.state === 'suspended') ctx.resume();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = lapSoundBuffer;
    gain.gain.value = 1.0;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  // Continuous engine sound
  let engineOsc = null;
  let engineGain = null;
  let engineOsc2 = null;
  let engineGain2 = null;

  function startEngine() {
    if (engineOsc) return;
    if (ctx.state === 'suspended') ctx.resume();
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.02;
    engineOsc.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();

    engineOsc2 = ctx.createOscillator();
    engineGain2 = ctx.createGain();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 40;
    engineGain2.gain.value = 0.01;
    engineOsc2.connect(engineGain2);
    engineGain2.connect(ctx.destination);
    engineOsc2.start();
  }

  function updateEngine(speed, maxSpeed) {
    if (!engineOsc) return;
    const ratio = speed / maxSpeed;
    engineOsc.frequency.value = 55 + ratio * 200;
    engineGain.gain.value = 0.015 + ratio * 0.03;
    engineOsc2.frequency.value = 40 + ratio * 140;
    engineGain2.gain.value = 0.008 + ratio * 0.015;
  }

  function stopEngine() {
    if (engineOsc) { engineOsc.stop(); engineOsc = null; }
    if (engineOsc2) { engineOsc2.stop(); engineOsc2 = null; }
  }

  function playBeep(freq, duration) {
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  }

  return { ctx, startEngine, updateEngine, stopEngine, playBeep, playLapSound };
}

// --- Podium celebration scene ---
async function showPodium(renderer, gltfLoader, rankings) {
  // rankings = [{ model, label, place }, ...] sorted by place (1st, 2nd, 3rd)

  const podScene = new THREE.Scene();
  podScene.background = new THREE.Color(0x1a1a2e);

  // --- Showroom-quality lighting ---
  // Strong ambient fill
  podScene.add(new THREE.AmbientLight(0xffffff, 0.8));
  // Hemisphere for natural top-bottom gradient
  podScene.add(new THREE.HemisphereLight(0xaabbff, 0x223344, 0.8));

  // Main key light (bright white spotlight from front-above)
  const keyLight = new THREE.SpotLight(0xffffff, 150);
  keyLight.position.set(0, 15, 10);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.6;
  keyLight.decay = 1.5;
  keyLight.distance = 50;
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.target.position.set(0, 2, 0);
  podScene.add(keyLight);
  podScene.add(keyLight.target);

  // Gold accent light from left
  const goldLight = new THREE.SpotLight(0xffd700, 80);
  goldLight.position.set(-8, 10, -3);
  goldLight.angle = Math.PI / 5;
  goldLight.penumbra = 0.7;
  goldLight.decay = 1.5;
  goldLight.distance = 40;
  goldLight.target.position.set(0, 2, 0);
  podScene.add(goldLight);
  podScene.add(goldLight.target);

  // Blue accent light from right
  const blueLight = new THREE.SpotLight(0x4488ff, 60);
  blueLight.position.set(8, 10, -3);
  blueLight.angle = Math.PI / 5;
  blueLight.penumbra = 0.7;
  blueLight.decay = 1.5;
  blueLight.distance = 40;
  blueLight.target.position.set(0, 2, 0);
  podScene.add(blueLight);
  podScene.add(blueLight.target);

  // Backlight for rim/silhouette
  const backLight = new THREE.DirectionalLight(0x6688cc, 2);
  backLight.position.set(0, 8, -10);
  podScene.add(backLight);

  // --- Environment map for car reflections (like showroom) ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x222233);
  const envL1 = new THREE.DirectionalLight(0xffffff, 2);
  envL1.position.set(0, 1, 0);
  envScene.add(envL1);
  const envL2 = new THREE.DirectionalLight(0x4466aa, 1);
  envL2.position.set(0, -1, 0);
  envScene.add(envL2);
  const panelGeo = new THREE.PlaneGeometry(10, 10);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, 5, 0);
  panel.rotation.x = Math.PI / 2;
  envScene.add(panel);
  const envRT = pmrem.fromScene(envScene, 0.04);
  podScene.environment = envRT.texture;
  pmrem.dispose();

  // Camera — pulled back more for larger view
  const podCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  podCamera.position.set(0, 7, 18);
  podCamera.lookAt(0, 3, 0);

  // Load podium model
  const podium = await new Promise((resolve) => {
    gltfLoader.load('model_assets/winner_pod.glb', (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 10 / maxDim;
      model.position.set(-center.x, -box.min.y, -center.z);
      const group = new THREE.Group();
      group.add(model);
      group.scale.setScalar(scale);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      resolve(group);
    });
  });

  // Rotating container for podium + cars
  const rotatingGroup = new THREE.Group();
  rotatingGroup.add(podium);

  // Get podium bounding box for car placement
  const podBox = new THREE.Box3().setFromObject(podium);
  const podTop = podBox.max.y;
  const podW = podBox.max.x - podBox.min.x;

  // Place cars on podium: 1st center/top, 2nd left/mid, 3rd right/low
  const podPositions = [
    { x: 0,            y: podTop + 0.05, z: 0 },
    { x: -podW * 0.35, y: podTop * 0.72, z: 0 },
    { x:  podW * 0.35, y: podTop * 0.52, z: 0 },
  ];

  // Reload car models fresh so they have clean orientation (not race transforms)
  function loadPodiumCar(file) {
    return new Promise((resolve) => {
      gltfLoader.load(file, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        const group = new THREE.Group();
        group.add(model);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(group);
      });
    });
  }

  // Get the file paths from rankings models' userData or reload from allCarFiles
  // We stored the car file on the model during loadCar — but we didn't.
  // Instead, re-use the rankings model's geometry by cloning, but reset all transforms.
  for (let i = 0; i < rankings.length && i < 3; i++) {
    // Clone the original model group
    const carClone = rankings[i].model.clone();

    // Reset any race rotation/position — start clean
    carClone.position.set(0, 0, 0);
    carClone.rotation.set(0, 0, 0);
    carClone.updateMatrixWorld(true);

    // Measure the clean bounding box
    const carBox = new THREE.Box3().setFromObject(carClone);
    const carSize = carBox.getSize(new THREE.Vector3());
    const carMaxDim = Math.max(carSize.x, carSize.y, carSize.z);
    const targetSize = 4.5;
    const carScale = targetSize / carMaxDim;
    carClone.scale.multiplyScalar(carScale);

    const pp = podPositions[i];
    carClone.position.set(pp.x, pp.y, pp.z);
    // Face car sideways (profile view) — rotate 90 degrees so side faces camera
    carClone.rotation.y = -Math.PI / 2;
    rotatingGroup.add(carClone);
  }

  podScene.add(rotatingGroup);

  // Reflective floor
  const floorGeo = new THREE.CircleGeometry(30, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222233,
    roughness: 0.3,
    metalness: 0.5,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  podScene.add(floor);

  // HUD overlay for podium
  const podHud = document.createElement('div');
  podHud.id = 'podium-hud';
  podHud.innerHTML = `
    <div class="podium-title">RACE RESULTS</div>
    <div class="podium-rankings">
      ${rankings.map((r, i) => {
        const medals = ['GOLD', 'SILVER', 'BRONZE'];
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        return `<div class="podium-rank" style="color:${colors[i]}">${medals[i]}: ${r.label}</div>`;
      }).join('')}
    </div>
    <div class="podium-continue">PRESS ENTER TO CONTINUE</div>
  `;
  const podStyle = document.createElement('style');
  podStyle.textContent = `
    #podium-hud {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 40px;
      pointer-events: none;
      z-index: 50;
      font-family: 'Courier New', monospace;
    }
    .podium-title {
      font-size: 3rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.15em;
      text-shadow: 0 0 30px rgba(255,215,0,0.5);
      margin-bottom: 20px;
    }
    .podium-rankings {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .podium-rank {
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-shadow: 0 0 10px currentColor;
    }
    .podium-continue {
      position: fixed;
      bottom: 60px;
      font-size: 1.2rem;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.2em;
      animation: blink-podium 1.5s ease-in-out infinite;
    }
    @keyframes blink-podium {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(podStyle);
  document.body.appendChild(podHud);

  // Resize handler
  const onPodResize = () => {
    podCamera.aspect = window.innerWidth / window.innerHeight;
    podCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onPodResize);
  onPodResize();

  // Animation loop for rotating podium
  let podAnimId;
  function podiumLoop() {
    podAnimId = requestAnimationFrame(podiumLoop);
    rotatingGroup.rotation.y += 0.005;
    renderer.render(podScene, podCamera);
  }
  podiumLoop();

  // Wait for Enter key to continue
  await new Promise((resolve) => {
    const handler = (e) => {
      if (e.code === 'Enter') {
        window.removeEventListener('keydown', handler);
        resolve();
      }
    };
    window.addEventListener('keydown', handler);
  });

  // Clean up podium
  cancelAnimationFrame(podAnimId);
  window.removeEventListener('resize', onPodResize);
  podHud.remove();
  podStyle.remove();

  // Show restart screen
  const restartScreen = document.createElement('div');
  restartScreen.id = 'restart-screen';
  restartScreen.innerHTML = `
    <div class="restart-title">GAME OVER</div>
    <div class="restart-prompt">PRESS ENTER TO RESTART</div>
  `;
  const restartStyle = document.createElement('style');
  restartStyle.textContent = `
    #restart-screen {
      position: fixed;
      inset: 0;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Courier New', monospace;
    }
    .restart-title {
      font-size: 4rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.15em;
      margin-bottom: 30px;
    }
    .restart-prompt {
      font-size: 1.5rem;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.2em;
      animation: blink-restart 1.5s ease-in-out infinite;
    }
    @keyframes blink-restart {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(restartStyle);
  document.body.appendChild(restartScreen);

  // Wait for Enter to restart
  await new Promise((resolve) => {
    const handler = (e) => {
      if (e.code === 'Enter') {
        window.removeEventListener('keydown', handler);
        resolve();
      }
    };
    window.addEventListener('keydown', handler);
  });

  // Restart: reload page
  window.location.reload();
}

// ============================================================
// Main game entry
// ============================================================
export async function startRace(renderer, playerCarFile, allCarFiles, levelIndex = 0) {
  const level = LEVELS[levelIndex];

  // --- Pick opponents (different from player and each other) ---
  const opponentChoices = allCarFiles.filter(c => c.file !== playerCarFile);
  const opponent1Car = opponentChoices[Math.floor(Math.random() * opponentChoices.length)];
  const opponent2Choices = opponentChoices.filter(c => c.file !== opponent1Car.file);
  const opponent2Car = opponent2Choices[Math.floor(Math.random() * opponent2Choices.length)];

  // --- Hide showroom completely ---
  const titleEl = document.getElementById('title-logo');
  if (titleEl) titleEl.style.display = 'none';
  const carNameEl = document.getElementById('car-name');
  if (carNameEl) carNameEl.style.display = 'none';
  const selectEl = document.getElementById('select-prompt');
  if (selectEl) selectEl.style.display = 'none';
  const infoEl = document.getElementById('info');
  if (infoEl) infoEl.style.display = 'none';
  document.querySelectorAll('.arrow-hint').forEach(el => el.style.display = 'none');

  // --- Clean up previous race HUD/elements ---
  const oldHud = document.getElementById('race-hud');
  if (oldHud) oldHud.remove();

  // --- Level screen with loading bar ---
  const levelScreen = document.createElement('div');
  levelScreen.id = 'level-screen';
  levelScreen.innerHTML = `
    <div class="level-number">${level.label}</div>
    <div class="level-name">${level.name}</div>
    <div class="loading-area">
      <div class="loading-header">
        <span class="loading-label">LOADING...</span>
        <span class="loading-pct" id="loading-pct">0%</span>
      </div>
      <div class="loading-bar-outer">
        <div class="loading-bar-inner" id="loading-bar"></div>
      </div>
    </div>
  `;
  const levelStyle = document.createElement('style');
  levelStyle.textContent = `
    #level-screen {
      position: fixed;
      inset: 0;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 1;
      transition: opacity 0.8s ease-out;
    }
    #level-screen .level-number {
      font-family: 'Courier New', monospace;
      font-size: 4rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    #level-screen .level-name {
      font-family: 'Courier New', monospace;
      font-size: 1.8rem;
      font-weight: 300;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.2em;
      margin-top: 12px;
    }
    .loading-area {
      margin-top: 50px;
      width: 400px;
    }
    .loading-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .loading-label, .loading-pct {
      font-family: 'Courier New', monospace;
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffcc00;
      letter-spacing: 0.15em;
    }
    .loading-bar-outer {
      width: 100%;
      height: 28px;
      border: 3px solid #ffcc00;
      background: #000;
      padding: 3px;
    }
    .loading-bar-inner {
      height: 100%;
      width: 0%;
      background: #ffcc00;
      transition: width 0.2s ease-out;
    }
  `;
  document.head.appendChild(levelStyle);
  document.body.appendChild(levelScreen);

  const loadingBar = document.getElementById('loading-bar');
  const loadingPct = document.getElementById('loading-pct');
  let loadProgress = 0;
  const TOTAL_STEPS = 8;
  const STEP_DELAY = 250; // minimum ms per step so bar is visible
  async function advanceLoading() {
    loadProgress++;
    const pct = Math.round((loadProgress / TOTAL_STEPS) * 100);
    loadingBar.style.width = `${pct}%`;
    loadingPct.textContent = `${pct}%`;
    // Ensure browser repaints and user sees the bar animate
    await new Promise(r => setTimeout(r, STEP_DELAY));
  }

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(level.skyColor);
  scene.fog = new THREE.FogExp2(level.skyColor, level.fogDensity);

  // --- Skybox ---
  const skyTex = new THREE.TextureLoader().load(level.skyboxImage);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyCylGeo = new THREE.CylinderGeometry(900, 900, 1200, 64, 1, true);
  const skyCylMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyCylinder = new THREE.Mesh(skyCylGeo, skyCylMat);
  skyCylinder.renderOrder = -1;
  skyCylinder.position.y = 50;
  scene.add(skyCylinder);

  // --- Camera (behind-car perspective) ---
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 2000);

  // --- Lighting ---
  const ambientIntensity = levelIndex === 2 ? 0.3 : 0.6;
  const hemiGroundColor = levelIndex === 0 ? 0x88aa66 : (levelIndex === 1 ? 0x886644 : 0x444466);
  scene.add(new THREE.AmbientLight(0xffffff, ambientIntensity));
  scene.add(new THREE.HemisphereLight(0xffffff, hemiGroundColor, 0.8));

  const sunColor = levelIndex === 1 ? 0xffccaa : (levelIndex === 2 ? 0xccccff : 0xfff5e6);
  const sun = new THREE.DirectionalLight(sunColor, 2.0);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);

  // --- Ground plane ---
  const groundGeo = new THREE.PlaneGeometry(3000, 3000);
  const bgGrassTex = new THREE.TextureLoader().load(level.groundTexture);
  bgGrassTex.wrapS = THREE.RepeatWrapping;
  bgGrassTex.wrapT = THREE.RepeatWrapping;
  bgGrassTex.repeat.set(200, 200);
  bgGrassTex.colorSpace = THREE.SRGBColorSpace;
  const groundMat = new THREE.MeshStandardMaterial({ map: bgGrassTex, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = level.groundY;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Build track ---
  const trackPoints = level.buildTrack();
  const curve = createTrackCurve(trackPoints);
  await advanceLoading(); // 1: track

  // --- GLTF Loader (shared for trees and cars) ---
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  // --- Build scene elements ---

  // Landscape
  const mountains = createMountains(level.mountainColors);
  scene.add(mountains);

  const terrain = createTerrainAlongTrack(curve, level.terrainTexture);
  terrain.receiveShadow = true;
  scene.add(terrain);
  await advanceLoading(); // 2: terrain

  // Road surface and markings
  const road = createRoadMesh(curve, level.roadColor);
  road.receiveShadow = true;
  scene.add(road);

  const edgeLines = createEdgeLines(curve, level.edgeLineColor);
  scene.add(edgeLines);

  const centerLine = createCenterLine(curve, level.centerLineColor);
  scene.add(centerLine);

  const finishLine = createFinishLine(curve);
  scene.add(finishLine);
  await advanceLoading(); // 3: road & markings

  // Scenery assets (trees & houses only on levels that have them)
  if (level.hasTrees) {
    const trees = await createTrees(curve, gltfLoader);
    scene.add(trees);
  }
  await advanceLoading(); // 4: scenery

  if (level.hasHouses) {
    const houses = await createHouses(curve, gltfLoader);
    scene.add(houses);
  }

  // Mars/Moon: add rocks instead of trees/houses
  if (!level.hasTrees) {
    const rocks = await createRocks(curve, levelIndex, gltfLoader);
    scene.add(rocks);
  }
  await advanceLoading(); // 5: more scenery

  // --- Environment map for car reflections ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x87ceeb);
  const envL1 = new THREE.DirectionalLight(0xffffff, 2);
  envL1.position.set(0, 1, 0);
  envScene.add(envL1);
  const envL2 = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1);
  envScene.add(envL2);
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();
  await advanceLoading(); // 6: environment

  // --- Load car models ---
  function loadCar(file) {
    return new Promise((resolve) => {
      gltfLoader.load(file, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.5 / maxDim;
        model.position.set(-center.x, -box.min.y, -center.z);

        // Wrap in group so rotation/position is clean
        const group = new THREE.Group();
        group.add(model);
        group.scale.setScalar(scale);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        resolve(group);
      });
    });
  }

  const [playerModel, opponent1Model, opponent2Model] = await Promise.all([
    loadCar(playerCarFile),
    loadCar(opponent1Car.file),
    loadCar(opponent2Car.file),
  ]);
  await advanceLoading(); // 7: car models

  scene.add(playerModel);
  scene.add(opponent1Model);
  scene.add(opponent2Model);
  await advanceLoading(); // 8: done

  // --- HUD ---
  const hud = createHUD();
  const hudSpeed = document.getElementById('hud-speed-val');
  const hudLap = document.getElementById('hud-lap-val');
  const hudPos = document.getElementById('hud-pos-val');
  const hudThrottle = document.getElementById('hud-throttle-bar');
  const hudCountdown = document.getElementById('hud-countdown');
  const hudMessage = document.getElementById('hud-message');

  // --- Game audio ---
  const audio = createGameAudio();

  // --- Game state ---
  const MAX_SPEED = 2.2;
  const ACCEL = 0.015;
  const BRAKE_FORCE = 0.025;
  const FRICTION = 0.004;
  const STEER_SPEED = 0.0015;
  const MAX_LANE_OFFSET = ROAD_WIDTH / 2 - 1.5;

  const player = {
    trackT: 0,          // 0-1 position along track
    laneOffset: 0,      // lateral offset
    speed: 0,
    lap: 1,
    lastT: 0,
    finished: false,
  };

  const opponent1 = {
    trackT: 0,
    laneOffset: LANE_OFFSET * 0.6,
    speed: 0,
    lap: 1,
    lastT: 0,
    targetSpeed: MAX_SPEED * 0.85,
    finished: false,
    steerTimer: 0,
    targetLane: LANE_OFFSET * 0.6,
  };

  const opponent2 = {
    trackT: 0,
    laneOffset: -LANE_OFFSET * 0.6,
    speed: 0,
    lap: 1,
    lastT: 0,
    targetSpeed: MAX_SPEED * 0.82,
    finished: false,
    steerTimer: 0,
    targetLane: -LANE_OFFSET * 0.6,
  };

  const keys = {};
  const onKeyDown = (e) => { keys[e.code] = true; };
  const onKeyUp = (e) => { keys[e.code] = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);
  onResize();

  // --- Place car on track ---
  function getTrackTransform(t, laneOffset) {
    const tt = ((t % 1) + 1) % 1;
    const pos = curve.getPointAt(tt);
    const tangent = curve.getTangentAt(tt).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    return {
      position: new THREE.Vector3(
        pos.x + right.x * laneOffset,
        pos.y - 2.3,
        pos.z + right.z * laneOffset
      ),
      tangent,
      right,
    };
  }

  function placeCarOnTrack(carModel, t, laneOffset) {
    const { position, tangent } = getTrackTransform(t, laneOffset);
    carModel.position.copy(position);
    const lookTarget = position.clone().add(tangent);
    carModel.lookAt(lookTarget);
  }

  // --- Countdown ---
  let countdownDone = false;
  let raceOver = false;

  async function doCountdown() {
    // Ensure audio context is resumed after async delays
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
    for (let i = 3; i >= 1; i--) {
      hudCountdown.textContent = i;
      hudCountdown.className = 'show';
      audio.playBeep(440, 0.3);
      await new Promise(r => setTimeout(r, 700));
      hudCountdown.className = '';
      await new Promise(r => setTimeout(r, 300));
    }
    hudCountdown.textContent = 'GO!';
    hudCountdown.className = 'show go';
    audio.playBeep(880, 0.5);
    audio.startEngine();
    countdownDone = true;

    // Restart background music quietly
    if (window.bgMusic) {
      window.bgMusic.volume = 0.15;
      window.bgMusic.currentTime = 0;
      window.bgMusic.play().catch(() => {});
    }
    await new Promise(r => setTimeout(r, 1000));
    hudCountdown.className = '';
    hudCountdown.textContent = '';
  }

  // --- Main game loop ---
  const clock = new THREE.Clock();
  let animFrameId;

  function updatePlayer(dt) {
    if (!countdownDone || player.finished) return;

    // Acceleration
    if (keys['ArrowUp'] || keys['KeyW']) {
      player.speed = Math.min(player.speed + ACCEL, MAX_SPEED);
    } else if (keys['ArrowDown'] || keys['KeyS']) {
      player.speed = Math.max(player.speed - BRAKE_FORCE, 0);
    } else {
      player.speed = Math.max(player.speed - FRICTION, 0);
    }

    // Steering
    if (keys['ArrowLeft'] || keys['KeyA']) {
      player.laneOffset -= STEER_SPEED * (80 + player.speed * 200);
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      player.laneOffset += STEER_SPEED * (80 + player.speed * 200);
    }
    player.laneOffset = THREE.MathUtils.clamp(player.laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);

    // Move along track
    player.lastT = player.trackT;
    const curveLen = curve.getLength();
    player.trackT += player.speed / curveLen;

    // Lap detection
    if (player.trackT >= 1 && player.lastT < 1) {
      player.trackT -= 1;
      player.lastT -= 1;
      player.lap++;
      audio.playLapSound();
      if (player.lap > LAPS_TO_WIN) {
        player.finished = true;
      }
    }

    placeCarOnTrack(playerModel, player.trackT, player.laneOffset);
    audio.updateEngine(player.speed, MAX_SPEED);
  }

  function updateOpponent(dt, opp, model) {
    if (!countdownDone || opp.finished) return;

    // Speed up unfinished opponents after race is over so podium doesn't take forever
    if (raceOver) {
      opp.speed = Math.min(opp.speed + ACCEL * 2, MAX_SPEED);
      opp.lastT = opp.trackT;
      const curveLen = curve.getLength();
      opp.trackT += opp.speed / curveLen;
      if (opp.trackT >= 1 && opp.lastT < 1) {
        opp.trackT -= 1;
        opp.lastT -= 1;
        opp.lap++;
        if (opp.lap > LAPS_TO_WIN) opp.finished = true;
      }
      placeCarOnTrack(model, opp.trackT, opp.laneOffset);
      return;
    }

    // AI: vary speed slightly, sometimes speed up/slow down
    opp.steerTimer -= dt;
    if (opp.steerTimer <= 0) {
      opp.steerTimer = 1 + Math.random() * 2;
      opp.targetSpeed = MAX_SPEED * (0.78 + Math.random() * 0.15);
      opp.targetLane = (Math.random() - 0.5) * ROAD_WIDTH * 0.5;
    }

    // Smooth speed adjustment
    if (opp.speed < opp.targetSpeed) {
      opp.speed = Math.min(opp.speed + ACCEL * 0.8, opp.targetSpeed);
    } else {
      opp.speed = Math.max(opp.speed - FRICTION * 2, opp.targetSpeed);
    }

    // Smooth lane change
    const laneDiff = opp.targetLane - opp.laneOffset;
    opp.laneOffset += laneDiff * 0.02;

    // Move along track
    opp.lastT = opp.trackT;
    const curveLen = curve.getLength();
    opp.trackT += opp.speed / curveLen;

    if (opp.trackT >= 1 && opp.lastT < 1) {
      opp.trackT -= 1;
      opp.lastT -= 1;
      opp.lap++;
      if (opp.lap > LAPS_TO_WIN) {
        opp.finished = true;
      }
    }

    placeCarOnTrack(model, opp.trackT, opp.laneOffset);
  }

  // --- Collision detection between all cars ---
  const CAR_LENGTH_T = 6 / curve.getLength(); // ~6 units along track
  const CAR_WIDTH = 2.5; // lateral collision width
  const PUSH_BACK_SPEED = 0.3;
  const PUSH_SIDE = 0.15;

  function checkCollisions() {
    const cars = [
      { state: player, model: playerModel, isPlayer: true },
      { state: opponent1, model: opponent1Model, isPlayer: false },
      { state: opponent2, model: opponent2Model, isPlayer: false },
    ];

    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i].state;
        const b = cars[j].state;

        // Track distance (handle wrap-around)
        let dT = a.trackT - b.trackT;
        if (dT > 0.5) dT -= 1;
        if (dT < -0.5) dT += 1;

        const trackDist = Math.abs(dT) * curve.getLength();
        const laneDist = Math.abs(a.laneOffset - b.laneOffset);

        if (trackDist < CAR_LENGTH_T * curve.getLength() && laneDist < CAR_WIDTH) {
          // Collision! Push cars apart

          // Along-track push: slower car gets slowed, faster car gets slight boost
          const speedDiff = a.speed - b.speed;
          if (dT > 0) {
            // a is ahead of b
            a.speed = Math.min(a.speed + PUSH_BACK_SPEED * 0.3, MAX_SPEED);
            b.speed = Math.max(b.speed - PUSH_BACK_SPEED, 0);
          } else {
            // b is ahead of a
            b.speed = Math.min(b.speed + PUSH_BACK_SPEED * 0.3, MAX_SPEED);
            a.speed = Math.max(a.speed - PUSH_BACK_SPEED, 0);
          }

          // Lateral push: push cars away from each other
          const lateralDir = a.laneOffset > b.laneOffset ? 1 : -1;
          const overlap = CAR_WIDTH - laneDist;
          a.laneOffset += lateralDir * overlap * 0.5;
          b.laneOffset -= lateralDir * overlap * 0.5;

          // Clamp lane offsets
          a.laneOffset = THREE.MathUtils.clamp(a.laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
          b.laneOffset = THREE.MathUtils.clamp(b.laneOffset, -MAX_LANE_OFFSET, MAX_LANE_OFFSET);
        }
      }
    }
  }

  function updateCamera() {
    const { position, tangent, right } = getTrackTransform(player.trackT, player.laneOffset);

    // Fixed offset behind and above the player car — no lerp, stays locked
    const camOffset = tangent.clone().multiplyScalar(-6).add(new THREE.Vector3(0, 3, 0));
    camera.position.copy(position).add(camOffset);

    const lookAt = position.clone().add(tangent.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookAt);

    // Keep skybox centered on camera so it appears at infinity
    skyCylinder.position.x = camera.position.x;
    skyCylinder.position.z = camera.position.z;

    // Move sun with player
    sun.position.copy(position).add(new THREE.Vector3(50, 80, 30));
    sun.target.position.copy(position);
    sun.target.updateMatrixWorld();
  }

  function updateHUD() {
    const speedKmh = Math.round(player.speed / MAX_SPEED * 320);
    hudSpeed.textContent = speedKmh;

    hudLap.textContent = Math.min(player.lap, LAPS_TO_WIN);

    // Position: who's ahead on the track (accounting for laps)
    const playerProgress = (player.lap - 1) + player.trackT;
    const opp1Progress = (opponent1.lap - 1) + opponent1.trackT;
    const opp2Progress = (opponent2.lap - 1) + opponent2.trackT;
    let pos = 1;
    if (opp1Progress > playerProgress) pos++;
    if (opp2Progress > playerProgress) pos++;
    hudPos.textContent = pos;
    hudPos.style.color = pos === 1 ? '#4f4' : '#f44';

    // Throttle bar
    const throttle = (keys['ArrowUp'] || keys['KeyW']) ? player.speed / MAX_SPEED * 100 : 0;
    hudThrottle.style.width = `${Math.max(throttle, player.speed / MAX_SPEED * 60)}%`;
  }

  function getRankings() {
    // Compute race progress for each car
    const cars = [
      { state: player, model: playerModel, label: 'YOU' },
      { state: opponent1, model: opponent1Model, label: 'OPPONENT 1' },
      { state: opponent2, model: opponent2Model, label: 'OPPONENT 2' },
    ];
    cars.sort((a, b) => {
      const progressA = (a.state.lap - 1) + a.state.trackT;
      const progressB = (b.state.lap - 1) + b.state.trackT;
      return progressB - progressA; // highest progress first
    });
    return cars.map((c, i) => ({ model: c.model, label: c.label, place: i + 1 }));
  }

  function cleanupRace() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    hud.remove();
  }

  let podiumTriggered = false;
  let finishOrder = []; // track actual order cars finish in

  function checkRaceEnd() {
    if (podiumTriggered) return;

    // Record finish order as each car crosses the line
    if (player.finished && !finishOrder.find(f => f.label === 'YOU')) {
      finishOrder.push({ model: playerModel, label: 'YOU' });
    }
    if (opponent1.finished && !finishOrder.find(f => f.label === 'OPPONENT 1')) {
      finishOrder.push({ model: opponent1Model, label: 'OPPONENT 1' });
    }
    if (opponent2.finished && !finishOrder.find(f => f.label === 'OPPONENT 2')) {
      finishOrder.push({ model: opponent2Model, label: 'OPPONENT 2' });
    }

    const allFinished = player.finished && opponent1.finished && opponent2.finished;

    // Detect first finisher for win/lose message
    if (!raceOver && finishOrder.length > 0) {
      if (finishOrder[0].label === 'YOU') {
        raceOver = true;
        audio.stopEngine();
        audio.playBeep(880, 0.3);
        setTimeout(() => audio.playBeep(1100, 0.5), 300);

        if (levelIndex < LEVELS.length - 1) {
          hudMessage.textContent = 'YOU WIN!';
          hudMessage.style.color = '#4f4';
        } else {
          hudMessage.textContent = 'YOU WIN THE GAME!';
          hudMessage.style.color = '#4f4';
        }
      } else {
        raceOver = true;
        hudMessage.textContent = 'YOU LOSE!';
        hudMessage.style.color = '#f44';
        audio.stopEngine();
        audio.playBeep(220, 0.5);
      }
    }

    // Keep opponents running until all finish
    if (!allFinished) return;

    // All 3 cars have finished — show podium or advance
    podiumTriggered = true;

    const playerWon = finishOrder[0].label === 'YOU';

    if (playerWon && levelIndex < LEVELS.length - 1) {
      // Player won and more levels remain — advance
      hudMessage.textContent = 'NEXT LEVEL...';
      hudMessage.style.color = '#ff4';
      setTimeout(() => {
        cleanupRace();
        startRace(renderer, playerCarFile, allCarFiles, levelIndex + 1);
      }, 2500);
    } else {
      // Show podium (final level win, or any loss)
      setTimeout(() => {
        const rankings = finishOrder.map((f, i) => ({ model: f.model, label: f.label, place: i + 1 }));
        cleanupRace();
        showPodium(renderer, gltfLoader, rankings);
      }, 2000);
    }
  }

  function gameLoop() {
    animFrameId = requestAnimationFrame(gameLoop);
    const dt = Math.min(clock.getDelta(), 0.05);

    updatePlayer(dt);
    updateOpponent(dt, opponent1, opponent1Model);
    updateOpponent(dt, opponent2, opponent2Model);
    checkCollisions();
    // Re-place cars after collision adjustments
    placeCarOnTrack(playerModel, player.trackT, player.laneOffset);
    placeCarOnTrack(opponent1Model, opponent1.trackT, opponent1.laneOffset);
    placeCarOnTrack(opponent2Model, opponent2.trackT, opponent2.laneOffset);
    updateCamera();
    updateHUD();
    checkRaceEnd();

    renderer.render(scene, camera);
  }

  // --- Start ---
  // Place cars at start
  placeCarOnTrack(playerModel, 0, 0);
  placeCarOnTrack(opponent1Model, 0.005, LANE_OFFSET);
  placeCarOnTrack(opponent2Model, 0.005, -LANE_OFFSET);
  player.laneOffset = 0;

  // Initial camera
  const initTransform = getTrackTransform(0, 0);
  camera.position.copy(initTransform.position).add(
    initTransform.tangent.clone().multiplyScalar(-6)
  ).add(new THREE.Vector3(0, 3, 0));
  camera.lookAt(initTransform.position);

  // Start render loop (renders behind level screen)
  clock.start();
  gameLoop();

  // Render one frame, then fade out level screen to reveal race
  await new Promise(r => requestAnimationFrame(r));
  renderer.render(scene, camera);
  await new Promise(r => setTimeout(r, 500));
  levelScreen.style.opacity = '0';
  await new Promise(r => setTimeout(r, 800));
  levelScreen.remove();

  // Countdown after level screen is gone
  setTimeout(() => doCountdown(), 300);
}
