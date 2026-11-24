import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import useThreeScene from "./useThreeScene";
import { createLabel, drawLabel } from "./labels";
import { formatClock } from "../../utils/traffic";

/* Layout: time runs along X, approaches along Z, waiting vehicles along Y. */
const COLS = 16;
const ROWS = 5;
const STEP_X = 1.25;
const STEP_Z = 1.75;
const BAR_W = 0.85;
const BAR_D = 1.05;
const MAX_H = 7;

const HALF_W = (COLS * STEP_X) / 2;
const HALF_D = (ROWS * STEP_Z) / 2;

const COLOR_LOW = new THREE.Color(0x2fd4a0);
const COLOR_MID = new THREE.Color(0xffb224);
const COLOR_HIGH = new THREE.Color(0xff5a52);
const WHITE = new THREE.Color(0xffffff);

// Colour follows the congestion share (waiting / total), matching the 30% and 60% bands.
const congestionColor = (percent, out) => {
    if (percent <= 30) return out.copy(COLOR_LOW).lerp(COLOR_MID, percent / 30);
    return out.copy(COLOR_MID).lerp(COLOR_HIGH, Math.min(1, (percent - 30) / 30));
};

const niceMax = (value) => Math.max(4, Math.ceil(value / 4) * 4);

const colX = (col) => (col - (COLS - 1) / 2) * STEP_X;
const rowZ = (row) => (row - (ROWS - 1) / 2) * STEP_Z;

function buildBars({ scene, camera, controls, canvas, reduceMotion }, hoverRef) {
    const pointer = new THREE.Vector2();
    const pointerPx = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    let pointerActive = false;
    let pointerMoved = false;
    let lastData = null;
    let hoveredId = -1;
    let frame = 0;

    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.55;
    controls.addEventListener("start", () => {
        controls.autoRotate = false;
    });

    /* ---- lights ---- */
    scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x0f1b2a, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-10, 22, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    /* ---- floor with alternating row stripes ---- */
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(HALF_W * 2 + 9, HALF_D * 2 + 4),
        new THREE.MeshStandardMaterial({ color: 0x122238, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const stripeA = new THREE.MeshStandardMaterial({ color: 0x172b44, roughness: 1 });
    const stripeB = new THREE.MeshStandardMaterial({ color: 0x142639, roughness: 1 });
    const stripeGeometry = new THREE.PlaneGeometry(HALF_W * 2 + 1.4, STEP_Z - 0.18);

    for (let row = 0; row < ROWS; row += 1) {
        const stripe = new THREE.Mesh(stripeGeometry, row % 2 ? stripeB : stripeA);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, rowZ(row));
        stripe.receiveShadow = true;
        scene.add(stripe);
    }

    /* ---- bars ---- */
    const total = COLS * ROWS;
    const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.12 }),
        total
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const current = new Float32Array(total); // animated heights
    const target = new Float32Array(total); // heights we are heading to
    const baseColors = Array.from({ length: total }, () => new THREE.Color(0x2fd4a0));
    const cells = new Array(total).fill(null);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    const index = (col, row) => col * ROWS + row;

    /* ---- axes: back-wall ticks and labels ---- */
    const axisGroup = new THREE.Group();
    scene.add(axisGroup);

    const rowLabels = [];
    for (let row = 0; row < ROWS; row += 1) {
        const label = createLabel(4.6);
        label.position.set(-HALF_W - 3.1, 0.5, rowZ(row));
        scene.add(label);
        rowLabels.push(label);
    }

    const timeLabels = [createLabel(3.4), createLabel(3.4), createLabel(3.4)];
    timeLabels.forEach((label) => {
        label.position.y = 0.15;
        label.position.z = HALF_D + 1.1;
        scene.add(label);
    });

    const tickLabels = [];
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x35557a, transparent: true, opacity: 0.55 });

    const rebuildAxis = (maxValue, scale) => {
        axisGroup.clear();
        tickLabels.length = 0;

        const backZ = -HALF_D - 0.6;
        const points = [];

        for (let i = 0; i <= 4; i += 1) {
            const value = (maxValue / 4) * i;
            const y = value * scale;
            points.push(-HALF_W - 0.4, y, backZ, HALF_W + 0.4, y, backZ);

            const label = createLabel(2.2);
            drawLabel(label, { title: String(Math.round(value)), plain: true, align: "right" });
            label.position.set(-HALF_W - 1.5, y, backZ);
            axisGroup.add(label);
            tickLabels.push(label);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
        axisGroup.add(new THREE.LineSegments(geometry, lineMaterial));
    };

    /* ---- data in ---- */
    const setData = (data) => {
        lastData = data;
        const { columns, approaches } = data;
        const maxWaiting = Math.max(
            0,
            ...columns.flatMap((column) => column.cells.map((cell) => cell.waiting))
        );
        const axisMax = niceMax(maxWaiting);
        const scale = MAX_H / axisMax;
        rebuildAxis(axisMax, scale);

        target.fill(0);
        cells.fill(null);

        columns.slice(-COLS).forEach((column, col) => {
            column.cells.forEach((cell, row) => {
                const i = index(col, row);
                target[i] = cell.waiting * scale;
                congestionColor(cell.percent, baseColors[i]);
                cells[i] = {
                    ...cell,
                    approach: approaches[row]?.name || "",
                    time: column.time,
                };
            });
        });

        approaches.slice(0, ROWS).forEach((approach, row) => {
            drawLabel(rowLabels[row], { title: approach.name, plain: true, align: "right" });
        });

        const used = Math.min(columns.length, COLS);
        const picks = used ? [0, Math.floor((used - 1) / 2), used - 1] : [];
        timeLabels.forEach((label, i) => {
            const col = picks[i];
            const column = col === undefined ? null : columns.slice(-COLS)[col];
            label.visible = Boolean(column) && (i === 0 || picks[i] !== picks[i - 1]);

            if (column) {
                drawLabel(label, { title: formatClock(column.time), plain: true });
                label.position.x = colX(col);
            }
        });
    };

    /* ---- pointer picking ---- */
    const onPointerMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        pointerPx.x = event.clientX - rect.left;
        pointerPx.y = event.clientY - rect.top;
        pointerActive = true;
        pointerMoved = true;
    };
    const onPointerLeave = () => {
        pointerActive = false;
        if (hoveredId !== -1) {
            hoveredId = -1;
            hoverRef.current?.(null);
        }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const pick = () => {
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(mesh, false)[0];
        const id = hit && target[hit.instanceId] > 0.001 ? hit.instanceId : -1;

        if (id !== hoveredId) {
            hoveredId = id;
            hoverRef.current?.(
                id === -1 ? null : { ...cells[id], x: pointerPx.x, y: pointerPx.y }
            );
        } else if (id !== -1 && pointerMoved) {
            hoverRef.current?.({ ...cells[id], x: pointerPx.x, y: pointerPx.y });
        }

        pointerMoved = false;
    };

    const setAutoRotate = (value) => {
        controls.autoRotate = value && !reduceMotion;
    };

    /* ---- frame ---- */
    const update = (dt) => {
        frame += 1;
        const needsPick = pointerMoved || (controls.autoRotate && frame % 6 === 0);
        if (pointerActive && needsPick && frame % 2 === 0) pick();

        const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);

        for (let col = 0; col < COLS; col += 1) {
            for (let row = 0; row < ROWS; row += 1) {
                const i = index(col, row);
                current[i] += (target[i] - current[i]) * ease;

                const height = Math.max(current[i], 0.001);
                dummy.position.set(colX(col), height / 2, rowZ(row));
                dummy.scale.set(BAR_W, height, BAR_D);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                tint.copy(baseColors[i]);
                if (i === hoveredId) tint.lerp(WHITE, 0.4);
                mesh.setColorAt(i, tint);
            }
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    // Repaint the canvas labels once the display font has actually loaded.
    document.fonts
        ?.load?.('600 64px "Barlow Condensed"')
        .then(() => {
            if (lastData) setData(lastData);
        })
        .catch(() => { });

    const dispose = () => {
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        mesh.dispose();
    };

    return { setData, setAutoRotate, update, dispose };
}

/* ------------------------------------------------------------------ *
 * React wrapper
 * ------------------------------------------------------------------ */
const CongestionBars3D = ({ snapshots, approaches, height = 520 }) => {
    const [tooltip, setTooltip] = useState(null);
    const [rotating, setRotating] = useState(true);

    const hoverRef = useRef(null);
    hoverRef.current = setTooltip;

    const { containerRef, apiRef, failed } = useThreeScene(
        (ctx) => buildBars(ctx, hoverRef),
        {
            cameraPosition: [-7, 11.5, 17],
            target: [0, 2.2, 0],
            minDistance: 9,
            maxDistance: 44,
            minAspect: 2,
            maxPolarAngle: Math.PI / 2.15,
        }
    );

    const data = useMemo(() => {
        const columns = snapshots.slice(-COLS).map((snapshot) => ({
            time: snapshot.timestamp,
            cells: approaches.map((approach) => {
                const record = snapshot.records.find(
                    (item) => item.approach_key === approach.id
                );
                const waiting = Number(record?.waiting_vehicles || 0);
                const totalVehicles = Number(record?.total_vehicles || 0);

                return {
                    waiting,
                    total: totalVehicles,
                    percent: totalVehicles ? (waiting / totalVehicles) * 100 : 0,
                };
            }),
        }));

        return { columns, approaches };
    }, [snapshots, approaches]);

    useEffect(() => {
        apiRef.current?.setData?.(data);
    }, [data, apiRef]);

    const toggleRotate = () => {
        const next = !rotating;
        setRotating(next);
        apiRef.current?.setAutoRotate?.(next);
    };

    return (
        <div className="stage stage-bars" style={{ height }}>
            <div
                className="stage-canvas"
                ref={containerRef}
                role="img"
                aria-label="3D bar chart of waiting vehicles by approach over time"
            />

            {failed && (
                <div className="stage-fallback">
                    <strong>3D view unavailable</strong>
                    <span>This browser could not start WebGL. The 2D charts below show the same data.</span>
                </div>
            )}

            <div className="stage-toolbar" role="group" aria-label="Chart controls">
                <button
                    type="button"
                    className={rotating ? "on" : ""}
                    aria-pressed={rotating}
                    onClick={toggleRotate}
                >
                    Auto-rotate
                </button>
            </div>

            <ul className="stage-legend" aria-label="Legend">
                <li><span className="swatch low" />Under 30% waiting</li>
                <li><span className="swatch medium" />30 to 60%</li>
                <li><span className="swatch high" />Over 60%</li>
            </ul>

            {tooltip && (
                <div
                    className="stage-tooltip"
                    style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
                >
                    <strong>{tooltip.approach}</strong>
                    <span>{formatClock(tooltip.time)}</span>
                    <dl>
                        <div><dt>Waiting</dt><dd>{tooltip.waiting}</dd></div>
                        <div><dt>Total</dt><dd>{tooltip.total}</dd></div>
                        <div><dt>Congestion</dt><dd>{tooltip.percent.toFixed(0)}%</dd></div>
                    </dl>
                </div>
            )}
        </div>
    );
};

export default CongestionBars3D;
