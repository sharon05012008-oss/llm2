/**
 * ============================================================================
 * LLMVerse — Ambient Cosmic Starfield & Hero 3D AI Brain (js/hero-brain.js)
 * ============================================================================
 * Renders:
 *   1. Lightweight floating cosmic particles + subtle neural connections on
 *      the full-screen background canvas (#cosmic-bg-canvas).
 *   2. A breathtaking interactive Three.js 3D glowing AI Neural Brain in the
 *      Hero section (#hero-brain-canvas) with:
 *        - Anatomically inspired left & right cerebral hemispheres
 *        - Hundreds of luminous synaptic nodes in lavender, cosmic blue & pink
 *        - Glowing neural pathways & traveling light-pulse sparks
 *        - Holographic orbital rings & radiant inner core
 *        - Drag rotation, mouse parallax, and clickable "Fire Neural Pulse"
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * PART 1: AMBIENT FLOATING COSMIC PARTICLE CANVAS (2D, ULTRA-LIGHTWEIGHT)
   * -------------------------------------------------------------------------- */
  function initCosmicBackground() {
    const canvas = document.getElementById('cosmic-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const palette = ['#c084fc', '#38bdf8', '#f472b6', '#818cf8', '#e9d5ff'];
    const particleCount = Math.min(72, Math.floor((width * height) / 22000));
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 0.6,
        color: palette[i % palette.length],
        alpha: Math.random() * 0.55 + 0.25
      });
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    function animateBg() {
      ctx.clearRect(0, 0, width, height);

      // Update and draw floating particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Draw delicate cosmic neural filaments between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 16500) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = '#a855f7';
            ctx.globalAlpha = (1 - dist / 128) * 0.14;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(animateBg);
    }

    animateBg();
  }

  /* --------------------------------------------------------------------------
   * PART 2: THREE.JS HERO 3D AI BRAIN
   * -------------------------------------------------------------------------- */

  /**
   * Generates a soft radial glow texture on an offscreen canvas for bright
   * glowing neural nodes without needing external image assets.
   */
  function createGlowTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.28, 'rgba(233, 213, 255, 0.85)');
    grad.addColorStop(0.6, 'rgba(139, 92, 246, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Procedurally samples a point inside/on a realistic two-hemisphere 3D brain shape.
   */
  function sampleBrainPoint(hemiSign, surfaceBias) {
    // Spherical coordinates
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);

    // Base radius biased toward cortical shell for crisp brain silhouette
    const r = surfaceBias ? 0.82 + Math.random() * 0.22 : Math.cbrt(Math.random()) * 0.92;

    let sx = Math.sin(phi) * Math.cos(theta);
    let sy = Math.cos(phi);
    let sz = Math.sin(phi) * Math.sin(theta);

    // Elongate front-to-back (Z), shape height (Y), flatten medial side slightly
    let x = sx * 1.05 * r;
    let y = sy * 1.12 * r;
    let z = sz * 1.52 * r;

    // Sculpt anatomical lobes: slightly wider back (occipital/parietal), tapered front (frontal)
    const frontTaper = 1 - 0.14 * Math.max(0, z);
    x *= frontTaper;

    // Gentle temporal lobe bulge on lower sides
    if (y < 0.05 && Math.abs(z) < 0.85) {
      x *= 1.12;
    }

    // Add cortical sulci/gyri organic ripples on the surface
    const fold =
      Math.sin(z * 5.2 + y * 3.8) * 0.065 +
      Math.cos(x * 6.0 - z * 4.5) * 0.05;
    x += sx * fold;
    y += sy * fold;
    z += sz * fold;

    // Pull medial side inward to form the central longitudinal fissure between hemispheres
    x = Math.abs(x) * hemiSign;
    const fissureOffset = 0.16 * hemiSign;
    x += fissureOffset;

    // Slight arch curve along front-to-back
    y += Math.cos(z * 0.9) * 0.18 - 0.06;

    return new THREE.Vector3(x, y, z);
  }

  function initHeroBrain() {
    const canvas = document.getElementById('hero-brain-canvas');
    const wrap = document.getElementById('hero-brain-canvas-wrap');
    if (!canvas || !wrap || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
    camera.position.set(0, 0.35, 6.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    const glowTex = createGlowTexture();

    // 1. Generate 3D Brain Synaptic Nodes (Left + Right Hemispheres + Brainstem)
    const nodePositions = [];
    const nodeColors = [];
    const synapseNodes = []; // Subset of key hub nodes for neural edges

    const colorLavender = new THREE.Color('#c084fc');
    const colorBlue = new THREE.Color('#38bdf8');
    const colorPink = new THREE.Color('#f472b6');
    const colorWhite = new THREE.Color('#f5f3ff');

    const totalCortexPoints = 920;
    for (let i = 0; i < totalCortexPoints; i++) {
      const hemi = i % 2 === 0 ? 1 : -1;
      const surface = i < 740;
      const p = sampleBrainPoint(hemi, surface);
      nodePositions.push(p.x, p.y, p.z);

      // Color gradient from front (cosmic blue) -> middle (lavender) -> lower/back (pink)
      const mixT = THREE.MathUtils.clamp((p.z + 1.5) / 3.0, 0, 1);
      const col = new THREE.Color().lerpColors(colorPink, colorLavender, mixT);
      if (p.y > 0.25 || Math.random() > 0.62) {
        col.lerp(colorBlue, 0.45 + Math.random() * 0.35);
      }
      if (Math.random() > 0.88) col.lerp(colorWhite, 0.6);

      nodeColors.push(col.r, col.g, col.b);

      if (i < 240) {
        synapseNodes.push(p);
      }
    }

    // Add glowing brainstem / cerebellum taper underneath
    for (let i = 0; i < 95; i++) {
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const rad = (0.36 - t * 0.16) * (0.6 + Math.random() * 0.4);
      const x = Math.cos(angle) * rad;
      const y = -0.95 - t * 0.85;
      const z = -0.45 + Math.sin(angle) * rad - t * 0.2;
      nodePositions.push(x, y, z);

      const c = colorBlue.clone().lerp(colorLavender, t);
      nodeColors.push(c.r, c.g, c.b);
      if (i < 22) synapseNodes.push(new THREE.Vector3(x, y, z));
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 0.145,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const brainPointCloud = new THREE.Points(pointsGeo, pointsMat);
    brainGroup.add(brainPointCloud);

    // 2. Neural Pathways (Edges connecting nearby synapse nodes + cross-hemisphere bridges)
    const edgeCoords = [];
    const edgeColors = [];
    const pulsePaths = []; // Pairs of [startVec, endVec] for traveling light impulses

    for (let i = 0; i < synapseNodes.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < synapseNodes.length; j++) {
        const dist = synapseNodes[i].distanceTo(synapseNodes[j]);
        if (dist < 0.72 && connections < 4) {
          edgeCoords.push(
            synapseNodes[i].x, synapseNodes[i].y, synapseNodes[i].z,
            synapseNodes[j].x, synapseNodes[j].y, synapseNodes[j].z
          );
          const cA = synapseNodes[i].x > 0 ? colorBlue : colorLavender;
          const cB = synapseNodes[j].y < 0 ? colorPink : colorLavender;
          edgeColors.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b);

          if (pulsePaths.length < 75 && Math.random() > 0.35) {
            pulsePaths.push([synapseNodes[i], synapseNodes[j]]);
          }
          connections++;
        }
      }
    }

    const edgesGeo = new THREE.BufferGeometry();
    edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeCoords, 3));
    edgesGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));

    const edgesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const neuralEdges = new THREE.LineSegments(edgesGeo, edgesMat);
    brainGroup.add(neuralEdges);

    // 3. Traveling Synaptic Impulses (Glowing sparks racing along neural links)
    const sparkCount = Math.min(54, pulsePaths.length);
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkMeta = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkMeta.push({
        pathIndex: i % pulsePaths.length,
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.014
      });
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.24,
      map: glowTex,
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sparkCloud = new THREE.Points(sparkGeo, sparkMat);
    brainGroup.add(sparkCloud);

    // 4. Radiant Inner AI Core + Subtle Wireframe Aura
    const coreMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 2),
      new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.22
      })
    );
    brainGroup.add(coreMesh);

    // 5. Holographic Orbital Rings surrounding the AI Brain
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.011, 12, 120),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.34 })
    );
    ring1.rotation.x = Math.PI * 0.42;
    ring1.rotation.y = 0.2;
    brainGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.48, 0.008, 12, 120),
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.24 })
    );
    ring2.rotation.x = -Math.PI * 0.36;
    ring2.rotation.z = 0.45;
    brainGroup.add(ring2);

    // 6. Floating Ambient Micro-Dust around the Brain
    const dustCount = 160;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 2.1 + Math.random() * 1.9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dustPos[i * 3 + 1] = r * Math.cos(ph);
      dustPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.075,
      map: glowTex,
      color: 0xe879f9,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const dustField = new THREE.Points(dustGeo, dustMat);
    scene.add(dustField);

    // 7. Interactive Drag Rotation, Mouse Parallax & Pulse Trigger
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = -0.45;
    let targetRotX = 0.14;
    let mouseOffsetX = 0;
    let mouseOffsetY = 0;
    let pulseBoost = 0;

    wrap.addEventListener('pointerdown', (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      const rect = wrap.getBoundingClientRect();
      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        targetRotY += dx * 0.008;
        targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.006, -0.75, 0.75);
        prevX = e.clientX;
        prevY = e.clientY;
      } else if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouseOffsetX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35;
        mouseOffsetY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.25;
      }
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    const pulseBtn = document.getElementById('trigger-pulse-btn');
    if (pulseBtn) {
      pulseBtn.addEventListener('click', () => {
        pulseBoost = 1.0;
      });
    }

    // Pause rendering when hero is scrolled completely out of view for smooth performance
    let isVisible = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0].isIntersecting;
        },
        { threshold: 0.02 }
      );
      observer.observe(wrap);
    }

    // Handle Resize
    function handleResize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    // Main Animation Loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();

      if (!isDragging) {
        targetRotY += 0.0032;
      }

      // Smoothly ease brain rotation toward target + mouse parallax
      brainGroup.rotation.y += (targetRotY + mouseOffsetX - brainGroup.rotation.y) * 0.06;
      brainGroup.rotation.x += (targetRotX + mouseOffsetY - brainGroup.rotation.x) * 0.06;

      // Subtle floating levitation
      brainGroup.position.y = Math.sin(t * 1.15) * 0.1;

      // Animate core & holographic rings
      coreMesh.rotation.y = -t * 0.35;
      coreMesh.rotation.x = t * 0.22;
      ring1.rotation.z = t * 0.18;
      ring2.rotation.y = -t * 0.15;
      dustField.rotation.y = t * 0.05;

      // Pulse boost effect when user clicks "Fire Neural Pulse"
      if (pulseBoost > 0.001) {
        pulseBoost *= 0.955;
      } else {
        pulseBoost = 0;
      }

      edgesMat.opacity = 0.26 + Math.sin(t * 2.2) * 0.05 + pulseBoost * 0.45;
      sparkMat.size = 0.23 + pulseBoost * 0.24;
      const scalePulse = 1 + pulseBoost * 0.055;
      brainGroup.scale.set(scalePulse, scalePulse, scalePulse);

      // Move glowing sparks along neural pathways
      const posArr = sparkGeo.attributes.position.array;
      const speedMult = 1 + pulseBoost * 3.8;
      for (let i = 0; i < sparkCount; i++) {
        const s = sparkMeta[i];
        s.progress += s.speed * speedMult;
        if (s.progress >= 1) {
          s.progress = 0;
          s.pathIndex = (s.pathIndex + 7) % pulsePaths.length;
        }
        const [a, b] = pulsePaths[s.pathIndex];
        posArr[i * 3] = a.x + (b.x - a.x) * s.progress;
        posArr[i * 3 + 1] = a.y + (b.y - a.y) * s.progress;
        posArr[i * 3 + 2] = a.z + (b.z - a.z) * s.progress;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    animate();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCosmicBackground();
    initHeroBrain();
  });
})();
