// app.js
// Behavior:
// - Draw cable between RouterPort -> Plug (always)
// - On tap Plug: snap Plug to RazPort and set RazPort green + update text
// - On second tap: unplug (return to original spot) + set RazPort yellow

AFRAME.registerComponent('plug-controller', {
  init: function () {
    this.isConnected = false;

    // Cache entities
    this.marker = document.querySelector('#marker');
    this.plug = document.querySelector('#plug');
    this.razPort = document.querySelector('#razPort');
    this.statusText = document.querySelector('#statusText');

    // Remember original plug position (local to rig)
    // We will read from the first child box, but easier: set plug entity position on itself
    // Plug entity has default position (0 0 0). We'll treat child geometry positions as relative.
    // So we will move the *plug entity* by setting its position.
    this.originalPos = new THREE.Vector3(0, 0, 0); // plug entity default
    this.originalRot = new THREE.Euler(0, 0, 0);

    // Set an initial offset for plug entity so it is visible nicely
    // (So we can "move" it later as a whole)
    this.plug.object3D.position.set(0, 0, 0);

    // Where to snap when connected (local position near RazPort)
    // We'll compute live from razPort world position, but need local to rig.
    // Simpler: just snap to a fixed local position that aligns visually.
    this.connectedLocalPos = new THREE.Vector3(0.02, 0.0, -0.02); // relative offset near razPort area (rig space)

    // Make plug clickable: add raycaster cursor for mobile tap (A-Frame uses click events)
    // We'll just listen to click event. On mobile, tapping object triggers click if cursor/raycaster exists.
    // A-Frame camera without cursor may not trigger click on mobile, so we add a hidden cursor to camera.
    const cam = document.querySelector('[camera]');
    if (cam && !cam.querySelector('[cursor]')) {
      const cursor = document.createElement('a-entity');
      cursor.setAttribute('cursor', 'rayOrigin: mouse; fuse: false');
      cursor.setAttribute('raycaster', 'objects: #plug');
      cursor.setAttribute('position', '0 0 -0.1');
      cam.appendChild(cursor);
    }

    this.el.addEventListener('click', () => this.toggle());
    this.setDisconnectedUI();
  },

  toggle: function () {
    this.isConnected = !this.isConnected;
    if (this.isConnected) this.connect();
    else this.disconnect();
  },

  connect: function () {
    // Move plug entity closer to RazPort visually
    this.el.object3D.position.copy(this.connectedLocalPos);

    // Change RazPort color to green
    this.razPort.setAttribute('material', 'color', '#19d36b');
    this.razPort.setAttribute('material', 'emissive', '#0f6b3a');
    this.razPort.setAttribute('material', 'emissiveIntensity', 0.35);

    // Update status
    this.statusText.setAttribute('value', 'Status: CONNECTED');
  },

  disconnect: function () {
    // Return plug
    this.el.object3D.position.copy(this.originalPos);

    // RazPort back to yellow
    this.setDisconnectedUI();
  },

  setDisconnectedUI: function () {
    this.razPort.setAttribute('material', 'color', '#f1c232');
    this.razPort.setAttribute('material', 'emissive', '#2b2100');
    this.razPort.setAttribute('material', 'emissiveIntensity', 0.15);
    this.statusText.setAttribute('value', 'Status: NOT CONNECTED');
  }
});

AFRAME.registerComponent('cable-line', {
  init: function () {
    this.routerPort = document.querySelector('#routerPort');
    this.plug = document.querySelector('#plug');

    // Create THREE.Line
    const geom = new THREE.BufferGeometry();
    const points = new Float32Array(6); // 2 points * 3
    geom.setAttribute('position', new THREE.BufferAttribute(points, 3));

    const mat = new THREE.LineBasicMaterial({ color: 0xff8a00 });
    this.line = new THREE.Line(geom, mat);
    this.el.object3D.add(this.line);

    this.p1 = new THREE.Vector3();
    this.p2 = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
  },

  tick: function () {
    if (!this.routerPort || !this.plug) return;

    // World positions
    this.routerPort.object3D.getWorldPosition(this.p1);

    // Plug cable attach point:
    // Use plug's first child box world position as approx plug body
    const plugBox = this.plug.querySelector('a-box');
    if (plugBox) plugBox.object3D.getWorldPosition(this.p2);
    else this.plug.object3D.getWorldPosition(this.p2);

    // Convert world -> local for this line object's space
    // Since line is attached under marker rig, easiest is:
    // - Put line under scene root and use world coords directly
    // But our line is under <a-entity id="cable"> under marker, so we need to convert.
    const parent = this.el.object3D;
    parent.worldToLocal(this.tmp.copy(this.p1));
    const a = this.tmp.clone();
    parent.worldToLocal(this.tmp.copy(this.p2));
    const b = this.tmp.clone();

    const pos = this.line.geometry.attributes.position.array;
    pos[0] = a.x; pos[1] = a.y; pos[2] = a.z;
    pos[3] = b.x; pos[4] = b.y; pos[5] = b.z;
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.geometry.computeBoundingSphere();
  }
});