import {math, Scene, CameraFlightAnimation, CameraControl} from "../xeogl/xeogl.module.js";

/**
 * The WebGL-based 3D Viewer class at the heart of the xeokit SDK.
 *
 * A Viewer wraps a single  <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>.
 *
 * Add {@link Plugin}s to a Viewer to extend its functionality.
 *
 * Save and load the state of a Viewer as JSON with {@link Viewer#getBookmark} and {@link Viewer#setBookmark}. Installed
 * {@link Plugin} instances will also save and load their state to and from the JSON.
 *
 * @public
 */
class Viewer {

    constructor(cfg) {

        /**
         * Metadata about this Viewer.
         *
         * @property meta
         * @type {{system: string}}
         */
        this.meta = {
            systemId: "xeoviewer.org",
            authoring_tool: "xeoviewer.org"
        };

        /**
         * Subscriptions to events sent with {@link fire}.
         * @private
         */
        this._eventSubs = {};

        /**
         * The Viewer's <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>.
         *
         * @property scene
         * @type {xeogl.Scene}
         */
        this.scene = new Scene({
            canvas: cfg.canvasId,
            webgl2: false,
            contextAttr: {preserveDrawingBuffer: true},
            transparent: !!cfg.transparent,
            gammaInput: true,
            gammaOutput: true
        });

        /**
         * The Viewer's <a href="http://xeogl.org/docs/classes/CameraFlightAnimation.html">xeogl.CameraFlightAnimation</a>, which
         * is used to fly the <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>'s <a href="http://xeogl.org/docs/classes/Camera.html">xeogl.Camera</a> to given targets.
         *
         * @property cameraFlight
         * @type {xeogl.CameraFlightAnimation}
         */
        this.cameraFlight = new CameraFlightAnimation(this.scene, {
            fitFOV: 45,
            duration: 0.1
        });

        /**
         * The Viewer's <a href="http://xeogl.org/docs/classes/CameraControl.html">xeogl.CameraControl</a>, which
         * controls the <a href="http://xeogl.org/docs/classes/Scene.html">xeogl.Scene</a>'s <a href="http://xeogl.org/docs/classes/Camera.html">xeogl.Camera</a> with mouse,  touch and keyboard input.
         *
         * @property cameraControl
         * @type {xeogl.CameraControl}
         */
        this.cameraControl = new CameraControl(this.scene, {});

        /**
         * {@link Plugin}s that have been installed into this Viewer, mapped to their IDs.
         *
         * @property plugins
         * @type {{string:Plugin}}
         */
        this.plugins = {};
    }

    /**
     * Subscribes to an event fired at this Viewer.
     *
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     */
    on(event, callback) {
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = [];
            this._eventSubs[event] = subs;
        }
        subs.push(callback);
    }

    /**
     * Fires an event at this Viewer.
     *
     * @param {String} event Event name
     * @param {Object} value Event parameters
     */
    fire(event, value) {
        const subs = this._eventSubs[event];
        if (subs) {
            for (let i = 0, len = subs.length; i < len; i++) {
                subs[i](value);
            }
        }
    }

    /**
     * Logs a message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The message
     */
    log(msg) {
        console.log(`[xeoviewer viewer ${this.id}]: ${msg}`);
    }

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The error message
     */
    error(msg) {
        console.error(`[xeoviewer viewer ${this.id}]: ${msg}`);
    }

    /**
     * Installs a Plugin.
     *
     * @private
     */
    addPlugin(plugin) {
        if (this.plugins[plugin.id]) {
            this.error(`Plugin with this ID already installed: ${plugin.id}`);
        }
        this.plugins[plugin.id] = plugin;
        this.log(`Installed plugin: ${plugin.id}`);
    }

    /**
     * Uninstalls a Plugin, clearing content from it first.
     *
     * @private
     */
    removePlugin(plugin) {
        const installedPlugin = this.plugins[plugin.id];
        if (!installedPlugin) {
            this.error(`Can't remove plugin - no plugin with this ID is installed: ${plugin.id}`);
            return;
        }
        if (!installedPlugin !== plugin) {
            this.error(`Can't remove plugin - a different plugin is installed with this ID: ${plugin.id}`);
            return;
        }
        if (installedPlugin.clear) {
            installedPlugin.clear();
        }
        delete this.plugins[id];
        this.log(`Removed plugin: ${plugin.id}`);
    }

    /**
     * Sends a message to installed Plugins.
     *
     * The message can optionally be accompanied by a value.
     * @private
     */
    sendToPlugins(name, value) {
        const plugins = this.plugins;
        for (const id in plugins) {
            if (plugins.hasOwnProperty(id)) {
                plugins[id].send(name, value);
            }
        }
    }

    /**
     * Clears content from this Viewer and all installed {@link Plugin}s.
     */
    clear() {
        this.sendToPlugins("clear");
    }

    /**
     * Resets viewing state.
     *
     * Sends a "resetView" message to each installed {@link Plugin}.
     */
    resetView() {
        this.sendToPlugins("resetView");

        // TODO
        // this.show();
        // this.hide("space");
        // this.hide("DEFAULT");
    }

    /**
     * Gets a JSON bookmark that captures the state of the Viewer and all installed {@link Plugin}s.
     *
     * @returns {*} The bookmark
     */
    getBookmark() {

        const vecToArray = math.vecToArray;
        const bookmark = {};
        let id;
        let model;
        let modelState;
        let position;
        let scale;
        let rotation;
        let object;
        let objectState;

        /*
         // Save object states that have non-default properties

         const objectStates = [];
         for (id in this.scene.entities) {
         if (this.scene.entities.hasOwnProperty(id)) {
         object = this.scene.entities[id];
         objectState = null;
         position = getPosition(object);
         if (position) {
         objectState = objectState || {id};
         objectState.position = position;
         }
         scale = getScale(object);
         if (scale) {
         objectState = objectState || {id};
         objectState.scale = scale;
         }
         rotation = getRotation(object);
         if (rotation) {
         objectState = objectState || {id};
         objectState.rotation = rotation;
         }
         if (!object.visible) {
         objectState = objectState || {id};
         objectState.visible = false;
         }
         if (object.outlined) {
         objectState = objectState || {id};
         objectState.outlined = true;
         }
         if (!object.clippable) {
         objectState = objectState || {id};
         objectState.clippable = false;
         }
         if (!object.pickable) {
         objectState = objectState || {id};
         objectState.pickable = false;
         }
         if (!object.pickable) {
         objectState = objectState || {id};
         objectState.pickable = false;
         }
         if (objectState) {
         objectStates.push(objectState);
         }
         }
         }
         if (objectStates.length > 0) {
         bookmark.objects = objectStates;
         }

         const camera = this.camera;

         bookmark.lookat = {
         eye: vecToArray(camera.eye),
         look: vecToArray(camera.look),
         up: vecToArray(camera.up),
         worldZUp: worldZUp === true
         };

         // Save other viewer properties that have non-default values

         if (camera.gimbalLock !== true) {
         bookmark.gimbalLock = camera.gimbalLock;
         }

         if (camera.projection !== "perspective") {
         bookmark.projection = camera.projection;
         }

         if (camera.perspective.near !== 0.1) {
         bookmark.perspectiveNear = camera.perspective.near;
         }

         if (camera.perspective.far !== 10000.0) {
         bookmark.perspectiveFar = camera.perspective.far;
         }

         if (camera.perspective.fov !== 60.0) {
         bookmark.perspectiveFOV = camera.perspective.fov;
         }

         if (camera.ortho.near !== 0.1) {
         bookmark.orthoNear = camera.ortho.near;
         }

         if (camera.ortho.far !== 10000.0) {
         bookmark.orthoFar = camera.ortho.far;
         }

         if (camera.ortho.scale !== 1.0) {
         bookmark.orthoScale = camera.ortho.scale;
         }

         bookmark.viewFitFOV = this.cameraFlight.fitFOV;
         bookmark.viewFitDuration = this.cameraFlight.duration;
         */
        // Save plugin states

        for (const pluginId in this.plugins) {
            if (this.plugins.hasOwnProperty(pluginId)) {
                const plugin = this.plugins[pluginId];
                if (plugin.writeBookmark) {
                    plugin.writeBookmark(bookmark);
                }
            }
        }

        return bookmark;
    }

    /**
     * Restores the Viewer and all installed {@link Plugin}s to the state captured in the given JSON bookmark.
     *
     * @param {*} bookmark
     */
    setBookmark(bookmark) {

        for (const pluginId in this.plugins) {
            if (this.plugins.hasOwnProperty(pluginId)) {
                const plugin = this.plugins[pluginId];
                if (plugin.readBookmark) {
                    plugin.readBookmark(bookmark);
                }
            }
        }
    }

    getSnapshot(params = {}, ok) {
        return this.scene.canvas.getSnapshot({
            width: params.width, // Defaults to size of canvas
            height: params.height,
            format: params.format || "png" // Options are "jpeg" (default), "png" and "bmp"
        }, ok);
    }

    destroy() {

    }
}

function getPosition(object) {
    const position = object.position;
    if (position[0] !== 0 || position[1] !== 0 || position[2] !== 0) {
        return vecToArray(position);
    }
}

function getScale(object) {
    const scale = object.scale;
    if (scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) {
        return vecToArray(scale);
    }
}

function getRotation(object) {
    const rotation = object.rotation;
    if (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0) {
        return vecToArray(rotation);
    }
}

export {Viewer}