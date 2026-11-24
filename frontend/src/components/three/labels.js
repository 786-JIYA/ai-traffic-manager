import * as THREE from "three";

const WIDTH = 640;
const HEIGHT = 160;
const DISPLAY_FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

const roundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/** Creates an always-camera-facing sprite that can be redrawn with drawLabel(). */
export function createLabel(worldWidth = 6) {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(worldWidth, (worldWidth * HEIGHT) / WIDTH, 1);
    sprite.renderOrder = 20;
    sprite.userData.canvas = canvas;
    sprite.userData.texture = texture;

    return sprite;
}

/**
 * Draws a label. `plain` labels are text only (axis ticks); the default is a
 * dark chip with an optional coloured badge on the right.
 */
export function drawLabel(
    sprite,
    { title = "", badge = "", badgeColor = "#6f87a3", plain = false, align = "center" } = {}
) {
    const { canvas, texture } = sprite.userData;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.textBaseline = "middle";

    if (plain) {
        ctx.font = `600 64px ${DISPLAY_FONT}`;
        ctx.fillStyle = "#9db3cb";
        ctx.textAlign = align;
        const x = align === "left" ? 24 : align === "right" ? WIDTH - 24 : WIDTH / 2;
        ctx.fillText(title, x, HEIGHT / 2 + 2);
        texture.needsUpdate = true;
        return;
    }

    ctx.fillStyle = "rgba(12, 22, 34, 0.88)";
    roundedRect(ctx, 8, 24, WIDTH - 16, HEIGHT - 48, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(142, 166, 191, 0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = `600 58px ${DISPLAY_FONT}`;
    ctx.fillStyle = "#eaf1f8";
    ctx.fillText(title, 40, HEIGHT / 2 + 2);

    if (badge) {
        ctx.font = `600 42px ${DISPLAY_FONT}`;
        const textWidth = ctx.measureText(badge).width;
        const pillWidth = textWidth + 44;
        const pillX = WIDTH - 32 - pillWidth;

        ctx.fillStyle = badgeColor;
        roundedRect(ctx, pillX, HEIGHT / 2 - 31, pillWidth, 62, 31);
        ctx.fill();

        ctx.fillStyle = "#08121c";
        ctx.textAlign = "center";
        ctx.fillText(badge, pillX + pillWidth / 2, HEIGHT / 2 + 3);
    }

    texture.needsUpdate = true;
}
