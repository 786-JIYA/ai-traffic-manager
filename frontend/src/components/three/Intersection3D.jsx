import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import useThreeScene from "./useThreeScene";
import { createLabel, drawLabel } from "./labels";
import {
    APPROACHES,
    LEVEL_COLORS,
    levelFromWaiting,
} from "../../utils/traffic";

/* ------------------------------------------------------------------ *
 * World layout (1 unit is roughly one metre)
 * ------------------------------------------------------------------ */
const ARM = 20; // length of each road arm from the centre
const ROAD_HALF = 3.2; // half width of the carriageway
const STOP = 4.9; // stop-line distance from the centre
const CAR_GAP = 1.5;
const MAX_MOVING = 4;
const FONT_FACE = '600 58px "Barlow Condensed"';

const ANGLED_VIEW = new THREE.Vector3(24, 20, 24);
const TOP_VIEW = new THREE.Vector3(0.01, 58, 0.01);

const LAMP_COLORS = { red: 0xff3b30, yellow: 0xffb224, green: 0x2bd985 };
const CARPET = {
    green: { color: 0x3ddc97, opacity: 0.24 },
    yellow: { color: 0xffb224, opacity: 0.24 },
    red: { color: 0xff5a52, opacity: 0.1 },
    off: { color: 0x000000, opacity: 0 },
};

// Slip road: runs up the south arm's outer edge and curves east around the corner.
const SLIP_CENTER = 7.0;
const SLIP_RADIUS = SLIP_CENTER - 4.3;
const slipArc = Array.from({ length: 7 }, (_, i) => {
    const phi = Math.PI + (i / 6) * (Math.PI / 2);
    return [
        SLIP_CENTER + SLIP_RADIUS * Math.cos(phi),
        SLIP_CENTER + SLIP_RADIUS * Math.sin(phi),
    ];
});

// Left-hand traffic: every inbound lane keeps to the left of its direction of travel.
const LANE_DEFS = {
    top_center: {
        points: [[1.6, -ARM], [1.6, ARM]],
        stopS: ARM - STOP,
        side: [1, 0],
        poleOffset: 2.1,
        poleBase: 0.3,
        laneWidth: 3.0,
    },
    left_side: {
        points: [[-ARM, -1.6], [ARM, -1.6]],
        stopS: ARM - STOP,
        side: [0, -1],
        poleOffset: 2.1,
        poleBase: 0.3,
        laneWidth: 3.0,
    },
    right_side: {
        points: [[ARM, 1.6], [-ARM, 1.6]],
        stopS: ARM - STOP,
        side: [0, 1],
        poleOffset: 2.1,
        poleBase: 0,
        laneWidth: 3.0,
    },
    bottom_left: {
        points: [[-1.6, ARM], [-1.6, -ARM]],
        stopS: ARM - STOP,
        side: [-1, 0],
        poleOffset: 2.1,
        poleBase: 0.3,
        laneWidth: 3.0,
    },
    bottom_right_slip: {
        points: [[4.3, ARM], ...slipArc, [ARM, 4.3]],
        stopS: ARM - SLIP_CENTER,
        side: [1, 0],
        poleOffset: 1.3,
        poleBase: 0,
        laneWidth: 1.7,
    },
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const mulberry32 = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makePath = (points) => {
    const pts = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const lengths = [];
    let total = 0;

    for (let i = 0; i < pts.length - 1; i += 1) {
        const length = pts[i].distanceTo(pts[i + 1]);
        lengths.push(length);
        total += length;
    }

    return {
        length: total,
        // Writes the position into `out` and returns the heading (rotation about Y).
        sample(s, out) {
            let remaining = THREE.MathUtils.clamp(s, 0, total);
            let i = 0;

            while (i < lengths.length - 1 && remaining > lengths[i]) {
                remaining -= lengths[i];
                i += 1;
            }

            const a = pts[i];
            const b = pts[i + 1];
            const t = lengths[i] ? remaining / lengths[i] : 0;
            out.lerpVectors(a, b, t);

            return Math.atan2(b.x - a.x, b.z - a.z);
        },
    };
};

const makeHaloTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const signalToLightState = (signal, laneId) => {
    if (!signal || !signal.state || signal.state === "UNKNOWN") return "off";

    const isActive = signal.active_phase === laneId;
    if (signal.state === "GREEN" && isActive) return "green";
    if (signal.state === "YELLOW" && isActive) return "yellow";
    return "red";
};

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */
function buildIntersection({ scene, camera, controls, reduceMotion }) {
    const disposables = [];
    const track = (item) => {
        disposables.push(item);
        return item;
    };

    let disposed = false;
    let viewTween = null;

    controls.addEventListener("start", () => {
        viewTween = null;
    });

    /* ---- lights and atmosphere ---- */
    scene.fog = new THREE.Fog(0x0f1b2a, 46, 100);

    scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x0f1b2a, 1.15));
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    const sun = new THREE.DirectionalLight(0xffffff, 2.3);
    sun.position.set(16, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4aa3ff, 0.55);
    rim.position.set(-18, 12, -16);
    scene.add(rim);

    /* ---- ground ---- */
    const ground = new THREE.Mesh(
        new THREE.CircleGeometry(80, 64),
        new THREE.MeshStandardMaterial({ color: 0x112033, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(120, 60, 0x1d3652, 0x162a40);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    scene.add(grid);

    /* ---- roads and kerbs ---- */
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x0b141f, roughness: 0.95 });
    const kerbMaterial = new THREE.MeshStandardMaterial({ color: 0x1b3048, roughness: 0.9 });

    const addBox = (w, h, d, x, y, z, material, parent = scene) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    addBox(ARM * 2, 0.1, ROAD_HALF * 2, 0, 0.05, 0, asphalt);
    addBox(ROAD_HALF * 2, 0.1, ARM * 2, 0, 0.05, 0, asphalt);

    // Slip road surface: two straights plus a curve.
    addBox(1.8, 0.1, ARM - SLIP_CENTER, 4.3, 0.05, (ARM + SLIP_CENTER) / 2, asphalt);
    addBox(ARM - SLIP_CENTER, 0.1, 1.8, (ARM + SLIP_CENTER) / 2, 0.05, 4.3, asphalt);

    const slipCurve = new THREE.Mesh(
        new THREE.RingGeometry(SLIP_RADIUS - 0.9, SLIP_RADIUS + 0.9, 24, 1, Math.PI / 2, Math.PI / 2),
        asphalt
    );
    slipCurve.rotation.x = -Math.PI / 2;
    slipCurve.position.set(SLIP_CENTER, 0.1, SLIP_CENTER);
    slipCurve.receiveShadow = true;
    scene.add(slipCurve);

    // Kerb blocks in each corner (the south-east one starts beyond the slip road).
    const corners = [
        { sx: -1, sz: -1, inner: ROAD_HALF },
        { sx: 1, sz: -1, inner: ROAD_HALF },
        { sx: -1, sz: 1, inner: ROAD_HALF },
        { sx: 1, sz: 1, inner: 8.0 },
    ];

    corners.forEach(({ sx, sz, inner }) => {
        const size = ARM - inner;
        addBox(size, 0.3, size, sx * (inner + size / 2), 0.15, sz * (inner + size / 2), kerbMaterial);
    });

    /* ---- buildings (deterministic, so the skyline never jumps) ---- */
    const random = mulberry32(2718);
    const buildingMaterial = track(
        new THREE.MeshStandardMaterial({ color: 0x20384f, roughness: 0.85 })
    );
    const edgeMaterial = track(
        new THREE.LineBasicMaterial({ color: 0x3a5d85, transparent: true, opacity: 0.75 })
    );

    corners.forEach(({ sx, sz }) => {
        const inner = sx === 1 && sz === 1 ? 8.8 : 4.8;
        const outer = ARM - 0.8;
        const cell = (outer - inner) / 3;

        for (let ix = 0; ix < 3; ix += 1) {
            for (let iz = 0; iz < 3; iz += 1) {
                if (random() < 0.2) continue;

                const w = cell * (0.55 + random() * 0.3);
                const d = cell * (0.55 + random() * 0.3);
                const h = 0.8 + random() * 3.6;
                const cx = inner + (ix + 0.5) * cell;
                const cz = inner + (iz + 0.5) * cell;

                const geometry = new THREE.BoxGeometry(w, h, d);
                const building = new THREE.Mesh(geometry, buildingMaterial);
                building.position.set(sx * cx, 0.3 + h / 2, sz * cz);
                building.castShadow = true;
                building.receiveShadow = true;
                building.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial));
                scene.add(building);
            }
        }
    });

    /* ---- road markings (instanced) ---- */
    const paint = new THREE.MeshStandardMaterial({ color: 0xe6edf5, roughness: 0.8 });
    const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.8 });
    const dummy = new THREE.Object3D();

    const dashPlacements = [];
    for (let d = 6.2; d < ARM - 0.5; d += 2.2) {
        dashPlacements.push([0, -d, false], [0, d, false], [-d, 0, true], [d, 0, true]);
    }

    const dashes = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.02, 1),
        yellowPaint,
        dashPlacements.length
    );
    dashPlacements.forEach(([x, z, horizontal], i) => {
        dummy.position.set(x, 0.11, z);
        dummy.scale.set(horizontal ? 1.1 : 0.14, 1, horizontal ? 0.14 : 1.1);
        dummy.updateMatrix();
        dashes.setMatrixAt(i, dummy.matrix);
    });
    scene.add(dashes);

    const zebraOffsets = [-2.75, -1.65, -0.55, 0.55, 1.65, 2.75];
    const zebraPlacements = [];
    zebraOffsets.forEach((o) => {
        zebraPlacements.push([o, -3.8, false], [o, 3.8, false], [-3.8, o, true], [3.8, o, true]);
    });

    const zebra = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.02, 1),
        paint,
        zebraPlacements.length
    );
    zebraPlacements.forEach(([x, z, horizontal], i) => {
        dummy.position.set(x, 0.11, z);
        dummy.scale.set(horizontal ? 1.0 : 0.55, 1, horizontal ? 0.55 : 1.0);
        dummy.updateMatrix();
        zebra.setMatrixAt(i, dummy.matrix);
    });
    scene.add(zebra);

    /* ---- shared vehicle assets ---- */
    const bodyGeometry = track(new THREE.BoxGeometry(0.9, 0.42, 1.9));
    const cabinGeometry = track(new THREE.BoxGeometry(0.76, 0.34, 0.95));
    const glass = track(new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.3, metalness: 0.4 }));
    const bodyMaterials = new Map();

    const bodyMaterial = (hex) => {
        if (!bodyMaterials.has(hex)) {
            bodyMaterials.set(
                hex,
                track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.15 }))
            );
        }
        return bodyMaterials.get(hex);
    };

    const makeCar = (hex) => {
        const car = new THREE.Group();

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial(hex));
        body.position.y = 0.21;
        body.castShadow = true;

        const cabin = new THREE.Mesh(cabinGeometry, glass);
        cabin.position.set(0, 0.59, -0.1);
        cabin.castShadow = true;

        car.add(body, cabin);
        return car;
    };

    /* ---- lanes, signal poles, labels ---- */
    const halo = track(makeHaloTexture());
    const poleMaterial = track(new THREE.MeshStandardMaterial({ color: 0x5b7088, roughness: 0.6, metalness: 0.4 }));
    const housingMaterial = track(new THREE.MeshStandardMaterial({ color: 0x0c141d, roughness: 0.6 }));
    const lampGeometry = track(new THREE.SphereGeometry(0.17, 16, 12));
    const poleGeometry = track(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8));
    const housingGeometry = track(new THREE.BoxGeometry(0.55, 1.55, 0.42));
    const stopLineGeometry = track(new THREE.BoxGeometry(1, 0.02, 0.32));
    const carpetGeometry = track(new THREE.BoxGeometry(1, 0.02, 1));

    const lanes = {};

    APPROACHES.forEach(({ id, name }) => {
        const def = LANE_DEFS[id];
        const path = makePath(def.points);

        const stopPosition = new THREE.Vector3();
        const heading = path.sample(def.stopS, stopPosition);

        // Stop line
        const stopLine = new THREE.Mesh(stopLineGeometry, paint);
        stopLine.position.set(stopPosition.x, 0.11, stopPosition.z);
        stopLine.rotation.y = heading;
        stopLine.scale.x = def.laneWidth;
        scene.add(stopLine);

        // Coloured carpet showing the phase on the approach lane
        const carpetMaterial = track(
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
        );
        const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
        const carpetCenter = new THREE.Vector3();
        path.sample(def.stopS - 3.4, carpetCenter);
        carpet.position.set(carpetCenter.x, 0.115, carpetCenter.z);
        carpet.rotation.y = heading;
        carpet.scale.set(def.laneWidth - 0.4, 1, 6.2);
        scene.add(carpet);

        // Signal pole
        const pole = new THREE.Group();
        pole.position.set(
            stopPosition.x + def.side[0] * def.poleOffset,
            def.poleBase,
            stopPosition.z + def.side[1] * def.poleOffset
        );
        pole.rotation.y = heading;

        const post = new THREE.Mesh(poleGeometry, poleMaterial);
        post.position.y = 1.6;
        post.castShadow = true;

        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 3.45;
        housing.castShadow = true;

        pole.add(post, housing);

        const lamps = {};
        [
            ["red", 3.95],
            ["yellow", 3.45],
            ["green", 2.95],
        ].forEach(([key, y]) => {
            const material = track(
                new THREE.MeshStandardMaterial({
                    color: 0x1b2530,
                    emissive: new THREE.Color(LAMP_COLORS[key]),
                    emissiveIntensity: 0,
                    roughness: 0.4,
                })
            );
            const lamp = new THREE.Mesh(lampGeometry, material);
            lamp.position.set(0, y, -0.25);

            const haloSprite = new THREE.Sprite(
                track(
                    new THREE.SpriteMaterial({
                        map: halo,
                        color: LAMP_COLORS[key],
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                    })
                )
            );
            haloSprite.position.copy(lamp.position);
            haloSprite.scale.setScalar(1.5);
            haloSprite.visible = false;

            pole.add(lamp, haloSprite);
            lamps[key] = { material, halo: haloSprite, color: LAMP_COLORS[key] };
        });
        scene.add(pole);

        // Floating label at the far end of the arm
        const label = createLabel(5.6);
        const labelPosition = new THREE.Vector3();
        path.sample(3, labelPosition);
        label.position.set(labelPosition.x, 3.8, labelPosition.z);
        scene.add(label);

        const queueGroup = new THREE.Group();
        const movingGroup = new THREE.Group();
        scene.add(queueGroup, movingGroup);

        lanes[id] = {
            id,
            name,
            def,
            path,
            stopS: def.stopS,
            maxQueue: Math.floor((def.stopS - 0.75) / CAR_GAP) + 1,
            queueGroup,
            movingGroup,
            moving: [],
            queueCount: 0,
            lamps,
            carpetMaterial,
            label,
            labelState: null,
            light: "off",
            allowed: true,
            traffic: null,
        };
    });

    /* ---- label drawing ---- */
    const redrawLabel = (lane) => {
        const data = lane.traffic;
        const waiting = Number(data?.waiting_vehicles || 0);
        const level = data ? data.congestion_level || levelFromWaiting(waiting) : "none";
        const badge = data ? `${waiting} waiting` : "No data";
        const key = `${badge}|${level}`;

        lane.labelState = key;
        drawLabel(lane.label, {
            title: lane.name,
            badge,
            badgeColor: LEVEL_COLORS[level] || LEVEL_COLORS.none,
        });
    };

    const redrawAllLabels = () => {
        if (disposed) return;
        Object.values(lanes).forEach(redrawLabel);
    };

    Object.values(lanes).forEach(redrawLabel);
    document.fonts?.load?.(FONT_FACE).then(redrawAllLabels).catch(() => { });

    /* ---- public setters ---- */
    let trafficKey = "";

    const rebuildMoving = (lane, count) => {
        while (lane.moving.length > count) {
            const removed = lane.moving.pop();
            lane.movingGroup.remove(removed.mesh);
        }

        while (lane.moving.length < count) {
            const mesh = makeCar(0xd6e7f8);
            mesh.scale.setScalar(0);
            lane.movingGroup.add(mesh);
            lane.moving.push({
                mesh,
                s: Math.random() * lane.path.length * 0.8,
                speed: 5 + Math.random() * 2.5,
            });
        }
    };

    const setTraffic = (trafficMap) => {
        const key = APPROACHES.map(({ id }) => {
            const d = trafficMap?.[id];
            return d
                ? `${d.waiting_vehicles}-${d.moving_vehicles}-${d.congestion_level}`
                : "x";
        }).join("|");

        if (key === trafficKey) return;
        trafficKey = key;

        Object.values(lanes).forEach((lane) => {
            const data = trafficMap?.[lane.id] || null;
            lane.traffic = data;

            const waiting = Number(data?.waiting_vehicles || 0);
            const moving = Number(data?.moving_vehicles || 0);
            const level = data ? data.congestion_level || levelFromWaiting(waiting) : "none";
            const colorHex = new THREE.Color(LEVEL_COLORS[level] || LEVEL_COLORS.none).getHex();

            lane.queueGroup.clear();
            lane.queueCount = Math.min(waiting, lane.maxQueue);

            const position = new THREE.Vector3();
            for (let k = 0; k < lane.queueCount; k += 1) {
                const car = makeCar(colorHex);
                const heading = lane.path.sample(lane.stopS - 0.75 - k * CAR_GAP, position);
                car.position.set(position.x, 0.1, position.z);
                car.rotation.y = heading;
                lane.queueGroup.add(car);
            }

            rebuildMoving(lane, Math.min(moving, MAX_MOVING));
            redrawLabel(lane);
        });
    };

    const setSignal = (signal) => {
        Object.values(lanes).forEach((lane) => {
            const state = signalToLightState(signal, lane.id);
            lane.light = state;
            lane.allowed = state !== "red";

            Object.entries(lane.lamps).forEach(([key, lamp]) => {
                const on = state === key;
                lamp.material.emissiveIntensity = on ? 2.6 : 0;
                lamp.material.color.setHex(on ? lamp.color : 0x1b2530);
                lamp.halo.visible = on;
            });

            const carpet = CARPET[state];
            lane.carpetMaterial.color.setHex(carpet.color);
            lane.carpetMaterial.opacity = carpet.opacity;
        });
    };

    const setView = (view) => {
        viewTween = (view === "top" ? TOP_VIEW : ANGLED_VIEW).clone();
        controls.autoRotate = false;
    };

    /* ---- per-frame animation ---- */
    const position = new THREE.Vector3();

    const update = (dt, elapsed) => {
        if (viewTween) {
            camera.position.lerp(viewTween, 1 - Math.exp(-dt * 5));
            if (camera.position.distanceTo(viewTween) < 0.05) viewTween = null;
        }

        Object.values(lanes).forEach((lane) => {
            // Pulse the active lamp's halo
            if (!reduceMotion) {
                const pulse = 1.5 + Math.sin(elapsed * 3) * 0.12;
                Object.values(lane.lamps).forEach((lamp) => {
                    if (lamp.halo.visible) lamp.halo.scale.setScalar(pulse);
                });
            }

            const tail = lane.stopS - 0.75 - lane.queueCount * CAR_GAP - 0.5;

            lane.moving.forEach((car) => {
                if (!reduceMotion) car.s += car.speed * dt;

                const beforeLine = car.s < lane.stopS + 0.3;

                // Cars that cannot proceed join the back of the queue and are recycled.
                if (!lane.allowed && beforeLine && car.s > tail) {
                    car.s = 0;
                    car.speed = 5 + Math.random() * 2.5;
                }

                if (car.s > lane.path.length) {
                    car.s = 0;
                    car.speed = 5 + Math.random() * 2.5;
                }

                const heading = lane.path.sample(car.s, position);
                car.mesh.position.set(position.x, 0.1, position.z);
                car.mesh.rotation.y = heading;

                let scale = THREE.MathUtils.clamp(car.s / 2, 0, 1);
                scale *= THREE.MathUtils.clamp((lane.path.length - car.s) / 2, 0, 1);
                if (!lane.allowed && beforeLine) {
                    scale *= THREE.MathUtils.clamp((tail - car.s) / 1.5, 0, 1);
                }
                car.mesh.scale.setScalar(scale);
            });
        });
    };

    const dispose = () => {
        disposed = true;
        disposables.forEach((item) => item.dispose?.());
    };

    return { setTraffic, setSignal, setView, update, dispose };
}

/* ------------------------------------------------------------------ *
 * React wrapper
 * ------------------------------------------------------------------ */
const STATE_TEXT = {
    GREEN: "Green",
    YELLOW: "Yellow",
    ALL_RED: "All red",
};

const Intersection3D = ({ traffic, signal, height = null, className = "" }) => {
    const [view, setView] = useState("angled");

    const { containerRef, apiRef, failed } = useThreeScene(buildIntersection, {
        cameraPosition: [ANGLED_VIEW.x, ANGLED_VIEW.y, ANGLED_VIEW.z],
        minDistance: 16,
        maxDistance: 72,
        minAspect: 1.55,
    });

    useEffect(() => {
        apiRef.current?.setTraffic?.(traffic);
    }, [traffic, apiRef]);

    useEffect(() => {
        apiRef.current?.setSignal?.(signal);
    }, [signal, apiRef]);

    useEffect(() => {
        apiRef.current?.setView?.(view);
    }, [view, apiRef]);

    const chip = useMemo(() => {
        if (!signal?.state) return "Signal state unknown";

        const label = STATE_TEXT[signal.state] || signal.state;
        const approach = APPROACHES.find((item) => item.id === signal.active_phase);

        return approach ? `${label}: ${approach.name}` : label;
    }, [signal]);

    const chipTone = signal?.state === "GREEN"
        ? "go"
        : signal?.state === "YELLOW"
            ? "caution"
            : signal?.state
                ? "stop"
                : "idle";

    return (
        <div className={`stage ${className}`} style={height ? { height } : undefined}>
            <div
                className="stage-canvas"
                ref={containerRef}
                role="img"
                aria-label="3D model of the intersection showing queued vehicles and signal states"
            />

            {failed && (
                <div className="stage-fallback">
                    <strong>3D view unavailable</strong>
                    <span>This browser could not start WebGL. The numbers on this page are unaffected.</span>
                </div>
            )}

            <div className="stage-toolbar" role="group" aria-label="Camera view">
                <button
                    type="button"
                    className={view === "angled" ? "on" : ""}
                    aria-pressed={view === "angled"}
                    onClick={() => setView("angled")}
                >
                    Angled
                </button>
                <button
                    type="button"
                    className={view === "top" ? "on" : ""}
                    aria-pressed={view === "top"}
                    onClick={() => setView("top")}
                >
                    Top-down
                </button>
            </div>

            <div className={`stage-chip ${chipTone}`}>
                <span className="stage-chip-dot" />
                {chip}
            </div>

            <ul className="stage-legend" aria-label="Legend">
                <li><span className="swatch low" />Low queue</li>
                <li><span className="swatch medium" />Medium</li>
                <li><span className="swatch high" />High</li>
                <li><span className="swatch moving" />Moving</li>
            </ul>
        </div>
    );
};

export default Intersection3D;
