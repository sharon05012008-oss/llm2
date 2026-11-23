/**
 * ============================================================================
 * LLMVerse — Interactive 3D Semantic Universe Visualizer (js/universe-3d.js)
 * ============================================================================
 * Builds a luminous Three.js 3D universe of glowing purple, cosmic blue,
 * pink, and gold sentence embedding stars.
 *
 * Features:
 *   - Drag to rotate, scroll/buttons to zoom, Reset view, Auto-Orbit toggle
 *   - Click any star to inspect its sentence label, 3D coordinates, simulated
 *     embedding vector, and closest semantic neighbors
 *   - Dynamically plot user-entered sentences into 3D semantic space
 *   - Glowing constellation links between nearest semantic neighbors
 *   - Smooth 3D-to-2D projected floating sentence labels
 */

window.LLMVerseUniverse = (function () {
  'use strict';

  let scene, camera, renderer, raycaster;
  let canvas, wrap, labelsLayer;
  let glowTex;
  let pointsGroup, linksGroup, nebulaField, selectionRing;

  // Data state
  const nodes = []; // { id, text, embed, pos3D, isCustom, mesh, halo, labelEl }
  let selectedNode = null;
  let isInitialized = false;
  let isVisible = true;

  // Interactive toggles
  let autoOrbit = true;
  let showLabels = true;
  let showLinks = true;

  // Smooth spherical camera controller (zero external OrbitControls dependency)
  const camState = {
    radius: 15.5,
    targetRadius: 15.5,
    theta: 0.65,
    targetTheta: 0.65,
    phi: 1.18,
    targetPhi: 1.18,
    lookAt: null,
    targetLookAt: null
  };

  let onSelectCallback = null;

  /**
   * Creates a soft radial glow texture for 3D star sprites & nebula dust.
   */
  function makeStarTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(240,220,255,0.85)');
    g.addColorStop(0.55, 'rgba(168,85,247,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Builds the glowing purple, cosmic blue, and pink background particle universe.
   */
  function createCosmicNebulaParticles() {
    const count = 1350;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#c084fc'), // Lavender
      new THREE.Color('#38bdf8'), // Cosmic Blue
      new THREE.Color('#f472b6'), // Holographic Pink
      new THREE.Color('#818cf8'), // Indigo
      new THREE.Color('#a855f7')  // Violet
    ];

    for (let i = 0; i < count; i++) {
      // Spiral/spherical cosmic cloud distribution
      const r = 4 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.78;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.24,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    nebulaField = new THREE.Points(geo, mat);
    scene.add(nebulaField);
  }

  /**
   * Adds subtle holographic 3D reference axes and equatorial grid ring.
   */
  function createLabReferenceGrid() {
    const grid = new THREE.GridHelper(16, 16, 0x38bdf8, 0x4c1d95);
    grid.position.y = -5.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.9, 7.98, 96),
      new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -5.18;
    scene.add(ring);
  }

  /**
   * Creates a single glowing 3D star node for a sentence.
   */
  function addSentence(text, isCustom = false, autoSelect = false) {
    if (!isInitialized || !text || !text.trim()) return null;

    const cleanText = text.trim();
    const embed = window.LLMVerseEngine.embedText(cleanText, 16);
    const pos3D = window.LLMVerseEngine.projectTo3D(embed);

    const colorHex = isCustom ? '#fbbf24' : embed.colorHex;
    const nodeColor = new THREE.Color(colorHex);

    // Core glowing sphere (raycast target)
    const sphereGeo = new THREE.SphereGeometry(isCustom ? 0.34 : 0.26, 20, 20);
    const sphereMat = new THREE.MeshBasicMaterial({ color: nodeColor });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(pos3D.x, pos3D.y, pos3D.z);

    // Soft glowing sprite halo around the star
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: nodeColor,
      transparent: true,
      opacity: isCustom ? 0.95 : 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Sprite(spriteMat);
    halo.scale.set(isCustom ? 1.85 : 1.35, isCustom ? 1.85 : 1.35, 1);
    mesh.add(halo);

    // Floating 2D label element
    const labelEl = document.createElement('div');
    labelEl.className = 'u-floating-label' + (isCustom ? ' custom-node' : '');
    labelEl.textContent = cleanText.length > 38 ? cleanText.slice(0, 36) + '…' : cleanText;
    labelsLayer.appendChild(labelEl);

    const nodeObj = {
      id: 'node_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: cleanText,
      embed,
      pos3D,
      isCustom,
      colorHex,
      mesh,
      halo,
      labelEl
    };

    mesh.userData.nodeRef = nodeObj;
    pointsGroup.add(mesh);
    nodes.push(nodeObj);

    rebuildSemanticLinks();

    if (autoSelect) {
      selectNode(nodeObj, true);
    }

    return nodeObj;
  }

  /**
   * Computes and renders delicate glowing constellation links connecting each
   * sentence to its top 2 closest semantic neighbors.
   */
  function rebuildSemanticLinks() {
    // Clear existing lines
    while (linksGroup.children.length > 0) {
      const child = linksGroup.children[0];
      child.geometry.dispose();
      child.material.dispose();
      linksGroup.remove(child);
    }

    const lineCoords = [];
    const lineColors = [];
    const seenPairs = new Set();

    nodes.forEach((a, idxA) => {
      const ranked = nodes
        .map((b, idxB) => ({
          idxB,
          node: b,
          sim: idxA === idxB ? -2 : window.LLMVerseEngine.cosineSimilarity(a.embed.vector, b.embed.vector)
        }))
        .sort((p, q) => q.sim - p.sim)
        .slice(0, 2);

      ranked.forEach((match) => {
        if (match.sim < 0.35) return;
        const pairKey = Math.min(idxA, match.idxB) + '_' + Math.max(idxA, match.idxB);
        if (seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);

        lineCoords.push(
          a.pos3D.x, a.pos3D.y, a.pos3D.z,
          match.node.pos3D.x, match.node.pos3D.y, match.node.pos3D.z
        );

        const cA = new THREE.Color(a.colorHex);
        const cB = new THREE.Color(match.node.colorHex);
        lineColors.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b);
      });
    });

    if (lineCoords.length === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const lines = new THREE.LineSegments(geo, mat);
    linksGroup.add(lines);
    linksGroup.visible = showLinks;
  }

  /**
   * Returns the top K semantically closest neighbor nodes for a given node.
   */
  function getNeighbors(nodeObj, count = 3) {
    return nodes
      .filter((other) => other.id !== nodeObj.id)
      .map((other) => ({
        node: other,
        similarity: window.LLMVerseEngine.cosineSimilarity(nodeObj.embed.vector, other.embed.vector)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);
  }

  /**
   * Selects a node, moves the glowing holographic selection ring onto it,
   * optionally glides the camera smoothly toward it, and notifies the UI.
   */
  function selectNode(nodeObj, focusCamera = false) {
    if (!nodeObj) return;
    selectedNode = nodeObj;

    nodes.forEach((n) => {
      n.labelEl.classList.toggle('selected', n.id === nodeObj.id);
    });

    selectionRing.visible = true;
    selectionRing.position.set(nodeObj.pos3D.x, nodeObj.pos3D.y, nodeObj.pos3D.z);

    if (focusCamera) {
      camState.targetLookAt.set(nodeObj.pos3D.x * 0.42, nodeObj.pos3D.y * 0.42, nodeObj.pos3D.z * 0.42);
      camState.targetRadius = Math.min(camState.targetRadius, 12.8);
    }

    if (typeof onSelectCallback === 'function') {
      onSelectCallback(nodeObj, getNeighbors(nodeObj, 3), nodes.length);
    }
  }

  /**
   * Removes all user-added custom points and resets selection.
   */
  function clearCustomNodes() {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].isCustom) {
        const n = nodes[i];
        pointsGroup.remove(n.mesh);
        n.mesh.geometry.dispose();
        n.mesh.material.dispose();
        if (n.labelEl && n.labelEl.parentNode) n.labelEl.parentNode.removeChild(n.labelEl);
        nodes.splice(i, 1);
      }
    }
    rebuildSemanticLinks();
    if (nodes.length > 0) {
      selectNode(nodes[0], false);
    }
    return nodes.length;
  }

  /**
   * Projects every 3D sentence position into 2D screen coordinates for floating labels.
   */
  function updateFloatingLabels() {
    if (!showLabels) {
      labelsLayer.style.display = 'none';
      return;
    }
    labelsLayer.style.display = 'block';

    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    const tempVec = new THREE.Vector3();

    nodes.forEach((n) => {
      tempVec.set(n.pos3D.x, n.pos3D.y, n.pos3D.z);
      tempVec.project(camera);

      // Hide labels behind the camera
      if (tempVec.z > 1) {
        n.labelEl.style.opacity = '0';
        return;
      }

      const x = (tempVec.x * 0.5 + 0.5) * width;
      const y = (-tempVec.y * 0.5 + 0.5) * height;

      const isSel = selectedNode && selectedNode.id === n.id;
      const inBounds = x > -40 && x < width + 40 && y > -20 && y < height + 20;

      n.labelEl.style.left = x + 'px';
      n.labelEl.style.top = y + 'px';
      n.labelEl.style.opacity = !inBounds ? '0' : isSel || n.isCustom ? '1' : '0.78';
    });
  }

  /**
   * Initializes the Three.js 3D Universe inside #universe-canvas.
   */
  function init(selectHandler) {
    canvas = document.getElementById('universe-canvas');
    wrap = document.getElementById('universe-canvas-wrap');
    labelsLayer = document.getElementById('universe-labels-layer');
    onSelectCallback = selectHandler;

    if (!canvas || !wrap || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(48, wrap.clientWidth / wrap.clientHeight, 0.1, 150);
    camState.lookAt = new THREE.Vector3(0, 0, 0);
    camState.targetLookAt = new THREE.Vector3(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);

    raycaster = new THREE.Raycaster();
    glowTex = makeStarTexture();

    pointsGroup = new THREE.Group();
    linksGroup = new THREE.Group();
    scene.add(linksGroup);
    scene.add(pointsGroup);

    // Holographic Selection Pulse Ring
    selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.56, 40),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      })
    );
    selectionRing.visible = false;
    scene.add(selectionRing);

    createCosmicNebulaParticles();
    createLabReferenceGrid();

    isInitialized = true;

    // Seed with starter cosmic sentences
    window.LLMVerseEngine.STARTER_UNIVERSE_SENTENCES.forEach((sentence) => {
      addSentence(sentence, false, false);
    });

    if (nodes.length > 0) {
      selectNode(nodes[0], false);
    }

    // Pointer Drag Orbit + Click Raycasting
    let pointerDown = false;
    let draggedDist = 0;
    let lastX = 0;
    let lastY = 0;
    const pointerNDC = new THREE.Vector2();

    wrap.addEventListener('pointerdown', (e) => {
      pointerDown = true;
      draggedDist = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      const rect = wrap.getBoundingClientRect();
      if (pointerDown) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        draggedDist += Math.hypot(dx, dy);
        camState.targetTheta -= dx * 0.0075;
        camState.targetPhi = THREE.MathUtils.clamp(camState.targetPhi - dy * 0.0065, 0.22, Math.PI - 0.22);
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        // Hover cursor highlight on stars
        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNDC, camera);
        const hits = raycaster.intersectObjects(pointsGroup.children, false);
        wrap.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!pointerDown) return;
      pointerDown = false;

      // Treat as a click if pointer barely moved
      if (draggedDist < 7) {
        const rect = wrap.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointerNDC, camera);
          const hits = raycaster.intersectObjects(pointsGroup.children, false);
          if (hits.length > 0 && hits[0].object.userData.nodeRef) {
            selectNode(hits[0].object.userData.nodeRef, true);
          }
        }
      }
    });

    // Mouse Wheel Zoom (prevent page scroll only while zooming inside canvas)
    wrap.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        camState.targetRadius = THREE.MathUtils.clamp(camState.targetRadius + e.deltaY * 0.012, 6.2, 27);
      },
      { passive: false }
    );

    // Visibility optimization
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0].isIntersecting;
        },
        { threshold: 0.02 }
      );
      obs.observe(wrap);
    }

    // Responsive Resize
    window.addEventListener('resize', () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();

      if (autoOrbit && !pointerDown) {
        camState.targetTheta += 0.0022;
      }

      // Smooth damped interpolation
      camState.theta += (camState.targetTheta - camState.theta) * 0.07;
      camState.phi += (camState.targetPhi - camState.phi) * 0.07;
      camState.radius += (camState.targetRadius - camState.radius) * 0.08;
      camState.lookAt.lerp(camState.targetLookAt, 0.07);

      // Update camera spherical position
      camera.position.x = camState.lookAt.x + camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);
      camera.position.y = camState.lookAt.y + camState.radius * Math.cos(camState.phi);
      camera.position.z = camState.lookAt.z + camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);
      camera.lookAt(camState.lookAt);

      // Gentle cosmic drift of nebula particles
      if (nebulaField) {
        nebulaField.rotation.y = t * 0.018;
      }

      // Pulse the holographic selection ring and face it toward the camera
      if (selectionRing.visible) {
        selectionRing.lookAt(camera.position);
        const pulse = 1 + Math.sin(t * 4) * 0.14;
        selectionRing.scale.set(pulse, pulse, 1);
      }

      renderer.render(scene, camera);
      updateFloatingLabels();
    }

    animate();
  }

  return {
    init,
    addSentence,
    selectNode,
    clearCustomNodes,
    toggleAutoOrbit: () => {
      autoOrbit = !autoOrbit;
      return autoOrbit;
    },
    toggleLabels: () => {
      showLabels = !showLabels;
      return showLabels;
    },
    toggleLinks: () => {
      showLinks = !showLinks;
      if (linksGroup) linksGroup.visible = showLinks;
      return showLinks;
    },
    zoomBy: (delta) => {
      camState.targetRadius = THREE.MathUtils.clamp(camState.targetRadius + delta, 6.2, 27);
    },
    resetCamera: () => {
      camState.targetRadius = 15.5;
      camState.targetTheta = 0.65;
      camState.targetPhi = 1.18;
      camState.targetLookAt.set(0, 0, 0);
    },
    getNodes: () => nodes
  };
})();
