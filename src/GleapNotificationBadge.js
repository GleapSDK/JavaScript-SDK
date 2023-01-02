/**
 * Add notification badge (pill) to favicon in browser tab
 * @url stackoverflow.com/questions/65719387/
 */
export default class GleapNotificationBadge {
    constructor(options) {
        Object.assign(
            this, {
            backgroundColor: "#f00",
            color: "#fff",
            size: 0.6,
            position: "se",
            radius: 8,
            src: "",
            onChange() { },
        },
            options
        );
        this.canvas = document.createElement("canvas");
        this.src = this.src || this.faviconEL.getAttribute("href");
        this.ctx = this.canvas.getContext("2d");
    }

    faviconEL = document.querySelector("link[rel$=icon]");

    _drawIcon() {
        this.ctx.clearRect(0, 0, this.faviconSize, this.faviconSize);
        this.ctx.drawImage(this.img, 0, 0, this.faviconSize, this.faviconSize);
    }

    _drawShape() {
        const r = this.radius;
        const xa = this.offset.x;
        const ya = this.offset.y;
        const xb = this.offset.x + this.badgeSize;
        const yb = this.offset.y + this.badgeSize;
        this.ctx.beginPath();
        this.ctx.moveTo(xb - r, ya);
        this.ctx.quadraticCurveTo(xb, ya, xb, ya + r);
        this.ctx.lineTo(xb, yb - r);
        this.ctx.quadraticCurveTo(xb, yb, xb - r, yb);
        this.ctx.lineTo(xa + r, yb);
        this.ctx.quadraticCurveTo(xa, yb, xa, yb - r);
        this.ctx.lineTo(xa, ya + r);
        this.ctx.quadraticCurveTo(xa, ya, xa + r, ya);
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fill();
        this.ctx.closePath();
    }

    _drawVal() {
        const margin = (this.badgeSize * 0.18) / 2;
        this.ctx.beginPath();
        this.ctx.textBaseline = "middle";
        this.ctx.textAlign = "center";
        this.ctx.font = `bold ${this.badgeSize * 0.82}px Arial`;
        this.ctx.fillStyle = this.color;
        this.ctx.fillText(this.value, this.badgeSize / 2 + this.offset.x, this.badgeSize / 2 + this.offset.y + margin);
        this.ctx.closePath();
    }

    _drawFavicon() {
        try {
            this.faviconEL.setAttribute("href", this.dataURL);
        } catch (e) {
            console.log(e);
        }
    }

    _draw() {
        this._drawIcon();
        if (this.value) this._drawShape();
        if (this.value) this._drawVal();
        this._drawFavicon();
    }

    _setup() {
        this.faviconSize = this.img.naturalWidth;
        this.badgeSize = this.faviconSize * this.size;
        this.canvas.width = this.faviconSize;
        this.canvas.height = this.faviconSize;
        const sd = this.faviconSize - this.badgeSize;
        const sd2 = sd / 2;
        this.offset = {
            n: { x: sd2, y: 0 },
            e: { x: sd, y: sd2 },
            s: { x: sd2, y: sd },
            w: { x: 0, y: sd2 },
            nw: { x: 0, y: 0 },
            ne: { x: sd, y: 0 },
            sw: { x: 0, y: sd },
            se: { x: sd, y: sd },
        }[this.position];
    }

    // Public functions / methods:
    update() {
        this._value = Math.min(99, parseInt(this._value, 10));
        if (this.img) {
            this._draw();
            if (this.onChange) this.onChange.call(this);
        } else {
            this.img = new Image();
            this.img.addEventListener("load", () => {
                this._setup();
                this._draw();
                if (this.onChange) this.onChange.call(this);
            });
            this.img.src = this.src;
        }
    }

    get dataURL() {
        return this.canvas.toDataURL();
    }

    get value() {
        return this._value;
    }

    set value(val) {
        try {
            this._value = val;
            this.update();
        } catch (e) {
            console.log(e);
        }
    }
}