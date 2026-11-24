import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const disposeScene = (scene) => {
    scene.traverse((object) => {
        object.geometry?.dispose?.();

        const materials = Array.isArray(object.material)
            ? object.material
            : object.material
                ? [object.material]
                : [];

        materials.forEach((material) => {
            Object.values(material).forEach((value) => {
                if (value && value.isTexture) value.dispose();
            });
            material.dispose();
        });
    });
};

/**
 * Owns the WebGL renderer, camera, orbit controls, resize + visibility handling
 * and cleanup so each 3D view only has to describe its scene.
 *
 * `build(ctx)` runs once on mount and returns an api object:
 *   { update?(dt, elapsed), onResize?(w, h), dispose?(), ...anything else }
 * The returned api is exposed through `apiRef` so React props can be pushed in.
 */
export default function useThreeScene(build, options = {}) {
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const buildRef = useRef(build);
    const optionsRef = useRef(options);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const opts = optionsRef.current;
        const reduceMotion = prefersReducedMotion();

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
            });
        } catch {
            setFailed(true);
            return undefined;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const canvas = renderer.domElement;
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(opts.background ?? 0x0f1b2a);

        const camera = new THREE.PerspectiveCamera(opts.fov ?? 38, 1, 0.1, 300);
        camera.position.set(...(opts.cameraPosition ?? [22, 19, 22]));

        const controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.target.set(...(opts.target ?? [0, 0, 0]));
        controls.minDistance = opts.minDistance ?? 12;
        controls.maxDistance = opts.maxDistance ?? 80;
        controls.maxPolarAngle = opts.maxPolarAngle ?? Math.PI / 2.1;
        controls.update();

        // Keep one-finger vertical swipes scrolling the page on touch screens.
        canvas.style.touchAction = "pan-y";

        const baseFov = camera.fov;
        const minAspect = opts.minAspect ?? 1.45;

        const ctx = {
            THREE,
            scene,
            camera,
            renderer,
            controls,
            container,
            canvas,
            reduceMotion,
        };

        const api = buildRef.current(ctx) || {};
        apiRef.current = api;

        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (!width || !height) return;

            renderer.setSize(width, height, false);
            camera.aspect = width / height;

            // Keep the same horizontal coverage on narrow screens by widening the FOV.
            const baseRad = THREE.MathUtils.degToRad(baseFov);
            const widened =
                2 * Math.atan(Math.tan(baseRad / 2) * Math.max(1, minAspect / camera.aspect));
            camera.fov = Math.min(THREE.MathUtils.radToDeg(widened), 80);
            camera.updateProjectionMatrix();

            api.onResize?.(width, height);
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let visible = true;
        const visibilityObserver = new IntersectionObserver(
            (entries) => {
                visible = entries[0]?.isIntersecting ?? true;
            },
            { threshold: 0 }
        );
        visibilityObserver.observe(container);

        let frame = 0;
        let last = performance.now();
        let elapsed = 0;

        const tick = (now) => {
            frame = requestAnimationFrame(tick);

            if (!visible || document.hidden) {
                last = now;
                return;
            }

            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            elapsed += dt;

            api.update?.(dt, elapsed);
            controls.update();
            renderer.render(scene, camera);
        };

        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            visibilityObserver.disconnect();
            api.dispose?.();
            controls.dispose();
            disposeScene(scene);
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
            apiRef.current = null;
        };
    }, []);

    return { containerRef, apiRef, failed };
}
