import { app } from "../../scripts/app.js";

const ASPECT_RATIOS = {
    "16:3 (ThirdHeight)": [16, 3],
    "32:9 (Super Ultrawide/HalfHeight)": [32, 9],
    "21:9 (Ultrawide)": [21, 9],
    "16:9 (Widescreen)": [16, 9],
    "16:10 (WUXGA)": [16, 10],
    "3:2 (Photo)": [3, 2],
    "4:3 (Standard)": [4, 3],
    "5:4 (5:4 Standard)": [5, 4],
    "1:1 (Square)": [1, 1],
    "8:9 (HalfWidth)": [8, 9],
    "4:5 (Portrait 5:4 Standard)": [4, 5],
    "3:4 (Portrait Standard)": [3, 4],
    "2:3 (Portrait Photo)": [2, 3],
    "10:16 (Portrait WUXGA)": [10, 16],
    "16:27 (ThirdWidth)": [16, 27],
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
    "680p": 680,
    "720p": 720,
    "768p": 768,
    "864p": 864,
    "1024p": 1024,
    "1080p": 1080,
    "1200p": 1200,
    "1280p": 1280,
    "1360p": 1360,
    "1440p": 1440,
    "1620p": 1620,
    "1800p": 1800,
    "2160p": 2160,
    "2400p": 2400,
    "2880p": 2880,
    "3072p": 3072,
    "3160p": 2880,
    "3200p": 3200,
    "3384p": 3384,
    "3456p": 3456,
    "4096p": 4096,
    "4320p": 4320,
};

function roundDown(value, multiple) {
    return Math.floor(value / multiple) * multiple;
}

// ---------------------------------------------------------
// Upstream connection configuration
// ---------------------------------------------------------

const UPSTREAM_CONNECTIONS = {
    ResolutionFromMegapixels: {
        aspect_ratio: ["AspectRatioSelector", "AspectRatioFromImage"],
        megapixels: ["AspectRatioFromImage"],
    },

    ResolutionFromDimensions: {
        pixelbudget: ["PixelBudgetSelector", "AspectRatioFromImage"],
    },

    ResolutionFromPixelBudget: {
        aspect_ratio: ["AspectRatioSelector", "AspectRatioFromImage"],
        pixelbudget: ["PixelBudgetSelector", "AspectRatioFromImage"],
    },

    ResolutionCalculator: {
        pixelbudget: ["PixelBudgetSelector", "AspectRatioFromImage"],
    },

    AspectRatioFromImage: {
        pixelbudget: ["PixelBudgetSelector", "AspectRatioFromImage"],
    },
};

app.registerExtension({
    name: "ResolutionTools.ResolutionPreviews",

    async beforeRegisterNodeDef(nodeType, nodeData) {

        const supportedNodes = Object.keys(UPSTREAM_CONNECTIONS);

        if (!supportedNodes.includes(nodeData.name)) {
            return;
        }

        const originalCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {

            originalCreated?.apply(this, arguments);

            const node = this;

            if (node._resolutionPreviewCreated) {
                return;
            }

            node._resolutionPreviewCreated = true;

            // -------------------------------------------------
            // Preview widget
            // -------------------------------------------------

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

            // -------------------------------------------------
            // Receive calculated resolution from Python
            // -------------------------------------------------

            const originalExecuted = node.onExecuted;

            node.onExecuted = function (message) {

                originalExecuted?.apply(this, arguments);

                // Cache values calculated by Python.
                node._resolutionPreviewValues = {
                    aspect_ratio: message?.aspect_ratio?.[0],
                    pixelbudget: message?.pixelbudget?.[0],
                    megapixels: message?.megapixels?.[0],
                };

                const resolution = message?.resolution?.[0];

                if (typeof resolution === "string" && resolution.length > 0) {
                    container.textContent = `resolution: ${resolution}`;
                } else {
                    container.textContent = "resolution: -- × --";
                }

                node.setDirtyCanvas(true, true);

                // -------------------------------------------------
                // Notify downstream nodes that calculated values
                // have changed.
                // -------------------------------------------------

                for (const targetNode of node.graph?._nodes ?? []) {

                    if (!targetNode._updateResolutionPreview) {
                        continue;
                    }

                    const connectedInputs = targetNode.inputs ?? [];

                    const isConnected = connectedInputs.some(input => {

                        if (input.link == null) {
                            return false;
                        }

                        const link = node.graph.links?.[input.link];

                        return link?.origin_id === node.id;
                    });

                    if (isConnected) {
                        targetNode._updateResolutionPreview();
                    }
                }
            };

            // -------------------------------------------------
            // Read widget values, including connected inputs
            // -------------------------------------------------

            function get(name) {

                const slot = node.inputs?.findIndex(
                    input => input.name === name
                );

                if (slot !== undefined && slot >= 0 &&
                    node.isInputConnected(slot)) {

                    const link = node.getInputLink(slot);

                    if (!link) {
                        return undefined;
                    }

                    const connectedNode = node.graph.getNodeById(
                        link.origin_id
                    );

                    if (!connectedNode) {
                        return undefined;
                    }

                    // First: calculated values from Python.
                    const calculatedValue =
                        connectedNode._resolutionPreviewValues?.[name];

                    if (calculatedValue !== undefined &&
                        calculatedValue !== null) {
                        return calculatedValue;
                    }

                    // Second: values from selector widgets.
                    const connectedWidget =
                        connectedNode.widgets?.find(
                            widget => widget.name === name
                        );

                    if (connectedWidget) {
                        return connectedWidget.value;
                    }

                    // Connected input, but no value available yet.
                    return undefined;
                }

                // Only use local widgets when the input is unconnected.
                return node.widgets?.find(
                    widget => widget.name === name
                )?.value;
            }

            // -------------------------------------------------
            // Update preview
            // -------------------------------------------------

            function updatePreview() {

                const multiple = Number(get("multiple"));
				
                if (!Number.isFinite(multiple) || multiple < 1) {
                    container.textContent = "resolution: -- × --";
                    return;
                }

                let width;
                let height;

                // ResolutionFromPixelBudget
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

                // ResolutionFromMegapixels
                else if (nodeData.name === "ResolutionFromMegapixels") {

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

                    width = roundDown( Math.sqrt(megapixels * 1024 * 1024 * aspectWidth / aspectHeight), multiple );
                    height = roundDown( width * aspectHeight / aspectWidth, multiple );
                }

                // ResolutionFromDimensions
                else if (nodeData.name === "ResolutionFromDimensions") {

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

                    const scale = Math.sqrt( (budget * budget * 16 / 9) / (inputHeight * inputWidth) );

                    width = roundDown(inputWidth * scale, multiple);
                    height = roundDown(inputHeight * scale, multiple);
                }

                // ResolutionCalculator
                else if (nodeData.name === "ResolutionCalculator") {

                    // Actual resolution will be received from Python
                    // after node execution.
                    container.textContent = "resolution: -- × --";

                    node.setDirtyCanvas(true, true);
                    return;
                }

                // AspectRatioFromImage
                else if (nodeData.name === "AspectRatioFromImage") {

                    // Actual resolution will be received from Python
                    // after node execution.
                    container.textContent = "resolution: -- × --";

                    node.setDirtyCanvas(true, true);
                    return;
                }

                container.textContent =
                    `resolution: ${width} × ${height}`;

                node.setDirtyCanvas(true, true);
            }


            // -------------------------------------------------
            // Remove existing upstream listeners
            // -------------------------------------------------

            function removeUpstreamListeners() {

                for (const subscription of
                    node._resolutionPreviewSubscriptions ?? []) {

                    subscription.widget
                        ._resolutionPreviewListeners
                        ?.delete(node);
                }

                node._resolutionPreviewSubscriptions = [];
            }

            // -------------------------------------------------
            // Generic upstream listener
            // -------------------------------------------------

            function setupUpstreamListener() {

                // Always rebuild subscriptions from the actual
                // current connections.

                removeUpstreamListeners();

                const connections = UPSTREAM_CONNECTIONS[nodeData.name];

                for (const [inputName, sourceNodeType] of
                    Object.entries(connections)) {

                    const input = node.inputs?.find(
                        input => input.name === inputName
                    );

                    if (!input || input.link == null) {
                        continue;
                    }

                    const link = node.graph?.links?.[input.link];

                    if (!link) {
                        continue;
                    }

                    const sourceNode = node.graph.getNodeById(
                        link.origin_id
                    );

                    if (
                        !sourceNode ||
                        sourceNode.type !== sourceNodeType
                    ) {
                        continue;
                    }

                    const sourceWidget = sourceNode.widgets?.find(
                        widget => widget.name === inputName
                    );

                    if (!sourceWidget) {
                        continue;
                    }

                    // Install the callback only once per source widget.

                    if (!sourceWidget._resolutionPreviewListeners) {

                        sourceWidget._resolutionPreviewListeners =
                            new Set();

                        const originalCallback = sourceWidget.callback;

                        sourceWidget.callback = function () {

                            originalCallback?.apply(this, arguments);

                            // Use a copy because invalid subscriptions
                            // may be removed while iterating.

                            for (const targetNode of [
                                ...sourceWidget._resolutionPreviewListeners
                            ]) {

                                // Remove deleted or disconnected nodes.

                                if (
                                    !targetNode.graph ||
                                    !targetNode._updateResolutionPreview
                                ) {
                                    sourceWidget._resolutionPreviewListeners
                                        .delete(targetNode);

                                    continue;
                                }

                                const targetInput =
                                    targetNode.inputs?.find(
                                        input => input.name === inputName
                                    );

                                const targetLink =
                                    targetInput?.link != null
                                        ? targetNode.graph.links?.[
                                            targetInput.link
                                        ]
                                        : null;

                                // Verify that the connection still points
                                // to this particular selector.

                                if (
                                    !targetLink ||
                                    targetLink.origin_id !== sourceNode.id
                                ) {
                                    sourceWidget._resolutionPreviewListeners
                                        .delete(targetNode);

                                    continue;
                                }

                                targetNode._updateResolutionPreview?.();
                            }
                        };
                    }

                    // Store the actual node object, not just its ID.

                    sourceWidget._resolutionPreviewListeners.add(node);

                    // Keep track of subscriptions owned by this node.

                    if (!node._resolutionPreviewSubscriptions) {
                        node._resolutionPreviewSubscriptions = [];
                    }

                    node._resolutionPreviewSubscriptions.push({
                        widget: sourceWidget,
                        sourceNode,
                        inputName,
                    });
                }
            }

            // -------------------------------------------------
            // Delayed initialization / workflow loading
            // -------------------------------------------------

            function schedulePreviewRefresh() {

                // Wait for the current graph configuration to finish.
                // Two animation frames give LiteGraph time to restore
                // widgets, connections and their values.

                requestAnimationFrame(() => {

                    requestAnimationFrame(() => {

                        setupUpstreamListener();
                        updatePreview();

                    });

                });
            }

            // -------------------------------------------------
            // Local widget callbacks
            // -------------------------------------------------

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

                const originalCallback = widget.callback;

                widget.callback = function () {

                    originalCallback?.apply(this, arguments);

                    updatePreview();
                };

                const originalInput = widget.input;

                if (typeof originalInput === "function") {

                    widget.input = function () {

                        const result = originalInput.apply(this, arguments);

                        updatePreview();

                        return result;
                    };
                }
            }

            // -------------------------------------------------
            // Widget changes
            // -------------------------------------------------

            const originalWidgetChanged = node.onWidgetChanged;

            node.onWidgetChanged = function () {

                originalWidgetChanged?.apply(this, arguments);

                updatePreview();
            };


            // -------------------------------------------------
            // Node removal
            // -------------------------------------------------

            const originalRemoved = node.onRemoved;

            node.onRemoved = function () {

                removeUpstreamListeners();

                originalRemoved?.apply(this, arguments);
            };

            // -------------------------------------------------
            // Workflow loading
            // -------------------------------------------------

            const originalConfigure = node.onConfigure;

            node.onConfigure = function () {

                originalConfigure?.apply(this, arguments);

                schedulePreviewRefresh();
            };


            // -------------------------------------------------
            // Connection changes
            // -------------------------------------------------

            const originalConnectionsChange = node.onConnectionsChange;

            node.onConnectionsChange = function () {

                originalConnectionsChange?.apply(this, arguments);

                schedulePreviewRefresh();
            };

            // -------------------------------------------------
            // Initial setup
            // -------------------------------------------------

            node._updateResolutionPreview = updatePreview;

            schedulePreviewRefresh();

            node.setSize(node.computeSize());
        };
    },
});