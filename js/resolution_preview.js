
import { app } from "../../scripts/app.js";

const ASPECT_RATIOS = {
    "32:9 (Super Ultrawide)": [32, 9],
    "21:9 (Ultrawide)": [21, 9],
    "16:9 (Widescreen)": [16, 9],
    "16:10 (WUXGA)": [16, 10],
    "5:4 (5:4 Standard)": [5, 4],
    "4:3 (Standard)": [4, 3],
    "3:2 (Photo)": [3, 2],
    "1:1 (Square)": [1, 1],
    "2:3 (Portrait Photo)": [2, 3],
    "3:4 (Portrait Standard)": [3, 4],
    "4:5 (Portrait 5:4 Standard)": [4, 5],
    "10:16 (Portrait WUXGA)": [10, 16],
    "9:16 (Portrait Widescreen)": [9, 16],
    "9:21 (Portrait Ultrawide)": [9, 21],
    "9:32 (Portrait Super Ultrawide)": [9, 32],
};

const PIXEL_BUDGETS = {
    "240p": 240,
    "360p": 360,
    "480p": 480,
    "544p": 544,
    "640p": 640,
    "720p": 720,
    "768p": 768,
    "864p": 864,
    "1024p": 1024,
    "1080p": 1080,
    "1200p": 1200,
    "1440p": 1440,
    "1600p": 1600,
    "1800p": 1800,
    "2160p": 2160,
    "2400p": 2400,
    "2880p": 2880,
    "3200p": 3200,
    "3456p": 3456,
    "4320p": 4320,
};

function roundDown(value, multiple) {
    return Math.floor(value / multiple) * multiple;
}

app.registerExtension({
    name: "ResolutionTools.ResolutionPreviews",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        const supportedNodes = [
            "ResolutionFromPixelBudget",
            "ResolutionFromMegapixels",
            "ResolutionFromDimensions",
        ];

        if (!supportedNodes.includes(nodeData.name)) {
            return;
        }

        const originalCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            originalCreated?.apply(this, arguments);

            const node = this;

            // Prevent duplicate previews on the same node instance.
            if (node._resolutionPreviewCreated) {
                return;
            }
            node._resolutionPreviewCreated = true;

            // Minimal, text-only display.
            const container = document.createElement("div");

            container.style.cssText = `
                padding: 0;
                margin: 0;
                text-align: center;
                font-size: 12px;
                font-weight: normal;
                line-height: 14px;
                color: var(--fg-color, #ddd);
                background: transparent;
                border: none;
                white-space: nowrap;
            `;

            container.textContent = "resolution: -- × --";

            node.addDOMWidget(
                "resolution_preview",
                "div",
                container,
                {
                    serialize: false,
                    hideOnZoom: false,

                    getValue() {
                        return null;
                    },

                    getHeight() {
                        return 14;
                    },
                }
            );

            function updatePreview() {
                const widgets = node.widgets ?? [];

                function get(name) {
                    return widgets.find(
                        widget => widget.name === name
                    )?.value;
                }

                const multiple = Number(get("multiple"));

                if (!Number.isFinite(multiple) || multiple < 1) {
                    container.textContent = "resolution: -- × --";
                    return;
                }

                let width;
                let height;

                // ---------------------------------------------
                // ResolutionFromPixelBudget
                // ---------------------------------------------
                if (nodeData.name === "ResolutionFromPixelBudget") {
                    const ratio = ASPECT_RATIOS[get("aspect_ratio")];
                    const budget = PIXEL_BUDGETS[get("pixelbudget")];

                    if (!ratio || !budget) {
                        container.textContent = "resolution: -- × --";
                        return;
                    }

                    const [aspectWidth, aspectHeight] = ratio;

                    const pixels = budget * budget * 16 / 9;

                    width = roundDown(
                        Math.sqrt(
                            pixels * aspectWidth / aspectHeight
                        ),
                        multiple
                    );

                    height = roundDown(
                        width * aspectHeight / aspectWidth,
                        multiple
                    );
                }

                // ---------------------------------------------
                // ResolutionFromMegapixels
                // ---------------------------------------------
                else if (
                    nodeData.name === "ResolutionFromMegapixels"
                ) {
                    const ratio = ASPECT_RATIOS[get("aspect_ratio")];
                    const megapixels = Number(get("megapixels"));

                    if (
                        !ratio ||
                        !Number.isFinite(megapixels) ||
                        megapixels <= 0
                    ) {
                        container.textContent = "resolution: -- × --";
                        return;
                    }

                    const [aspectWidth, aspectHeight] = ratio;

                    width = roundDown(
                        Math.sqrt(
                            megapixels * 1024 * 1024 *
                            aspectWidth / aspectHeight
                        ),
                        multiple
                    );

                    height = roundDown(
                        width * aspectHeight / aspectWidth,
                        multiple
                    );
                }

                // ---------------------------------------------
                // ResolutionFromDimensions
                // ---------------------------------------------
                else if (
                    nodeData.name === "ResolutionFromDimensions"
                ) {
                    const inputWidth = Number(get("width"));
                    const inputHeight = Number(get("height"));
                    const budget = PIXEL_BUDGETS[get("pixelbudget")];

                    if (
                        !Number.isFinite(inputWidth) ||
                        !Number.isFinite(inputHeight) ||
                        inputWidth <= 0 ||
                        inputHeight <= 0 ||
                        !budget
                    ) {
                        container.textContent = "resolution: -- × --";
                        return;
                    }

                    const scale = Math.sqrt(
                        (
                            budget * budget * 16 / 9
                        ) / (inputHeight * inputWidth)
                    );

                    width = roundDown(
                        inputWidth * scale,
                        multiple
                    );

                    height = roundDown(
                        inputHeight * scale,
                        multiple
                    );
                }

                container.textContent =
                    `resolution: ${width} × ${height}`;

                node.setDirtyCanvas(true, true);
            }

            // Refresh the preview when any relevant widget changes.
            const relevantWidgets = [
                "aspect_ratio",
                "megapixels",
                "pixelbudget",
                "multiple",
                "width",
                "height",
            ];

            for (const widget of node.widgets ?? []) {
                if (!relevantWidgets.includes(widget.name)) {
                    continue;
                }

                // Update after the standard widget callback.
                const originalCallback = widget.callback;

                widget.callback = function () {
                    if (originalCallback) {
                        originalCallback.apply(this, arguments);
                    }

                    updatePreview();
                };

                // Also update when a numeric widget is edited directly.
                const originalInput = widget.input;

                if (typeof originalInput === "function") {
                    widget.input = function () {
                        const result = originalInput.apply(this, arguments);
                        updatePreview();
                        return result;
                    };
                }
            }


            const originalWidgetChanged = node.onWidgetChanged;

            node.onWidgetChanged = function (
                widgetName,
                value,
                oldValue,
                widget
            ) {
                if (originalWidgetChanged) {
                    originalWidgetChanged.apply(this, arguments);
                }
            
                // Refresh the preview after any relevant widget changes.
                updatePreview();
            };

            // Refresh when a saved workflow is loaded.
            const originalConfigure = node.onConfigure;			

            node.onConfigure = function () {
                if (originalConfigure) {
                    originalConfigure.apply(this, arguments);
                }

                updatePreview();
            };

            updatePreview();

            // Keep the node as compact as possible.
            node.setSize(node.computeSize());
        };
    },
});
